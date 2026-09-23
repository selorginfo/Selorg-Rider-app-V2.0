/**
 * @format
 */
import 'react-native-gesture-handler';
import {AppRegistry} from 'react-native';
import {enableScreens} from 'react-native-screens';
import App from './App';
import {name as appName} from './app.json';

// Pixel 9 / API 35+ emulators can paint a solid black Surface with native screens
// (layout exists, pixels stay black). Keep native screens off on this path.
enableScreens(false);

AppRegistry.registerComponent(appName, () => App);
