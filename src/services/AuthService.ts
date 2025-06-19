import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthUser, LoginRequest, RegisterRequest, ResetPasswordRequest, SMSVerification } from '../types';
import { DatabaseService } from './DatabaseService';
import { TwilioService } from './TwilioService';

export class AuthService {
  private static instance: AuthService;
  private dbService: DatabaseService;
  private twilioService: TwilioService;

  private constructor() {
    this.dbService = DatabaseService.getInstance();
    this.twilioService = TwilioService.getInstance();
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // Generate 6-digit SMS code
  private generateSMSCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Send SMS through Twilio
  private async sendSMS(phoneNumber: string, code: string, type: 'registration' | 'password_reset'): Promise<boolean> {
    try {
      const result = await this.twilioService.sendVerificationCode(phoneNumber, code, type);
      return result.success;
    } catch (error) {
      console.error('SMS sending error:', error);
      return false;
    }
  }

  // Password hashing (simplified version)
  private hashPassword(password: string): string {
    // In a real application, use bcrypt or another secure library
    return Buffer.from(password).toString('base64');
  }

  // Проверка пароля
  private verifyPassword(password: string, hashedPassword: string): boolean {
    return this.hashPassword(password) === hashedPassword;
  }

  // Сохранение токена аутентификации
  private async saveAuthToken(userId: string): Promise<void> {
    await AsyncStorage.setItem('authToken', userId);
  }

  // Получение токена аутентификации
  async getAuthToken(): Promise<string | null> {
    return await AsyncStorage.getItem('authToken');
  }

  // Удаление токена аутентификации
  async removeAuthToken(): Promise<void> {
    await AsyncStorage.removeItem('authToken');
  }

  // Отправка кода подтверждения
  async sendVerificationCode(phoneNumber: string, type: 'registration' | 'password_reset'): Promise<boolean> {
    try {
      console.log('🔄 AuthService: Starting verification code sending process');
      console.log('📱 Phone number:', phoneNumber);
      console.log('🔧 Type:', type);

      const code = this.generateSMSCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 минут

      console.log('🔑 Generated code:', code);
      console.log('⏰ Expires at:', expiresAt);

      const verification: SMSVerification = {
        id: Date.now().toString(),
        phoneNumber,
        code,
        type,
        isUsed: false,
        expiresAt,
        createdAt: new Date()
      };

      console.log('💾 Saving verification to database...');
      await this.dbService.saveSMSVerification(verification);
      console.log('✅ Verification saved to database');

      console.log('📨 Sending SMS...');
      const smsResult = await this.sendSMS(phoneNumber, code, type);
      console.log('📨 SMS result:', smsResult);
      
      if (!smsResult) {
        console.log('❌ SMS sending failed');
        return false;
      }

      console.log('✅ Verification code sent successfully');
      return true;
    } catch (error) {
      console.error('❌ Error in sendVerificationCode:', error);
      console.error('Error details:', {
        name: (error as Error).name,
        message: (error as Error).message,
        stack: (error as Error).stack
      });
      return false;
    }
  }

  // Проверка кода подтверждения
  async verifyCode(phoneNumber: string, code: string, type: 'registration' | 'password_reset'): Promise<boolean> {
    try {
      const verification = await this.dbService.getSMSVerification(phoneNumber, type);
      
      if (!verification || verification.isUsed || verification.expiresAt < new Date()) {
        return false;
      }

      if (verification.code === code) {
        await this.dbService.markSMSVerificationAsUsed(verification.id);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Ошибка проверки кода:', error);
      return false;
    }
  }

  // Регистрация пользователя
  async register(data: RegisterRequest): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
    try {
      console.log('🔄 Starting registration for:', data.phoneNumber);
      
      // Проверяем, что пользователь с таким номером не существует
      console.log('🔄 Checking if user exists...');
      const existingUser = await this.dbService.getUserByPhone(data.phoneNumber);
      if (existingUser) {
        return { success: false, error: 'Пользователь с таким номером уже существует' };
      }

      // Проверяем код подтверждения если он предоставлен
      if (data.verificationCode) {
        const isValidCode = await this.verifyCode(data.phoneNumber, data.verificationCode, 'registration');
        if (!isValidCode) {
          return { success: false, error: 'Неверный или истёкший код подтверждения' };
        }
      } else {
        // Отправляем код подтверждения
        const codeSent = await this.sendVerificationCode(data.phoneNumber, 'registration');
        if (!codeSent) {
          return { success: false, error: 'Ошибка отправки кода подтверждения' };
        }
        return { success: false, error: 'CODE_REQUIRED' };
      }

      // Создаем пользователя
      console.log('🔄 Creating new user...');
      const user: AuthUser = {
        id: Date.now().toString(),
        phoneNumber: data.phoneNumber,
        name: data.name,
        role: 'worker',
        isVerified: true,
        isActive: true,
        createdAt: new Date()
      };

      console.log('🔄 Hashing password and saving user to database...');
      const hashedPassword = this.hashPassword(data.password);
      await this.dbService.createUser(user, hashedPassword);
      console.log('✅ User created successfully');
      await this.saveAuthToken(user.id);

      return { success: true, user };
    } catch (error) {
      console.error('Ошибка регистрации:', error);
      return { success: false, error: 'Ошибка сервера' };
    }
  }

  // Вход в систему
  async login(data: LoginRequest): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
    try {
      const user = await this.dbService.getUserByPhone(data.phoneNumber);
      if (!user) {
        return { success: false, error: 'Пользователь не найден' };
      }

      const storedPassword = await this.dbService.getUserPassword(user.id);
      if (!storedPassword || !this.verifyPassword(data.password, storedPassword)) {
        return { success: false, error: 'Неверный пароль' };
      }

      if (!user.isActive) {
        return { success: false, error: 'Аккаунт заблокирован' };
      }

      await this.saveAuthToken(user.id);
      return { success: true, user };
    } catch (error) {
      console.error('Ошибка входа:', error);
      return { success: false, error: 'Ошибка сервера' };
    }
  }

  // Восстановление пароля
  async resetPassword(data: ResetPasswordRequest): Promise<{ success: boolean; error?: string }> {
    try {
      const user = await this.dbService.getUserByPhone(data.phoneNumber);
      if (!user) {
        return { success: false, error: 'Пользователь не найден' };
      }

      const isValidCode = await this.verifyCode(data.phoneNumber, data.verificationCode, 'password_reset');
      if (!isValidCode) {
        return { success: false, error: 'Неверный или истёкший код подтверждения' };
      }

      const hashedPassword = this.hashPassword(data.newPassword);
      await this.dbService.updateUserPassword(user.id, hashedPassword);

      return { success: true };
    } catch (error) {
      console.error('Ошибка сброса пароля:', error);
      return { success: false, error: 'Ошибка сервера' };
    }
  }

  // Получение текущего пользователя
  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const token = await this.getAuthToken();
      if (!token) return null;

      const user = await this.dbService.getUserById(token);
      return user;
    } catch (error) {
      console.error('Ошибка получения пользователя:', error);
      return null;
    }
  }

  // Выход из системы
  async logout(): Promise<void> {
    await this.removeAuthToken();
  }
} 