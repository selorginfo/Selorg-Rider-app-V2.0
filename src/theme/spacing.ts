import {Platform, ViewStyle} from 'react-native';

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  screenH: 16, // default horizontal screen padding in the design
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 14,
  xl: 16,
  xxl: 22,
  pill: 999,
};

/**
 * CSS `box-shadow` → RN cross-platform shadow.
 * `level` roughly matches the design's shadow intensities.
 */
export function shadow(level: 'sm' | 'md' | 'lg' | 'xl' = 'sm'): ViewStyle {
  const map = {
    sm: {opacity: 0.05, radius: 12, offset: 3, elevation: 2},
    md: {opacity: 0.08, radius: 16, offset: 6, elevation: 4},
    lg: {opacity: 0.12, radius: 20, offset: 8, elevation: 8},
    xl: {opacity: 0.22, radius: 40, offset: -12, elevation: 16},
  }[level];
  return Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#101828',
      shadowOpacity: map.opacity,
      shadowRadius: map.radius,
      shadowOffset: {width: 0, height: map.offset},
    },
    android: {elevation: map.elevation},
    default: {},
  }) as ViewStyle;
}

/** Coloured glow shadow (design uses green/purple tinted shadows on CTAs). */
export function glow(color: string): ViewStyle {
  return Platform.select<ViewStyle>({
    ios: {
      shadowColor: color,
      shadowOpacity: 0.3,
      shadowRadius: 18,
      shadowOffset: {width: 0, height: 8},
    },
    android: {elevation: 6},
    default: {},
  }) as ViewStyle;
}
