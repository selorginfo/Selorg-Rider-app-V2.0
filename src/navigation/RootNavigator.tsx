import React, {useEffect, useRef} from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../types/navigation';
import {navigationRef, resetTo} from './navigationRef';
import {BottomTabNavigator} from './BottomTabNavigator';
import {GlobalSheets} from '../components/bottomSheets';
import {useRider} from '../store/RiderContext';
import {colors} from '../theme';

import {AuthLandingScreen} from '../screens/auth/AuthLandingScreen';
import {LoginScreen} from '../screens/auth/LoginScreen';
import {OtpScreen} from '../screens/auth/OtpScreen';

import {AcceptScreen} from '../screens/delivery/AcceptScreen';
import {TravelScreen} from '../screens/delivery/TravelScreen';
import {BagScreen} from '../screens/delivery/BagScreen';
import {NavScreen} from '../screens/delivery/NavScreen';
import {OrderChatScreen} from '../screens/delivery/OrderChatScreen';
import {PhotoScreen} from '../screens/delivery/PhotoScreen';
import {CompleteScreen} from '../screens/delivery/CompleteScreen';

import {BulkOverviewScreen} from '../screens/bulk/BulkOverviewScreen';
import {BulkLoadingScreen} from '../screens/bulk/BulkLoadingScreen';
import {BulkActiveScreen} from '../screens/bulk/BulkActiveScreen';
import {BulkAllStopsScreen} from '../screens/bulk/BulkAllStopsScreen';
import {BulkStopDetailScreen} from '../screens/bulk/BulkStopDetailScreen';
import {BulkVerifyScreen} from '../screens/bulk/BulkVerifyScreen';
import {BulkCompleteScreen} from '../screens/bulk/BulkCompleteScreen';
import {BulkHistoryDetailScreen} from '../screens/history/BulkHistoryDetailScreen';

import {ObWelcomeScreen} from '../screens/onboarding/ObWelcomeScreen';
import {ObPersonalScreen} from '../screens/onboarding/ObPersonalScreen';
import {ObVehicleScreen} from '../screens/onboarding/ObVehicleScreen';
import {ObHubScreen} from '../screens/onboarding/ObHubScreen';
import {ObKycScreen} from '../screens/onboarding/ObKycScreen';
import {ObTrainingScreen} from '../screens/onboarding/ObTrainingScreen';
import {ObReviewScreen} from '../screens/onboarding/ObReviewScreen';
import {ObDoneScreen} from '../screens/onboarding/ObDoneScreen';
import {PendingScreen} from '../screens/onboarding/PendingScreen';
import {RejectedScreen} from '../screens/onboarding/RejectedScreen';

import {DocsScreen} from '../screens/profile/DocsScreen';
import {UploadDocumentScreen} from '../screens/profile/UploadDocumentScreen';
import {ShiftsScreen} from '../screens/profile/ShiftsScreen';
import {FloatCashScreen} from '../screens/profile/FloatCashScreen';
import {WalletScreen} from '../screens/profile/WalletScreen';
import {NotificationsScreen} from '../screens/profile/NotificationsScreen';
import {SupportScreen} from '../screens/profile/SupportScreen';
import {SettingsScreen} from '../screens/profile/SettingsScreen';
import {PrivacyScreen} from '../screens/profile/PrivacyScreen';
import {TermsScreen} from '../screens/profile/TermsScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const {state} = useRider();
  const restored = useRef(false);

  useEffect(() => {
    if (!state.sessionReady) {
      return;
    }
    // Do not latch on an early unauthenticated splash. A slow hydrate can
    // still become authenticated after sessionReady flips, and that late
    // success must still route into Main (force-stop restore).
    if (!state.isAuthenticated) {
      return;
    }
    if (restored.current) {
      return;
    }
    restored.current = true;
    let route:
      | keyof import('../types/navigation').RootStackParamList
      | 'Main' =
      state.accountStatus === 'approved'
        ? 'Main'
        : state.accountStatus === 'pending'
          ? 'Pending'
          : state.accountStatus === 'rejected'
            ? 'Rejected'
            : 'ObWelcome';
    // Approved riders without a hub must pick one before Home.
    if (
      state.accountStatus === 'approved' &&
      !state.epHubId &&
      !state.obHub
    ) {
      route = 'ObHub';
    }
    // Wait a tick so NavigationContainer is ready
    const t = setTimeout(() => resetTo(route), 0);
    return () => clearTimeout(t);
  }, [
    state.sessionReady,
    state.isAuthenticated,
    state.accountStatus,
    state.epHubId,
    state.obHub,
  ]);

  // After an explicit logout, allow the next successful login to restore again.
  useEffect(() => {
    if (!state.isAuthenticated) {
      restored.current = false;
    }
  }, [state.isAuthenticated]);

  // Keep NavigationContainer mounted under the splash. Unmounting it whenever
  // sessionReady flips remounts Auth/Login and feels like a page reload.
  return (
    <>
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator
          initialRouteName="AuthLanding"
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            contentStyle: {backgroundColor: colors.white},
          }}>
          <Stack.Screen name="AuthLanding" component={AuthLandingScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Otp" component={OtpScreen} />

          <Stack.Screen name="Main" component={BottomTabNavigator} />

          <Stack.Screen name="Accept" component={AcceptScreen} />
          <Stack.Screen name="Travel" component={TravelScreen} />
          <Stack.Screen name="Bag" component={BagScreen} />
          <Stack.Screen name="Nav" component={NavScreen} />
          <Stack.Screen name="OrderChat" component={OrderChatScreen} />
          <Stack.Screen name="Photo" component={PhotoScreen} />
          <Stack.Screen name="Complete" component={CompleteScreen} />

          <Stack.Screen name="BulkOverview" component={BulkOverviewScreen} />
          <Stack.Screen name="BulkLoading" component={BulkLoadingScreen} />
          <Stack.Screen name="BulkActive" component={BulkActiveScreen} />
          <Stack.Screen name="BulkAllStops" component={BulkAllStopsScreen} />
          <Stack.Screen
            name="BulkStopDetail"
            component={BulkStopDetailScreen}
          />
          <Stack.Screen name="BulkVerify" component={BulkVerifyScreen} />
          <Stack.Screen name="BulkComplete" component={BulkCompleteScreen} />
          <Stack.Screen
            name="BulkHistoryDetail"
            component={BulkHistoryDetailScreen}
          />

          <Stack.Screen name="ObWelcome" component={ObWelcomeScreen} />
          <Stack.Screen name="ObPersonal" component={ObPersonalScreen} />
          <Stack.Screen name="ObVehicle" component={ObVehicleScreen} />
          <Stack.Screen name="ObHub" component={ObHubScreen} />
          <Stack.Screen name="ObKyc" component={ObKycScreen} />
          <Stack.Screen name="ObTraining" component={ObTrainingScreen} />
          <Stack.Screen name="ObReview" component={ObReviewScreen} />
          <Stack.Screen name="ObDone" component={ObDoneScreen} />
          <Stack.Screen name="Pending" component={PendingScreen} />
          <Stack.Screen name="Rejected" component={RejectedScreen} />

          <Stack.Screen name="Docs" component={DocsScreen} />
          <Stack.Screen name="UploadDocument" component={UploadDocumentScreen} />
          <Stack.Screen name="Shifts" component={ShiftsScreen} />
          <Stack.Screen name="FloatCash" component={FloatCashScreen} />
          <Stack.Screen name="Wallet" component={WalletScreen} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
          <Stack.Screen name="Support" component={SupportScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="Privacy" component={PrivacyScreen} />
          <Stack.Screen name="Terms" component={TermsScreen} />
        </Stack.Navigator>
      </NavigationContainer>
      {!state.sessionReady && (
        <View
          style={styles.splash}
          pointerEvents="auto"
          // Android can paint absolute+zIndex layers black without elevation.
          collapsable={false}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      )}
      <GlobalSheets />
    </>
  );
}

const styles = StyleSheet.create({
  splash: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    zIndex: 100,
    elevation: 100,
  },
});
