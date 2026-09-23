import type {
  AccountStatus,
  AuthIntent,
  BulkBatchStatus,
  BulkExceptionReasonId,
  BulkStopPhase,
  BulkStopStatus,
  CancelReasonId,
  ChatMessage,
  ContactVia,
  FloatTxn,
  FlowScreen,
  LoginMethod,
  Order,
  OrderItem,
  PayMethod,
  ShiftSlot,
  VehicleType,
} from '../types';

export interface RiderState {
  sessionReady: boolean;
  isAuthenticated: boolean;

  authIntent: AuthIntent;
  accountStatus: AccountStatus;
  loginMethod: LoginMethod;
  loginNotFound: boolean;
  phone: string;
  email: string;
  otp: string;
  otpError: string;
  authBusy: boolean;

  isOnline: boolean;
  shiftSheetOpen: boolean;
  activeShiftId: string | null;
  pickedShiftId: string | null;
  booked: Record<string, boolean>;
  shifts: ShiftSlot[];

  activeId: string | null;
  flowScreen: FlowScreen;
  checked: Record<number, boolean>;
  photoTaken: boolean;
  orders: Order[];
  bagItems: OrderItem[];
  ordersLoading: boolean;
  ordersError: string;

  obName: string;
  obEmail: string;
  obHub: string | null;
  obVehicle: string | null;
  obVehicleNo: string;
  obDocs: Record<string, boolean>;
  obKit: Record<string, boolean>;
  obVideo: boolean;
  onboarded: boolean;
  locStage: 'idle' | 'locating' | 'ready';

  epName: string;
  epEmail: string;
  epVehicle: string;
  epHubId: string | null;
  epHubName: string | null;
  onlineSince: string | null;

  prev: 'home' | 'profile';

  floatingCash: number;
  extraTxns: FloatTxn[];
  depositStage: null | 'form' | 'done';
  depositAmt: string;
  depositError: string;
  depositedAmt: number | '';
  depositRef: string;
  depositMethodName: string;
  payMethod: PayMethod;

  contactVia: ContactVia;
  chat: ChatMessage[];
  chatInput: string;

  cancelStage: null | 'form' | 'done';
  cancelReason: CancelReasonId | null;
  cancelNote: string;

  toggles: {push: boolean; location: boolean; sound: boolean};
  language: string;
  langOpen: boolean;

  vehicleType: VehicleType;
  bulkBatchId: string;
  bulkOrders: Array<{
    id: string;
    customer: string;
    num: string;
    addr: string;
    bag: string;
    dist: string;
    eta: string;
    items: number;
    phone?: string;
  }>;
  bulkBatchStatus: BulkBatchStatus;
  bulkLoaded: Record<string, boolean>;
  bulkStatuses: Record<number, BulkStopStatus>;
  bulkStopPhase: BulkStopPhase;
  bulkSearch: string;
  bulkFilter: 'all' | 'current' | 'pending' | 'delivered' | 'failed';
  bulkExceptionOpen: boolean;
  bulkExceptionTarget: number | null;
  bulkExceptionReason: BulkExceptionReasonId | null;
  bulkExceptionNote: string;
  bulkDetailIdx: number | null;
  bulkPhotoTaken: boolean;
  bulkReturnTo: 'BulkActive' | 'BulkOverview' | 'BulkAllStops';

  historyFilter: 'all' | 'standard' | 'bulk';
}

export const initialState: RiderState = {
  sessionReady: false,
  isAuthenticated: false,

  authIntent: null,
  accountStatus: 'none',
  loginMethod: 'mobile',
  loginNotFound: false,
  phone: '',
  email: '',
  otp: '',
  otpError: '',
  authBusy: false,

  isOnline: false,
  shiftSheetOpen: false,
  activeShiftId: null,
  pickedShiftId: null,
  booked: {},
  shifts: [],

  activeId: null,
  flowScreen: null,
  checked: {},
  photoTaken: false,
  orders: [],
  bagItems: [],
  ordersLoading: false,
  ordersError: '',

  obName: '',
  obEmail: '',
  obHub: null,
  obVehicle: null,
  obVehicleNo: '',
  obDocs: {},
  obKit: {},
  obVideo: false,
  onboarded: false,
  locStage: 'idle',

  epName: '',
  epEmail: '',
  epVehicle: '',
  epHubId: null,
  epHubName: null,
  onlineSince: null,

  prev: 'profile',

  floatingCash: 0,
  extraTxns: [],
  depositStage: null,
  depositAmt: '',
  depositError: '',
  depositedAmt: '',
  depositRef: '',
  depositMethodName: 'UPI',
  payMethod: 'upi',

  contactVia: null,
  chat: [],
  chatInput: '',

  cancelStage: null,
  cancelReason: null,
  cancelNote: '',

  toggles: {push: true, location: true, sound: true},
  language: 'en',
  langOpen: false,

  vehicleType: 'bike',
  bulkBatchId: '',
  bulkOrders: [],
  bulkBatchStatus: 'assigned',
  bulkLoaded: {},
  bulkStatuses: {},
  bulkStopPhase: 'toNav',
  bulkSearch: '',
  bulkFilter: 'all',
  bulkExceptionOpen: false,
  bulkExceptionTarget: null,
  bulkExceptionReason: null,
  bulkExceptionNote: '',
  bulkDetailIdx: null,
  bulkPhotoTaken: false,
  bulkReturnTo: 'BulkActive',

  historyFilter: 'all',
};
