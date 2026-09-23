import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {AppText} from '../../components/common/AppText';
import {ContentColumn} from '../../components/common/ContentColumn';
import {SegmentedProgress} from '../../components/feedback/ProgressBar';
import {colors} from '../../theme';
import {MIN_TOUCH, useLayout} from '../../theme/layout';

interface ObStepLayoutProps {
  step: number; // 1..totalSteps
  /** Total onboarding steps in the progress bar (default 6). */
  totalSteps?: number;
  title: string;
  subtitle: string;
  onBack: () => void;
  children: React.ReactNode;
  /** sticky bottom CTA */
  footer: React.ReactNode;
  /** right accessory next to STEP label (e.g. docs count) */
  headerRight?: React.ReactNode;
}

/** Shared chrome for onboarding steps. */
export function ObStepLayout({
  step,
  totalSteps = 5,
  title,
  subtitle,
  onBack,
  children,
  footer,
  headerRight,
}: ObStepLayoutProps) {
  const layout = useLayout();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.body,
            {paddingHorizontal: layout.gutter + 8},
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <ContentColumn style={styles.column}>
            <Pressable
              onPress={onBack}
              hitSlop={8}
              style={styles.backBtn}
              accessibilityRole="button"
              accessibilityLabel="Back">
              <AppText style={styles.back}>‹</AppText>
            </Pressable>
            <View style={styles.progress}>
              <SegmentedProgress total={totalSteps} filled={step} />
            </View>
            <View style={styles.stepRow}>
              <AppText style={styles.stepLabel}>
                STEP {step} OF {totalSteps}
              </AppText>
              {headerRight}
            </View>
            <AppText style={styles.title}>{title}</AppText>
            <AppText style={styles.subtitle}>{subtitle}</AppText>
            <View style={styles.content}>{children}</View>
          </ContentColumn>
        </ScrollView>
        <ContentColumn
          style={[styles.footer, {paddingHorizontal: layout.gutter + 8}]}>
          {footer}
        </ContentColumn>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.white},
  flex: {flex: 1},
  body: {paddingTop: 4, paddingBottom: 16, flexGrow: 1},
  column: {width: '100%', flexGrow: 1},
  backBtn: {
    alignSelf: 'flex-start',
    minWidth: MIN_TOUCH,
    minHeight: MIN_TOUCH,
    justifyContent: 'center',
  },
  back: {fontWeight: '700', fontSize: 22, color: colors.textSecondary},
  progress: {marginTop: 8, marginBottom: 22},
  stepRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  stepLabel: {
    fontWeight: '400',
    fontSize: 12,
    color: colors.primary,
    letterSpacing: 0.5,
  },
  title: {
    fontWeight: '800',
    fontSize: 22,
    color: colors.inkStrong,
    letterSpacing: -0.4,
    marginTop: 6,
  },
  subtitle: {
    fontWeight: '400',
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
  },
  content: {flexGrow: 1, marginTop: 20},
  footer: {paddingBottom: 8, paddingTop: 8, width: '100%'},
});
