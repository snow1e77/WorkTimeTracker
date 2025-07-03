const NetInfo = {
  fetch: jest.fn(() => Promise.resolve({
    isConnected: true,
    type: 'wifi',
    details: {
      strength: 0.8
    },
    isInternetReachable: true
  })),
  addEventListener: jest.fn(() => jest.fn()),
  configure: jest.fn(),
  useNetInfo: jest.fn(() => ({
    isConnected: true,
    type: 'wifi'
  }))
};

module.exports = NetInfo; 