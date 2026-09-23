import React, {useEffect, useState} from 'react';
import {
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {GradientView} from '../../components/common/GradientView';
import {AppText} from '../../components/common/AppText';
import {ContentColumn} from '../../components/common/ContentColumn';
import {SegmentedControl} from '../../components/buttons/SegmentedControl';
import {PhoneInput} from '../../components/inputs/PhoneInput';
import {PrimaryButton} from '../../components/buttons/PrimaryButton';
import {TextButton} from '../../components/buttons/TextButton';
import {Banner} from '../../components/feedback/Banner';
import {useAppNavigation} from '../../hooks/useAppNavigation';
import {useRider} from '../../store/RiderContext';
import {useScreenEnter} from '../../hooks/useScreenEnter';
import {useAppConfig} from '../../hooks/useAppConfig';
import {authTargetError, emailError, phoneError} from '../../utils/validation';
import {colors, radius, shadow, FONT_FAMILY} from '../../theme';
import {useLayout} from '../../theme/layout';

const logo = require('../../assets/images/selorg-logo.png');

const METHODS = [
  {id: 'mobile', label: 'Mobile'},
  {id: 'whatsapp', label: 'WhatsApp'},
  {id: 'email', label: 'Email'},
];

export function LoginScreen() {
  const nav = useAppNavigation();
  const {state, actions} = useRider();
  const enter = useScreenEnter();
  const cfg = useAppConfig();
  const layout = useLayout();
  const [sendError, setSendError] = useState('');
  const [fieldTouched, setFieldTouched] = useState(false);
  const logoSize = Math.round(
    Math.min(100, Math.max(72, layout.shortest * 0.22)),
  );

  const methods = cfg.emailLoginEnabled
    ? METHODS
    : METHODS.filter(m => m.id !== 'email');
  const isEmail = state.loginMethod === 'email' && cfg.emailLoginEnabled;
  const fieldError = isEmail
    ? emailError(state.email)
    : phoneError(state.phone);
  const showFieldError = fieldTouched && !!fieldError;

  const isSignup = state.authIntent === 'signup';
  const title = isSignup ? 'Create your rider account' : 'Sign in to ride';
  const subtitle = isSignup
    ? "We'll verify your email with a one-time code, then start onboarding"
    : isEmail
      ? "We'll email you a one-time code"
      : state.loginMethod === 'whatsapp'
        ? "We'll send a one-time code on WhatsApp"
        : "We'll send a one-time code by SMS";
  const fieldLabel = isEmail
    ? 'Email Address'
    : state.loginMethod === 'whatsapp'
      ? 'WhatsApp Number'
      : 'Mobile Number';
  const hint = state.loginNotFound
    ? isEmail
      ? 'No rider account found with this email address. Please create an account first.'
      : 'No rider account found with this phone number. Please create an account first.'
    : isSignup
      ? 'Enter both phone and email. We will send the OTP to your email.'
      : isEmail
        ? 'Enter the email linked to your rider account.'
        : "We'll send a one-time code to this number.";
  const sendLabel = isSignup
    ? 'Send email OTP'
    : state.loginMethod === 'whatsapp'
      ? 'Send code on WhatsApp'
      : 'Send OTP';

  const phoneFieldError = phoneError(state.phone);
  const emailFieldError = emailError(state.email);
  const signupInvalid = isSignup && (!!phoneFieldError || !!emailFieldError);
  const loginInvalid = !isSignup && !!fieldError;
  const canSubmit = isSignup ? !signupInvalid : !loginInvalid;

  useEffect(() => {
    if (!cfg.emailLoginEnabled && state.loginMethod === 'email') {
      actions.setLoginMethod('mobile');
    }
  }, [actions, cfg.emailLoginEnabled, state.loginMethod]);

  useEffect(() => {
    setFieldTouched(false);
    setSendError('');
  }, [state.loginMethod, state.authIntent]);

  const onSend = async () => {
    if (state.authBusy) {
      return;
    }
    setFieldTouched(true);
    if (isSignup) {
      if (phoneFieldError || emailFieldError) {
        setSendError('');
        return;
      }
    } else {
      const err = authTargetError(state.loginMethod, state.email, state.phone);
      if (err) {
        setSendError('');
        return;
      }
    }
    setSendError('');
    const result = await actions.sendOtp();
    if (!result.ok) {
      const nudgeEmail =
        !isSignup &&
        state.loginMethod !== 'email' &&
        cfg.emailLoginEnabled &&
        (result.appCode === 'ACCOUNT_NOT_FOUND' ||
          result.appCode === 'INVALID_PHONE' ||
          result.appCode === 'OTP_PROVIDER_ERROR' ||
          String(result.appCode || '').startsWith('SMS_'));
      setSendError(
        (result.error || 'Unable to continue. Please try again.') +
          (nudgeEmail ? ' Try logging in with your email instead.' : ''),
      );
      return;
    }
    actions.resetOtp();
    nav.navigate('Otp');
  };

  return (
    <GradientView
      colors={['#FFFFFF', '#FFFFFF']}
      angle={180}
      style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.fill}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <Animated.View style={enter}>
              <ContentColumn>
                <TextButton
                  label="‹ Back"
                  onPress={() => nav.goBack()}
                  color={colors.textSecondary}
                  weight="600"
                  size={14}
                />

                <View style={styles.logoWrap}>
                  <View
                    style={[
                      styles.logoTile,
                      {
                        width: logoSize,
                        height: logoSize,
                        borderRadius: logoSize * 0.27,
                      },
                    ]}>
                    <Image source={logo} style={styles.logo} resizeMode="cover" />
                  </View>
                </View>

                <View style={styles.card}>
                  <AppText style={styles.title} numberOfLines={2}>
                    {title}
                  </AppText>
                  <AppText style={styles.subtitle} numberOfLines={2}>
                    {subtitle}
                  </AppText>

                  {!isSignup && (
                    <>
                      <AppText style={styles.label}>Choose login method</AppText>
                      <SegmentedControl
                        options={methods}
                        value={state.loginMethod}
                        onChange={id => actions.setLoginMethod(id as never)}
                      />
                    </>
                  )}

                  {isSignup ? (
                    <>
                      <AppText style={styles.label}>Mobile Number</AppText>
                      <PhoneInput
                        value={state.phone}
                        invalid={fieldTouched && !!phoneFieldError}
                        onChangeText={v => {
                          setFieldTouched(true);
                          setSendError('');
                          actions.setPhone(v);
                        }}
                      />
                      {fieldTouched && !!phoneFieldError && (
                        <AppText style={styles.fieldError}>
                          {phoneFieldError}
                        </AppText>
                      )}
                      <AppText style={styles.label}>Email Address</AppText>
                      <View
                        style={[
                          styles.emailRow,
                          fieldTouched &&
                            !!emailFieldError &&
                            styles.fieldInvalid,
                        ]}>
                        <AppText style={styles.emailPrefix}>✉️</AppText>
                        <TextInput
                          value={state.email}
                          onChangeText={v => {
                            setFieldTouched(true);
                            setSendError('');
                            actions.setEmail(v);
                          }}
                          onBlur={() => setFieldTouched(true)}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          autoCorrect={false}
                          placeholder="you@example.com"
                          placeholderTextColor={colors.textFaint}
                          underlineColorAndroid="transparent"
                          selectionColor={colors.primary}
                          style={styles.emailInput}
                        />
                      </View>
                      {fieldTouched && !!emailFieldError && (
                        <AppText style={styles.fieldError}>
                          {emailFieldError}
                        </AppText>
                      )}
                    </>
                  ) : (
                    <>
                      <AppText style={styles.label}>{fieldLabel}</AppText>
                      {isEmail ? (
                        <View
                          style={[
                            styles.emailRow,
                            showFieldError && styles.fieldInvalid,
                          ]}>
                          <AppText style={styles.emailPrefix}>✉️</AppText>
                          <TextInput
                            value={state.email}
                            onChangeText={v => {
                              setFieldTouched(true);
                              setSendError('');
                              actions.setEmail(v);
                            }}
                            onBlur={() => setFieldTouched(true)}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                            placeholder="you@example.com"
                            placeholderTextColor={colors.textFaint}
                            underlineColorAndroid="transparent"
                            selectionColor={colors.primary}
                            style={styles.emailInput}
                          />
                        </View>
                      ) : (
                        <PhoneInput
                          value={state.phone}
                          invalid={showFieldError}
                          onChangeText={v => {
                            setFieldTouched(true);
                            setSendError('');
                            actions.setPhone(v);
                          }}
                        />
                      )}
                      {showFieldError && (
                        <AppText style={styles.fieldError}>{fieldError}</AppText>
                      )}
                    </>
                  )}

                  <Banner tone="info" icon="ⓘ" text={hint} style={styles.hint} />
                  {!!sendError && (
                    <Banner
                      tone="danger"
                      icon="⚠"
                      text={sendError}
                      style={styles.hint}
                    />
                  )}
                  {state.loginNotFound && (
                    <TextButton
                      label="Create an account"
                      onPress={() => {
                        actions.setAuthIntent('signup');
                        setSendError('');
                      }}
                      color={colors.primary}
                      weight="700"
                      size={13}
                      style={styles.switch}
                    />
                  )}
                  {!isSignup &&
                    state.suggestEmailLogin &&
                    cfg.emailLoginEnabled &&
                    state.loginMethod !== 'email' && (
                      <TextButton
                        label="Log in with email instead"
                        onPress={() => {
                          actions.setLoginMethod('email');
                          setSendError('');
                          setFieldTouched(false);
                        }}
                        color={colors.primary}
                        weight="700"
                        size={13}
                        style={styles.switch}
                      />
                    )}
                  {/already registered/i.test(sendError) && (
                    <TextButton
                      label="Login instead"
                      onPress={() => {
                        actions.setAuthIntent('login');
                        setSendError('');
                      }}
                      color={colors.primary}
                      weight="700"
                      size={13}
                      style={styles.switch}
                    />
                  )}

                  <PrimaryButton
                    label={state.authBusy ? 'Sending…' : sendLabel}
                    onPress={onSend}
                    disabled={!canSubmit || state.authBusy}
                    loading={state.authBusy}
                    height={52}
                    style={styles.send}
                  />
                  <TextButton
                    label={
                      isSignup
                        ? 'Already have an account? Log in'
                        : 'New rider? Create account'
                    }
                    onPress={actions.toggleAuthIntent}
                    align="center"
                    weight="600"
                    size={12}
                    style={styles.switch}
                  />
                </View>
              </ContentColumn>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GradientView>
  );
}

const styles = StyleSheet.create({
  fill: {flex: 1},
  scroll: {
    paddingHorizontal: 28,
    paddingTop: 8,
    paddingBottom: 32,
    flexGrow: 1,
  },
  logoWrap: {alignItems: 'center', marginVertical: 24},
  logoTile: {
    overflow: 'hidden',
    ...shadow('lg'),
  },
  logo: {width: '100%', height: '100%'},
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xxl,
    padding: 22,
    ...shadow('lg'),
  },
  title: {fontWeight: '700', fontSize: 18, color: colors.inkStrong},
  subtitle: {
    fontWeight: '400',
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
  },
  label: {
    fontFamily: FONT_FAMILY,
    fontWeight: '700',
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 16,
    marginBottom: 8,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: colors.inputBorder,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    backgroundColor: colors.white,
  },
  emailPrefix: {fontSize: 15},
  emailInput: {
    flex: 1,
    minWidth: 0,
    fontFamily: FONT_FAMILY,
    fontWeight: '600',
    fontSize: 16,
    color: colors.ink,
    paddingVertical: 14,
    backgroundColor: 'transparent',
  },
  fieldInvalid: {
    borderColor: colors.danger,
  },
  fieldError: {
    fontWeight: '600',
    fontSize: 12,
    color: colors.danger,
    marginTop: 8,
  },
  hint: {marginTop: 14},
  send: {marginTop: 18},
  switch: {marginTop: 12},
});
