import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthUser, LoginRequest, RegisterRequest, ResetPasswordRequest, SMSVerification } from '../types';
import { ApiDatabaseService } from './ApiDatabaseService';
import { TwilioService } from './TwilioService';
import { API_CONFIG, getApiUrl } from '../config/api';

export class AuthService {
  private static instance: AuthService;
  private dbService: ApiDatabaseService;
  private twilioService: TwilioService;

  private constructor() {
    this.dbService = ApiDatabaseService.getInstance();
    this.twilioService = TwilioService.getInstance();
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // Helper method for API calls
  private async apiCall(endpoint: string, options: RequestInit = {}): Promise<any> {
    const token = await this.getAuthToken();
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Создаем AbortController для timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15 секунд timeout

    try {
      const response = await fetch(getApiUrl(endpoint), {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `API Error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeout);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout. Please check your connection and try again');
        }
        throw error;
      }
      throw new Error('Network error');
    }
  }

  // Generate 6-digit SMS code
  private generateSMSCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Send SMS through Twilio
  private async sendSMS(phoneNumber: string, code: string, type: 'login' | 'registration'): Promise<boolean> {
    try {
      const result = await this.twilioService.sendVerificationCode(phoneNumber, code, type);
      return result.success;
    } catch (error) {
      return false;
    }
  }

  // Password hashing for SMS codes (SMS код автоматически становится паролем)
  private hashPassword(smsCode: string): string {
    // В реальном приложении используйте bcrypt или другую безопасную библиотеку
    // Используем btoa вместо Buffer для React Native совместимости
    return btoa(smsCode);
  }

  // Проверка SMS-кода/пароля
  private verifyPassword(smsCode: string, hashedPassword: string): boolean {
    return this.hashPassword(smsCode) === hashedPassword;
  }

  // Сохранение токена аутентификации
  private async saveAuthToken(token: string): Promise<void> {
    await AsyncStorage.setItem('authToken', token);
  }

  // Получение токена аутентификации
  async getAuthToken(): Promise<string | null> {
    return await AsyncStorage.getItem('authToken');
  }

  // Удаление токена аутентификации
  async removeAuthToken(): Promise<void> {
    await AsyncStorage.removeItem('authToken');
  }

  // Проверка существует ли пользователь с таким номером
  async checkUserExists(phoneNumber: string): Promise<{ exists: boolean; user?: AuthUser }> {
    try {
      const user = await this.dbService.getUserByPhone(phoneNumber);
      return { exists: !!user, user: user || undefined };
    } catch (error) {
      return { exists: false };
    }
  }

  // Отправка SMS-кода для входа или регистрации
  async sendLoginCode(phoneNumber: string): Promise<{ 
    success: boolean; 
    userExists: boolean; 
    error?: string; 
    needsContact?: boolean;
    isPreRegistered?: boolean;
    isActivated?: boolean;
  }> {
    try {
      const response = await this.apiCall('/auth/send-code', {
        method: 'POST',
        body: JSON.stringify({ phoneNumber }),
      });

      return {
        success: response.success,
        userExists: response.userExists || false,
        error: response.error,
        needsContact: response.needsContact,
        isPreRegistered: response.data?.isPreRegistered,
        isActivated: response.data?.isActivated
      };
    } catch (error) {
      return { 
        success: false, 
        userExists: false, 
        error: error instanceof Error ? error.message : 'Server error',
        needsContact: false
      };
    }
  }

  // Проверка SMS-кода и вход/регистрация
  async verifyLoginCode(phoneNumber: string, code: string): Promise<{ 
    success: boolean; 
    user?: AuthUser; 
    error?: string; 
    needsProfile?: boolean;
    tokens?: { accessToken: string; refreshToken: string };
  }> {
    try {
      const response = await this.apiCall('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ phoneNumber, code }),
      });

      if (response.success && response.tokens) {
        // Сохраняем access token
        await this.saveAuthToken(response.tokens.accessToken);
        // Сохраняем refresh token отдельно
        await AsyncStorage.setItem('refreshToken', response.tokens.refreshToken);
        
                  return { 
          success: true, 
          user: response.user,
          tokens: response.tokens
        };
      }

      return response;
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Server error' };
    }
  }

  // Создание профиля после проверки SMS-кода (для новых пользователей)
  async createUserProfile(phoneNumber: string, name: string, smsCode: string): Promise<{ 
    success: boolean; 
    user?: AuthUser; 
    error?: string;
    tokens?: { accessToken: string; refreshToken: string };
  }> {
    try {
      const response = await this.apiCall('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          phoneNumber,
          name: name.trim(),
          code: smsCode
        }),
      });

      if (response.success && response.tokens) {
        // Сохраняем access token
        await this.saveAuthToken(response.tokens.accessToken);
        // Сохраняем refresh token отдельно
        await AsyncStorage.setItem('refreshToken', response.tokens.refreshToken);
        
                  return { 
          success: true, 
          user: response.user,
          tokens: response.tokens
        };
      }

      return response;
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Server error' };
    }
  }

  // Получение текущего пользователя
  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const token = await this.getAuthToken();
      if (!token) return null;

      const response = await this.apiCall('/auth/me');
      return response.success ? response.user : null;
    } catch (error) {
      return null;
    }
  }

  // Обновление токена
  async refreshToken(): Promise<{ success: boolean; tokens?: { accessToken: string; refreshToken: string }; error?: string }> {
    try {
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      if (!refreshToken) {
        return { success: false, error: 'No refresh token available' };
      }

      const response = await fetch(getApiUrl('/auth/refresh'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Token refresh failed' }));
        throw new Error(errorData.error || 'Token refresh failed');
      }

      const data = await response.json();
      
      if (data.success && data.tokens) {
        // Сохраняем новые токены
        await this.saveAuthToken(data.tokens.accessToken);
        await AsyncStorage.setItem('refreshToken', data.tokens.refreshToken);
        
        return { success: true, tokens: data.tokens };
      }

      return { success: false, error: data.error || 'Token refresh failed' };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Token refresh failed' };
    }
  }

  // Выход из системы
  async logout(): Promise<void> {
    try {
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      
      if (refreshToken) {
        // Уведомляем сервер о выходе
        await this.apiCall('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken }),
        }).catch(() => {
          // Игнорируем ошибки при выходе с сервера
          });
      }
    } catch (error) {
      } finally {
      // Всегда очищаем локальные токены
      await this.removeAuthToken();
      await AsyncStorage.removeItem('refreshToken');
    }
  }

  // Устаревшие методы - оставляем для совместимости, но помечаем как deprecated
  /** @deprecated Используйте sendLoginCode вместо этого */
  async sendVerificationCode(phoneNumber: string, type: 'registration' | 'password_reset'): Promise<boolean> {
    const result = await this.sendLoginCode(phoneNumber);
    return result.success;
  }

  /** @deprecated Используйте verifyLoginCode вместо этого */
  async verifyCode(phoneNumber: string, code: string, type: 'registration' | 'password_reset'): Promise<boolean> {
    const result = await this.verifyLoginCode(phoneNumber, code);
    return result.success;
  }

  /** @deprecated Регистрация теперь происходит через sendLoginCode + createUserProfile */
  async register(data: RegisterRequest): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
    return { success: false, error: 'Method deprecated' };
  }

  /** @deprecated Вход теперь происходит через sendLoginCode + verifyLoginCode */
  async login(data: LoginRequest): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
    return { success: false, error: 'Method deprecated' };
  }

  /** @deprecated Сброс пароля заменен на sendLoginCode */
  async resetPassword(data: ResetPasswordRequest): Promise<{ success: boolean; error?: string }> {
    return { success: false, error: 'Method deprecated' };
  }
} 
