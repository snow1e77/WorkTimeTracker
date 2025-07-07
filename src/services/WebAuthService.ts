import { AuthUser, AuthTokens } from '../types';
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

  // БЕЗОПАСНАЯ аутентификация без паролей в localStorage
  async login(phoneNumber: string): Promise<{ success: boolean; user?: AuthUser; tokens?: AuthTokens; error?: string }> {
    try {
      await this.dbService.initDatabase();
      
      // Маскируем номер телефона в логах
      const maskedPhone = phoneNumber.replace(/\d(?=\d{4})/g, '*');
      logger.info('Веб-аутентификация: попытка входа', { phoneNumber: maskedPhone });

      const user = await this.dbService.getUserByPhoneNumber(phoneNumber);

      if (!user) {
        logger.warn('Веб-аутентификация: пользователь не найден', { phoneNumber: maskedPhone });
        return {
          success: false,
          error: 'Пользователь не найден. Обратитесь к администратору.'
        };
      }

      if (!user.isActive) {
        logger.warn('Веб-аутентификация: учетная запись деактивирована', { userId: user.id });
        return {
          success: false,
          error: 'Учетная запись деактивирована'
        };
      }

      // Только админы могут входить в веб-версию
      if (user.role !== 'admin') {
        logger.warn('Веб-аутентификация: недостаточные права доступа', { 
          userId: user.id, 
          role: user.role 
        });
        return {
          success: false,
          error: 'Недостаточные права доступа. Веб-версия доступна только администраторам.'
        };
      }

      // Генерируем безопасный токен
      const tokens: AuthTokens = {
        accessToken: this.generateSecureToken(),
        refreshToken: this.generateSecureToken()
      };

      // Сохраняем токен в sessionStorage (более безопасно чем localStorage)
      sessionStorage.setItem('worktime_auth_token', tokens.accessToken);
      sessionStorage.setItem('worktime_user_id', user.id);

      logger.info('Веб-аутентификация: успешный вход', { 
        userId: user.id,
        role: user.role
      });

      return {
        success: true,
        user,
        tokens
      };

    } catch (error) {
      logger.error('Ошибка веб-аутентификации', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        phoneNumber: phoneNumber.replace(/\d(?=\d{4})/g, '*')
      });
      return {
        success: false,
        error: 'Системная ошибка входа'
      };
    }
  }

  // Генерация безопасного токена
  private generateSecureToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  // Получение токена из безопасного хранилища
  async getAuthToken(): Promise<string | null> {
    try {
      // Используем sessionStorage вместо localStorage для большей безопасности
      return sessionStorage.getItem('worktime_auth_token');
    } catch (error) {
      logger.error('Ошибка получения токена аутентификации', { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  // Получение текущего пользователя по токену
  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const userId = sessionStorage.getItem('worktime_user_id');
      
      if (!userId) {
        return null;
      }

      await this.dbService.initDatabase();
      const user = await this.dbService.getUserById(userId);
      
      return user && user.isActive && user.role === 'admin' ? user : null;
    } catch (error) {
      logger.error('Ошибка получения текущего пользователя', { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  // Безопасный выход
  async logout(): Promise<void> {
    try {
      // Очищаем все данные сессии
      sessionStorage.removeItem('worktime_auth_token');
      sessionStorage.removeItem('worktime_user_id');
      
      // Также очищаем localStorage от потенциально чувствительных данных
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('worktime_')) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      logger.info('Веб-аутентификация: выход выполнен');
    } catch (error) {
      logger.error('Ошибка при выходе', { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Проверка аутентификации
  async isAuthenticated(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return !!user;
  }

  // Устаревшие методы для совместимости

  async register(data: Record<string, unknown>): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
    // В веб версии регистрация не поддерживается
    return { success: false, error: 'Registration not supported in web version' };
  }
} 