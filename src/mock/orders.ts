import type {LatLngPoint, Order, OrderItem} from '../types';
import {HUBS} from './onboarding';

const SHARED_ITEMS: OrderItem[] = [
  {name: 'Organic Spinach 200g', qty: '1'},
  {name: 'Farm Fresh Eggs (6)', qty: '1'},
  {name: 'Brown Bread', qty: '2'},
  {name: 'Cold Pressed Coconut Oil 500ml', qty: '1'},
];

type HubOrderExtras = Pick<
  Order,
  | 'num'
  | 'raw'
  | 'payout'
  | 'bay'
  | 'deliver'
  | 'distance'
  | 'time'
  | 'priority'
  | 'deliverCoords'
>;

/** Drop pins — Out for delivery uses Adyar, Chennai. */
const HUB_EXTRAS: Record<string, HubOrderExtras> = {
  kor: {
    num: '#SG-2048',
    raw: '2048',
    payout: 52,
    bay: 'Bay 3 · Rack B',
    deliver: '42, Lattice Bridge Road, Adyar, Chennai',
    distance: '2.8 km',
    time: '11 min',
    priority: true,
    deliverCoords: {latitude: 13.0064, longitude: 80.2572},
  },
  hsr: {
    num: '#SG-2049',
    raw: '2049',
    payout: 48,
    bay: 'Bay 2 · Rack A',
    deliver: '14, 1st Main Road, Gandhi Nagar, Adyar, Chennai',
    distance: '2.5 km',
    time: '10 min',
    priority: false,
    deliverCoords: {latitude: 13.0069, longitude: 80.2548},
  },
  ind: {
    num: '#SG-2050',
    raw: '2050',
    payout: 55,
    bay: 'Bay 1 · Rack C',
    deliver: 'LB Road, Adyar, Chennai',
    distance: '2.6 km',
    time: '11 min',
    priority: true,
    deliverCoords: {latitude: 13.0058, longitude: 80.2591},
  },
};

const DEFAULT_EXTRAS: HubOrderExtras = {
  num: '#SG-2099',
  raw: '2099',
  payout: 50,
  bay: 'Bay 1 · Rack A',
  deliver: '42, Lattice Bridge Road, Adyar, Chennai',
  distance: '2.6 km',
  time: '11 min',
  priority: true,
  deliverCoords: {latitude: 13.0064, longitude: 80.2572},
};

function hubLabel(hubId: string): string {
  const hub = HUBS.find(h => h.id === hubId);
  return hub?.name.replace(/\s*Darkstore\s*$/i, '').trim() || hubId;
}

function hubCoords(hubId: string): LatLngPoint | undefined {
  const hub = HUBS.find(h => h.id === hubId);
  if (
    hub?.latitude != null &&
    hub?.longitude != null &&
    Number.isFinite(hub.latitude) &&
    Number.isFinite(hub.longitude)
  ) {
    return {latitude: hub.latitude, longitude: hub.longitude};
  }
  return undefined;
}

function orderForHub(hubId: string): Order {
  const extras = HUB_EXTRAS[hubId] ?? DEFAULT_EXTRAS;
  return {
    id: `dummy-order-${hubId}`,
    hubId,
    pickup: `Selorg Darkstore — ${hubLabel(hubId)}`,
    pickupCoords: hubCoords(hubId) ?? {
      latitude: 12.9352,
      longitude: 77.6245,
    },
    items: SHARED_ITEMS.length,
    customerName: 'Priya S',
    customerPhone: '9876543210',
    ...extras,
  };
}

/**
 * One dummy available order per onboarding hub (kor / hsr / ind).
 * Pickup labels align with onboarding `HUBS` darkstores.
 */
export const ORDERS: Order[] = HUBS.map(h => orderForHub(h.id));

/** Default / first dummy id (first hub). */
export const DUMMY_ORDER_ID = ORDERS[0]?.id ?? 'dummy-order-kor';

export const ORDER_ITEMS: Record<string, OrderItem[]> = Object.fromEntries(
  ORDERS.map(o => [o.id, SHARED_ITEMS.map(i => ({...i}))]),
);

export function isDummyOrderId(orderId: string): boolean {
  return orderId.startsWith('dummy-order-');
}

/** Dummy order(s) for a rider hub. Unknown hubs still get one synthetic dummy. */
export function dummyOrdersForHub(hubId?: string | null): Order[] {
  if (!hubId) {
    return ORDERS.map(o => ({...o}));
  }
  const match = ORDERS.find(o => o.hubId === hubId);
  if (match) {
    return [{...match}];
  }
  return [{...orderForHub(hubId)}];
}

export function dummyOrderById(orderId: string): Order {
  const found = ORDERS.find(o => o.id === orderId);
  if (found) {
    return {...found};
  }
  if (isDummyOrderId(orderId)) {
    return orderForHub(orderId.slice('dummy-order-'.length) || 'unknown');
  }
  return {...(ORDERS[0] ?? orderForHub('kor'))};
}

export function dummyBagItems(orderId?: string): OrderItem[] {
  if (orderId && ORDER_ITEMS[orderId]) {
    return ORDER_ITEMS[orderId].map(i => ({...i}));
  }
  return SHARED_ITEMS.map(i => ({...i}));
}
