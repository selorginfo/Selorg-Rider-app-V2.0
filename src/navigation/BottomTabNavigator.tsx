import React from 'react';
import {
  createBottomTabNavigator,
  BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import type {MainTabParamList} from '../types/navigation';
import {BottomTabBar} from '../components/navigation/BottomTabBar';
import {colors} from '../theme';
import {HomeScreen} from '../screens/dashboard/HomeScreen';
import {OrdersScreen} from '../screens/orders/OrdersScreen';
import {EarningsScreen} from '../screens/earnings/EarningsScreen';
import {HistoryScreen} from '../screens/history/HistoryScreen';
import {ProfileScreen} from '../screens/profile/ProfileScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

const renderTabBar = (props: BottomTabBarProps) => <BottomTabBar {...props} />;

export function BottomTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{headerShown: false}}
      sceneContainerStyle={{backgroundColor: colors.white}}
      tabBar={renderTabBar}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Orders" component={OrdersScreen} />
      <Tab.Screen name="Earnings" component={EarningsScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
