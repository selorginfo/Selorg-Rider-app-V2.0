import React from 'react';
import {StyleProp, View, ViewStyle} from 'react-native';
import {contentColumnStyle, useLayout} from '../../theme/layout';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Centers children and caps width on tablet / wide landscape. */
export function ContentColumn({children, style}: Props) {
  const layout = useLayout();
  return <View style={[contentColumnStyle(layout), style]}>{children}</View>;
}
