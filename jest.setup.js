import '@testing-library/jest-native/extend-expect';

// Мокируем AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Мокируем React Navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    replace: jest.fn(),
    reset: jest.fn(),
  }),
  useRoute: () => ({
    params: {}
  }),
  useFocusEffect: jest.fn(),
}));

// Мокируем Expo модули
jest.mock('expo-notifications', () => ({
  requestPermissionsAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
}));

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
  Accuracy: {
    High: 1
  }
}));

jest.mock('expo-task-manager', () => ({
  defineTask: jest.fn(),
  startLocationUpdatesAsync: jest.fn(),
  stopLocationUpdatesAsync: jest.fn(),
}));

// Мокируем Socket.IO
jest.mock('socket.io-client', () => ({
  io: jest.fn(() => ({
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    connected: false
  }))
}));

// Мокируем React Native Paper
jest.mock('react-native-paper', () => ({
  Button: 'Button',
  TextInput: 'TextInput',
  Card: 'Card',
  Title: 'Title',
  Paragraph: 'Paragraph',
  FAB: 'FAB',
  Portal: 'Portal',
  Modal: 'Modal',
  Provider: ({ children }) => children,
  DefaultTheme: {},
  HelperText: 'HelperText',
}));

// Мокируем InternationalPhoneInput
jest.mock('./src/components/InternationalPhoneInput', () => {
  const React = require('react');
  const { TextInput } = require('react-native');
  
  const MockInternationalPhoneInput = (props) => {
    return React.createElement(TextInput, {
      placeholder: props.placeholder,
      value: props.value,
      onChangeText: props.onChangeText,
      testID: 'phone-input'
    });
  };
  
  return {
    __esModule: true,
    default: MockInternationalPhoneInput,
  };
});

// Мокируем Maps
jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  
  const MockMapView = React.forwardRef((props, ref) => {
    return React.createElement(View, props, props.children);
  });
  
  const MockMarker = (props) => {
    return React.createElement(View, props, props.children);
  };
  
  return {
    __esModule: true,
    default: MockMapView,
    Marker: MockMarker,
    PROVIDER_GOOGLE: 'google',
  };
});

// Глобальные настройки для тестов
global.__DEV__ = true;

// Увеличиваем таймаут для тестов
jest.setTimeout(10000);

// Подавляем предупреждения в тестах
console.warn = jest.fn();
console.error = jest.fn(); 