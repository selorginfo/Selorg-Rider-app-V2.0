export * from './onboarding';
export {PAY_METHODS, depositBtnLabel, payMethodName} from './finance';
export {LANGUAGES} from './support';
export {SLOTS} from './shifts';
export {
  DUMMY_ORDER_ID,
  ORDERS,
  ORDER_ITEMS,
  isDummyOrderId,
  dummyOrdersForHub,
  dummyOrderById,
  dummyBagItems,
} from './orders';

export const CANCEL_REASONS = [
  {
    id: 'unreachable' as const,
    label: 'Customer not reachable',
    sub: 'No answer after multiple calls',
  },
  {
    id: 'refused' as const,
    label: 'Customer refused delivery',
    sub: 'Order declined at the door',
  },
  {
    id: 'address' as const,
    label: 'Wrong or incomplete address',
    sub: 'Location could not be found',
  },
  {
    id: 'asked' as const,
    label: 'Customer asked to cancel',
    sub: 'Requested cancellation directly',
  },
  {
    id: 'vehicle' as const,
    label: 'Vehicle breakdown / safety issue',
    sub: 'Unable to continue the trip',
  },
  {id: 'other' as const, label: 'Other reason', sub: 'Add a note for support'},
];

export const BULK_EXCEPTION_REASONS = [
  {id: 'unreachable' as const, label: 'Customer not reachable'},
  {id: 'refused' as const, label: 'Customer refused delivery'},
  {id: 'address' as const, label: 'Wrong or incomplete address'},
  {id: 'other' as const, label: 'Other reason'},
];

export const SETTINGS_ROWS = [
  {
    id: 'push',
    icon: 'bell' as const,
    label: 'Push notifications',
    kind: 'toggle' as const,
  },
  {
    id: 'location',
    icon: 'location' as const,
    label: 'Location sharing',
    kind: 'toggle' as const,
  },
  {
    id: 'sound',
    icon: 'sound' as const,
    label: 'Order sound alerts',
    kind: 'toggle' as const,
  },
  {
    id: 'version',
    icon: 'info' as const,
    label: 'App version',
    kind: 'value' as const,
  },
];
