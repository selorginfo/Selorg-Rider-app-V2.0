import type {NavigatorScreenParams} from '@react-navigation/native';
import type {KycDocumentType} from '../services/api/profileApi';

export type MainTabParamList = {
  Home: undefined;
  Orders: undefined;
  Earnings: undefined;
  History: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  // auth
  AuthLanding: undefined;
  Login: undefined;
  Otp: undefined;

  // main tabs
  Main: NavigatorScreenParams<MainTabParamList> | undefined;

  // standard delivery flow
  Accept: undefined;
  Travel: undefined;
  Bag: undefined;
  Nav: undefined;
  Photo: undefined;
  Complete: undefined;
  OrderChat: {orderId: string; customerName?: string};

  // bulk delivery flow
  BulkOverview: undefined;
  BulkLoading: undefined;
  BulkActive: undefined;
  BulkAllStops: undefined;
  BulkStopDetail: undefined;
  BulkVerify: undefined;
  BulkComplete: undefined;
  BulkHistoryDetail: {batchId: string};

  // onboarding
  ObWelcome: undefined;
  ObPersonal: undefined;
  ObVehicle: undefined;
  ObHub: undefined;
  ObKyc: undefined;
  ObTraining: undefined;
  ObReview: undefined;
  ObDone: undefined;
  Pending: undefined;
  Rejected: undefined;

  // profile area
  Docs: undefined;
  UploadDocument: {type: KycDocumentType};
  Shifts: undefined;
  FloatCash: undefined;
  Wallet: undefined;
  Notifications: undefined;
  Support: undefined;
  Settings: undefined;
  Privacy: undefined;
  Terms: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
