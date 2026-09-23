import type {EarningsDay, HistoryEntry, ShiftSlot} from '../../types';
import type {
  CashSummaryDto,
  CashTxnDto,
  DashboardTodayDto,
  DepositResultDto,
  EarningsBreakdownDto,
  EarningsHistoryDayDto,
  HistoryOrderDto,
  IncentiveTodayDto,
  ShiftSlotDto,
  WalletBalanceDto,
  WalletTransactionDto,
} from '../../types/api';
import {environment} from '../../config/environment';
import {request, type ApiResult} from './client';

const OBJECT_ID_RE = /^[a-f\d]{24}$/i;

function isObjectId(id: string): boolean {
  return OBJECT_ID_RE.test(id);
}

function mapShift(dto: ShiftSlotDto): ShiftSlot {
  const id = String(dto?.id || dto?._id || '');
  const timeRaw =
    dto?.timeDisplay ||
    dto?.time ||
    `${dto?.startTime ?? ''} – ${dto?.endTime ?? ''}`.trim();
  const payRaw =
    dto?.payDisplay ||
    (dto?.basePayPerHour != null
      ? `₹${dto.basePayPerHour}/hr`
      : dto?.basePay != null
      ? `₹${dto.basePay}/hr`
      : '');
  return {
    id,
    time: String(timeRaw || 'Shift'),
    label: String(dto?.label || dto?.name || 'Shift'),
    pay: String(payRaw),
    booked: !!(dto?.booked || dto?.isBookedByMe),
  };
}

export interface EarningsSummary {
  total: string;
  orders: number;
  hours: string;
  avgPerOrder: string;
  breakdown: Array<{label: string; amount: string; purple?: boolean}>;
  nextPayout: string;
  nextPayoutWhen: string;
  nextPayoutSchedule: string;
}

export interface RiderApi {
  getShifts(): Promise<ShiftSlot[]>;
  bookShift(id: string, booked: boolean): Promise<ApiResult<unknown>>;
  startShift(shiftId: string): Promise<ApiResult<unknown>>;
  endShift(shiftId: string): Promise<ApiResult<unknown>>;
  goOnline(location?: {
    latitude: number;
    longitude: number;
  }): Promise<ApiResult<{isOnline: boolean; onlineSince: string | null; mode: string}>>;
  goOffline(location?: {
    latitude: number;
    longitude: number;
  }): Promise<ApiResult<{isOnline: boolean; warnings?: string[]}>>;
  getMyShifts(): Promise<ApiResult<unknown>>;
  getDashboardToday(): Promise<ApiResult<DashboardTodayDto>>;
  getIncentiveToday(): Promise<ApiResult<IncentiveTodayDto>>;
  getEarningsSummary(): Promise<EarningsSummary>;
  getDailyBreakdown(): Promise<EarningsDay[]>;
  getHistory(
    type?: 'all' | 'standard' | 'bulk',
  ): Promise<Array<HistoryEntry & {id?: string; type?: string}>>;
  getCashSummary(): Promise<ApiResult<CashSummaryDto>>;
  getCashTransactions(): Promise<CashTxnDto[]>;
  recordDeposit(
    amount: number,
    method: string,
  ): Promise<ApiResult<DepositResultDto>>;
  getWallet(): Promise<ApiResult<WalletBalanceDto>>;
  getWalletTransactions(
    page?: number,
    limit?: number,
  ): Promise<ApiResult<WalletTransactionDto[]>>;
}

export const riderApi: RiderApi = {
  async getShifts() {
    const result = await request<ShiftSlotDto[] | {shifts: ShiftSlotDto[]}>(
      '/picker/shifts/available',
    );
    if (!result.ok || !result.data) {
      throw new Error(result.error || 'Could not load shifts');
    }
    const list = Array.isArray(result.data)
      ? result.data
      : Array.isArray(result.data.shifts)
      ? result.data.shifts
      : [];
    return list.map(mapShift).filter(s => Boolean(s.id));
  },

  async bookShift(id, booked) {
    // Design/dummy slot ids (e.g. s1) are not Mongo ObjectIds — reject in live mode.
    if (!id || !isObjectId(id)) {
      if (environment.useMockData) {
        return {ok: true, data: null};
      }
      return {
        ok: false,
        data: null,
        error: 'Invalid shift. Refresh the list and try again.',
        status: 400,
      };
    }
    if (booked) {
      return request('/picker/shifts/select', {
        method: 'POST',
        body: JSON.stringify({shiftId: id}),
      });
    }
    return request('/picker/shifts/deselect', {
      method: 'POST',
      body: JSON.stringify({shiftId: id}),
    });
  },

  async startShift(shiftId) {
    // Empty / non-ObjectId → shiftless 24h online via go-online.
    if (!shiftId || !isObjectId(shiftId)) {
      return riderApi.goOnline();
    }
    return request('/picker/shifts/start', {
      method: 'POST',
      body: JSON.stringify({shiftId}),
    });
  },

  async endShift(shiftId) {
    if (!shiftId || !isObjectId(shiftId)) {
      return riderApi.goOffline();
    }
    return request('/picker/shifts/end', {
      method: 'POST',
      body: JSON.stringify({shiftId}),
    });
  },

  async goOnline(location) {
    return request('/picker/shifts/go-online', {
      method: 'POST',
      body: JSON.stringify(location ? {location} : {}),
    });
  },

  async goOffline(location) {
    return request('/picker/shifts/go-offline', {
      method: 'POST',
      body: JSON.stringify(location ? {location} : {}),
    });
  },

  async getMyShifts() {
    return request('/picker/shifts/my');
  },

  async getDashboardToday() {
    return request<DashboardTodayDto>('/picker/dashboard/today');
  },

  async getIncentiveToday() {
    return request<IncentiveTodayDto>('/picker/incentives/today');
  },

  async getEarningsSummary() {
    const result = await request<EarningsBreakdownDto>(
      '/picker/wallet/earnings-breakdown?period=week',
    );
    if (!result.ok || !result.data) {
      throw new Error(result.error || 'Could not load earnings');
    }
    const d = result.data;
    const orders = d.deliveries ?? 0;
    const avg =
      d.avgPerOrder != null
        ? `₹${d.avgPerOrder}`
        : orders > 0 && d.total
        ? `₹${Math.round(d.total / orders)}`
        : '₹0';
    return {
      total: d.totalDisplay ?? `₹${d.total ?? 0}`,
      orders,
      hours: d.onlineHours != null ? `${d.onlineHours}h` : '0h',
      avgPerOrder: avg,
      breakdown: (d.breakdown ?? []).map(b => ({
        label: b.label,
        amount: b.amountDisplay ?? `₹${b.amount}`,
        purple: b.key === 'bulk' || /bulk/i.test(b.label),
      })),
      nextPayout:
        d.nextPayout?.amount != null
          ? `₹${d.nextPayout.amount}`
          : d.totalDisplay ?? `₹${d.total ?? 0}`,
      nextPayoutWhen: d.nextPayout?.dueAt
        ? new Date(d.nextPayout.dueAt).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
          })
        : '',
      nextPayoutSchedule: d.nextPayout?.scheduleDisplay ?? 'Weekly payout',
    };
  },

  async getDailyBreakdown() {
    const result = await request<{history: EarningsHistoryDayDto[]}>(
      '/picker/wallet/history?period=week&limit=7',
    );
    if (!result.ok) {
      throw new Error(result.error || 'Could not load earnings history');
    }
    const history = result.data?.history;
    if (!Array.isArray(history)) {
      return [];
    }
    return history.map(h => ({
      day: h.day ?? '',
      date: h.dateDisplay ?? h.date ?? '',
      orders: h.orders ?? 0,
      hours:
        h.hours ??
        (h.hoursDecimal != null ? `${h.hoursDecimal}h` : '0h'),
      amount:
        h.amount ??
        (h.amountValue != null ? `₹${h.amountValue}` : '₹0'),
    }));
  },

  async getHistory(type = 'all') {
    const result = await request<{orders: HistoryOrderDto[]}>(
      `/picker/shared-orders/completed?type=${type}`,
    );
    if (!result.ok) {
      throw new Error(result.error || 'Could not load history');
    }
    const orders = result.data?.orders;
    if (!Array.isArray(orders)) {
      return [];
    }
    return orders.map(o => ({
      id: o.id,
      type: o.type ?? 'standard',
      time: o.time ?? o.deliveredAt ?? '',
      addr: o.addr ?? '',
      num: o.num?.startsWith('#') ? o.num : `#${o.num}`,
      items: o.items ?? 0,
      dist: o.dist ?? (o.distanceKm != null ? `${o.distanceKm} km` : ''),
      payout: o.payout ?? 0,
    }));
  },

  async getCashSummary() {
    return request<CashSummaryDto>('/picker/cash/summary');
  },

  async getCashTransactions() {
    const result = await request<{transactions: CashTxnDto[]}>(
      '/picker/cash/transactions',
    );
    if (!result.ok) {
      throw new Error(result.error || 'Could not load cash transactions');
    }
    return Array.isArray(result.data?.transactions)
      ? result.data.transactions
      : [];
  },

  async recordDeposit(amount, method) {
    return request<DepositResultDto>('/picker/cash/deposits', {
      method: 'POST',
      body: JSON.stringify({amount, method}),
      idempotent: true,
    });
  },

  async getWallet() {
    return request<WalletBalanceDto>('/picker/wallet');
  },

  async getWalletTransactions(page = 1, limit = 20) {
    return request<WalletTransactionDto[]>(
      `/picker/wallet/transactions?page=${page}&limit=${limit}`,
    );
  },
};
