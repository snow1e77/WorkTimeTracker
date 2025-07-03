module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest.setup.global.js'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  globals: {
    '__DEV__': true,
    '__RCT_DEV_MENU_ENABLED__': false,
    '__RCT_NEW_ARCH_ENABLED__': false,
    '__BUNDLE_START_TIME__': 0
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-native-.*|@react-navigation|react-navigation|@expo|expo|expo-.*|@react-native-async-storage|@react-native-community|react-native-paper|react-native-vector-icons|react-native-safe-area-context|react-native-screens|@sentry|is-online|axios)/)'
  ],
  testMatch: [
    '**/__tests__/**/*.test.{js,jsx,ts,tsx}',
    '**/?(*.)+(spec|test).{js,jsx,ts,tsx}'
  ],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/server/'
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
    '^react-native-maps$': '<rootDir>/src/utils/mapsMock.web.js',
    '^@react-native-community/netinfo$': '<rootDir>/src/utils/__mocks__/netinfo.js',
    '^is-online$': '<rootDir>/src/utils/__mocks__/is-online.js',
    '^@sentry/react-native$': '<rootDir>/src/utils/__mocks__/sentry.js'
  },
  testEnvironment: 'node',
  testTimeout: 10000
}; 