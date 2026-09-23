import type {LatLngPoint, Order} from '../types';
import type {HubDto, OrderDetailDto} from '../types/api';

export function toLatLng(
  lat?: number | null,
  lng?: number | null,
): LatLngPoint | null {
  if (
    lat == null ||
    lng == null ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng)
  ) {
    return null;
  }
  return {latitude: lat, longitude: lng};
}

/** Hub pin from API HubDto coordinates only — never mock/hardcoded hubs. */
export function hubLatLng(
  _hubId?: string | null,
  hubDto?: HubDto | null,
): LatLngPoint | null {
  if (hubDto?.coordinates) {
    const c = hubDto.coordinates;
    const fromApi = toLatLng(
      c.latitude ?? c.lat ?? null,
      c.longitude ?? c.lng ?? null,
    );
    if (fromApi) {
      return fromApi;
    }
  }
  return null;
}

/** Store destination for Travel map. */
export function pickupDestination(
  order: Order | null | undefined,
  hubId?: string | null,
): LatLngPoint | null {
  if (order?.pickupCoords) {
    return order.pickupCoords;
  }
  return hubLatLng(order?.hubId || hubId);
}

/** Customer destination for Nav map. */
export function deliverDestination(
  order: Order | null | undefined,
  detail?: OrderDetailDto | null,
): LatLngPoint | null {
  if (order?.deliverCoords) {
    return order.deliverCoords;
  }
  const d = detail?.delivery as
    | {
        lat?: number;
        lng?: number;
        latitude?: number | null;
        longitude?: number | null;
      }
    | undefined;
  if (d) {
    return toLatLng(d.latitude ?? d.lat ?? null, d.longitude ?? d.lng ?? null);
  }
  return null;
}

/** Enrich domain order with coords from order-detail API payload. */
export function applyDetailCoords(
  order: Order,
  detail: OrderDetailDto,
): Order {
  const pickupObj = detail.pickup as
    | string
    | {
        latitude?: number | null;
        longitude?: number | null;
        lat?: number;
        lng?: number;
      }
    | undefined;
  let pickupCoords = order.pickupCoords;
  if (pickupObj && typeof pickupObj === 'object') {
    pickupCoords =
      toLatLng(
        pickupObj.latitude ?? pickupObj.lat ?? null,
        pickupObj.longitude ?? pickupObj.lng ?? null,
      ) ?? pickupCoords;
  }
  const deliverCoords =
    deliverDestination(order, detail) ?? order.deliverCoords;
  const customer = detail.customer;
  const customerPhone =
    customer?.phone || order.customerPhone || undefined;
  const customerName =
    customer?.name || order.customerName || undefined;
  return {
    ...order,
    ...(pickupCoords ? {pickupCoords} : {}),
    ...(deliverCoords ? {deliverCoords} : {}),
    ...(customerName ? {customerName} : {}),
    ...(customerPhone ? {customerPhone} : {}),
    ...(detail.paymentMode ? {paymentMode: detail.paymentMode} : {}),
    ...(detail.codAmount !== undefined
      ? {codAmount: detail.codAmount}
      : {}),
  };
}
