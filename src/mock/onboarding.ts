import type {DocDef, Hub, KitItem, VehicleOption} from '../types';

/** Dummy darkstores — IDs/coords match backend hubs (Adyar is the live order spine). */
export const HUBS: Hub[] = [
  {
    id: 'DS-Adyar-01',
    name: 'Adyar Darkstore',
    dist: '0.8 km',
    addr: 'Lattice Bridge Road, Adyar, Chennai',
    bays: '8 dispatch bays',
    latitude: 13.0067,
    longitude: 80.2206,
  },
  {
    id: 'kor',
    name: 'Koramangala Darkstore',
    dist: '1.2 km',
    addr: '80 Feet Rd, 4th Block, Koramangala',
    bays: '6 dispatch bays',
    latitude: 12.9352,
    longitude: 77.6245,
  },
  {
    id: 'hsr',
    name: 'HSR Layout Darkstore',
    dist: '3.4 km',
    addr: '27th Main, Sector 2, HSR Layout',
    bays: '4 dispatch bays',
    latitude: 12.9116,
    longitude: 77.6473,
  },
  {
    id: 'ind',
    name: 'Indiranagar Darkstore',
    dist: '4.1 km',
    addr: '100 Feet Rd, Indiranagar',
    bays: '5 dispatch bays',
    latitude: 12.9784,
    longitude: 77.6408,
  },
];

/** Document types that require a front and a back photo. */
export const TWO_SIDED_DOC_CODES = ['aadhar', 'pan'] as const;

/** `DOC_LIST` — Aadhaar / PAN need front+back; others are front only. */
export const DOC_LIST: DocDef[] = [
  {code: 'aadhar', label: 'Aadhaar Card', icon: '🪪', sub: 'Front & back photo'},
  {code: 'pan', label: 'PAN Card', icon: '💳', sub: 'Front & back photo'},
  {
    code: 'dl',
    label: 'Driving License',
    icon: '🚗',
    sub: 'Front photo only',
  },
  {
    code: 'rc',
    label: 'Vehicle RC',
    icon: '📃',
    sub: 'Front photo only',
  },
  {
    code: 'ins',
    label: 'Vehicle Insurance',
    icon: '🛡',
    sub: 'Front photo only',
  },
];

/** Local training video on Training & kit (onboarding step 5). */
export const TRAINING_VIDEO_TITLE = 'Rider onboarding · 30 sec';
/** Seconds of watch time required before Review & Submit can unlock. */
export const TRAINING_REQUIRED_SECONDS = 30;

/** `KIT_LIST` */
export const KIT_LIST: KitItem[] = [
  {id: 'bag', label: 'Insulated delivery bag', icon: '🛍'},
  {id: 'tshirt', label: 'Selorg uniform t-shirt', icon: '👕'},
  {id: 'id', label: 'Rider ID card', icon: '🪪'},
  {id: 'helmet', label: 'Safety helmet', icon: '⛑'},
];

/** `VEHICLES` — Auto / EV Auto are bulk-only; others are normal one-by-one. */
export const VEHICLES: VehicleOption[] = [
  {id: 'bike', label: 'Motorbike', icon: '🏍'},
  {id: 'scooter', label: 'Scooter', icon: '🛵'},
  {id: 'auto', label: 'Auto', icon: '🛺'},
  {id: 'ev_auto', label: 'EV Auto', icon: '⚡'},
  {id: 'cycle', label: 'Bicycle', icon: '🚲'},
];

/** onboarding welcome step list */
export const OB_STEPS = [
  {icon: '👤', label: 'Personal details', n: '1'},
  {icon: '🛵', label: 'Vehicle information', n: '2'},
  {icon: '🏬', label: 'Choose your hub', n: '3'},
  {icon: '📄', label: 'Upload documents', n: '4'},
  {icon: '🎓', label: 'Training & kit', n: '5'},
];
