import React from 'react';
import {Animated, Image, ScrollView, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {GradientView} from '../../components/common/GradientView';
import {AppText} from '../../components/common/AppText';
import {ContentColumn} from '../../components/common/ContentColumn';
import {PrimaryButton} from '../../components/buttons/PrimaryButton';
import {useAppNavigation} from '../../hooks/useAppNavigation';
import {useScreenEnter} from '../../hooks/useScreenEnter';
import {OB_STEPS} from '../../mock';
import {colors, shadow} from '../../theme';
import {useLayout} from '../../theme/layout';

const logo = require('../../assets/images/selorg-logo.png');

export function ObWelcomeScreen() {
  const nav = useAppNavigation();
  const enter = useScreenEnter();
  const layout = useLayout();
  const logoSize = Math.round(
    Math.min(132, Math.max(96, layout.shortest * 0.28)),
  );

  return (
    <GradientView
      colors={['#FFFFFF', '#FFFFFF']}
      angle={180}
      style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}>
          <Animated.View style={[styles.inner, enter]}>
            <ContentColumn style={styles.column}>
              <View style={styles.top}>
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
                <AppText style={styles.title}>
                  Let's get you{'\n'}on the road 🛵
                </AppText>
                <AppText style={styles.copy}>
                  Complete a quick 5-step setup to start earning as a Selorg
                  delivery partner. Takes about 8 minutes.
                </AppText>
                <View style={styles.steps}>
                  {OB_STEPS.map(s => (
                    <View key={s.n} style={styles.step}>
                      <View style={styles.stepIcon}>
                        <AppText style={styles.stepEmoji}>{s.icon}</AppText>
                      </View>
                      <AppText style={styles.stepLabel} numberOfLines={1}>
                        {s.label}
                      </AppText>
                      <AppText style={styles.stepN}>{s.n}</AppText>
                    </View>
                  ))}
                </View>
              </View>
              <PrimaryButton
                label="Get Started"
                onPress={() => nav.navigate('ObPersonal')}
                style={styles.cta}
              />
            </ContentColumn>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </GradientView>
  );
}

const styles = StyleSheet.create({
  fill: {flex: 1},
  body: {flexGrow: 1, paddingHorizontal: 26, paddingVertical: 32},
  inner: {flex: 1},
  column: {flexGrow: 1, width: '100%', justifyContent: 'space-between'},
  top: {},
  logoTile: {
    overflow: 'hidden',
    ...shadow('lg'),
  },
  logo: {width: '100%', height: '100%'},
  title: {
    fontWeight: '800',
    fontSize: 27,
    color: colors.inkStrong,
    letterSpacing: -0.6,
    marginTop: 24,
    lineHeight: 33,
  },
  copy: {
    fontWeight: '400',
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 10,
    lineHeight: 22,
  },
  steps: {gap: 12, marginTop: 26},
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 13,
  },
  stepIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepEmoji: {fontSize: 15},
  stepLabel: {
    flex: 1,
    minWidth: 0,
    fontWeight: '600',
    fontSize: 13,
    color: colors.ink,
  },
  stepN: {fontWeight: '700', fontSize: 12, color: colors.textFaint},
  cta: {marginTop: 24},
});
