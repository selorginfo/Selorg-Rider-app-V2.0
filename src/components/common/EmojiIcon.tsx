import React from 'react';
import {StyleProp, Text, TextStyle, View, ViewStyle} from 'react-native';

interface EmojiIconProps {
  glyph: string;
  size?: number;
  /** optional coloured rounded tile behind the emoji (matches the design) */
  tile?: {
    size: number;
    radius: number;
    bg: string;
    style?: StyleProp<ViewStyle>;
  };
  style?: StyleProp<TextStyle>;
}

/**
 * The design uses emoji as iconography (🪪 💳 🚗 🛍 🏬 📍 ⚙️ …). Rendering them
 * through this component keeps sizing consistent and lets us centralise the
 * coloured-tile pattern used all over the app.
 */
export function EmojiIcon({glyph, size = 16, tile, style}: EmojiIconProps) {
  const emoji = (
    <Text style={[{fontSize: size}, style]} allowFontScaling={false}>
      {glyph}
    </Text>
  );
  if (!tile) {
    return emoji;
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
      ]}>
      {emoji}
    </View>
  );
}
