import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database';
import { UserService } from './UserService';
import { SMSService } from './SMSService';
import { User, AuthTokens, JWTPayload, LoginRequest, RegisterRequest } from '../types';

export class AuthService {
  private static readonly JWT_SECRET: string = process.env.JWT_SECRET || 'your_super_secret_jwt_key';
  private static readonly JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
  private static readonly REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';
  private static readonly BCRYPT_ROUNDS = 12; // Высокий уровень безопасности

  // Безопасное хеширование пароля
  static async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, this.BCRYPT_ROUNDS);
  }

  // Проверка пароля
  static async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(password, hashedPassword);
  }

  // Валидация силы пароля
  static validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    return { valid: errors.length === 0, errors };
  }

  // Отправка кода для входа/регистрации
  static async sendLoginCode(phoneNumber: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Для демо-версии используем фиксированный код
      const code = process.env.NODE_ENV === 'production' ? 
        Math.floor(100000 + Math.random() * 900000).toString() : '123456';

      // Сохраняем код в базе данных
      await this.saveSMSVerification(phoneNumber, code, 'login');

      if (process.env.NODE_ENV === 'production') {
        // В продакшене отправляем реальную SMS
        const smsResult = await SMSService.sendSMS(phoneNumber, `Ваш код для входа: ${code}`);
        if (!smsResult.success) {
          return { success: false, error: smsResult.error || 'Failed to send SMS' };
        }
      } else {
        console.log(`📱 SMS код для ${phoneNumber}: ${code}`);
      }

      return { success: true };
    } catch (error) {
      console.error('Error sending login code:', error);
      return { success: false, error: 'Failed to send verification code' };
    }
  }

  // Вход в систему с кодом
  static async login(data: LoginRequest): Promise<{ 
    success: boolean; 
    user?: User; 
    tokens?: AuthTokens;
    error?: string;
    isNewUser?: boolean;
  }> {
    try {
      const { phoneNumber, code } = data;

      // Проверяем код
      const isCodeValid = await this.verifyCode(phoneNumber, code, 'login');
      if (!isCodeValid) {
        return { success: false, error: 'Invalid or expired verification code' };
      }

      // Проверяем, существует ли пользователь
      let user = await UserService.getUserByPhoneNumber(phoneNumber);
      let isNewUser = false;

      if (!user) {
        // Если пользователя нет, это новая регистрация
        isNewUser = true;
        return { 
          success: true, 
          isNewUser: true,
          error: 'User not found. Please complete registration.' 
        };
      }

      if (!user.isActive) {
        return { success: false, error: 'Account is deactivated' };
      }

      // Генерируем токены
      const tokens = await this.generateTokens(user);

      // Помечаем код как использованный
      await this.markCodeAsUsed(phoneNumber, code);

      return { success: true, user, tokens };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Login failed' };
    }
  }

  // Регистрация нового пользователя
  static async register(data: RegisterRequest): Promise<{ 
    success: boolean; 
    user?: User; 
    tokens?: AuthTokens;
    error?: string;
  }> {
    try {
      const { phoneNumber, name, code } = data;

      // Проверяем код
      const isCodeValid = await this.verifyCode(phoneNumber, code, 'login');
      if (!isCodeValid) {
        return { success: false, error: 'Invalid or expired verification code' };
      }

      // Проверяем, не существует ли уже пользователь
      const existingUser = await UserService.getUserByPhoneNumber(phoneNumber);
      if (existingUser) {
        return { success: false, error: 'User already exists' };
      }

      // Генерируем сильный временный пароль
      const tempPassword = uuidv4() + Math.random().toString(36);
      const hashedPassword = await this.hashPassword(tempPassword);

      // Создаем нового пользователя
      const user = await UserService.createUser({
        phoneNumber,
        name,
        password: hashedPassword,
        role: 'worker',
      });

      // Генерируем токены
      const tokens = await this.generateTokens(user);

      // Помечаем код как использованный
      await this.markCodeAsUsed(phoneNumber, code);

      return { success: true, user, tokens };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'Registration failed' };
    }
  }

  // Обновление токена
  static async refreshToken(refreshToken: string): Promise<{
    success: boolean;
    tokens?: AuthTokens;
    error?: string;
  }> {
    try {
      // Проверяем refresh token в базе данных
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
      console.error('Refresh token error:', error);
      return { success: false, error: 'Token refresh failed' };
    }
  }

  // Выход из системы
  static async logout(refreshToken: string): Promise<{ success: boolean }> {
    try {
      await query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false };
    }
  }

  // Проверка токена доступа
  static verifyAccessToken(token: string): JWTPayload | null {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as JWTPayload;
      return decoded;
    } catch (error) {
      return null;
    }
  }

  // Генерация JWT токенов
  private static async generateTokens(user: User): Promise<AuthTokens> {
    const payload: JWTPayload = {
      userId: user.id,
      phoneNumber: user.phoneNumber,
      role: user.role,
    };

    const accessToken = jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN,
    } as jwt.SignOptions);

    const refreshToken = uuidv4();

    // Сохраняем refresh token в базе данных
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 дней

    await query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, refreshToken, expiresAt]
    );

    return { accessToken, refreshToken };
  }

  // Сохранение SMS кода
  private static async saveSMSVerification(
    phoneNumber: string, 
    code: string, 
    type: 'login' | 'registration' | 'password_reset'
  ): Promise<void> {
    const id = uuidv4();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // Код действует 10 минут

    await query(
      `INSERT INTO sms_verifications (id, phone_number, code, type, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, phoneNumber, code, type, expiresAt]
    );
  }

  // Проверка SMS кода
  private static async verifyCode(
    phoneNumber: string, 
    code: string, 
    type: 'login' | 'registration' | 'password_reset'
  ): Promise<boolean> {
    const result = await query(
      `SELECT id FROM sms_verifications 
       WHERE phone_number = $1 AND code = $2 AND type = $3 
       AND is_used = false AND expires_at > NOW()`,
      [phoneNumber, code, type]
    );

    return result.rows.length > 0;
  }

  // Пометка кода как использованного
  private static async markCodeAsUsed(phoneNumber: string, code: string): Promise<void> {
    await query(
      'UPDATE sms_verifications SET is_used = true WHERE phone_number = $1 AND code = $2',
      [phoneNumber, code]
    );
  }

  // Очистка истекших токенов и кодов
  static async cleanupExpiredTokens(): Promise<void> {
    try {
      await query('DELETE FROM refresh_tokens WHERE expires_at < NOW()');
      await query('DELETE FROM sms_verifications WHERE expires_at < NOW()');
      console.log('✅ Expired tokens and codes cleaned up');
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }
} 