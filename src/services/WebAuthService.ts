import { AuthUser } from '../types';
import { WebDatabaseService } from './WebDatabaseService';
import logger from '../utils/logger';

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

  // Простой логин для веб админ панели - только по номеру телефона
  async login(phoneNumber: string): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
    try {
      logger.auth('WebAuthService: Авторизация для пользователя', { phoneNumber });
      
      // Инициализируем базу данных если нужно
      await this.dbService.initDatabase();
      
      // Ищем пользователя по номеру телефона
      const user = await this.dbService.getUserByPhone(phoneNumber);
      
      if (!user) {
        return { success: false, error: 'Пользователь не найден. Обратитесь к администратору для добавления в систему.' };
      }

      // Проверяем, что пользователь - админ
      if (user.role !== 'admin') {
        return { success: false, error: 'Доступ разрешен только администраторам' };
      }

      // Проверяем, активен ли пользователь
      if (!user.isActive) {
        return { success: false, error: 'Аккаунт деактивирован' };
      }

      // Сохраняем токен
      await this.saveAuthToken(user.id);
      
      logger.auth('Успешная авторизация администратора', { userName: user.name, userId: user.id });
      return { success: true, user };
    } catch (error) {
      logger.error('Ошибка авторизации', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        phoneNumber 
      });
      return { success: false, error: 'Ошибка сервера' };
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
      
      return user && user.isActive && user.role === 'admin' ? user : null;
    } catch (error) {
      logger.error('Ошибка получения текущего пользователя', { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  // Выход из системы
  async logout(): Promise<void> {
    await this.removeAuthToken();
  }

  // Проверка аутентификации
  async isAuthenticated(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return !!user;
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

  async register(data: Record<string, unknown>): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
    // В веб версии регистрация не поддерживается
    return { success: false, error: 'Registration not supported in web version' };
  }

  async resetPassword(data: Record<string, unknown>): Promise<{ success: boolean; error?: string }> {
    // В веб версии сброс пароля не поддерживается
    return { success: false, error: 'Password reset not supported in web version' };
  }
} 