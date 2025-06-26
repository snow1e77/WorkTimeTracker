import { AuthService } from '../../src/services/AuthService';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';

// Мокируем зависимости
jest.mock('../../src/config/database');
jest.mock('../../src/services/UserService');
jest.mock('../../src/services/SMSService');

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('hashPassword', () => {
    it('должен хэшировать пароль', async () => {
      const password = 'TestPassword123!';
      const hashedPassword = await AuthService.hashPassword(password);
      
      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(password);
      expect(typeof hashedPassword).toBe('string');
      expect(hashedPassword.length).toBeGreaterThan(50);
    });

    it('должен создавать разные хэши для одинаковых паролей', async () => {
      const password = 'TestPassword123!';
      const hash1 = await AuthService.hashPassword(password);
      const hash2 = await AuthService.hashPassword(password);
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    it('должен проверять правильный пароль', async () => {
      const password = 'TestPassword123!';
      const hashedPassword = await AuthService.hashPassword(password);
      
      const isValid = await AuthService.verifyPassword(password, hashedPassword);
      expect(isValid).toBe(true);
    });

    it('должен отклонять неправильный пароль', async () => {
      const password = 'TestPassword123!';
      const wrongPassword = 'WrongPassword123!';
      const hashedPassword = await AuthService.hashPassword(password);
      
      const isValid = await AuthService.verifyPassword(wrongPassword, hashedPassword);
      expect(isValid).toBe(false);
    });
  });

  describe('validatePasswordStrength', () => {
    it('должен принимать сильный пароль', () => {
      const strongPassword = 'StrongPass123!';
      const result = AuthService.validatePasswordStrength(strongPassword);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('должен отклонять короткий пароль', () => {
      const shortPassword = 'Short1!';
      const result = AuthService.validatePasswordStrength(shortPassword);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    it('должен отклонять пароль без заглавных букв', () => {
      const password = 'password123!';
      const result = AuthService.validatePasswordStrength(password);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('должен отклонять пароль без строчных букв', () => {
      const password = 'PASSWORD123!';
      const result = AuthService.validatePasswordStrength(password);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('должен отклонять пароль без цифр', () => {
      const password = 'Password!';
      const result = AuthService.validatePasswordStrength(password);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('должен отклонять пароль без специальных символов', () => {
      const password = 'Password123';
      const result = AuthService.validatePasswordStrength(password);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });

    it('должен возвращать все ошибки для слабого пароля', () => {
      const weakPassword = 'weak';
      const result = AuthService.validatePasswordStrength(weakPassword);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('verifyAccessToken', () => {
    it('должен проверять валидный токен', () => {
      const payload = { userId: '123', phoneNumber: '+1234567890' };
      const token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '1h' });
      
      const result = AuthService.verifyAccessToken(token);
      
      expect(result).toBeDefined();
      expect(result?.userId).toBe(payload.userId);
      expect(result?.phoneNumber).toBe(payload.phoneNumber);
    });

    it('должен отклонять невалидный токен', () => {
      const invalidToken = 'invalid.token.here';
      
      const result = AuthService.verifyAccessToken(invalidToken);
      
      expect(result).toBeNull();
    });

    it('должен отклонять истекший токен', () => {
      const payload = { userId: '123', phoneNumber: '+1234567890' };
      const expiredToken = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '-1h' });
      
      const result = AuthService.verifyAccessToken(expiredToken);
      
      expect(result).toBeNull();
    });

    it('должен отклонять токен с неправильным секретом', () => {
      const payload = { userId: '123', phoneNumber: '+1234567890' };
      const token = jwt.sign(payload, 'wrong-secret', { expiresIn: '1h' });
      
      const result = AuthService.verifyAccessToken(token);
      
      expect(result).toBeNull();
    });
  });

  describe('sendLoginCode', () => {
    it('должен отправлять код в development режиме', async () => {
      const phoneNumber = '+1234567890';
      process.env.NODE_ENV = 'development';
      
      const result = await AuthService.sendLoginCode(phoneNumber);
      
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('должен возвращать ошибку при проблемах с отправкой', async () => {
      const phoneNumber = 'invalid-phone';
      
      const result = await AuthService.sendLoginCode(phoneNumber);
      
      // В зависимости от реализации, может быть либо success: false, либо исключение
      expect(result.success).toBe(false);
    });
  });
}); 