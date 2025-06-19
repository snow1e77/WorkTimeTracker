import { AuthUser, LoginRequest } from '../types';
import { WebDatabaseService } from './WebDatabaseService';

export class WebAuthService {
  private static instance: WebAuthService;
  private dbService: WebDatabaseService;

  private constructor() {
    this.dbService = WebDatabaseService.getInstance();
  }

  static getInstance(): WebAuthService {
    if (!WebAuthService.instance) {
      WebAuthService.instance = new WebAuthService();
    }
    return WebAuthService.instance;
  }

  // Простая проверка пароля для веб версии (без хеширования для демонстрации)
  private verifyPassword(password: string, storedPassword: string): boolean {
    return password === storedPassword;
  }

  // Сохранение токена аутентификации в localStorage
  private async saveAuthToken(userId: string): Promise<void> {
    localStorage.setItem('authToken', userId);
  }

  // Получение токена аутентификации из localStorage
  async getAuthToken(): Promise<string | null> {
    return localStorage.getItem('authToken');
  }

  // Удаление токена аутентификации
  async removeAuthToken(): Promise<void> {
    localStorage.removeItem('authToken');
  }

  // Простой логин для веб админ панели
  async login(phoneNumber: string, password: string): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
    try {
      console.log('🔄 WebAuthService: Авторизация для:', phoneNumber);
      
      // Инициализируем базу данных если нужно
      await this.dbService.initDatabase();
      
      // Ищем пользователя по номеру телефона
      const user = await this.dbService.getUserByPhone(phoneNumber);
      
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Проверяем пароль
      const storedPassword = await this.dbService.getUserPassword(user.id);
      
      if (!storedPassword || !this.verifyPassword(password, storedPassword)) {
        return { success: false, error: 'Invalid credentials' };
      }

      // Проверяем, активен ли пользователь
      if (!user.isActive) {
        return { success: false, error: 'Account is deactivated' };
      }

      // Сохраняем токен
      await this.saveAuthToken(user.id);
      
      console.log('✅ Успешная авторизация:', user.name);
      return { success: true, user };
    } catch (error) {
      console.error('❌ Ошибка авторизации:', error);
      return { success: false, error: 'Server error' };
    }
  }

  // Получение текущего пользователя по токену
  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const token = await this.getAuthToken();
      
      if (!token) {
        return null;
      }

      await this.dbService.initDatabase();
      const user = await this.dbService.getUserById(token);
      
      return user && user.isActive ? user : null;
    } catch (error) {
      console.error('Ошибка получения текущего пользователя:', error);
      return null;
    }
  }

  // Выход из системы
  async logout(): Promise<void> {
    await this.removeAuthToken();
  }

  // Устаревшие методы для совместимости
  async sendVerificationCode(phoneNumber: string): Promise<boolean> {
    // В веб версии не используем SMS
    return false;
  }

  async verifyCode(phoneNumber: string, code: string): Promise<boolean> {
    // В веб версии не используем SMS
    return false;
  }

  async register(data: any): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
    // В веб версии регистрация не поддерживается
    return { success: false, error: 'Registration not supported in web version' };
  }

  async resetPassword(data: any): Promise<{ success: boolean; error?: string }> {
    // В веб версии сброс пароля не поддерживается
    return { success: false, error: 'Password reset not supported in web version' };
  }
} 