import React from 'react';
import {ScrollView, StatusBar, StyleSheet} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {AppText} from '../common/AppText';
import {BigCheckIcon} from '../common/Icons';
import {GradientView} from '../common/GradientView';
import {PopIn} from './PopIn';
import {ContentColumn} from '../common/ContentColumn';
import {colors, spacing} from '../../theme';
import {useLayout} from '../../theme/layout';

interface SuccessScreenProps {
  gradient: string[];
  title: string;
  subtitle?: string;
  /** central content block below the heading (earnings card / batch summary) */
  body?: React.ReactNode;
  /** bottom CTA */
  footer: React.ReactNode;
  onDark?: boolean;
}

/** Full-bleed gradient success layout — Complete / ObDone / BulkComplete. */
export function SuccessScreen({
  gradient,
  title,
  subtitle,
  body,
  footer,
}: SuccessScreenProps) {
  const {isLandscape, isCompact} = useLayout();
  const checkSize = isCompact ? 84 : 100;

  return (
    <GradientView colors={gradient} angle={180} style={styles.fill}>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />
      <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
        <ScrollView
          style={styles.fill}
          contentContainerStyle={[
            styles.scroll,
            isLandscape && styles.scrollLandscape,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <ContentColumn style={styles.center}>
            <PopIn
              style={[
                styles.checkTile,
                {width: checkSize, height: checkSize, borderRadius: checkSize / 2},
              ]}>
              <BigCheckIcon size={isCompact ? 44 : 52} />
            </PopIn>
            <AppText style={styles.title}>{title}</AppText>
            {!!subtitle && <AppText style={styles.sub}>{subtitle}</AppText>}
            {body}
          </ContentColumn>
          <ContentColumn style={styles.footer}>{footer}</ContentColumn>
        </ScrollView>
      </SafeAreaView>
    </GradientView>
  );
}

const styles = StyleSheet.create({
  fill: {flex: 1},
  scroll: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  scrollLandscape: {justifyContent: 'center', gap: 16},
  center: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  checkTile: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 26,
    marginTop: 22,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  sub: {
    color: colors.onPrimarySoft,
    fontWeight: '400',
    fontSize: 14,
    marginTop: 6,
    lineHeight: 22,
    textAlign: 'center',
  },
  footer: {padding: spacing.lg, width: '100%'},
});
