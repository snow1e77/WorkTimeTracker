// Empty mock for native-only modules that are not available on web
const emptyFunction = () => {};
const emptyObject = {};
const emptyPromise = () => Promise.resolve();

// Export all possible variants
export default emptyObject;

// Common expo module exports
export const codegenNativeCommands = emptyFunction;
export const codegenNativeComponent = emptyFunction;

// Task Manager mocks
export const defineTask = emptyFunction;
export const startLocationUpdatesAsync = emptyPromise;
export const stopLocationUpdatesAsync = emptyPromise;
export const isTaskRegisteredAsync = () => Promise.resolve(false);
export const unregisterAllTasksAsync = emptyPromise;

// Notifications mocks
export const requestPermissionsAsync = () => Promise.resolve({ status: 'granted' });
export const scheduleNotificationAsync = emptyPromise;
export const cancelAllScheduledNotificationsAsync = emptyPromise;
export const setNotificationHandler = emptyFunction;

// Device mocks
export const getDeviceTypeAsync = () => Promise.resolve(2);
export const osName = 'web';
export const osVersion = '1.0';

// Image Picker mocks
export const launchImageLibraryAsync = () => Promise.resolve({ cancelled: true });
export const MediaTypeOptions = { All: 'All', Videos: 'Videos', Images: 'Images' };

// Location mocks
export const getCurrentPositionAsync = () => Promise.resolve({
  coords: {
    latitude: 37.7749,
    longitude: -122.4194,
    accuracy: 10,
    altitude: null,
    altitudeAccuracy: null,
    heading: null,
    speed: null,
  },
  timestamp: Date.now(),
});

export const requestForegroundPermissionsAsync = () => Promise.resolve({ status: 'granted' });
export const requestBackgroundPermissionsAsync = () => Promise.resolve({ status: 'granted' }); 