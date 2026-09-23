import type {DeliveryMode} from '../types';

/** Mirrors backend `PICKER_VEHICLE_TYPES` (selorg-service picker.models). */
export const PICKER_VEHICLE_TYPES = [
  'bike',
  'scooter',
  'ev',
  'cycle',
  'auto',
  'van',
  'ev_auto',
] as const;

export type PickerVehicleType = (typeof PICKER_VEHICLE_TYPES)[number];

/**
 * Vehicles that only receive bulk (multi-drop) orders.
 * `van` remains for fleet assignment; onboarding offers Auto / EV Auto.
 */
export const BULK_VEHICLE_TYPES: readonly PickerVehicleType[] = [
  'auto',
  'ev_auto',
  'van',
];

export const VEHICLE_LABELS: Record<string, string> = {
  bike: 'Motorbike',
  scooter: 'Scooter',
  ev: 'EV Scooter',
  cycle: 'Bicycle',
  auto: 'Auto',
  van: 'Van',
  ev_auto: 'EV Auto',
  motorcycle: 'Motorbike',
};

/** Legacy runtime alias used by the old motorcycle ↔ auto toggle. */
const LEGACY_ALIASES: Record<string, PickerVehicleType> = {
  motorcycle: 'bike',
};

export function normalizeVehicleType(
  vehicleType?: string | null,
): PickerVehicleType | null {
  if (!vehicleType) {
    return null;
  }
  const key = vehicleType.trim().toLowerCase();
  const aliased = LEGACY_ALIASES[key] ?? key;
  return (PICKER_VEHICLE_TYPES as readonly string[]).includes(aliased)
    ? (aliased as PickerVehicleType)
    : null;
}

export function isBulkVehicle(vehicleType?: string | null): boolean {
  const normalized = normalizeVehicleType(vehicleType);
  if (!normalized) {
    return false;
  }
  return (BULK_VEHICLE_TYPES as readonly string[]).includes(normalized);
}

export function deriveDeliveryMode(
  vehicleType?: string | null,
): DeliveryMode {
  return isBulkVehicle(vehicleType) ? 'bulk' : 'standard';
}

export function vehicleLabel(vehicleType?: string | null): string {
  const normalized = normalizeVehicleType(vehicleType);
  if (!normalized) {
    return '—';
  }
  return VEHICLE_LABELS[normalized] || normalized.toUpperCase();
}

/** Flip bulk ↔ standard vehicle pairing (Auto ↔ Motorbike). Kept for helpers. */
export function toggleVehicleType(
  vehicleType?: string | null,
): PickerVehicleType {
  return isBulkVehicle(vehicleType) ? 'bike' : 'auto';
}

/** Empty list + loading flags used when vehicle/order mode changes. */
export function clearedOrderPatch() {
  return {
    orders: [],
    ordersLoading: true,
    ordersError: '',
    bulkBatchId: '',
    bulkOrders: [],
    bulkBatchStatus: 'assigned' as const,
    bulkLoaded: {} as Record<string, boolean>,
    bulkStatuses: {} as Record<number, 'pending' | 'delivered' | 'failed'>,
    bulkStopPhase: 'toNav' as const,
    bulkSearch: '',
    bulkFilter: 'all' as const,
    bulkExceptionOpen: false,
    bulkExceptionTarget: null as number | null,
    bulkExceptionReason: null,
    bulkExceptionNote: '',
    bulkDetailIdx: null as number | null,
    bulkPhotoTaken: false,
  };
}
