import request from 'supertest';
import express from 'express';
import authRoutes from '../../src/routes/auth';
import { AuthService } from '../../src/services/AuthService';

// Мокируем зависимости
jest.mock('../../src/services/AuthService');
jest.mock('../../src/services/PreRegistrationService', () => ({
  PreRegistrationService: {
    canUserLogin: jest.fn(),
    getPreRegisteredUserByPhone: jest.fn(),
    activatePreRegisteredUser: jest.fn()
  }
}));

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

const mockAuthService = AuthService as jest.Mocked<typeof AuthService>;

describe('Auth Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/send-code', () => {
    it('должен отправлять код для валидного номера телефона', async () => {
      const { PreRegistrationService } = await import('../../src/services/PreRegistrationService');
      const mockPreRegService = PreRegistrationService as jest.Mocked<typeof PreRegistrationService>;
      
      mockPreRegService.canUserLogin.mockResolvedValue({
        canLogin: true,
        isPreRegistered: true,
        isActivated: true
      });
      
      mockAuthService.sendLoginCode.mockResolvedValue({ success: true });

      const response = await request(app)
        .post('/api/auth/send-code')
        .send({ phoneNumber: '+1234567890' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.phoneNumber).toBe('+1234567890');
      expect(mockAuthService.sendLoginCode).toHaveBeenCalledWith('+1234567890');
    });

    it('должен отклонять невалидный номер телефона', async () => {
      const response = await request(app)
        .post('/api/auth/send-code')
        .send({ phoneNumber: 'invalid-phone' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Phone number must be in international format');
    });

    it('должен отклонять номер телефона без знака +', async () => {
      const response = await request(app)
        .post('/api/auth/send-code')
        .send({ phoneNumber: '1234567890' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('должен отклонять пользователя не из системы', async () => {
      const { PreRegistrationService } = await import('../../src/services/PreRegistrationService');
      const mockPreRegService = PreRegistrationService as jest.Mocked<typeof PreRegistrationService>;
      
      mockPreRegService.canUserLogin.mockResolvedValue({
        canLogin: false,
        isPreRegistered: false,
        isActivated: false
      });

      const response = await request(app)
        .post('/api/auth/send-code')
        .send({ phoneNumber: '+1234567890' });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.needsContact).toBe(true);
    });

    it('должен обрабатывать ошибки при отправке SMS', async () => {
      const { PreRegistrationService } = await import('../../src/services/PreRegistrationService');
      const mockPreRegService = PreRegistrationService as jest.Mocked<typeof PreRegistrationService>;
      
      mockPreRegService.canUserLogin.mockResolvedValue({
        canLogin: true,
        isPreRegistered: true,
        isActivated: true
      });
      
      mockAuthService.sendLoginCode.mockResolvedValue({ 
        success: false, 
        error: 'SMS service unavailable' 
      });

      const response = await request(app)
        .post('/api/auth/send-code')
        .send({ phoneNumber: '+1234567890' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('SMS service unavailable');
    });
  });

  describe('POST /api/auth/login', () => {
    it('должен аутентифицировать существующего пользователя', async () => {
      const mockUser = {
        id: '123',
        phoneNumber: '+1234567890',
        name: 'Test User',
        role: 'worker' as const,
        isVerified: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockTokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token'
      };

      mockAuthService.login.mockResolvedValue({
        success: true,
        user: mockUser,
        tokens: mockTokens,
        isNewUser: false
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ 
          phoneNumber: '+1234567890',
          code: '123456'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toEqual(mockUser);
      expect(response.body.data.tokens).toEqual(mockTokens);
    });

    it('должен обрабатывать нового пользователя', async () => {
      mockAuthService.login.mockResolvedValue({
        success: true,
        isNewUser: true,
        needsProfile: true
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ 
          phoneNumber: '+1234567890',
          code: '123456'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.isNewUser).toBe(true);
      expect(response.body.data.phoneNumber).toBe('+1234567890');
    });

    it('должен отклонять невалидный код', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ 
          phoneNumber: '+1234567890',
          code: '12345'  // Неправильная длина
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Verification code must be 6 digits');
    });

    it('должен отклонять код с буквами', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ 
          phoneNumber: '+1234567890',
          code: '12345a'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Verification code must contain only numbers');
    });

    it('должен обрабатывать ошибки входа', async () => {
      mockAuthService.login.mockResolvedValue({
        success: false,
        error: 'Invalid or expired verification code'
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ 
          phoneNumber: '+1234567890',
          code: '123456'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid or expired verification code');
    });
  });

  describe('POST /api/auth/register', () => {
    it('должен регистрировать нового пользователя', async () => {
      const mockUser = {
        id: '123',
        phoneNumber: '+1234567890',
        name: 'New User',
        role: 'worker' as const,
        isVerified: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockTokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token'
      };

      mockAuthService.register.mockResolvedValue({
        success: true,
        user: mockUser,
        tokens: mockTokens
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({ 
          phoneNumber: '+1234567890',
          name: 'New User',
          code: '123456'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toEqual(mockUser);
      expect(response.body.data.tokens).toEqual(mockTokens);
    });

    it('должен отклонять слишком короткое имя', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ 
          phoneNumber: '+1234567890',
          name: 'A',  // Слишком короткое
          code: '123456'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Name must be at least 2 characters long');
    });

    it('должен отклонять слишком длинное имя', async () => {
      const longName = 'A'.repeat(101);  // 101 символ

      const response = await request(app)
        .post('/api/auth/register')
        .send({ 
          phoneNumber: '+1234567890',
          name: longName,
          code: '123456'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Name must not exceed 100 characters');
    });

    it('должен обрабатывать ошибки регистрации', async () => {
      mockAuthService.register.mockResolvedValue({
        success: false,
        error: 'User already exists'
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({ 
          phoneNumber: '+1234567890',
          name: 'Test User',
          code: '123456'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('User already exists');
    });
  });

  describe('Валидация входных данных', () => {
    it('должен отклонять запросы без обязательных полей', async () => {
      const response = await request(app)
        .post('/api/auth/send-code')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Phone number is required');
    });

    it('должен отклонять пустые строки', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ 
          phoneNumber: '',
          code: ''
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
}); 