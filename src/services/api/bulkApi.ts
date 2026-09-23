import type {
  BulkBatchStatus,
  BulkOrder,
  BulkStopPhase,
  BulkStopStatus,
  HistoryEntry,
} from '../../types';
import type {
  BulkBatchDto,
  BulkBatchListItemDto,
  BulkStopDto,
  ProofPhotoDto,
} from '../../types/api';
import {request, requestMultipart, type ApiResult} from './client';

const PHASE_FROM_API: Record<string, BulkStopPhase> = {
  to_nav: 'toNav',
  navigating: 'navigating',
  arrived: 'arrived',
};

function stopIdOf(stop: BulkStopDto): string {
  return stop.stopId || stop.id;
}

function mapStop(stop: BulkStopDto): BulkOrder & {id: string} {
  return {
    id: stopIdOf(stop),
    customer: stop.customer ?? 'Customer',
    num: stop.num ?? '',
    addr: stop.addr ?? '',
    bag: stop.bag ?? '',
    dist: stop.dist ?? '',
    eta: stop.eta ?? '',
    items: stop.items ?? 0,
    phone: stop.phone,
    paymentMode: stop.paymentMode,
    codAmount: stop.codAmount ?? null,
  };
}

export interface BulkBatchStatePatch {
  bulkBatchId: string;
  bulkOrders: Array<BulkOrder & {id: string}>;
  bulkBatchStatus: BulkBatchStatus;
  bulkLoaded: Record<string, boolean>;
  bulkStatuses: Record<number, BulkStopStatus>;
  bulkStopPhase: BulkStopPhase;
}

/** Map a batch DTO into store fields for bulk screens. */
export function batchToStatePatch(batch: BulkBatchDto): BulkBatchStatePatch {
  const orders = (batch.orders || []).map(mapStop);
  const bulkLoaded: Record<string, boolean> = {};
  const bulkStatuses: Record<number, BulkStopStatus> = {};

  (batch.orders || []).forEach((stop, i) => {
    if (stop.bag) {
      bulkLoaded[stop.bag] = !!stop.bagLoaded;
    }
    const st = stop.status as BulkStopStatus | undefined;
    if (st === 'delivered' || st === 'failed') {
      bulkStatuses[i] = st;
    }
  });

  const status = (batch.status as BulkBatchStatus) || 'assigned';
  const bulkStopPhase =
    batch.currentStopPhase != null
      ? PHASE_FROM_API[batch.currentStopPhase] ?? 'toNav'
      : 'toNav';

  return {
    bulkBatchId: batch.id,
    bulkOrders: orders,
    bulkBatchStatus: status,
    bulkLoaded,
    bulkStatuses,
    bulkStopPhase,
  };
}

export interface BulkApi {
  getBatch(batchId?: string): Promise<ApiResult<BulkBatchDto>>;
  loadBag(
    bag: string,
    batchId?: string,
  ): Promise<ApiResult<{bag: string; loaded: boolean; allLoaded?: boolean}>>;
  startDelivery(
    batchId?: string,
  ): Promise<ApiResult<{batchId: string; status: string; currentStopId?: string}>>;
  arrive(
    stopId: string,
    phase: 'navigating' | 'arrived',
  ): Promise<ApiResult<{stopId: string; phase: string}>>;
  uploadProofPhoto(
    stopId: string,
    photoUri: string,
    meta?: {mimeType?: string; fileName?: string},
  ): Promise<ApiResult<ProofPhotoDto>>;
  markDelivered(
    stopId: string,
    body?: {
      photoId?: string;
      otp?: string;
      codCollected?: number;
      photo?: boolean;
    },
  ): Promise<ApiResult<unknown>>;
  markFailed(
    stopId: string,
    reason: string,
    note?: string,
    photoId?: string,
  ): Promise<ApiResult<unknown>>;
  listBatches(): Promise<ApiResult<BulkBatchListItemDto[]>>;
  getBatchDetail(batchId: string): Promise<ApiResult<BulkBatchDto>>;
  mapOrders(batch: BulkBatchDto): Array<BulkOrder & {id: string}>;
}

export const bulkApi: BulkApi = {
  async getBatch(batchId) {
    const q = batchId ? `?batchId=${encodeURIComponent(batchId)}` : '';
    return request<BulkBatchDto>(`/picker/bulk/batch${q}`);
  },

  async loadBag(bag, batchId) {
    return request('/picker/bulk/bag/load', {
      method: 'POST',
      body: JSON.stringify({bag, batchId, loaded: true}),
    });
  },

  async startDelivery(batchId) {
    return request('/picker/bulk/start', {
      method: 'POST',
      body: JSON.stringify({batchId}),
      idempotent: true,
    });
  },

  async arrive(stopId, phase) {
    return request(`/picker/bulk/stops/${stopId}/arrive`, {
      method: 'POST',
      body: JSON.stringify({phase}),
    });
  },

  async uploadProofPhoto(stopId, photoUri, meta) {
    const form = new FormData();
    form.append('photo', {
      uri: photoUri,
      type: meta?.mimeType || 'image/jpeg',
      name: meta?.fileName || `bulk-pod-${stopId}.jpg`,
    } as unknown as Blob);
    return requestMultipart<ProofPhotoDto>(
      `/picker/bulk/stops/${stopId}/proof-photo`,
      form,
    );
  },

  async markDelivered(stopId, body) {
    return request(`/picker/bulk/stops/${stopId}/deliver`, {
      method: 'POST',
      body: JSON.stringify(body ?? {}),
      idempotent: true,
    });
  },

  async markFailed(stopId, reason, note, photoId) {
    return request(`/picker/bulk/stops/${stopId}/fail`, {
      method: 'POST',
      body: JSON.stringify({reason, note, photoId}),
      idempotent: true,
    });
  },

  async listBatches() {
    const result = await request<{batches: BulkBatchListItemDto[]}>(
      '/picker/bulk/batches?status=completed',
    );
    if (!result.ok) {
      return {
        ok: false,
        data: [],
        error: result.error || 'Could not load bulk history',
        status: result.status,
      };
    }
    return {
      ok: true,
      data: Array.isArray(result.data?.batches) ? result.data.batches : [],
      status: result.status,
    };
  },

  async getBatchDetail(batchId) {
    return request<BulkBatchDto>(`/picker/bulk/batches/${batchId}`);
  },

  mapOrders(batch) {
    return (batch.orders || []).map(mapStop);
  },
};

/** Map bulk history list items into HistoryEntry-like rows for HistoryScreen. */
export function mapBulkHistory(
  batches: BulkBatchListItemDto[],
): Array<HistoryEntry & {id: string; type: 'bulk'}> {
  return batches.map(b => ({
    id: b.id,
    type: 'bulk' as const,
    time: b.whenDisplay ?? b.completedAt ?? '',
    addr: b.route ?? b.summaryLine ?? 'Bulk route',
    num: b.id,
    items: b.orders ?? 0,
    dist: b.distanceKm != null ? `${b.distanceKm} km` : '',
    payout: b.earnings ?? 0,
  }));
}
