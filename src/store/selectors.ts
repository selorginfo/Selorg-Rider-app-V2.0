import type {BulkStop, BulkStopStatus, DeliveryMode, Order} from '../types';
import {
  deriveDeliveryMode,
  vehicleLabel,
} from '../constants/vehicles';
import type {RiderState} from './state';

export const activeOrder = (s: RiderState): Order | null => {
  if (!s.activeId) {
    return s.orders[0] ?? null;
  }
  return s.orders.find(o => o.id === s.activeId) ?? s.orders[0] ?? null;
};

export const availableOrders = (s: RiderState): Order[] =>
  s.orders.filter(
    o =>
      o.id !== s.activeId &&
      !o.assignedToMe &&
      o.riderStage !== 'accepted' &&
      o.riderStage !== 'picked_up' &&
      o.riderStage !== 'delivered',
  );

export const checkedCount = (s: RiderState): number =>
  Object.values(s.checked).filter(Boolean).length;

export const allItemsChecked = (s: RiderState): boolean =>
  s.bagItems.length > 0 && checkedCount(s) === s.bagItems.length;

export const FLOW_LABELS: Record<string, string> = {
  accept: 'Accepted · Head to store',
  travel: 'On the way to store',
  bag: 'At store · Collecting',
  nav: 'Out for delivery',
  photo: 'Capturing proof',
  complete: 'Delivered',
};

export const activeShiftLabel = (s: RiderState): string => {
  if (!s.isOnline) {
    return 'Not working · tap to go online';
  }
  const slot =
    s.activeShiftTime ||
    s.shifts.find(x => x.id === s.activeShiftId)?.time ||
    s.shifts.find(x => x.id === s.pickedShiftId)?.time;
  if (slot) {
    return slot;
  }
  const hub = s.epHubName || s.epHubId;
  if (hub) {
    return `${hub} · online`;
  }
  return 'Online';
};

export function onlineDurationLabel(onlineSince?: string | null): string {
  if (!onlineSince) {
    return '';
  }
  const start = new Date(onlineSince).getTime();
  if (!Number.isFinite(start)) {
    return '';
  }
  const mins = Math.max(0, Math.floor((Date.now() - start) / 60000));
  if (mins < 60) {
    return `${mins} min online`;
  }
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h online` : `${h}h ${m}m online`;
}

export const phoneMasked = (s: RiderState): string =>
  s.phone ? `${s.phone.slice(0, 5)} ${s.phone.slice(5)}` : '';

export const otpTarget = (s: RiderState): string =>
  s.loginMethod === 'email' ? s.email : s.phone ? `+91 ${phoneMasked(s)}` : '';

export const bookedCount = (s: RiderState): number =>
  s.shifts.filter(sl =>
    s.booked[sl.id] !== undefined ? s.booked[sl.id] : sl.booked,
  ).length;

export const isSlotBooked = (s: RiderState, id: string): boolean => {
  const def = s.shifts.find(sl => sl.id === id)?.booked ?? false;
  return s.booked[id] !== undefined ? s.booked[id] : def;
};

export const obDocsCount = (s: RiderState) =>
  Object.values(s.obDocs).filter(Boolean).length;
export const obKitCount = (s: RiderState) =>
  Object.values(s.obKit).filter(Boolean).length;

export const appId = (s: RiderState): string =>
  'SL-RA-' +
  (s.obVehicleNo ? s.obVehicleNo.replace(/[^0-9]/g, '').slice(-4) : '----');

export const floatTxns = (s: RiderState) => [...s.extraTxns];

export interface BulkStatusMeta {
  label: string;
  color: string;
  bg: string;
}

export const BULK_STATUS_META: Record<BulkStopStatus, BulkStatusMeta> = {
  pending: {label: 'Upcoming', color: '#9CA3AF', bg: '#F3F4F6'},
  delivered: {label: 'Delivered', color: '#237227', bg: 'rgba(35,114,39,.1)'},
  failed: {label: 'Failed', color: '#E7000B', bg: '#FEF2F2'},
};

export interface BulkView {
  batchId: string;
  vehicleLabel: string;
  vehicleNo: string;
  total: number;
  completed: number;
  failed: number;
  remaining: number;
  allDone: boolean;
  notDone: boolean;
  stops: BulkStop[];
  currentIdx: number;
  current: BulkStop | null;
  loadedCount: number;
  allLoaded: boolean;
  missingCount: number;
  progressPct: string;
  homeCardLabel: string;
  filteredStops: BulkStop[];
  detailStop: BulkStop | null;
  phaseBtnLabel: string;
  summary: {
    total: number;
    completed: number;
    failed: number;
    distance: string;
    duration: string;
    earning: number;
  };
  deliveryMode: DeliveryMode;
}

export function selectBulk(s: RiderState): BulkView {
  const orders = s.bulkOrders;
  const total = orders.length;
  const stops: BulkStop[] = orders.map((o, i) => ({
    ...o,
    idx: i,
    status: s.bulkStatuses[i] || 'pending',
  }));
  const currentIdx = stops.findIndex(st => st.status === 'pending');
  const allDone = total === 0 ? false : currentIdx === -1;
  const completed = stops.filter(st => st.status === 'delivered').length;
  const failed = stops.filter(st => st.status === 'failed').length;
  const remaining = total - completed - failed;
  const current = !allDone && currentIdx >= 0 ? stops[currentIdx] : null;

  const loadedCount = orders.filter(o => s.bulkLoaded[o.bag]).length;
  const allLoaded = total > 0 && loadedCount === total;

  const filteredStops = stops.filter(st => {
    if (s.bulkFilter !== 'all') {
      if (s.bulkFilter === 'current') {
        if (st.idx !== currentIdx) {
          return false;
        }
      } else if (st.status !== s.bulkFilter) {
        return false;
      }
    }
    if (s.bulkSearch.trim()) {
      const q = s.bulkSearch.trim().toLowerCase();
      if (
        !(
          st.customer.toLowerCase().includes(q) ||
          st.num.toLowerCase().includes(q) ||
          st.addr.toLowerCase().includes(q)
        )
      ) {
        return false;
      }
    }
    return true;
  });

  const detailStop = s.bulkDetailIdx != null ? stops[s.bulkDetailIdx] : current;

  const phaseBtnLabel =
    {
      toNav: 'Start Navigation',
      navigating: 'Mark Arrived',
      arrived: 'Deliver Order',
    }[s.bulkStopPhase] || 'Start Navigation';

  const deliveryMode: DeliveryMode = deriveDeliveryMode(s.vehicleType);

  return {
    batchId: s.bulkBatchId || '—',
    vehicleLabel: vehicleLabel(s.vehicleType),
    vehicleNo: s.epVehicle,
    total,
    completed,
    failed,
    remaining,
    allDone,
    notDone: !allDone,
    stops,
    currentIdx,
    current,
    loadedCount,
    allLoaded,
    missingCount: total - loadedCount,
    progressPct:
      total === 0
        ? '0%'
        : Math.round(((completed + failed) / total) * 100) + '%',
    homeCardLabel:
      s.bulkBatchStatus === 'assigned'
        ? 'View Batch'
        : s.bulkBatchStatus === 'loading'
        ? 'Continue Loading'
        : 'Continue Delivery',
    filteredStops,
    detailStop,
    phaseBtnLabel,
    summary: {
      total,
      completed,
      failed,
      distance: '—',
      duration: '—',
      earning: 0,
    },
    deliveryMode,
  };
}

export const deliveryMode = (s: RiderState): DeliveryMode =>
  deriveDeliveryMode(s.vehicleType);
