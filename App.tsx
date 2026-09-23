/**
 * Selorg Rider App — React Native CLI frontend.
 * Faithful native port of `Selorg Rider.dc.html` (the design source of truth).
 */
import React from 'react';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {RiderProvider} from './src/store/RiderContext';
import {RootNavigator} from './src/navigation/RootNavigator';
import {RiderRealtimeServices} from './src/components/system/RiderRealtimeServices';
import {colors} from './src/theme';

function App(): React.JSX.Element {
  return (
    <GestureHandlerRootView style={{flex: 1, backgroundColor: colors.screen}}>
      <SafeAreaProvider>
        <RiderProvider>
          <RiderRealtimeServices />
          <RootNavigator />
        </RiderProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;
