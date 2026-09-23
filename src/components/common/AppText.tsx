import React from 'react';
import {Text as RNText, TextProps} from 'react-native';
import {FONT_FAMILY} from '../../theme';

/**
 * Drop-in `<Text>` that applies the app font family and disables font scaling
 * (the design is pixel-tuned). Use this instead of RN `Text` everywhere.
 */
export function AppText({style, allowFontScaling = false, ...rest}: TextProps) {
  return (
    <RNText
      allowFontScaling={allowFontScaling}
      style={[FONT_FAMILY ? {fontFamily: FONT_FAMILY} : null, style]}
      {...rest}
    />
  );
}
