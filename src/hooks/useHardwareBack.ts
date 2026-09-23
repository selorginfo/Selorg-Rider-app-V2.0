import {useCallback, useEffect} from 'react';
import {BackHandler} from 'react-native';

/** Android hardware back. Return true to consume the event. */
export function useHardwareBack(onBack: () => boolean, enabled = true) {
  const handler = useCallback(() => {
    if (!enabled) {
      return false;
    }
    return onBack();
  }, [enabled, onBack]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', handler);
    return () => sub.remove();
  }, [handler]);
}
