import {PermissionsAndroid, Platform} from 'react-native';
import {configApi} from '../api/configApi';
import {environment} from '../../config/environment';
import {storageService, STORAGE_KEYS} from '../storage/storageService';

type PushResult =
  | {ok: true; registered: boolean; tokenId?: string}
  | {ok: false; error: string; skipped?: boolean};

function randomId(): string {
  return `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

async function deviceId(): Promise<string> {
  const existing = await storageService.get(STORAGE_KEYS.deviceId);
  if (existing) {
    return existing;
  }
  const id = randomId();
  await storageService.set(STORAGE_KEYS.deviceId, id);
  return id;
}

type MessagingModule = {
  default: () => {
    requestPermission(): Promise<number>;
    getToken(): Promise<string>;
    onTokenRefresh(cb: (token: string) => void): () => void;
  };
  AuthorizationStatus?: {AUTHORIZED: number; PROVISIONAL: number};
};

function loadMessaging(): MessagingModule | null {
  try {
    return require('@react-native-firebase/messaging') as MessagingModule;
  } catch {
    return null;
  }
}

export async function registerPushTokenIfAvailable(): Promise<PushResult> {
  const messagingMod = loadMessaging();
  if (!messagingMod?.default) {
    return {
      ok: false,
      skipped: true,
      error:
        'FCM/APNs native module is not linked. Add google-services.json / GoogleService-Info.plist and rebuild the app.',
    };
  }

  try {
    if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
      const notif = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );
      if (notif !== PermissionsAndroid.RESULTS.GRANTED) {
        return {ok: false, error: 'Notification permission was not granted.'};
      }
    }
    const messaging = messagingMod.default();
    const authStatus = await messaging.requestPermission();
    const authorized =
      authStatus === 1 ||
      authStatus === 2 ||
      authStatus === messagingMod.AuthorizationStatus?.AUTHORIZED ||
      authStatus === messagingMod.AuthorizationStatus?.PROVISIONAL;
    if (!authorized) {
      return {ok: false, error: 'Notification permission was not granted.'};
    }
    const token = await messaging.getToken();
    if (!token) {
      return {ok: false, error: 'Push token was empty. Check FCM/APNs credentials.'};
    }
    const result = await configApi.registerPushToken(
      token,
      Platform.OS === 'ios' ? 'ios' : 'android',
      await deviceId(),
      environment.appVersion,
    );
    if (!result.ok) {
      return {ok: false, error: result.error || 'Could not register push token'};
    }
    return {
      ok: true,
      registered: result.data?.registered !== false,
      tokenId: result.data?.tokenId,
    };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : 'Push registration failed. Rebuild with Firebase credentials.',
    };
  }
}
