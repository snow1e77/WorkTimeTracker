import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthUser, LoginRequest, RegisterRequest } from '../types';
import { ApiDatabaseService } from './ApiDatabaseService';
import { API_CONFIG, getApiUrl } from '../config/api';
import logger from '../utils/logger';

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

  // Сохранение данных пользователя
  private async saveUser(user: AuthUser): Promise<void> {
    await AsyncStorage.setItem('currentUser', JSON.stringify(user));
  }

  // Получение данных пользователя из хранилища
  private async getSavedUser(): Promise<AuthUser | null> {
    try {
      const userData = await AsyncStorage.getItem('currentUser');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      logger.error('Error loading saved user', { error: error instanceof Error ? error.message : 'Unknown error' }, 'auth');
      return null;
    }
  }

  // Получение токена аутентификации
  async getAuthToken(): Promise<string | null> {
    return await AsyncStorage.getItem('authToken');
  }

  // Удаление токена аутентификации
  async removeAuthToken(): Promise<void> {
    await AsyncStorage.removeItem('authToken');
    await AsyncStorage.removeItem('refreshToken');
    await AsyncStorage.removeItem('currentUser');
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
      logger.auth('Starting login process', { phoneNumber });
      
      const response = await this.apiCall('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ phoneNumber }),
      });

      logger.auth('API response received', {
        success: response.success,
        hasUser: !!response.data?.user,
        hasTokens: !!response.data?.tokens
      });

      if (response.success && response.data?.user && response.data?.tokens) {
        // Сохраняем tokens с дополнительной проверкой
        logger.auth('Saving tokens to storage');
        
        await this.saveAuthToken(response.data.tokens.accessToken);
        await AsyncStorage.setItem('refreshToken', response.data.tokens.refreshToken);
        await this.saveUser(response.data.user);
        
        // Дополнительная проверка что токены сохранились
        const savedToken = await this.getAuthToken();
        const savedRefreshToken = await AsyncStorage.getItem('refreshToken');
        const savedUser = await this.getSavedUser();
        
        logger.auth('Verification after save', {
          hasAccessToken: !!savedToken,
          hasRefreshToken: !!savedRefreshToken,
          hasSavedUser: !!savedUser
        });
        
        if (!savedToken || !savedRefreshToken || !savedUser) {
          logger.warn('Tokens or user not saved properly, retrying', {}, 'auth');
          // Повторяем попытку сохранения
          await this.saveAuthToken(response.data.tokens.accessToken);
          await AsyncStorage.setItem('refreshToken', response.data.tokens.refreshToken);
          await this.saveUser(response.data.user);
        }
        
        logger.auth('Login process completed successfully');
        
        return { 
          success: true, 
          user: response.data.user,
          tokens: response.data.tokens
        };
      }

      logger.auth('Login failed', {
        error: response.error,
        needsContact: response.needsContact
      });

      return {
        success: false,
        error: response.error,
        needsContact: response.needsContact
      };
    } catch (error) {
      logger.error('Login exception occurred', { error: error instanceof Error ? error.message : 'Unknown error' }, 'auth');
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
      logger.auth('Starting registration process', { phoneNumber });
      
      const response = await this.apiCall('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          phoneNumber,
          name: name.trim()
        }),
      });

      logger.auth('Registration API response received', {
        success: response.success,
        hasUser: !!response.data?.user,
        hasTokens: !!response.data?.tokens
      });

      if (response.success && response.data?.user && response.data?.tokens) {
        // Сохраняем tokens с дополнительной проверкой
        logger.auth('Saving registration tokens to storage');
        
        await this.saveAuthToken(response.data.tokens.accessToken);
        await AsyncStorage.setItem('refreshToken', response.data.tokens.refreshToken);
        await this.saveUser(response.data.user);
        
        // Дополнительная проверка что токены сохранились
        const savedToken = await this.getAuthToken();
        const savedRefreshToken = await AsyncStorage.getItem('refreshToken');
        const savedUser = await this.getSavedUser();
        
        logger.auth('Registration verification after save', {
          hasAccessToken: !!savedToken,
          hasRefreshToken: !!savedRefreshToken,
          hasSavedUser: !!savedUser
        });
        
        if (!savedToken || !savedRefreshToken || !savedUser) {
          logger.warn('Registration tokens or user not saved properly, retrying', {}, 'auth');
          // Повторяем попытку сохранения
          await this.saveAuthToken(response.data.tokens.accessToken);
          await AsyncStorage.setItem('refreshToken', response.data.tokens.refreshToken);
          await this.saveUser(response.data.user);
        }
        
        logger.auth('Registration process completed successfully');
        
        return { 
          success: true, 
          user: response.data.user,
          tokens: response.data.tokens
        };
      }

      logger.auth('Registration failed', {
        error: response.error
      });

      return {
        success: false,
        error: response.error
      };
    } catch (error) {
      logger.error('Registration exception occurred', { error: error instanceof Error ? error.message : 'Unknown error' }, 'auth');
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Ошибка сервера'
      };
    }
  }

  // Получение текущего пользователя
  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      logger.auth('Checking current user');
      const token = await this.getAuthToken();
      logger.auth('Token exists', { hasToken: !!token });
      
      if (!token) {
        logger.auth('No token found');
        return null;
      }
      
      // Сначала проверяем сохраненного пользователя
      const savedUser = await this.getSavedUser();
      if (savedUser) {
        logger.auth('Found saved user', { userName: savedUser.name });
        // Проверяем токен на сервере в фоне, но возвращаем сохраненного пользователя
        this.validateTokenInBackground();
        return savedUser;
      }
      
      const response = await this.apiCall('/auth/me');
      logger.auth('API response', {
        success: response.success,
        hasUser: !!response.data?.user
      });
      
      if (response.success && response.data?.user) {
        await this.saveUser(response.data.user);
        return response.data.user;
      }
      
      return null;
    } catch (error) {
      logger.error('Exception occurred', { error: error instanceof Error ? error.message : 'Unknown error' });
      return null;
    }
  }
  
  // Проверка токена в фоне
  private async validateTokenInBackground(): Promise<void> {
    try {
      const response = await this.apiCall('/auth/me');
      if (!response.success) {
        // Если токен недействителен, очищаем сохраненного пользователя
        await AsyncStorage.removeItem('currentUser');
      }
    } catch (error) {
      // Если ошибка, то возможно токен устарел
      logger.warn('Background token validation failed', { error: error instanceof Error ? error.message : 'Unknown error' }, 'auth');
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
