const path = require('path');
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  resolver: {
    resolveRequest: (context, moduleName, platform) => {
      // Prefer the published JS entry. Metro can fail to resolve the package's
      // `react-native` field (`src/index.ts`) when the file-map is stale/locked.
      if (moduleName === 'react-native-webview') {
        return {
          type: 'sourceFile',
          filePath: path.resolve(
            __dirname,
            'node_modules/react-native-webview/index.js',
          ),
        };
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
