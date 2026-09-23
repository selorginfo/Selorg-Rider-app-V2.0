import React from 'react';
import {Animated, Image, ScrollView, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {GradientView} from '../../components/common/GradientView';
import {AppText} from '../../components/common/AppText';
import {ContentColumn} from '../../components/common/ContentColumn';
import {PrimaryButton} from '../../components/buttons/PrimaryButton';
import {useAppNavigation} from '../../hooks/useAppNavigation';
import {useRider} from '../../store/RiderContext';
import {colors, radius} from '../../theme';
import {useLayout} from '../../theme/layout';
import {useScreenEnter} from '../../hooks/useScreenEnter';

const logo = require('../../assets/images/selorg-logo.png');

export function AuthLandingScreen() {
  const nav = useAppNavigation();
  const {actions} = useRider();
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
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Animated.View style={[styles.body, enter]}>
            <ContentColumn style={styles.column}>
              <View style={styles.hero}>
                <View
                  style={[
                    styles.logoTile,
                    {width: logoSize, height: logoSize, borderRadius: logoSize * 0.24},
                  ]}>
                  <Image source={logo} style={styles.logo} resizeMode="cover" />
                </View>
                <View style={styles.titleWrap}>
                  <AppText style={styles.title}>Selorg Rider</AppText>
                  <AppText style={styles.kicker}>DELIVERY PARTNER</AppText>
                </View>
              </View>

              <View style={styles.actions}>
                <PrimaryButton
                  label="Log In"
                  onPress={() => {
                    actions.setAuthIntent('login');
                    nav.navigate('Login');
                  }}
                  borderRadius={radius.xl}
                />
                <PrimaryButton
                  label="Create Rider Account"
                  variant="white"
                  onPress={() => {
                    actions.setAuthIntent('signup');
                    nav.navigate('Login');
                  }}
                  borderRadius={radius.xl}
                  style={styles.secondary}
                />
              </View>
            </ContentColumn>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </GradientView>
  );
}

const styles = StyleSheet.create({
  fill: {flex: 1},
  scroll: {flexGrow: 1},
  body: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 40,
    paddingBottom: 32,
  },
  column: {flexGrow: 1, width: '100%', justifyContent: 'space-between'},
  hero: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    paddingVertical: 24,
  },
  logoTile: {
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOpacity: 0.32,
    shadowRadius: 44,
    shadowOffset: {width: 0, height: 20},
    elevation: 10,
  },
  logo: {width: '100%', height: '100%'},
  titleWrap: {alignItems: 'center'},
  title: {
    fontWeight: '800',
    fontSize: 26,
    color: colors.inkStrong,
    letterSpacing: -0.5,
  },
  kicker: {
    fontWeight: '600',
    fontSize: 12,
    color: colors.primary,
    letterSpacing: 2.5,
    marginTop: 4,
  },
  actions: {gap: 12, width: '100%'},
  secondary: {borderWidth: 1.5, borderColor: colors.borderStrong},
});
