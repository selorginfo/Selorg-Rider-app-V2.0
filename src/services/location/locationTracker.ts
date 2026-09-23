import {Alert, Linking, PermissionsAndroid, Platform} from 'react-native';
import Geolocation, {
  type GeolocationResponse,
  type GeolocationError,
} from '@react-native-community/geolocation';
import {locationApi, type LocationPing} from '../api/locationApi';
import {getAppConfig} from '../../config/appConfig';

export type GpsPoint = {
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
};

export type LocationPermissionResult =
  | 'granted'
  | 'denied'
  | 'blocked'
  | 'unavailable';

let watchId: number | null = null;
let pingTimer: ReturnType<typeof setInterval> | null = null;
let lastPoint: GpsPoint | null = null;
let nextPingMs = getAppConfig().locationPingSeconds * 1000;
let context: {orderId?: string; batchId?: string} = {};
let sharingEnabled = true;

try {
  Geolocation.setRNConfiguration({
    skipPermissionRequests: false,
    authorizationLevel: 'whenInUse',
    enableBackgroundLocationUpdates: false,
    locationProvider: 'auto',
  });
} catch {
  // Native module may be unavailable until a rebuild; never crash app startup.
}

export function setLocationContext(next: {orderId?: string; batchId?: string}): void {
  context = next;
}

export function setLocationSharingEnabled(enabled: boolean): void {
  sharingEnabled = enabled;
  if (!enabled) {
    stopLocationTracking();
  }
}

export async function openDeviceLocationSettings(): Promise<void> {
  try {
    await Linking.openSettings();
  } catch {
    Alert.alert(
      'Open Settings',
      'Enable Location for Selorg Rider in your device Settings.',
    );
  }
}

/**
 * Request location permission once. Does not loop.
 * Returns `blocked` when Android NEVER_ASK_AGAIN / iOS restricted.
 */
export async function requestLocationPermission(): Promise<LocationPermissionResult> {
  if (Platform.OS !== 'android') {
    return new Promise(resolve => {
      Geolocation.requestAuthorization(
        () => resolve('granted'),
        () => resolve('denied'),
      );
    });
  }
  try {
    const fine = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Location permission',
        message:
          'Selorg uses your location to assign nearby hubs and track active deliveries.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      },
    );
    if (fine === PermissionsAndroid.RESULTS.GRANTED) {
      return 'granted';
    }
    if (fine === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
      return 'blocked';
    }
    return 'denied';
  } catch {
    return 'unavailable';
  }
}

function toPoint(pos: GeolocationResponse): GpsPoint {
  return {
    latitude: pos.coords.latitude,
    longitude: pos.coords.longitude,
    accuracy: pos.coords.accuracy ?? undefined,
    speed:
      pos.coords.speed != null && pos.coords.speed >= 0
        ? pos.coords.speed
        : undefined,
    heading:
      pos.coords.heading != null && pos.coords.heading >= 0
        ? pos.coords.heading
        : undefined,
  };
}

export function getLastGpsPoint(): GpsPoint | null {
  return lastPoint;
}

/** High-frequency GPS watch for live maps. Independent of ping tracking. */
export function watchGps(onPoint: (point: GpsPoint) => void): () => void {
  const id = Geolocation.watchPosition(
    pos => {
      const point = toPoint(pos);
      lastPoint = point;
      onPoint(point);
    },
    () => {
      // Keep last known point; LiveMap still renders destination.
    },
    {
      enableHighAccuracy: true,
      distanceFilter: 5,
      interval: 2000,
      fastestInterval: 1000,
    },
  );
  return () => {
    Geolocation.clearWatch(id);
  };
}

export function getCurrentPosition(): Promise<GpsPoint> {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      pos => {
        const point = toPoint(pos);
        lastPoint = point;
        resolve(point);
      },
      (err: GeolocationError) => {
        reject(new Error(err.message || 'Could not read GPS'));
      },
      {enableHighAccuracy: true, timeout: 15000, maximumAge: 10000},
    );
  });
}

function schedulePings(): void {
  if (pingTimer) {
    clearInterval(pingTimer);
  }
  const tick = () => {
    if (lastPoint) {
      void sendPing(lastPoint);
    }
  };
  pingTimer = setInterval(tick, nextPingMs);
}

async function sendPing(point: GpsPoint): Promise<void> {
  if (!sharingEnabled) {
    return;
  }
  const body: LocationPing = {
    latitude: point.latitude,
    longitude: point.longitude,
    accuracy: point.accuracy,
    speed: point.speed,
    heading: point.heading,
    recordedAt: new Date().toISOString(),
    orderId: context.orderId,
    batchId: context.batchId,
  };
  const result = await locationApi.track(body);
  if (!result.ok) {
    if (result.appCode === 'LOCATION_SHARING_DISABLED') {
      sharingEnabled = false;
      stopLocationTracking();
    }
    return;
  }
  if (result.data?.nextPingSeconds && result.data.nextPingSeconds > 0) {
    const ms = result.data.nextPingSeconds * 1000;
    if (ms !== nextPingMs) {
      nextPingMs = ms;
      if (watchId != null) {
        schedulePings();
      }
    }
  }
}

export async function startLocationTracking(): Promise<void> {
  if (!sharingEnabled || watchId != null) {
    return;
  }
  const allowed = await requestLocationPermission();
  if (allowed !== 'granted') {
    return;
  }
  watchId = Geolocation.watchPosition(
    pos => {
      lastPoint = toPoint(pos);
    },
    () => {
      // Keep last known point; next ping uses it if available.
    },
    {enableHighAccuracy: true, distanceFilter: 25, interval: 10000},
  );
  schedulePings();
  void getCurrentPosition()
    .then(point => {
      lastPoint = point;
      return sendPing(point);
    })
    .catch(() => {
      // Permission/GPS failure is reported by enableAndReadGps; pings wait for a fix.
    });
}

export function stopLocationTracking(): void {
  if (watchId != null) {
    Geolocation.clearWatch(watchId);
    watchId = null;
  }
  if (pingTimer) {
    clearInterval(pingTimer);
    pingTimer = null;
  }
}

function showBlockedAlert(): void {
  Alert.alert(
    'Location required',
    'Location access is turned off for Selorg Rider. Open Settings to enable it. GPS is not simulated.',
    [
      {text: 'Not now', style: 'cancel'},
      {
        text: 'Open Settings',
        onPress: () => {
          void openDeviceLocationSettings();
        },
      },
    ],
  );
}

export async function enableAndReadGps(): Promise<GpsPoint> {
  const status = await requestLocationPermission();
  if (status === 'blocked') {
    showBlockedAlert();
    throw new Error('Location permission permanently denied');
  }
  if (status !== 'granted') {
    Alert.alert(
      'Location required',
      'Allow location access to continue. GPS is not simulated.',
    );
    throw new Error('Location permission denied');
  }
  return getCurrentPosition();
}
