import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database';
import { UserService } from './UserService';
import { User, JWTPayload } from '../types';
import logger from '../utils/logger';

export interface LoginRequest {
  phoneNumber: string;
}

export interface RegisterRequest {
  phoneNumber: string;
  name: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  private static readonly JWT_SECRET: string = (() => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    return secret;
  })();
  private static readonly JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || '7d';
  private static readonly REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

  // Simple login with phone number only
  static async login(data: LoginRequest): Promise<{ 
    success: boolean; 
    user?: User; 
    tokens?: AuthTokens;
    error?: string;
    needsContact?: boolean;
  }> {
    try {
      // Логируем входящие данные
      logger.info('AuthService login called', { 
        data,
        phoneNumber: data.phoneNumber,
        dataKeys: Object.keys(data)
      });

      const { phoneNumber } = data;

      // Check if user exists in the main table
      const user = await UserService.getUserByPhoneNumber(phoneNumber);

      if (user) {
        // User found and fully registered
        if (!user.isActive) {
          return { success: false, error: 'Account is deactivated' };
        }

        const tokens = await this.generateTokens(user);
        logger.info('Successful user login', { userId: user.id, phoneNumber });
        return { success: true, user, tokens };
      }

      // User not found in system
      logger.warn('Login attempt for non-existent user', { phoneNumber });
      return { 
        success: false, 
        error: 'Your phone number is not found in the system. Please contact your supervisor or team leader to be added to the database.',
        needsContact: true
      };
    } catch (error) {
      logger.error('Login error', { error, phoneNumber: data.phoneNumber });
      return { success: false, error: 'System login error' };
    }
  }

  // Register new user (deprecated endpoint - no longer used)
  static async register(data: RegisterRequest): Promise<{ 
    success: boolean; 
    user?: User; 
    tokens?: AuthTokens;
    error?: string;
  }> {
    try {
      return { success: false, error: 'Registration is no longer supported. Users are added by administrators.' };
    } catch (error) {
      logger.error('Registration error', { error, phoneNumber: data.phoneNumber });
      return { success: false, error: 'Registration error' };
    }
  }

  // Refresh token
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

      // Delete old refresh token
      await query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);

      // Generate new tokens
      const tokens = await this.generateTokens(user);

      return { success: true, tokens };
    } catch (error) {
      logger.error('Refresh token error', { error });
      return { success: false, error: 'Failed to refresh token' };
    }
  }

  // Logout
  static async logout(refreshToken: string): Promise<{ success: boolean }> {
    try {
      await query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
      return { success: true };
    } catch (error) {
      logger.error('Logout error', { error });
      return { success: true }; // Consider successful even on error
    }
  }

  // Verify access token
  static verifyAccessToken(token: string): JWTPayload | null {
    try {
      return jwt.verify(token, this.JWT_SECRET) as JWTPayload;
    } catch (error) {
      return null;
    }
  }

  // Generate tokens
  private static async generateTokens(user: User): Promise<AuthTokens> {
    const payload: JWTPayload = {
      userId: user.id,
      phoneNumber: user.phoneNumber,
      role: user.role
    };

    const accessToken = jwt.sign(payload, this.JWT_SECRET, { expiresIn: '7d' });

    const refreshToken = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    // Save refresh token to database
    await query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, refreshToken, expiresAt]
    );

    return { accessToken, refreshToken };
  }

  // Cleanup expired tokens
  static async cleanupExpiredTokens(): Promise<void> {
    try {
      await query('DELETE FROM refresh_tokens WHERE expires_at < NOW()');
    } catch (error) {
      logger.error('Cleanup expired tokens error', { error });
    }
  }
} 