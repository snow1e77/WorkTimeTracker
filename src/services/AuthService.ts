import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthUser, LoginRequest, RegisterRequest } from '../types';
import { ApiDatabaseService } from './ApiDatabaseService';
import { API_CONFIG, getApiUrl } from '../config/api';

export class AuthService {
  private static instance: AuthService;
  private dbService: ApiDatabaseService;

  private constructor() {
    this.dbService = ApiDatabaseService.getInstance();
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
    await AsyncStorage.removeItem('refreshToken');
  }

  // Простой вход только по номеру телефона
  async login(phoneNumber: string): Promise<{ 
    success: boolean; 
    user?: AuthUser; 
    error?: string; 
    needsContact?: boolean;
    tokens?: { accessToken: string; refreshToken: string };
  }> {
    try {
      const response = await this.apiCall('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ phoneNumber }),
      });

      if (response.success && response.data?.user && response.data?.tokens) {
        // Сохраняем tokens
        await this.saveAuthToken(response.data.tokens.accessToken);
        await AsyncStorage.setItem('refreshToken', response.data.tokens.refreshToken);
        
        return { 
          success: true, 
          user: response.data.user,
          tokens: response.data.tokens
        };
      }

      return {
        success: false,
        error: response.error,
        needsContact: response.needsContact
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Ошибка сервера',
        needsContact: false
      };
    }
  }

  // Регистрация нового пользователя (только для предварительно зарегистрированных)
  async register(phoneNumber: string, name: string): Promise<{ 
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
          name: name.trim()
        }),
      });

      if (response.success && response.data?.user && response.data?.tokens) {
        // Сохраняем tokens
        await this.saveAuthToken(response.data.tokens.accessToken);
        await AsyncStorage.setItem('refreshToken', response.data.tokens.refreshToken);
        
        return { 
          success: true, 
          user: response.data.user,
          tokens: response.data.tokens
        };
      }

      return response;
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Ошибка сервера' };
    }
  }

  // Получение текущего пользователя
  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const response = await this.apiCall('/auth/me');
      return response.success ? response.data.user : null;
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

      const response = await this.apiCall('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      });

      if (response.success && response.data) {
        await this.saveAuthToken(response.data.accessToken);
        await AsyncStorage.setItem('refreshToken', response.data.refreshToken);
        return { success: true, tokens: response.data };
      }

      return { success: false, error: response.error };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Server error' };
    }
  }

  // Выход
  async logout(): Promise<void> {
    try {
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      
      if (refreshToken) {
        // Пытаемся уведомить сервер о выходе
        try {
          await this.apiCall('/auth/logout', {
            method: 'POST',
            body: JSON.stringify({ refreshToken }),
          });
        } catch (error) {
          // Игнорируем ошибки при logout на сервере
        }
      }
    } finally {
      // В любом случае очищаем локальные токены
      await this.removeAuthToken();
    }
  }

  // Проверка аутентификации
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getAuthToken();
    if (!token) {
      return false;
    }

    // Проверяем токен через API
    try {
      const user = await this.getCurrentUser();
      return !!user;
    } catch (error) {
      // Если токен недействителен, пытаемся обновить
      const refreshResult = await this.refreshToken();
      return refreshResult.success;
    }
  }
} 
