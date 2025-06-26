module.exports = {
  preset: 'react-native',
  setupFiles: ['<rootDir>/jest.setup.global.js'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-native-.*|@react-navigation|react-navigation|@expo|expo|expo-.*|@react-native-async-storage|react-native-paper|react-native-vector-icons|react-native-safe-area-context|react-native-screens)/)'
  ],
  testMatch: [
    '**/__tests__/**/*.test.{js,jsx,ts,tsx}',
    '**/?(*.)+(spec|test).{js,jsx,ts,tsx}'
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/utils/emptyMock.js',
    '!src/utils/mapsMock.web.js'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^react-native-maps$': '<rootDir>/src/utils/mapsMock.web.js'
  },
  testEnvironment: 'react-native',
  globals: {
    '__DEV__': true,
    '__RCT_DEV_MENU_ENABLED__': false,
    '__RCT_NEW_ARCH_ENABLED__': false,
    '__BUNDLE_START_TIME__': 0,
    'global': {}
  }
}; 