import React, {useCallback, useEffect, useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {AppText} from '../../components/common/AppText';
import {PrimaryButton} from '../../components/buttons/PrimaryButton';
import {useAppNavigation} from '../../hooks/useAppNavigation';
import {useHardwareBack} from '../../hooks/useHardwareBack';
import {useRider} from '../../store/RiderContext';
import {profileApi} from '../../services/api';
import {colors, radius} from '../../theme';

export function RejectedScreen() {
  const nav = useAppNavigation();
  const {actions} = useRider();
  const [reason, setReason] = useState(
    'We could not verify one or more documents. Please re-upload and resubmit.',
  );

  const signOut = useCallback(() => {
    void actions.logout();
    return true;
  }, [actions]);
  useHardwareBack(signOut);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await profileApi.getOnboardingState();
      if (cancelled) {
        return;
      }
      if (result.ok && result.data?.rejectionReason) {
        setReason(result.data.rejectionReason);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Pressable onPress={signOut} hitSlop={10} style={styles.backBtn}>
        <AppText style={styles.back}>‹</AppText>
      </Pressable>

      <View style={styles.body}>
        <View style={styles.iconTile}>
          <AppText style={styles.icon}>⚠️</AppText>
        </View>
        <AppText style={styles.title}>Application needs changes</AppText>
        <AppText style={styles.copy}>
          We couldn't verify one or more of your documents. Please re-upload
          clear, valid copies and resubmit.
        </AppText>
        <View style={styles.reasonCard}>
          <AppText style={styles.reasonTitle}>Reason</AppText>
          <AppText style={styles.reasonBody}>{reason}</AppText>
        </View>
      </View>

      <View style={styles.footer}>
        <PrimaryButton
          label="Resubmit Documents"
          onPress={() => {
            actions.resubmitDocs();
            nav.navigate('ObKyc');
          }}
        />
      </View>
    </SafeAreaView>
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
    backgroundColor: colors.dangerBg,
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
  reasonCard: {
    alignSelf: 'stretch',
    backgroundColor: colors.dangerBg,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    borderRadius: radius.lg,
    padding: 14,
    marginTop: 22,
  },
  reasonTitle: {fontWeight: '700', fontSize: 13, color: colors.danger},
  reasonBody: {
    fontWeight: '400',
    fontSize: 12,
    color: colors.dangerTextDeep,
    marginTop: 3,
    lineHeight: 18,
  },
  footer: {paddingHorizontal: 24, paddingBottom: 12},
});
