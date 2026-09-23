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

  const title =
    state.authIntent === 'signup'
      ? 'Create your rider account'
      : 'Sign in to ride';
  const subtitle = isEmail
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
      ? "We couldn't find an account for this email. Try Create Account instead."
      : "We couldn't find an account for this number. Try Create Account instead."
    : isEmail
    ? 'Enter the email linked to your rider account.'
    : "We'll send a one-time code to this number.";
  const sendLabel =
    state.loginMethod === 'whatsapp' ? 'Send code on WhatsApp' : 'Send OTP';

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
    const err = authTargetError(state.loginMethod, state.email, state.phone);
    if (err) {
      setSendError('');
      return;
    }
    setSendError('');
    const result = await actions.sendOtp();
    if (!result.ok) {
      setSendError(result.error || 'Unable to send OTP. Please try again.');
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

                  <AppText style={styles.label}>Choose login method</AppText>
                  <SegmentedControl
                    options={methods}
                    value={state.loginMethod}
                    onChange={id => actions.setLoginMethod(id as never)}
                  />

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

                  <Banner tone="info" icon="ⓘ" text={hint} style={styles.hint} />
                  {!!sendError && (
                    <Banner
                      tone="danger"
                      icon="⚠"
                      text={sendError}
                      style={styles.hint}
                    />
                  )}

                  <PrimaryButton
                    label={state.authBusy ? 'Sending…' : sendLabel}
                    onPress={onSend}
                    disabled={!!fieldError || state.authBusy}
                    loading={state.authBusy}
                    height={52}
                    style={styles.send}
                  />
                  <TextButton
                    label={
                      state.authIntent === 'signup'
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
