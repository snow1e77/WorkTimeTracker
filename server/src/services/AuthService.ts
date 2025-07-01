import * as jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database';
import { UserService } from './UserService';
import { User, AuthTokens, JWTPayload, LoginRequest, RegisterRequest } from '../types';
import logger from '../utils/logger';

export class AuthService {
  private static readonly JWT_SECRET: string = (() => {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    if (process.env.JWT_SECRET.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters long for security');
    }
    return process.env.JWT_SECRET;
  })();
  private static readonly JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || '7d';
  private static readonly REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

  // Простой вход только по номеру телефона
  static async login(data: LoginRequest): Promise<{ 
    success: boolean; 
    user?: User; 
    tokens?: AuthTokens;
    error?: string;
    needsContact?: boolean;
  }> {
    try {
      const { phoneNumber } = data;

      // Проверяем, существует ли пользователь в основной таблице
      let user = await UserService.getUserByPhoneNumber(phoneNumber);

      if (user) {
        // Пользователь найден и уже полностью зарегистрирован
        if (!user.isActive) {
          return { success: false, error: 'Аккаунт деактивирован' };
        }

        const tokens = await this.generateTokens(user);
        logger.info('Успешный вход пользователя', { userId: user.id, phoneNumber });
        return { success: true, user, tokens };
      }

      // Импортируем PreRegistrationService 
      const { PreRegistrationService } = await import('./PreRegistrationService');
      
      // Проверяем, есть ли пользователь в предварительной регистрации
      const preRegisteredUser = await PreRegistrationService.getPreRegisteredUserByPhone(phoneNumber);
      
      if (preRegisteredUser && preRegisteredUser.isActivated) {
        // Создаем полного пользователя из предварительной регистрации
        const newUser = await UserService.createUser({
          phoneNumber,
          name: preRegisteredUser.name || 'Новый пользователь',
          role: preRegisteredUser.role,
          companyId: preRegisteredUser.companyId
        });

        const tokens = await this.generateTokens(newUser);
        logger.info('Пользователь создан из предварительной регистрации', { userId: newUser.id, phoneNumber });
        return { success: true, user: newUser, tokens };
      }

      // Пользователь не найден ни в основной таблице, ни в предварительной регистрации
      logger.warn('Попытка входа несуществующего пользователя', { phoneNumber });
      return { 
        success: false, 
        error: 'Ваш номер телефона не найден в системе. Обратитесь к прорабу или бригадиру для добавления в базу данных.',
        needsContact: true
      };
    } catch (error) {
      logger.error('Ошибка входа', { error, phoneNumber: data.phoneNumber });
      return { success: false, error: 'Ошибка входа в систему' };
    }
  }

  // Регистрация нового пользователя (только для предварительно зарегистрированных)
  static async register(data: RegisterRequest): Promise<{ 
    success: boolean; 
    user?: User; 
    tokens?: AuthTokens;
    error?: string;
  }> {
    try {
      const { phoneNumber, name } = data;

      // Проверяем, не существует ли уже пользователь
      const existingUser = await UserService.getUserByPhoneNumber(phoneNumber);
      if (existingUser) {
        return { success: false, error: 'Пользователь уже существует' };
      }

      // Импортируем PreRegistrationService
      const { PreRegistrationService } = await import('./PreRegistrationService');
      
      // Проверяем предварительную регистрацию
      const preRegisteredUser = await PreRegistrationService.getPreRegisteredUserByPhone(phoneNumber);
      if (!preRegisteredUser) {
        return { 
          success: false, 
          error: 'Ваш номер телефона не найден в системе. Обратитесь к прорабу или бригадиру для добавления в базу данных.' 
        };
      }

      if (!preRegisteredUser.isActivated) {
        return { success: false, error: 'Пользователь не активирован' };
      }

      // Создаем нового пользователя
      const user = await UserService.createUser({
        phoneNumber,
        name: name || preRegisteredUser.name || 'Новый пользователь',
        role: preRegisteredUser.role,
        companyId: preRegisteredUser.companyId
      });

      // Генерируем токены
      const tokens = await this.generateTokens(user);

      logger.info('Успешная регистрация пользователя', { userId: user.id, phoneNumber });
      return { success: true, user, tokens };
    } catch (error) {
      logger.error('Ошибка регистрации', { error, phoneNumber: data.phoneNumber });
      return { success: false, error: 'Ошибка регистрации' };
    }
  }

  // Обновление токена
  static async refreshToken(refreshToken: string): Promise<{
    success: boolean;
    tokens?: AuthTokens;
    error?: string;
  }> {
    try {
      const result = await query(
        'SELECT user_id FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()',
        [refreshToken]
      );

      if (result.rows.length === 0) {
        return { success: false, error: 'Invalid or expired refresh token' };
      }

      const userId = result.rows[0].user_id;
      const user = await UserService.getUserById(userId);

      if (!user || !user.isActive) {
        return { success: false, error: 'User not found or inactive' };
      }

      // Удаляем старый refresh token
      await query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);

      // Генерируем новые токены
      const tokens = await this.generateTokens(user);

      return { success: true, tokens };
    } catch (error) {
      logger.error('Refresh token error', { error });
      return { success: false, error: 'Failed to refresh token' };
    }
  }

  // Выход
  static async logout(refreshToken: string): Promise<{ success: boolean }> {
    try {
      await query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
      return { success: true };
    } catch (error) {
      logger.error('Logout error', { error });
      return { success: true }; // Считаем успешным даже при ошибке
    }
  }

  // Проверка access токена
  static verifyAccessToken(token: string): JWTPayload | null {
    try {
      return jwt.verify(token, this.JWT_SECRET) as JWTPayload;
    } catch (error) {
      return null;
    }
  }

  // Генерация токенов
  private static async generateTokens(user: User): Promise<AuthTokens> {
    const payload: JWTPayload = {
      userId: user.id,
      phoneNumber: user.phoneNumber,
      role: user.role
    };

    const accessToken = jwt.sign(payload, this.JWT_SECRET, { expiresIn: '7d' });

    const refreshToken = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 дней

    // Сохраняем refresh token в базе
    await query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, refreshToken, expiresAt]
    );

    return { accessToken, refreshToken };
  }

  // Очистка истекших токенов
  static async cleanupExpiredTokens(): Promise<void> {
    try {
      await query('DELETE FROM refresh_tokens WHERE expires_at < NOW()');
    } catch (error) {
      logger.error('Cleanup expired tokens error', { error });
    }
  }
} 