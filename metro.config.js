const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Platform-specific extensions
config.resolver.sourceExts.push('web.js', 'web.ts', 'web.tsx');

// Platform support
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Resolve module fields order for web compatibility
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// Platform-specific aliases
config.resolver.alias = {
  ...(config.resolver.alias || {}),
};

// Enhanced resolver for platform-specific modules
const originalResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Handle react-native-maps for web platform
  if (platform === 'web' && moduleName === 'react-native-maps') {
    return {
      filePath: path.resolve(__dirname, 'src/utils/mapsMock.web.js'),
      type: 'sourceFile',
    };
  }

  // Handle expo-sqlite for web platform
  if (platform === 'web' && moduleName === 'expo-sqlite') {
    return {
      filePath: path.resolve(__dirname, 'src/utils/sqliteMock.web.js'),
      type: 'sourceFile',
    };
  }

  // Handle any other native-only modules that might cause issues on web
  if (platform === 'web') {
    // List of native-only modules to mock or skip
    const nativeOnlyModules = [
      'react-native-maps',
      'expo-sqlite',
      'react-native/Libraries/Utilities/codegenNativeCommands',
    ];
    
    if (nativeOnlyModules.some(mod => moduleName.includes(mod))) {
      if (moduleName === 'react-native-maps' || moduleName.includes('react-native-maps')) {
        return {
          filePath: path.resolve(__dirname, 'src/utils/mapsMock.web.js'),
          type: 'sourceFile',
        };
      }
      if (moduleName === 'expo-sqlite' || moduleName.includes('expo-sqlite')) {
        return {
          filePath: path.resolve(__dirname, 'src/utils/sqliteMock.web.js'),
          type: 'sourceFile',
        };
      }
      // For other native modules, try to return a minimal mock
      return {
        filePath: path.resolve(__dirname, 'src/utils/emptyMock.js'),
        type: 'sourceFile',
      };
    }
  }
  
  // Use original resolver for everything else
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  
  // Fallback to default resolution
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config; 