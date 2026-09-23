import React from 'react';
import {StyleProp, View, ViewStyle} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {colors} from '../../theme';

export type AppIconName =
  | 'home'
  | 'orders'
  | 'earnings'
  | 'history'
  | 'profile'
  | 'documents'
  | 'cash'
  | 'wallet'
  | 'bell'
  | 'support'
  | 'settings'
  | 'shifts'
  | 'phone'
  | 'mail'
  | 'chat'
  | 'location'
  | 'sound'
  | 'info'
  | 'bike'
  | 'auto'
  | 'logout'
  | 'camera'
  | 'image';

type IconSet = 'feather' | 'material';

const ICON_MAP: Record<
  AppIconName,
  {set: IconSet; name: string}
> = {
  home: {set: 'feather', name: 'home'},
  orders: {set: 'feather', name: 'package'},
  earnings: {set: 'feather', name: 'bar-chart-2'},
  history: {set: 'feather', name: 'clock'},
  profile: {set: 'feather', name: 'user'},
  documents: {set: 'feather', name: 'file-text'},
  cash: {set: 'feather', name: 'dollar-sign'},
  wallet: {set: 'feather', name: 'credit-card'},
  bell: {set: 'feather', name: 'bell'},
  support: {set: 'feather', name: 'headphones'},
  settings: {set: 'feather', name: 'settings'},
  shifts: {set: 'feather', name: 'calendar'},
  phone: {set: 'feather', name: 'phone'},
  mail: {set: 'feather', name: 'mail'},
  chat: {set: 'feather', name: 'message-circle'},
  location: {set: 'feather', name: 'map-pin'},
  sound: {set: 'feather', name: 'volume-2'},
  info: {set: 'feather', name: 'info'},
  bike: {set: 'material', name: 'motorbike'},
  auto: {set: 'material', name: 'rickshaw'},
  logout: {set: 'feather', name: 'log-out'},
  camera: {set: 'feather', name: 'camera'},
  image: {set: 'feather', name: 'image'},
};

interface AppIconProps {
  name: AppIconName;
  size?: number;
  color?: string;
  tile?: {
    size: number;
    radius: number;
    bg: string;
    style?: StyleProp<ViewStyle>;
  };
  style?: StyleProp<ViewStyle>;
}

/** Shared vector icon (Feather / Material) used across Rider UI. */
export function AppIcon({
  name,
  size = 18,
  color = colors.ink,
  tile,
  style,
}: AppIconProps) {
  const def = ICON_MAP[name];
  const glyph =
    def.set === 'material' ? (
      <MaterialCommunityIcons name={def.name} size={size} color={color} />
    ) : (
      <Feather name={def.name} size={size} color={color} />
    );

  if (!tile) {
    return <View style={style}>{glyph}</View>;
  }

  return (
    <View
      style={[
        {
          width: tile.size,
          height: tile.size,
          borderRadius: tile.radius,
          backgroundColor: tile.bg,
          alignItems: 'center',
          justifyContent: 'center',
        },
        tile.style,
        style,
      ]}>
      {glyph}
    </View>
  );
}
