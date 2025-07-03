const Sentry = {
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  addBreadcrumb: jest.fn(),
  setContext: jest.fn(),
  setUser: jest.fn(),
  setTag: jest.fn(),
  setTags: jest.fn(),
  setExtra: jest.fn(),
  setExtras: jest.fn(),
  ReactNativeTracing: jest.fn().mockImplementation(() => ({})),
  getGlobalHub: jest.fn(() => ({
    getClient: jest.fn(() => ({
      isEnabled: jest.fn(() => true)
    }))
  })),
  getCurrentHub: jest.fn(() => ({
    getClient: jest.fn(() => ({
      isEnabled: jest.fn(() => true)
    }))
  }))
};

module.exports = Sentry; 