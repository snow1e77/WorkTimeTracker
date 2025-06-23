// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Platform-specific extensions
config.resolver.sourceExts.push('web.js', 'web.ts', 'web.tsx');

// Platform support
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Resolve module fields order for web compatibility
config.resolver.resolverMainFields = [
  'react-native',
  'browser',
  'main',
];

// Platform-specific aliases
config.resolver.alias = {
  'react-native-maps': path.resolve(__dirname, 'src/utils/mapsMock.web.js'),
  'expo-task-manager': path.resolve(__dirname, 'src/utils/emptyMock.js'),
  'expo-notifications': path.resolve(__dirname, 'src/utils/emptyMock.js'),
  'expo-device': path.resolve(__dirname, 'src/utils/emptyMock.js'),
  'expo-image-picker': path.resolve(__dirname, 'src/utils/emptyMock.js'),
};

// Enhanced resolver for platform-specific modules
if (config.resolver.resolveRequest) {
  const originalResolveRequest = config.resolver.resolveRequest;

  config.resolver.resolveRequest = (context, moduleName, platform) => {
    // Handle maps for web platform  
    if (platform === 'web' && moduleName === 'react-native-maps') {
      return {
        filePath: path.resolve(__dirname, 'src/utils/mapsMock.web.js'),
        type: 'sourceFile',
      };
    }

    // Handle expo modules for web platform
    if (platform === 'web' && ['expo-task-manager', 'expo-notifications', 'expo-device', 'expo-image-picker'].includes(moduleName)) {
      return {
        filePath: path.resolve(__dirname, 'src/utils/emptyMock.js'),
        type: 'sourceFile',
      };
    }

    // Default resolver
    return originalResolveRequest(context, moduleName, platform);
  };
}

// Transformer configuration
config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

// Web-specific configuration
config.transformer.minifierConfig = {
  keep_fnames: true,
  mangle: {
    keep_fnames: true,
  },
};

module.exports = config; 