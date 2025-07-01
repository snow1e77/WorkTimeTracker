import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import LoginScreen from '../../src/screens/LoginScreen';
import { AuthService } from '../../src/services/AuthService';

// Mock навигации
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

// Mock AuthService
jest.mock('../../src/services/AuthService');
const mockAuthService = {
  login: jest.fn(),
  register: jest.fn(),
};

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AuthService.getInstance as jest.Mock).mockReturnValue(mockAuthService);
  });

  it('должен отображать экран входа', () => {
    const { getByText, getByPlaceholderText } = render(<LoginScreen />);
    
    expect(getByText('Вход в систему')).toBeTruthy();
    expect(getByPlaceholderText('Введите номер телефона')).toBeTruthy();
    expect(getByText('Войти')).toBeTruthy();
  });

  it('должен показывать ошибку при некорректном номере телефона', async () => {
    const { getByPlaceholderText, getByText } = render(<LoginScreen />);
    
    const phoneInput = getByPlaceholderText('Введите номер телефона');
    const loginButton = getByText('Войти');
    
    fireEvent.changeText(phoneInput, '123');
    fireEvent.press(loginButton);
    
    await waitFor(() => {
      expect(getByText('Введите корректный номер телефона')).toBeTruthy();
    });
  });

  it('должен вызвать AuthService.login при корректном номере', async () => {
    mockAuthService.login.mockResolvedValue({
      success: true,
      user: { id: '1', phoneNumber: '+11234567890', name: 'Test User', role: 'worker' },
    });

    const { getByPlaceholderText, getByText } = render(<LoginScreen />);
    
    const phoneInput = getByPlaceholderText('Введите номер телефона');
    const loginButton = getByText('Войти');
    
    fireEvent.changeText(phoneInput, '+11234567890');
    fireEvent.press(loginButton);
    
    await waitFor(() => {
      expect(mockAuthService.login).toHaveBeenCalledWith('+11234567890');
    });
  });

  it('должен перенаправить на домашний экран при успешном входе', async () => {
    mockAuthService.login.mockResolvedValue({
      success: true,
      user: { id: '1', phoneNumber: '+11234567890', name: 'Test User', role: 'worker' },
    });

    const { getByPlaceholderText, getByText } = render(<LoginScreen />);
    
    const phoneInput = getByPlaceholderText('Введите номер телефона');
    const loginButton = getByText('Войти');
    
    fireEvent.changeText(phoneInput, '+11234567890');
    fireEvent.press(loginButton);
    
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('Home');
    });
  });

  it('должен показать ошибку при неуспешном входе', async () => {
    mockAuthService.login.mockResolvedValue({
      success: false,
      error: 'Пользователь не найден'
    });

    const { getByPlaceholderText, getByText } = render(<LoginScreen />);
    
    const phoneInput = getByPlaceholderText('Введите номер телефона');
    const loginButton = getByText('Войти');
    
    fireEvent.changeText(phoneInput, '+11234567890');
    fireEvent.press(loginButton);
    
    await waitFor(() => {
      expect(getByText('Пользователь не найден')).toBeTruthy();
    });
  });
}); 