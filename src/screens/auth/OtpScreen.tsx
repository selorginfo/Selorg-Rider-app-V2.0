import React, {useEffect, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {Screen} from '../../components/common/Screen';
import {AppText} from '../../components/common/AppText';
import {ContentColumn} from '../../components/common/ContentColumn';
import {OtpInput} from '../../components/inputs/OtpInput';
import {PrimaryButton} from '../../components/buttons/PrimaryButton';
import {TextButton} from '../../components/buttons/TextButton';
import {Banner} from '../../components/feedback/Banner';
import {useAppNavigation} from '../../hooks/useAppNavigation';
import {resetTo} from '../../navigation/navigationRef';
import {useRider} from '../../store/RiderContext';
import {otpTarget} from '../../store/selectors';
import {useAppConfig} from '../../hooks/useAppConfig';
import {colors} from '../../theme';
import {isValidOtp, OTP_LENGTH} from '../../utils/validation';
import type {RootStackParamList} from '../../types/navigation';

export function OtpScreen() {
  const nav = useAppNavigation();
  const {state, actions} = useRider();
  const cfg = useAppConfig();
  const otpLength = OTP_LENGTH;
  const [seconds, setSeconds] = useState(cfg.otpResendSeconds);
  const [resendMsg, setResendMsg] = useState('');
  const [resendFailed, setResendFailed] = useState(false);

  useEffect(() => {
    if (seconds <= 0) {
      return;
    }
    const t = setTimeout(() => setSeconds(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  const onVerify = async () => {
    if (state.authBusy) {
      return;
    }
    if (!isValidOtp(state.otp, otpLength)) {
      actions.patch({
        otpError: `Enter the ${otpLength}-digit numeric code`,
        suggestEmailLogin:
          state.authIntent !== 'signup' && state.loginMethod !== 'email',
      });
      return;
    }
    const result = await actions.verifyOtp();
    if (!result.ok) {
      return;
    }
    const route = (result.route || 'Main') as keyof RootStackParamList;
    resetTo(route);
  };

  const onResend = async () => {
    if (seconds > 0) {
      return;
    }
    setResendMsg('');
    setResendFailed(false);
    actions.patch({otp: '', otpError: ''});
    const result = await actions.resendOtp();
    if (!result.ok) {
      setResendFailed(true);
      setResendMsg(result.error || 'Unable to send OTP. Please try again.');
      return;
    }
    setSeconds(cfg.otpResendSeconds);
    setResendMsg('Code resent. Enter the new code sent to you.');
  };

  const targetLabel =
    state.authIntent === 'signup'
      ? state.email.trim().toLowerCase()
      : otpTarget(state);

  const showEmailLoginCta =
    state.authIntent !== 'signup' &&
    state.suggestEmailLogin &&
    cfg.emailLoginEnabled &&
    state.loginMethod !== 'email';

  return (
    <Screen
      background={colors.white}
      edges={['top', 'bottom']}
      contentContainerStyle={styles.body}>
      <ContentColumn>
        <TextButton
          label="‹ Back"
          onPress={() => {
            actions.resetOtp();
            nav.goBack();
          }}
          color={colors.textSecondary}
          weight="600"
          size={14}
        />
        <AppText style={styles.title}>Verify OTP</AppText>
        <AppText style={styles.sub}>
          {state.authIntent === 'signup'
            ? `Enter the ${otpLength}-digit code sent to your email\n`
            : `Enter the ${otpLength}-digit code sent to\n`}
          <AppText style={styles.target}>{targetLabel}</AppText>
        </AppText>

        <View style={styles.otpWrap}>
          <OtpInput
            value={state.otp}
            onChange={v => {
              actions.setOtp(v);
            }}
            length={otpLength}
          />
        </View>

        {!!state.otpError && (
          <Banner
            tone="danger"
            icon="⚠"
            text={state.otpError}
            style={styles.err}
          />
        )}
        {state.loginNotFound && (
          <TextButton
            label="Create an account"
            onPress={() => {
              actions.setAuthIntent('signup');
              actions.resetOtp();
              nav.navigate('Login');
            }}
            color={colors.primary}
            weight="700"
            size={13}
            style={styles.switchSignup}
          />
        )}
        {showEmailLoginCta && (
          <TextButton
            label="Log in with email instead"
            onPress={() => {
              actions.setLoginMethod('email');
              actions.setAuthIntent('login');
              actions.resetOtp();
              nav.navigate('Login');
            }}
            color={colors.primary}
            weight="700"
            size={13}
            style={styles.switchSignup}
          />
        )}
        {!!resendMsg && (
          <Banner
            tone={resendFailed ? 'danger' : 'info'}
            icon={resendFailed ? '⚠' : 'ⓘ'}
            text={resendMsg}
            style={styles.err}
          />
        )}

        <View style={styles.row}>
          <TextButton
            label={
              seconds > 0
                ? `Resend in 0:${String(seconds).padStart(2, '0')}`
                : 'Resend code'
            }
            onPress={onResend}
            color={seconds > 0 ? colors.textFaint : colors.primary}
          />
        </View>

        <PrimaryButton
          label={state.authBusy ? 'Verifying…' : 'Verify & Continue'}
          onPress={onVerify}
          disabled={!isValidOtp(state.otp, otpLength)}
          loading={state.authBusy}
          style={styles.cta}
        />
      </ContentColumn>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {paddingHorizontal: 28, paddingTop: 8, paddingBottom: 32},
  title: {
    marginTop: 26,
    fontWeight: '800',
    fontSize: 22,
    color: colors.inkStrong,
    letterSpacing: -0.4,
  },
  sub: {
    fontWeight: '400',
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 6,
    lineHeight: 21,
  },
  target: {color: colors.inkStrong, fontWeight: '600'},
  otpWrap: {marginTop: 24},
  err: {marginTop: 12},
  switchSignup: {marginTop: 10},
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  cta: {marginTop: 30},
});
