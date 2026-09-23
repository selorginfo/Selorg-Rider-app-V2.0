module.exports = {
  preset: 'react-native',
  setupFiles: ['./jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(@react-native|react-native|@react-native-async-storage|@react-native-community|@react-navigation|react-native-gesture-handler|react-native-screens|react-native-safe-area-context|react-native-svg)/)',
  ],
};
