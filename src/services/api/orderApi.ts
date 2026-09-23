import type {Order, OrderItem} from '../../types';
import type {
  CompleteDeliveryDto,
  OrderDetailDto,
  OrderListItemDto,
  OrderStatusUpdateDto,
  ProofPhotoDto,
} from '../../types/api';
import {environment} from '../../config/environment';
import {
  dummyBagItems,
  dummyOrderById,
  dummyOrdersForHub,
  isDummyOrderId,
} from '../../mock/orders';
import {request, requestMultipart, type ApiResult} from './client';

function isMockOrder(orderId: string): boolean {
  return environment.useMockData && isDummyOrderId(orderId);
}

function mockOk<T>(data: T): ApiResult<T> {
  return {ok: true, data, status: 200};
}

function mapOrder(dto: OrderListItemDto): Order {
  const fee = dto.deliveryFee ?? dto.payout ?? 0;
  return {
    id: dto.id,
    num: dto.num?.startsWith('#') ? dto.num : `#${dto.num}`,
    raw: dto.raw ?? String(dto.num ?? '').replace(/\D/g, ''),
    payout: fee,
    deliveryFee: fee,
    pickup: dto.pickup ?? '',
    pickupAddress: dto.pickupAddress ?? undefined,
    bay: dto.bay ?? '',
    bagCode: dto.bagCode ?? undefined,
    deliver: dto.deliver ?? '',
    distance:
      dto.distance ??
      (dto.distanceKm != null ? `${dto.distanceKm} km` : ''),
    time:
      dto.time ??
      (dto.etaMinutes != null ? `${dto.etaMinutes} min` : ''),
    items: typeof dto.items === 'number' ? dto.items : 0,
    priority: !!dto.priority,
    riderStage: dto.riderStage,
    assignedToMe: !!dto.assignedToMe,
    paymentMode: dto.paymentMode,
    codAmount: dto.codAmount ?? null,
  };
}

function extractItems(detail: OrderDetailDto): OrderItem[] {
  if (Array.isArray(detail.itemsList)) {
    return detail.itemsList.map(i => ({
      name: i.name,
      qty: i.qty,
    }));
  }
  if (Array.isArray(detail.items)) {
    return detail.items.map(i => ({
      name: i.name,
      qty: i.qty ?? i.quantity ?? '1',
    }));
  }
  return [];
}

export interface OrderApi {
  listAvailable(
    scope?: 'available' | 'mine' | 'all',
    hubId?: string | null,
  ): Promise<ApiResult<Order[]>>;
  getOrderDetail(orderId: string): Promise<ApiResult<OrderDetailDto>>;
  getBagItems(orderId: string): Promise<OrderItem[]>;
  accept(orderId: string): Promise<ApiResult<OrderStatusUpdateDto>>;
  confirmPickup(
    orderId: string,
    itemsVerified?: boolean,
  ): Promise<ApiResult<OrderStatusUpdateDto>>;
  uploadProofPhoto(
    orderId: string,
    photoUri: string,
    meta?: {latitude?: number; longitude?: number; mimeType?: string; fileName?: string},
  ): Promise<ApiResult<ProofPhotoDto>>;
  confirmDelivery(
    orderId: string,
    otp: string,
    opts?: {
      photo?: boolean;
      photoId?: string;
      codCollected?: number;
      location?: {latitude: number; longitude: number};
    },
  ): Promise<ApiResult<CompleteDeliveryDto>>;
  cancel(
    orderId: string,
    reason: string,
    note?: string,
  ): Promise<ApiResult<OrderStatusUpdateDto>>;
}

export const orderApi: OrderApi = {
  async listAvailable(scope = 'all', hubId) {
    if (environment.useMockData) {
      return mockOk(dummyOrdersForHub(hubId));
    }
    const result = await request<{
      orders: OrderListItemDto[];
      total?: number;
    }>(`/picker/shared-orders/assignorders?scope=${scope}`);
    if (!result.ok) {
      return {
        ok: false,
        data: [],
        error: result.error || 'Could not load orders',
        status: result.status,
      };
    }
    const orders = result.data?.orders;
    return mockOk(Array.isArray(orders) ? orders.map(mapOrder) : []);
  },

  async getOrderDetail(orderId) {
    if (isMockOrder(orderId)) {
      const order = dummyOrderById(orderId);
      return mockOk({
        id: order.id,
        num: order.num,
        raw: order.raw,
        payout: order.payout,
        bay: order.bay,
        deliver: order.deliver,
        distance: order.distance,
        time: order.time,
        items: order.items,
        priority: order.priority,
        itemsList: dummyBagItems(orderId),
        customer: {
          name: order.customerName || 'Customer',
          phone: order.customerPhone,
          phoneMasked: order.customerPhone
            ? `+91 ${order.customerPhone.slice(0, 2)}XXX XX${order.customerPhone.slice(-3)}`
            : undefined,
        },
        delivery: order.deliverCoords
          ? {
              address: order.deliver,
              lat: order.deliverCoords.latitude,
              lng: order.deliverCoords.longitude,
              latitude: order.deliverCoords.latitude,
              longitude: order.deliverCoords.longitude,
            }
          : {address: order.deliver},
        pickup: order.pickupCoords
          ? {
              name: order.pickup,
              latitude: order.pickupCoords.latitude,
              longitude: order.pickupCoords.longitude,
            }
          : order.pickup,
      } as OrderDetailDto);
    }
    return request<OrderDetailDto>(`/picker/shared-orders/${orderId}`);
  },

  async getBagItems(orderId) {
    if (isMockOrder(orderId)) {
      return dummyBagItems(orderId);
    }
    const result = await request<OrderDetailDto>(
      `/picker/shared-orders/${orderId}`,
    );
    if (!result.ok || !result.data) {
      return [];
    }
    return extractItems(result.data);
  },

  async accept(orderId) {
    if (isMockOrder(orderId)) {
      return mockOk({
        id: orderId,
        status: 'accepted',
        riderStage: 'accepted',
        updatedAt: new Date().toISOString(),
      });
    }
    return request<OrderStatusUpdateDto>(
      `/picker/shared-orders/${orderId}/status`,
      {
        method: 'PUT',
        body: JSON.stringify({status: 'accepted'}),
        idempotent: true,
      },
    );
  },

  async confirmPickup(orderId, itemsVerified = true) {
    if (isMockOrder(orderId)) {
      return mockOk({
        id: orderId,
        status: 'picked_up',
        riderStage: 'picked_up',
        updatedAt: new Date().toISOString(),
      });
    }
    return request<OrderStatusUpdateDto>(
      `/picker/shared-orders/${orderId}/status`,
      {
        method: 'PUT',
        body: JSON.stringify({status: 'picked_up', itemsVerified}),
        idempotent: true,
      },
    );
  },

  async uploadProofPhoto(orderId, photoUri, meta) {
    if (isMockOrder(orderId)) {
      return mockOk({
        photoId: `mock-photo-${orderId}`,
        url: photoUri,
        uploadedAt: new Date().toISOString(),
      } as ProofPhotoDto);
    }
    const form = new FormData();
    form.append('photo', {
      uri: photoUri,
      type: meta?.mimeType || 'image/jpeg',
      name: meta?.fileName || `pod-${orderId}.jpg`,
    } as unknown as Blob);
    if (meta?.latitude != null) {
      form.append('latitude', String(meta.latitude));
    }
    if (meta?.longitude != null) {
      form.append('longitude', String(meta.longitude));
    }
    form.append('capturedAt', new Date().toISOString());
    return requestMultipart<ProofPhotoDto>(
      `/picker/shared-orders/${orderId}/proof-photo`,
      form,
    );
  },

  async confirmDelivery(orderId, otp, opts) {
    if (isMockOrder(orderId)) {
      const order = dummyOrderById(orderId);
      return mockOk({
        orderId,
        completed: true,
        deliveredAt: new Date().toISOString(),
        summary: {
          payout: order.payout,
          tripMinutes: 12,
          distanceKm: 2.4,
          otpAccepted: !!otp,
          photo: opts?.photo ?? false,
          codCollected: opts?.codCollected,
        },
      } as CompleteDeliveryDto);
    }
    const body: Record<string, unknown> = {otp};
    if (opts?.photoId) {
      body.photoId = opts.photoId;
    } else if (opts?.photo != null) {
      // Transitional backend flag when no photoId is available.
      body.photo = opts.photo;
    }
    if (opts?.codCollected != null) {
      body.codCollected = opts.codCollected;
    }
    if (opts?.location) {
      body.location = opts.location;
    }
    return request<CompleteDeliveryDto>(
      `/picker/shared-orders/${orderId}/complete`,
      {
        method: 'POST',
        body: JSON.stringify(body),
        idempotent: true,
      },
    );
  },

  async cancel(orderId, reason, note) {
    if (isMockOrder(orderId)) {
      return mockOk({
        id: orderId,
        status: 'cancelled',
        riderStage: 'cancelled',
        updatedAt: new Date().toISOString(),
        cancellation: {reason, note, reassigned: false},
      });
    }
    return request<OrderStatusUpdateDto>(
      `/picker/shared-orders/${orderId}/status`,
      {
        method: 'PUT',
        body: JSON.stringify({status: 'cancelled', reason, note}),
        idempotent: true,
      },
    );
  },
};
