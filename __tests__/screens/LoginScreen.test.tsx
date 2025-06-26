import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import LoginScreen from '../../src/screens/LoginScreen';
import { AuthContext } from '../../src/contexts/AuthContext';

// Мокируем AuthService
const mockAuthService = {
  sendLoginCode: jest.fn(),
  verifyLoginCode: jest.fn(),
  createUserProfile: jest.fn(),
};

jest.mock('../../src/services/AuthService', () => ({
  AuthService: {
    getInstance: () => mockAuthService
  }
}));

// Мокируем API конфигурацию
jest.mock('../../src/config/api', () => ({
  API_BASE_URL: 'http://localhost:3001',
  API_ENDPOINTS: {
    AUTH: {
      SEND_CODE: '/api/auth/send-code',
      LOGIN: '/api/auth/login',
    }
  }
}));

// Мокируем navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

// Создаем обертку для компонента
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const mockAuthContext = {
    user: null,
    login: jest.fn(),
    logout: jest.fn(),
    isLoading: false,
    isAuthenticated: false,
    sendLoginCode: jest.fn(),
    verifyLoginCode: jest.fn(),
    createUserProfile: jest.fn(),
    refreshToken: jest.fn(),
    register: jest.fn(),
    checkAuthStatus: jest.fn(),
  };

  return (
    <PaperProvider>
      <NavigationContainer>
        <AuthContext.Provider value={mockAuthContext}>
          {children}
        </AuthContext.Provider>
      </NavigationContainer>
    </PaperProvider>
  );
};

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
  });

  it('должен рендериться корректно', () => {
    const { getByText } = render(
      <TestWrapper>
        <LoginScreen />
      </TestWrapper>
    );

    expect(getByText('Sign In')).toBeTruthy();
    expect(getByText('Enter your phone number to receive an SMS code')).toBeTruthy();
  });

  it('должен показывать поле ввода номера телефона', () => {
    const { getByPlaceholderText } = render(
      <TestWrapper>
        <LoginScreen />
      </TestWrapper>
    );

    expect(getByPlaceholderText('Enter phone number')).toBeTruthy();
  });

  it('должен показывать кнопку получения кода', () => {
    const { getByText } = render(
      <TestWrapper>
        <LoginScreen />
      </TestWrapper>
    );

    expect(getByText('Get Code')).toBeTruthy();
  });

  it('должен валидировать номер телефона', async () => {
    const { getByPlaceholderText, getByText } = render(
      <TestWrapper>
        <LoginScreen />
      </TestWrapper>
    );

    const phoneInput = getByPlaceholderText('Enter phone number');
    const sendCodeButton = getByText('Get Code');

    // Вводим невалидный номер
    fireEvent.changeText(phoneInput, '123');
    fireEvent.press(sendCodeButton);

    await waitFor(() => {
      expect(getByText(/Enter a valid phone number/)).toBeTruthy();
    });
  });

  it('должен отправлять код при валидном номере телефона', async () => {
    mockAuthService.sendLoginCode.mockResolvedValue({ success: true, userExists: true });

    const { getByPlaceholderText, getByText } = render(
      <TestWrapper>
        <LoginScreen />
      </TestWrapper>
    );

    const phoneInput = getByPlaceholderText('Enter phone number');
    const sendCodeButton = getByText('Get Code');

    // Вводим валидный номер
    fireEvent.changeText(phoneInput, '1234567890');
    fireEvent.press(sendCodeButton);

    await waitFor(() => {
      expect(mockAuthService.sendLoginCode).toHaveBeenCalledWith('+11234567890');
    });
  });

  it('должен показывать поле ввода кода после успешной отправки', async () => {
    mockAuthService.sendLoginCode.mockResolvedValue({ success: true, userExists: true });

    const { getByPlaceholderText, getByText, queryByPlaceholderText } = render(
      <TestWrapper>
        <LoginScreen />
      </TestWrapper>
    );

    const phoneInput = getByPlaceholderText('Enter phone number');
    const sendCodeButton = getByText('Get Code');

    fireEvent.changeText(phoneInput, '1234567890');
    fireEvent.press(sendCodeButton);

    await waitFor(() => {
      expect(queryByPlaceholderText('Enter SMS code')).toBeTruthy();
    });
  });

  it('должен обрабатывать ошибки при отправке кода', async () => {
    mockAuthService.sendLoginCode.mockResolvedValue({ 
      success: false, 
      error: 'Phone number not found in system' 
    });

    const { getByPlaceholderText, getByText } = render(
      <TestWrapper>
        <LoginScreen />
      </TestWrapper>
    );

    const phoneInput = getByPlaceholderText('Enter phone number');
    const sendCodeButton = getByText('Get Code');

    fireEvent.changeText(phoneInput, '1234567890');
    fireEvent.press(sendCodeButton);

    await waitFor(() => {
      expect(getByText('Phone number not found in system')).toBeTruthy();
    });
  });

  it('должен аутентифицировать пользователя с правильным кодом', async () => {
    mockAuthService.sendLoginCode.mockResolvedValue({ success: true, userExists: true });
    mockAuthService.verifyLoginCode.mockResolvedValue({ 
      success: true,
      user: { id: '123', name: 'Test User' }
    });

    const { getByPlaceholderText, getByText } = render(
      <TestWrapper>
        <LoginScreen />
      </TestWrapper>
    );

    const phoneInput = getByPlaceholderText('Enter phone number');
    let sendCodeButton = getByText('Get Code');

    // Шаг 1: Отправляем код
    fireEvent.changeText(phoneInput, '1234567890');
    fireEvent.press(sendCodeButton);

    await waitFor(() => {
      expect(getByText('Sign In')).toBeTruthy();
    });

    // Шаг 2: Вводим код и входим
    const codeInput = getByPlaceholderText('Enter SMS code');
    const verifyButton = getByText('Sign In');

    fireEvent.changeText(codeInput, '123456');
    fireEvent.press(verifyButton);

    await waitFor(() => {
      expect(mockAuthService.verifyLoginCode).toHaveBeenCalledWith('+11234567890', '123456');
      expect(mockNavigate).toHaveBeenCalledWith('Home');
    });
  });

  it('должен обрабатывать ошибки входа', async () => {
    mockAuthService.sendLoginCode.mockResolvedValue({ success: true, userExists: true });
    mockAuthService.verifyLoginCode.mockResolvedValue({ 
      success: false, 
      error: 'Invalid code' 
    });

    const { getByPlaceholderText, getByText } = render(
      <TestWrapper>
        <LoginScreen />
      </TestWrapper>
    );

    const phoneInput = getByPlaceholderText('Enter phone number');
    let sendCodeButton = getByText('Get Code');

    // Отправляем код
    fireEvent.changeText(phoneInput, '1234567890');
    fireEvent.press(sendCodeButton);

    await waitFor(() => {
      expect(getByText('Sign In')).toBeTruthy();
    });

    // Вводим неверный код
    const codeInput = getByPlaceholderText('Enter SMS code');
    const verifyButton = getByText('Sign In');

    fireEvent.changeText(codeInput, '000000');
    fireEvent.press(verifyButton);

    await waitFor(() => {
      expect(getByText('Invalid code')).toBeTruthy();
    });
  });

  it('должен переключаться на экран создания профиля для новых пользователей', async () => {
    mockAuthService.sendLoginCode.mockResolvedValue({ success: true, userExists: false });
    mockAuthService.verifyLoginCode.mockResolvedValue({ 
      success: true,
      needsProfile: true
    });

    const { getByPlaceholderText, getByText } = render(
      <TestWrapper>
        <LoginScreen />
      </TestWrapper>
    );

    const phoneInput = getByPlaceholderText('Enter phone number');
    let sendCodeButton = getByText('Get Code');

    // Отправляем код
    fireEvent.changeText(phoneInput, '1234567890');
    fireEvent.press(sendCodeButton);

    await waitFor(() => {
      expect(getByText('Phone Verification')).toBeTruthy();
    });

    // Входим
    const codeInput = getByPlaceholderText('Enter SMS code');
    const verifyButton = getByText('Verify');

    fireEvent.changeText(codeInput, '123456');
    fireEvent.press(verifyButton);

    await waitFor(() => {
      expect(getByText('Create Profile')).toBeTruthy();
    });
  });
}); 