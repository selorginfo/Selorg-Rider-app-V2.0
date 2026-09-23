import {Platform, TextStyle} from 'react-native';

/**
 * The HTML design uses the `Inter` family exclusively via the CSS
 * `font: <weight> <size> Inter` shorthand. We map that to platform system
 * fonts (SF / Roboto) with matching weights so no native font-linking step is
 * required. To ship the real Inter face later: drop the .ttf files in
 * `src/assets/fonts/`, add a `react-native.config.js` assets entry, run
 * `npx react-native-asset`, then set `FONT_FAMILY` below.
 */
export const FONT_FAMILY: string | undefined = Platform.select({
  ios: undefined, // San Francisco
  android: 'sans-serif',
  default: undefined,
});

type Weight = '400' | '500' | '600' | '700' | '800';

/** Mirror of the CSS `font: <weight> <size>px Inter` shorthand. */
export function text(
  weight: Weight,
  size: number,
  extra?: TextStyle,
): TextStyle {
  return {
    fontFamily: FONT_FAMILY,
    fontWeight: weight,
    fontSize: size,
    ...(extra || {}),
  };
}

export const typography = {
  screenTitle: text('800', 22, {color: '#101828', letterSpacing: -0.4}),
  sectionTitle: text('700', 16, {color: '#101828'}),
  cardTitle: text('700', 14, {color: '#101828'}),
  body: text('400', 13, {color: '#4A5565', lineHeight: 20}),
  label: text('700', 13, {color: '#364153'}),
  caption: text('400', 12, {color: '#6B7280'}),
  tiny: text('400', 11, {color: '#9CA3AF'}),
};
