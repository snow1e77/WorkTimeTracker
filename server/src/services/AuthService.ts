import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database';
import { UserService } from './UserService';
import { SMSService } from './SMSService';
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
  private static readonly JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
  private static readonly REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';
  private static readonly BCRYPT_ROUNDS = 12; // High security level

  // Secure password hashing
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
        logger.info('SMS code sent (dev mode)', { phoneNumber, code });
      }

      return { success: true };
    } catch (error) {
      logger.error('Error sending login code', { error });
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
    needsProfile?: boolean;
  }> {
    try {
      const { phoneNumber, code } = data;

      // Verify code
      const isCodeValid = await this.verifyCode(phoneNumber, code, 'login');
      if (!isCodeValid) {
        return { success: false, error: 'Invalid or expired verification code' };
      }

      // Check if user exists in main users table
      let user = await UserService.getUserByPhoneNumber(phoneNumber);

      if (user) {
        // User is already fully registered
        if (!user.isActive) {
          return { success: false, error: 'Account is deactivated' };
        }

        const tokens = await this.generateTokens(user);
        await this.markCodeAsUsed(phoneNumber, code);
        return { success: true, user, tokens };
      }

      // Import PreRegistrationService dynamically to avoid circular dependencies
      const { PreRegistrationService } = await import('./PreRegistrationService');
      
      // Check if user exists in pre-registration
      const preRegisteredUser = await PreRegistrationService.getPreRegisteredUserByPhone(phoneNumber);
      
      if (preRegisteredUser) {
        // Activate pre-registered user
        await PreRegistrationService.activatePreRegisteredUser(phoneNumber);
        
        // Mark code as used
        await this.markCodeAsUsed(phoneNumber, code);
        
        // Return flag that profile creation is needed
        return { 
          success: true, 
          isNewUser: true,
          needsProfile: true 
        };
      }

      // User not found in either main table or pre-registration
      return { 
        success: false, 
        error: 'Your phone number is not found in the system. Please contact your foreman or supervisor to be added to the database.' 
      };
    } catch (error) {
      logger.error('Login error', { error });
      return { success: false, error: 'Login failed' };
    }
  }

  // Register new user (only for pre-registered users)
  static async register(data: RegisterRequest): Promise<{ 
    success: boolean; 
    user?: User; 
    tokens?: AuthTokens;
    error?: string;
  }> {
    try {
      const { phoneNumber, name, code } = data;

      // Verify code
      const isCodeValid = await this.verifyCode(phoneNumber, code, 'login');
      if (!isCodeValid) {
        return { success: false, error: 'Invalid or expired verification code' };
      }

      // Check if user already exists
      const existingUser = await UserService.getUserByPhoneNumber(phoneNumber);
      if (existingUser) {
        return { success: false, error: 'User already exists' };
      }

      // Import PreRegistrationService
      const { PreRegistrationService } = await import('./PreRegistrationService');
      
      // Check if user exists in pre-registration
      const preRegisteredUser = await PreRegistrationService.getPreRegisteredUserByPhone(phoneNumber);
      if (!preRegisteredUser) {
        return { 
          success: false, 
          error: 'Your phone number is not found in the system. Please contact your foreman or supervisor to be added to the database.' 
        };
      }

      if (!preRegisteredUser.isActivated) {
        return { success: false, error: 'User is not activated' };
      }

      // Generate strong temporary password
      const tempPassword = uuidv4() + Math.random().toString(36);
      const hashedPassword = await this.hashPassword(tempPassword);

      // Create new user using data from pre-registration
      const user = await UserService.createUser({
        phoneNumber,
        name: name || preRegisteredUser.name || 'New User',
        password: hashedPassword,
        role: preRegisteredUser.role,
        companyId: preRegisteredUser.companyId
      });

      // Generate tokens
      const tokens = await this.generateTokens(user);

      // Mark code as used
      await this.markCodeAsUsed(phoneNumber, code);

      return { success: true, user, tokens };
    } catch (error) {
      logger.error('Registration error', { error });
      return { success: false, error: 'Registration failed' };
    }
  }

  // Token refresh
  static async refreshToken(refreshToken: string): Promise<{
    success: boolean;
    tokens?: AuthTokens;
    error?: string;
  }> {
    try {
      // Check refresh token in database
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

      // Remove old refresh token
      await query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);

      // Generate new tokens
      const tokens = await this.generateTokens(user);

      return { success: true, tokens };
    } catch (error) {
      logger.error('Refresh token error', { error });
      return { success: false, error: 'Token refresh failed' };
    }
  }

  // Logout
  static async logout(refreshToken: string): Promise<{ success: boolean }> {
    try {
      await query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
      return { success: true };
    } catch (error) {
      logger.error('Logout error', { error });
      return { success: false };
    }
  }

  // Verify access token
  static verifyAccessToken(token: string): JWTPayload | null {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as JWTPayload;
      return decoded;
    } catch (error) {
      return null;
    }
  }

  // Generate JWT tokens
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

    // Save refresh token in database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    await query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, refreshToken, expiresAt]
    );

    return { accessToken, refreshToken };
  }

  // Save SMS code
  private static async saveSMSVerification(
    phoneNumber: string, 
    code: string, 
    type: 'login' | 'registration' | 'password_reset'
  ): Promise<void> {
    const id = uuidv4();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // Code valid for 10 minutes

    await query(
      `INSERT INTO sms_verifications (id, phone_number, code, type, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, phoneNumber, code, type, expiresAt]
    );
  }

  // Verify SMS code
  private static async verifyCode(
    phoneNumber: string, 
    code: string, 
    type: 'login' | 'registration' | 'password_reset'
  ): Promise<boolean> {
    // Для тестового номера делаем код бесконечным
    const isTestAccount = phoneNumber === '+79999999999' && code === '123456';
    
    if (isTestAccount) {
      // Для тестового аккаунта проверяем код без учета времени истечения
      const result = await query(
        `SELECT id FROM sms_verifications 
         WHERE phone_number = $1 AND code = $2 AND type = $3 
         AND is_used = false`,
        [phoneNumber, code, type]
      );
      return result.rows.length > 0;
    }
    
    // Для обычных пользователей проверяем с учетом времени истечения
    const result = await query(
      `SELECT id FROM sms_verifications 
       WHERE phone_number = $1 AND code = $2 AND type = $3 
       AND is_used = false AND expires_at > NOW()`,
      [phoneNumber, code, type]
    );

    return result.rows.length > 0;
  }

  // Mark code as used
  private static async markCodeAsUsed(phoneNumber: string, code: string): Promise<void> {
    // Для тестового номера не помечаем код как использованный, чтобы он был многоразовым
    const isTestAccount = phoneNumber === '+79999999999' && code === '123456';
    
    if (!isTestAccount) {
      await query(
        'UPDATE sms_verifications SET is_used = true WHERE phone_number = $1 AND code = $2',
        [phoneNumber, code]
      );
    }
  }

  // Cleanup expired tokens and codes
  static async cleanupExpiredTokens(): Promise<void> {
    try {
      await query('DELETE FROM refresh_tokens WHERE expires_at < NOW()');
      await query('DELETE FROM sms_verifications WHERE expires_at < NOW()');
      logger.info('Expired tokens and codes cleaned up');
    } catch (error) {
      logger.error('Cleanup error', { error });
    }
  }
} 