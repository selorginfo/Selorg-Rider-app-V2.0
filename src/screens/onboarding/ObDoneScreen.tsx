import React, {useCallback} from 'react';
import {SuccessScreen} from '../../components/feedback/SuccessScreen';
import {PrimaryButton} from '../../components/buttons/PrimaryButton';
import {useHardwareBack} from '../../hooks/useHardwareBack';
import {resetTo} from '../../navigation/navigationRef';
import {useRider} from '../../store/RiderContext';
import {colors} from '../../theme';

export function ObDoneScreen() {
  const {actions} = useRider();

  const enter = useCallback(() => {
    actions.enterApp();
    resetTo('Main', {screen: 'Home'});
  }, [actions]);

  useHardwareBack(
    useCallback(() => {
      enter();
      return true;
    }, [enter]),
  );

  return (
    <SuccessScreen
      gradient={[colors.primary, colors.primaryDark]}
      title="You're all set! 🎉"
      subtitle="Your application is verified and approved. Welcome to the Selorg rider fleet — time to start earning."
      footer={
        <PrimaryButton
          label="Go to Dashboard"
          variant="white"
          onPress={enter}
        />
      }
    />
  );
}
