/* eslint-disable no-undef */
require('react-native-gesture-handler/jestSetup');

jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);

jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map();
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async key => (store.has(key) ? store.get(key) : null)),
      setItem: jest.fn(async (key, value) => {
        store.set(key, value);
      }),
      removeItem: jest.fn(async key => {
        store.delete(key);
      }),
      clear: jest.fn(async () => {
        store.clear();
      }),
      getAllKeys: jest.fn(async () => Array.from(store.keys())),
      multiRemove: jest.fn(async keys => {
        keys.forEach(k => store.delete(k));
      }),
    },
  };
});

// react-native-screens: only enableScreens is called at import time by
// @react-navigation/native-stack; stub it so the native module isn't required.
jest.mock('react-native-screens', () => ({
  enableScreens: jest.fn(),
  enableFreeze: jest.fn(),
  screensEnabled: jest.fn(() => false),
  Screen: 'Screen',
  ScreenContainer: 'ScreenContainer',
  ScreenStack: 'ScreenStack',
  NativeScreen: 'NativeScreen',
  NativeScreenContainer: 'NativeScreenContainer',
  ScreenStackHeaderConfig: 'ScreenStackHeaderConfig',
  ScreenStackHeaderSubview: 'ScreenStackHeaderSubview',
}));

jest.mock('react-native-image-picker', () => ({
  launchCamera: jest.fn(async () => ({didCancel: true, assets: []})),
  launchImageLibrary: jest.fn(async () => ({didCancel: true, assets: []})),
}));

jest.mock('@react-native-community/geolocation', () => ({
  __esModule: true,
  default: {
    setRNConfiguration: jest.fn(),
    getCurrentPosition: jest.fn((_ok, err) => {
      if (typeof err === 'function') {
        err({message: 'GPS unavailable in tests'});
      }
    }),
    watchPosition: jest.fn(() => 1),
    clearWatch: jest.fn(),
  },
}));
