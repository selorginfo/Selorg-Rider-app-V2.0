import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {AppText} from '../../components/common/AppText';
import {OutlineButton} from '../../components/buttons/OutlineButton';
import {resetTo} from '../../navigation/navigationRef';
import {useRider} from '../../store/RiderContext';
import {profileApi} from '../../services/api';
import {appId} from '../../store/selectors';
import {colors, radius} from '../../theme';

type ReviewPhase = 'under_review' | 'pending' | 'successful';

const PHASE_LABEL: Record<ReviewPhase, string> = {
  under_review: '● Under review',
  pending: '● Pending',
  successful: '● Successful',
};

const POLL_MS = 4000;

export function PendingScreen() {
  const {state, actions} = useRider();
  const [checking, setChecking] = useState(false);
  const [applicationId, setApplicationId] = useState(appId(state));
  const [hubName, setHubName] = useState('—');
  const [phase, setPhase] = useState<ReviewPhase>('under_review');
  const finishedRef = useRef(false);

  const confirmLeave = useCallback(() => {
    Alert.alert(
      'Leave application review?',
      'You will be signed out. You can sign in again anytime to check your status.',
      [
        {text: 'Stay', style: 'cancel'},
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: () => {
            void actions.logout();
          },
        },
      ],
    );
  }, [actions]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      confirmLeave();
      return true;
    });
    return () => sub.remove();
  }, [confirmLeave]);

  const finishApproved = useCallback(() => {
    if (finishedRef.current) {
      return;
    }
    finishedRef.current = true;
    setPhase('successful');
    actions.approveAccount();
    resetTo('ObDone');
  }, [actions]);

  const checkStatus = useCallback(async () => {
    if (finishedRef.current) {
      return;
    }
    setChecking(true);
    const result = await profileApi.getOnboardingState();
    if (finishedRef.current) {
      setChecking(false);
      return;
    }
    if (result.ok && result.data) {
      const d = result.data;
      if (d.applicationId) {
        setApplicationId(d.applicationId);
      }
      if (d.hub?.name) {
        setHubName(d.hub.name);
      }
      const st = (d.status || 'pending').toLowerCase();
      if (st === 'approved' || st === 'active') {
        finishApproved();
        setChecking(false);
        return;
      }
      if (st === 'rejected') {
        finishedRef.current = true;
        resetTo('Rejected');
        setChecking(false);
        return;
      }
      if (st === 'under_review') {
        setPhase('under_review');
      } else {
        setPhase('pending');
      }
    }
    setChecking(false);
  }, [finishApproved]);

  useEffect(() => {
    let cancelled = false;
    finishedRef.current = false;

    void checkStatus();

    const poll = setInterval(() => {
      if (!cancelled && !finishedRef.current) {
        void checkStatus();
      }
    }, POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(poll);
    };
  }, [checkStatus]);

  const statusLabel = PHASE_LABEL[phase];
  const statusColor =
    phase === 'successful'
      ? colors.primary
      : phase === 'pending'
        ? colors.warn
        : colors.warn;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Pressable onPress={confirmLeave} hitSlop={10} style={styles.backBtn}>
        <AppText style={styles.back}>‹</AppText>
      </Pressable>

      <View style={styles.body}>
        <View style={styles.iconTile}>
          <AppText style={styles.icon}>
            {phase === 'successful' ? '✓' : '⏳'}
          </AppText>
        </View>
        <AppText style={styles.title}>
          {phase === 'successful'
            ? 'Application approved'
            : phase === 'pending'
              ? 'Application pending'
              : 'Application under review'}
        </AppText>
        <AppText style={styles.copy}>
          {phase === 'successful'
            ? `You're approved, ${state.obName || state.epName || 'there'}. Taking you to the success screen.`
            : phase === 'pending'
              ? 'Documents are in final checks. This screen updates when a decision is ready.'
              : `Thanks for signing up, ${state.obName || state.epName || 'there'}. Our team is verifying your documents and vehicle details.`}
        </AppText>
        <View style={styles.card}>
          <Row label="Application ID" value={applicationId} />
          <Row label="Hub" value={hubName} />
          <Row label="Status" value={statusLabel} valueColor={statusColor} />
        </View>
        {phase !== 'successful' && (
          <AppText style={styles.autoHint}>
            Status updates automatically — you can also check manually below.
          </AppText>
        )}
      </View>

      <View style={styles.footer}>
        <OutlineButton
          label={checking ? 'Checking…' : 'Check application status'}
          onPress={() => {
            if (!checking && !finishedRef.current) {
              void checkStatus();
            }
          }}
        />
        {checking && (
          <ActivityIndicator color={colors.primary} style={styles.spinner} />
        )}
      </View>
    </SafeAreaView>
  );
}

function Row({
  label,
  value,
  valueColor = colors.ink,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.row}>
      <AppText style={styles.rowLabel}>{label}</AppText>
      <AppText style={[styles.rowValue, {color: valueColor}]}>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.white},
  backBtn: {alignSelf: 'flex-start', paddingHorizontal: 24, paddingVertical: 8},
  back: {fontWeight: '700', fontSize: 22, color: colors.textSecondary},
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconTile: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: colors.warnBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {fontSize: 36},
  title: {
    fontWeight: '800',
    fontSize: 22,
    color: colors.inkStrong,
    letterSpacing: -0.4,
    marginTop: 20,
    textAlign: 'center',
  },
  copy: {
    fontWeight: '400',
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 8,
    lineHeight: 21,
    textAlign: 'center',
  },
  card: {
    alignSelf: 'stretch',
    backgroundColor: colors.fieldBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: 16,
    marginTop: 22,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  rowLabel: {fontWeight: '400', fontSize: 13, color: colors.textMuted},
  rowValue: {fontWeight: '700', fontSize: 13},
  autoHint: {
    fontWeight: '600',
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 14,
    textAlign: 'center',
    lineHeight: 18,
  },
  footer: {paddingHorizontal: 24, paddingBottom: 12, gap: 10},
  spinner: {alignSelf: 'center'},
});
