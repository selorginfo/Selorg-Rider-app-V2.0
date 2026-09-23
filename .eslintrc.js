module.exports = {
  root: true,
  extends: '@react-native',
  rules: {
    // Conditional/derived styles (border + background reacting to selection
    // state) are idiomatic here and kept inline next to the logic that drives
    // them. Static styles still live in StyleSheet.create.
    'react-native/no-inline-styles': 'off',
  },
};
