import type {RiderState} from './state';
import {initialState} from './state';
import {OTP_LENGTH} from '../utils/validation';

export type Action =
  | {type: 'PATCH'; patch: Partial<RiderState>}
  | {type: 'SET_OTP_DIGIT'; index: number; digit: string}
  | {type: 'ACCEPT_ORDER'; orderId: string}
  | {type: 'TOGGLE_ITEM'; index: number}
  | {type: 'TOGGLE_BOOKED'; id: string}
  | {type: 'TOGGLE_SETTING'; id: 'push' | 'location' | 'sound'}
  | {type: 'TOGGLE_OB_DOC'; code: string}
  | {type: 'TOGGLE_OB_KIT'; id: string}
  | {type: 'CONFIRM_DEPOSIT'; ref: string; amount: number; methodName: string}
  | {type: 'SEND_CHAT'}
  | {type: 'RECEIVE_CHAT'; text: string}
  | {type: 'CONFIRM_CANCEL'}
  | {type: 'FINISH_CANCEL'}
  | {type: 'FINISH_FLOW'}
  | {type: 'LOGOUT'}
  | {type: 'ENTER_APP'}
  | {type: 'TOGGLE_ONLINE_OFF'}
  | {type: 'START_SHIFT'}
  | {type: 'TOGGLE_BULK_BAG'; bag: string}
  | {type: 'START_BULK_DELIVERY'}
  | {type: 'BULK_PHASE_ADVANCE'}
  | {type: 'CONFIRM_BULK_DELIVERY'}
  | {type: 'CONFIRM_BULK_EXCEPTION'}
  | {type: 'RESET_BULK_BATCH'}
  | {type: 'RESUBMIT_DOCS'};

const clearedFlow = {
  activeId: null,
  flowScreen: null,
  checked: {},
  photoTaken: false,
} as const;

export function reducer(state: RiderState, action: Action): RiderState {
  switch (action.type) {
    case 'PATCH':
      return {...state, ...action.patch};

    case 'SET_OTP_DIGIT': {
      const chars = state.otp.split('');
      chars[action.index] = action.digit;
      return {
        ...state,
        otp: chars.join('').slice(0, OTP_LENGTH),
        otpError: '',
      };
    }

    case 'ACCEPT_ORDER':
      return {
        ...state,
        activeId: action.orderId,
        flowScreen: 'accept',
        checked: {},
        photoTaken: false,
      };

    case 'TOGGLE_ITEM':
      return {
        ...state,
        checked: {
          ...state.checked,
          [action.index]: !state.checked[action.index],
        },
      };

    case 'TOGGLE_BOOKED': {
      const currently =
        state.booked[action.id] !== undefined
          ? state.booked[action.id]
          : (state.shifts.find(sl => sl.id === action.id)?.booked ?? false);
      return {
        ...state,
        booked: {...state.booked, [action.id]: !currently},
        shifts: state.shifts.map(sl =>
          sl.id === action.id ? {...sl, booked: !currently} : sl,
        ),
      };
    }

    case 'TOGGLE_SETTING':
      return {
        ...state,
        toggles: {...state.toggles, [action.id]: !state.toggles[action.id]},
      };

    case 'TOGGLE_OB_DOC':
      return {
        ...state,
        obDocs: {...state.obDocs, [action.code]: !state.obDocs[action.code]},
      };

    case 'TOGGLE_OB_KIT':
      return {
        ...state,
        obKit: {...state.obKit, [action.id]: !state.obKit[action.id]},
      };

    case 'CONFIRM_DEPOSIT': {
      const amt = action.amount;
      return {
        ...state,
        floatingCash: Math.max(0, state.floatingCash - amt),
        depositedAmt: amt,
        depositRef: action.ref,
        depositMethodName: action.methodName,
        depositStage: 'done',
        depositError: '',
        extraTxns: [
          {
            label: `Deposit via ${action.methodName} · ${action.ref}`,
            amt: `−₹${amt.toLocaleString('en-IN')}`,
            pos: false,
            time: 'Just now',
          },
          ...state.extraTxns,
        ],
      };
    }

    case 'SEND_CHAT': {
      const t = state.chatInput.trim();
      if (!t) {
        return state;
      }
      return {
        ...state,
        chat: [...state.chat, {me: true, text: t}],
        chatInput: '',
      };
    }

    case 'RECEIVE_CHAT':
      return {...state, chat: [...state.chat, {me: false, text: action.text}]};

    case 'CONFIRM_CANCEL': {
      const valid =
        !!state.cancelReason &&
        (state.cancelReason !== 'other' || state.cancelNote.trim().length > 0);
      return valid ? {...state, cancelStage: 'done'} : state;
    }

    case 'FINISH_CANCEL':
      return {...state, cancelStage: null, ...clearedFlow};

    case 'FINISH_FLOW':
      return {...state, ...clearedFlow};

    case 'LOGOUT':
      return {
        ...initialState,
        sessionReady: true,
        isAuthenticated: false,
        // Keep login form fields so AuthLanding/Login do not "reload" empty.
        phone: state.phone,
        email: state.email,
        loginMethod: state.loginMethod,
        authIntent: state.authIntent,
      };

    case 'ENTER_APP':
      return {
        ...state,
        onboarded: true,
        accountStatus: 'approved',
        epName: state.obName || state.epName,
        epEmail: state.obEmail || state.epEmail,
        epVehicle: state.obVehicleNo || state.epVehicle,
        vehicleType: (state.obVehicle as typeof state.vehicleType) || state.vehicleType,
      };

    case 'TOGGLE_ONLINE_OFF':
      return {...state, isOnline: false, activeShiftId: null};

    case 'START_SHIFT':
      return {
        ...state,
        isOnline: true,
        activeShiftId: state.pickedShiftId || state.activeShiftId || null,
        shiftSheetOpen: false,
      };

    case 'TOGGLE_BULK_BAG':
      return {
        ...state,
        bulkLoaded: {
          ...state.bulkLoaded,
          [action.bag]: !state.bulkLoaded[action.bag],
        },
      };

    case 'START_BULK_DELIVERY': {
      const orders = state.bulkOrders;
      const allLoaded =
        orders.length > 0 &&
        orders.filter(o => state.bulkLoaded[o.bag]).length === orders.length;
      return allLoaded
        ? {...state, bulkBatchStatus: 'dispatched', bulkStopPhase: 'toNav'}
        : state;
    }

    case 'BULK_PHASE_ADVANCE':
      if (state.bulkStopPhase === 'toNav') {
        return {...state, bulkStopPhase: 'navigating'};
      }
      if (state.bulkStopPhase === 'navigating') {
        return {...state, bulkStopPhase: 'arrived'};
      }
      return state;

    case 'CONFIRM_BULK_DELIVERY': {
      const total = state.bulkOrders.length;
      const currentIdx = state.bulkOrders.findIndex(
        (_, i) => !state.bulkStatuses[i],
      );
      if (!state.bulkPhotoTaken || currentIdx === -1) {
        return state;
      }
      const nextStatuses = {
        ...state.bulkStatuses,
        [currentIdx]: 'delivered' as const,
      };
      const nextDone = Object.keys(nextStatuses).length === total;
      return {
        ...state,
        bulkStatuses: nextStatuses,
        bulkStopPhase: 'toNav',
        bulkPhotoTaken: false,
        bulkBatchStatus: nextDone ? 'completed' : state.bulkBatchStatus,
      };
    }

    case 'CONFIRM_BULK_EXCEPTION': {
      const valid =
        !!state.bulkExceptionReason &&
        (state.bulkExceptionReason !== 'other' ||
          state.bulkExceptionNote.trim().length > 0);
      if (!valid || state.bulkExceptionTarget == null) {
        return state;
      }
      return {
        ...state,
        bulkStatuses: {
          ...state.bulkStatuses,
          [state.bulkExceptionTarget]: 'failed',
        },
        bulkExceptionOpen: false,
        bulkStopPhase: 'toNav',
      };
    }

    case 'RESET_BULK_BATCH':
      return {
        ...state,
        bulkBatchStatus: 'assigned',
        bulkStatuses: {},
        bulkLoaded: {},
        bulkStopPhase: 'toNav',
      };

    case 'RESUBMIT_DOCS':
      return {...state, accountStatus: 'none', obDocs: {}};

    default:
      return state;
  }
}
