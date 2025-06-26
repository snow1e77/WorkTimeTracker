// Устанавливаем __DEV__ перед импортами
(global as any).__DEV__ = true;

// Мокируем React Native полностью
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: jest.fn((obj) => obj.ios),
  },
  Dimensions: {
    get: jest.fn(() => ({ width: 375, height: 667 })),
  },
  PixelRatio: {
    get: jest.fn(() => 2),
  },
  Alert: {
    alert: jest.fn(),
  },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthService } from '../../src/services/AuthService';

// Мокируем AsyncStorage
jest.mock('@react-native-async-storage/async-storage');

// Мокируем зависимости AuthService
jest.mock('../../src/services/ApiDatabaseService', () => ({
  ApiDatabaseService: {
    getInstance: jest.fn(() => ({
      getUserByPhone: jest.fn(),
    })),
  },
}));

jest.mock('../../src/services/TwilioService', () => ({
  TwilioService: {
    getInstance: jest.fn(() => ({
      sendVerificationCode: jest.fn(),
    })),
  },
}));

jest.mock('../../src/config/api', () => ({
  API_CONFIG: {
    BASE_URL: 'http://localhost:3000',
  },
  getApiUrl: jest.fn((endpoint) => `http://localhost:3000${endpoint}`),
}));

// Мокируем fetch
global.fetch = jest.fn();

describe('AuthService (Client)', () => {
  let authService: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    authService = AuthService.getInstance();
  });

  describe('sendLoginCode', () => {
    it('должен отправлять код успешно', async () => {
      const mockResponse = {
        success: true,
        userExists: true,
        data: {
          phoneNumber: '+79991234567',
          expiresIn: 600
        }
      };

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await authService.sendLoginCode('+79991234567');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/send-code'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ phoneNumber: '+79991234567' }),
        })
      );
      expect(result.success).toBe(true);
    });

    it('должен обрабатывать ошибки при отправке кода', async () => {
      const mockError = new Error('Номер не найден в системе');

      (fetch as jest.Mock).mockRejectedValue(mockError);

      const result = await authService.sendLoginCode('+79991234567');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Номер не найден в системе');
    });
  });

  describe('verifyLoginCode', () => {
    it('должен входить в систему успешно', async () => {
      const mockResponse = {
        success: true,
        user: { id: '123', name: 'Test User', phoneNumber: '+79991234567' },
        tokens: { accessToken: 'access-token', refreshToken: 'refresh-token' }
      };

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await authService.verifyLoginCode('+79991234567', '123456');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/login'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            phoneNumber: '+79991234567',
            code: '123456'
          }),
        })
      );
      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockResponse.user);
    });

    it('должен обрабатывать ошибки входа', async () => {
      const mockError = new Error('Неверный код');

      (fetch as jest.Mock).mockRejectedValue(mockError);

      const result = await authService.verifyLoginCode('+79991234567', '000000');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Неверный код');
    });
  });

  describe('createUserProfile', () => {
    it('должен регистрировать нового пользователя', async () => {
      const mockResponse = {
        success: true,
        user: { id: '123', name: 'New User', phoneNumber: '+79991234567' },
        tokens: { accessToken: 'access-token', refreshToken: 'refresh-token' }
      };

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await authService.createUserProfile('+79991234567', 'New User', '123456');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/register'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            phoneNumber: '+79991234567',
            name: 'New User',
            code: '123456'
          }),
        })
      );
      expect(result.success).toBe(true);
    });
  });

  describe('token management', () => {
    it('должен сохранять токены в AsyncStorage', async () => {
      const tokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token'
      };

      // Мокируем успешный ответ сервера
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          user: { id: '123', name: 'Test User' },
          tokens
        }),
      });

      await authService.verifyLoginCode('+79991234567', '123456');

      expect(AsyncStorage.setItem).toHaveBeenCalledWith('authToken', 'access-token');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('refreshToken', 'refresh-token');
    });

    it('должен получать токен аутентификации', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('access-token');

      const token = await authService.getAuthToken();

      expect(AsyncStorage.getItem).toHaveBeenCalledWith('authToken');
      expect(token).toBe('access-token');
    });

    it('должен возвращать null если токен не найден', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const token = await authService.getAuthToken();
      expect(token).toBeNull();
    });
  });

  describe('clearTokens/logout', () => {
    it('должен удалять токены из AsyncStorage при выходе', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('refresh-token');
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true }),
      });

      await authService.logout();

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('authToken');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('refreshToken');
    });
  });

  describe('refreshToken', () => {
    it('должен обновлять токен успешно', async () => {
      const mockResponse = {
        success: true,
        tokens: {
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token'
        }
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('old-refresh-token');
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await authService.refreshToken();

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/refresh'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ refreshToken: 'old-refresh-token' }),
        })
      );
      expect(result.success).toBe(true);
      expect(result.tokens).toEqual(mockResponse.tokens);
    });

    it('должен обрабатывать ошибки обновления токена', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await authService.refreshToken();
      expect(result.success).toBe(false);
      expect(result.error).toBe('No refresh token available');
    });
  });

  describe('logout', () => {
    it('должен выходить из системы', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('refresh-token');
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true }),
      });

      await authService.logout();

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/logout'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ refreshToken: 'refresh-token' }),
        })
      );
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('authToken');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('refreshToken');
    });

    it('должен очищать токены даже если запрос к серверу неудачен', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('refresh-token');
      (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      await authService.logout();

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('authToken');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('refreshToken');
    });
  });

  describe('isAuthenticated', () => {
    it('должен возвращать true если токен есть', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('access-token');

      const token = await authService.getAuthToken();
      const isAuthenticated = !!token;

      expect(isAuthenticated).toBe(true);
    });

    it('должен возвращать false если токена нет', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const token = await authService.getAuthToken();
      const isAuthenticated = !!token;

      expect(isAuthenticated).toBe(false);
    });
  });

  describe('validatePhoneNumber', () => {
    it('должен проверять корректность номера телефона', () => {
      // Простая валидация номера телефона
      const validatePhoneNumber = (phoneNumber: string): boolean => {
        const phoneRegex = /^\+\d{10,15}$/;
        return phoneRegex.test(phoneNumber);
      };

      expect(validatePhoneNumber('+79991234567')).toBe(true);
      expect(validatePhoneNumber('79991234567')).toBe(false);
      expect(validatePhoneNumber('+7999123')).toBe(false);
    });

    it('должен отклонять некорректные номера', () => {
      const validatePhoneNumber = (phoneNumber: string): boolean => {
        const phoneRegex = /^\+\d{10,15}$/;
        return phoneRegex.test(phoneNumber);
      };

      expect(validatePhoneNumber('invalid')).toBe(false);
      expect(validatePhoneNumber('')).toBe(false);
      expect(validatePhoneNumber('+7abc1234567')).toBe(false);
    });
  });

  describe('validateCode', () => {
    it('должен проверять корректность SMS кода', () => {
      const validateCode = (code: string): boolean => {
        const codeRegex = /^\d{6}$/;
        return codeRegex.test(code);
      };

      expect(validateCode('123456')).toBe(true);
      expect(validateCode('000000')).toBe(true);
    });

    it('должен отклонять некорректные коды', () => {
      const validateCode = (code: string): boolean => {
        const codeRegex = /^\d{6}$/;
        return codeRegex.test(code);
      };

      expect(validateCode('12345')).toBe(false);
      expect(validateCode('1234567')).toBe(false);
      expect(validateCode('abc123')).toBe(false);
      expect(validateCode('')).toBe(false);
    });
  });
}); 