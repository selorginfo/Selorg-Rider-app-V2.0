import {useEffect} from 'react';
import {useRider} from '../../store/RiderContext';
import {
  setLocationContext,
  setLocationSharingEnabled,
  startLocationTracking,
  stopLocationTracking,
} from '../../services/location/locationTracker';
import {registerPushTokenIfAvailable} from '../../services/push/pushService';
import {riderSocketService} from '../../services/realtime/riderSocketService';
import {getToken} from '../../services/api/client';

/** Starts real GPS pings, heartbeat, push registration, and order socket after login. */
export function RiderRealtimeServices() {
  const {state} = useRider();

  useEffect(() => {
    setLocationSharingEnabled(state.toggles.location);
    setLocationContext({
      orderId: state.activeId || undefined,
      batchId: state.bulkBatchId || undefined,
    });
    const shouldTrack =
      state.isAuthenticated &&
      state.accountStatus === 'approved' &&
      state.isOnline &&
      state.toggles.location;
    if (shouldTrack) {
      void startLocationTracking();
    } else {
      stopLocationTracking();
    }
    return () => stopLocationTracking();
  }, [
    state.isAuthenticated,
    state.accountStatus,
    state.isOnline,
    state.toggles.location,
    state.activeId,
    state.bulkBatchId,
  ]);

  useEffect(() => {
    if (
      !state.isAuthenticated ||
      state.accountStatus !== 'approved' ||
      !state.isOnline
    ) {
      return;
    }
    let cancelled = false;
    const tick = async () => {
      try {
        const {request} = await import('../../services/api/client');
        if (!cancelled) {
          await request('/picker/heartbeat', {method: 'POST', body: '{}'});
        }
      } catch {
        // Best-effort presence; next tick retries.
      }
    };
    void tick();
    const id = setInterval(() => {
      void tick();
    }, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [state.isAuthenticated, state.accountStatus, state.isOnline]);

  useEffect(() => {
    if (
      !state.isAuthenticated ||
      state.accountStatus !== 'approved' ||
      !state.toggles.push
    ) {
      return;
    }
    void registerPushTokenIfAvailable();
  }, [state.isAuthenticated, state.accountStatus, state.toggles.push]);

  useEffect(() => {
    if (!state.isAuthenticated || state.accountStatus !== 'approved') {
      riderSocketService.disconnect();
      return;
    }
    const hubKey = state.epHubId || state.obHub || undefined;
    riderSocketService.connect(getToken(), hubKey);
    return () => {
      // Keep socket across screen changes; disconnect only on logout.
    };
  }, [
    state.isAuthenticated,
    state.accountStatus,
    state.epHubId,
    state.obHub,
  ]);

  useEffect(() => {
    if (!state.isAuthenticated) {
      riderSocketService.disconnect();
    }
  }, [state.isAuthenticated]);

  return null;
}
