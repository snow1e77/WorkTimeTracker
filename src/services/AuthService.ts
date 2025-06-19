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
  private async sendSMS(phoneNumber: string, code: string, type: 'login' | 'registration'): Promise<boolean> {
    try {
      const result = await this.twilioService.sendVerificationCode(phoneNumber, code, type);
      return result.success;
    } catch (error) {
      console.error('SMS sending error:', error);
      return false;
    }
  }

  // Password hashing for SMS codes (SMS код автоматически становится паролем)
  private hashPassword(smsCode: string): string {
    // В реальном приложении используйте bcrypt или другую безопасную библиотеку
    // Используем btoa вместо Buffer для React Native совместимости
    return btoa(smsCode);
  }

  // Проверка SMS-кода/пароля
  private verifyPassword(smsCode: string, hashedPassword: string): boolean {
    return this.hashPassword(smsCode) === hashedPassword;
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

  // Проверка существует ли пользователь с таким номером
  async checkUserExists(phoneNumber: string): Promise<{ exists: boolean; user?: AuthUser }> {
    try {
      const user = await this.dbService.getUserByPhone(phoneNumber);
      return { exists: !!user, user: user || undefined };
    } catch (error) {
      console.error('Ошибка проверки пользователя:', error);
      return { exists: false };
    }
  }

  // Отправка SMS-кода для входа или регистрации
  async sendLoginCode(phoneNumber: string): Promise<{ success: boolean; userExists: boolean; error?: string }> {
    try {
      console.log('🔄 AuthService: Отправка кода входа для:', phoneNumber);
      
      // Проверяем, существует ли пользователь
      const { exists, user } = await this.checkUserExists(phoneNumber);
      console.log('👤 Пользователь существует:', exists);

      const code = this.generateSMSCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 минут

      console.log('🔑 Сгенерированный код:', code);

      const verification: SMSVerification = {
        id: Date.now().toString(),
        phoneNumber,
        code,
        type: exists ? 'login' : 'registration',
        isUsed: false,
        expiresAt,
        createdAt: new Date()
      };

      console.log('💾 Сохранение кода в БД...');
      await this.dbService.saveSMSVerification(verification);

      console.log('📨 Отправка SMS...');
      const smsResult = await this.sendSMS(phoneNumber, code, exists ? 'login' : 'registration');
      
      if (!smsResult) {
        console.log('❌ Ошибка отправки SMS');
        return { success: false, userExists: exists, error: 'Failed to send SMS' };
      }

      console.log('✅ Код отправлен успешно');
      return { success: true, userExists: exists };
    } catch (error) {
      console.error('❌ Ошибка в sendLoginCode:', error);
      return { success: false, userExists: false, error: 'Server error' };
    }
  }

  // Проверка SMS-кода
  async verifyLoginCode(phoneNumber: string, code: string): Promise<{ success: boolean; user?: AuthUser; error?: string; needsProfile?: boolean }> {
    try {
      console.log('🔄 Проверка SMS-кода для:', phoneNumber);
      
      // Получаем SMS верификацию
      const verification = await this.dbService.getSMSVerification(phoneNumber, 'login') 
        || await this.dbService.getSMSVerification(phoneNumber, 'registration');
      
      if (!verification || verification.isUsed || verification.expiresAt < new Date()) {
        return { success: false, error: 'Invalid or expired code' };
      }

      if (verification.code !== code) {
        return { success: false, error: 'Invalid code' };
      }

      // Отмечаем код как использованный
      await this.dbService.markSMSVerificationAsUsed(verification.id);

      // Проверяем, есть ли пользователь
      const { exists, user } = await this.checkUserExists(phoneNumber);

      if (exists && user) {
        // Пользователь существует - обновляем его пароль новым SMS-кодом
        const hashedCode = this.hashPassword(code);
        await this.dbService.updateUserPassword(user.id, hashedCode);
        await this.saveAuthToken(user.id);
        console.log('✅ Существующий пользователь вошел в систему');
        return { success: true, user };
      } else {
        // Новый пользователь - нужно будет создать профиль
        console.log('👤 Новый пользователь - требуется создание профиля');
        return { success: true, needsProfile: true };
      }
    } catch (error) {
      console.error('Ошибка проверки кода:', error);
      return { success: false, error: 'Server error' };
    }
  }

  // Создание профиля после проверки SMS-кода (для новых пользователей)
  async createUserProfile(phoneNumber: string, name: string, smsCode: string): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
    try {
      console.log('🔄 Создание профиля для нового пользователя:', phoneNumber);
      
      // Проверяем, что пользователь с таким номером не существует
      const existingUser = await this.dbService.getUserByPhone(phoneNumber);
      if (existingUser) {
        return { success: false, error: 'User with this phone number already exists' };
      }

      // Создаем пользователя
      const user: AuthUser = {
        id: Date.now().toString(),
        phoneNumber,
        name: name.trim(),
        role: 'worker',
        isVerified: true,
        isActive: true,
        createdAt: new Date()
      };

      console.log('🔄 Хеширование SMS-кода как пароля и сохранение в БД...');
      const hashedCode = this.hashPassword(smsCode);
      await this.dbService.createUser(user, hashedCode);
      console.log('✅ Пользователь создан успешно');
      await this.saveAuthToken(user.id);

      return { success: true, user };
    } catch (error) {
      console.error('Ошибка создания профиля:', error);
      return { success: false, error: 'Server error' };
    }
  }

  // Устаревшие методы - оставляем для совместимости, но помечаем как deprecated
  /** @deprecated Используйте sendLoginCode вместо этого */
  async sendVerificationCode(phoneNumber: string, type: 'registration' | 'password_reset'): Promise<boolean> {
    console.warn('⚠️ sendVerificationCode устарел, используйте sendLoginCode');
    const result = await this.sendLoginCode(phoneNumber);
    return result.success;
  }

  /** @deprecated Используйте verifyLoginCode вместо этого */
  async verifyCode(phoneNumber: string, code: string, type: 'registration' | 'password_reset'): Promise<boolean> {
    console.warn('⚠️ verifyCode устарел, используйте verifyLoginCode');
    const result = await this.verifyLoginCode(phoneNumber, code);
    return result.success;
  }

  /** @deprecated Регистрация теперь происходит через sendLoginCode + createUserProfile */
  async register(data: RegisterRequest): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
    console.warn('⚠️ register устарел, используйте sendLoginCode + createUserProfile');
    return { success: false, error: 'Method deprecated' };
  }

  /** @deprecated Вход теперь происходит через sendLoginCode + verifyLoginCode */
  async login(data: LoginRequest): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
    console.warn('⚠️ login устарел, используйте sendLoginCode + verifyLoginCode');
    return { success: false, error: 'Method deprecated' };
  }

  /** @deprecated Сброс пароля заменен на sendLoginCode */
  async resetPassword(data: ResetPasswordRequest): Promise<{ success: boolean; error?: string }> {
    console.warn('⚠️ resetPassword устарел, используйте sendLoginCode');
    return { success: false, error: 'Method deprecated' };
  }

  // Получение текущего пользователя
  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const token = await this.getAuthToken();
      if (!token) return null;

      const user = await this.dbService.getUserById(token);
      return user;
    } catch (error) {
      console.error('Ошибка получения текущего пользователя:', error);
      return null;
    }
  }

  // Выход из системы
  async logout(): Promise<void> {
    try {
      await this.removeAuthToken();
    } catch (error) {
      console.error('Ошибка выхода:', error);
    }
  }
} 