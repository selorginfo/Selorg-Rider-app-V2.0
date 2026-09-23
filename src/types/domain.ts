/** Domain models — shapes shared by mock data, services and the store. */

export type LoginMethod = 'mobile' | 'whatsapp' | 'email';
export type AuthIntent = 'login' | 'signup' | null;
export type AccountStatus = 'none' | 'pending' | 'approved' | 'rejected';

export type FlowScreen =
  | 'accept'
  | 'travel'
  | 'bag'
  | 'nav'
  | 'photo'
  | 'complete'
  | null;

export type DeliveryMode = 'standard' | 'bulk';
/** Runtime vehicle type — aligned with backend picker vehicle enums. */
export type VehicleType =
  | 'bike'
  | 'scooter'
  | 'ev'
  | 'cycle'
  | 'auto'
  | 'van'
  | 'ev_auto'
  | 'motorcycle';

export type BulkBatchStatus =
  | 'assigned'
  | 'loading'
  | 'ready'
  | 'dispatched'
  | 'in_transit'
  | 'completed';

export type BulkStopPhase = 'toNav' | 'navigating' | 'arrived';
export type BulkStopStatus = 'pending' | 'delivered' | 'failed';

export interface LatLngPoint {
  latitude: number;
  longitude: number;
}

export interface Order {
  id: string;
  num: string;
  raw: string;
  payout: number;
  /** Distance-based delivery fee from backend (same source as payout). */
  deliveryFee?: number;
  pickup: string;
  pickupAddress?: string;
  bay: string;
  bagCode?: string;
  deliver: string;
  distance: string;
  time: string;
  items: number;
  priority: boolean;
  /** Darkstore warehouseKey when known. */
  hubId?: string;
  /** Pickup darkstore coordinates (for Travel map). */
  pickupCoords?: LatLngPoint;
  /** Customer drop coordinates (for Nav map). */
  deliverCoords?: LatLngPoint;
  customerName?: string;
  /** Unmasked number for Call / Chat once the order is assigned. */
  customerPhone?: string;
  riderStage?: string;
  assignedToMe?: boolean;
  /** `cod` | `prepaid` from assign/list APIs. */
  paymentMode?: 'cod' | 'prepaid' | string;
  /** Rupees to collect at the door when paymentMode is cod. */
  codAmount?: number | null;
}

export interface OrderItem {
  name: string;
  qty: string;
}

export interface BulkOrder {
  id?: string;
  customer: string;
  num: string;
  addr: string;
  bag: string;
  dist: string;
  eta: string;
  items: number;
  phone?: string;
  paymentMode?: 'cod' | 'prepaid' | string;
  codAmount?: number | null;
}

export interface BulkStop extends BulkOrder {
  idx: number;
  status: BulkStopStatus;
}

export interface Hub {
  id: string;
  name: string;
  dist: string;
  addr: string;
  bays: string;
  latitude?: number;
  longitude?: number;
}

export interface DocDef {
  code: string;
  label: string;
  icon: string;
  sub: string;
}

export interface KitItem {
  id: string;
  label: string;
  icon: string;
}

export interface VehicleOption {
  id: string;
  label: string;
  icon: string;
}

export interface ShiftSlot {
  id: string;
  time: string;
  label: string;
  pay: string;
  booked: boolean;
}

export interface EarningsDay {
  day: string;
  date: string;
  orders: number;
  hours: string;
  amount: string;
}

export interface HistoryEntry {
  time: string;
  addr: string;
  num: string;
  items: number;
  dist: string;
  payout: number;
}

export interface FloatTxn {
  label: string;
  amt: string;
  pos: boolean;
  time: string;
}

export interface Faq {
  q: string;
  a: string;
}

export interface LegalSection {
  h: string;
  b: string;
}

export interface LanguageOption {
  id: string;
  native: string;
  en: string;
}

export interface ChatMessage {
  me: boolean;
  text: string;
}

export type PayMethod = 'upi' | 'bank' | 'card';
export type ContactVia = 'call' | 'email' | 'chat' | null;

export type CancelReasonId =
  | 'unreachable'
  | 'refused'
  | 'address'
  | 'asked'
  | 'vehicle'
  | 'other';

export type BulkExceptionReasonId =
  | 'unreachable'
  | 'refused'
  | 'address'
  | 'other';
