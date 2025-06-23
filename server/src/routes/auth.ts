import express from 'express';
import Joi from 'joi';
import { AuthService } from '../services/AuthService';
import { SMSService } from '../services/SMSService';
import { authenticateToken, validateJSON } from '../middleware/auth';
import { LoginRequest, RegisterRequest } from '../types';

const router = express.Router();

// Схемы валидации
const phoneSchema = Joi.object({
  phoneNumber: Joi.string()
    .pattern(/^\+[1-9]\d{1,14}$/)
    .required()
    .messages({
      'string.pattern.base': 'Phone number must be in international format (+1234567890)',
      'any.required': 'Phone number is required'
    })
});

const loginSchema = Joi.object({
  phoneNumber: Joi.string()
    .pattern(/^\+[1-9]\d{1,14}$/)
    .required(),
  code: Joi.string()
    .length(6)
    .pattern(/^\d+$/)
    .required()
    .messages({
      'string.length': 'Verification code must be 6 digits',
      'string.pattern.base': 'Verification code must contain only numbers'
    })
});

const registerSchema = Joi.object({
  phoneNumber: Joi.string()
    .pattern(/^\+[1-9]\d{1,14}$/)
    .required(),
  name: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name must not exceed 100 characters'
    }),
  code: Joi.string()
    .length(6)
    .pattern(/^\d+$/)
    .required()
});

const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required()
});

// POST /api/auth/send-code - Отправка SMS кода
router.post('/send-code', validateJSON, async (req, res) => {
  try {
    const { error, value } = phoneSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0]?.message || 'Validation error'
      });
    }

    const { phoneNumber } = value;

    const result = await AuthService.sendLoginCode(phoneNumber);

    if (result.success) {
      return res.json({
        success: true,
        message: 'Verification code sent successfully',
        data: {
          phoneNumber,
          expiresIn: 600 // 10 минут в секундах
        }
      });
    } else {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Send code error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to send verification code'
    });
  }
});

// POST /api/auth/login - Вход в систему
router.post('/login', validateJSON, async (req, res) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0]?.message || 'Validation error'
      });
    }

    const loginData: LoginRequest = value;
    const result = await AuthService.login(loginData);

    if (result.success) {
      if (result.isNewUser) {
        // Новый пользователь - нужна регистрация
        return res.json({
          success: true,
          isNewUser: true,
          message: 'Phone number verified. Please complete registration.',
          data: {
            phoneNumber: loginData.phoneNumber
          }
        });
      } else {
        // Существующий пользователь - возвращаем токены
        return res.json({
          success: true,
          message: 'Login successful',
          data: {
            user: result.user,
            tokens: result.tokens
          }
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
});

// POST /api/auth/register - Регистрация нового пользователя
router.post('/register', validateJSON, async (req, res) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0]?.message || 'Validation error'
      });
    }

    const registerData: RegisterRequest = value;
    const result = await AuthService.register(registerData);

    if (result.success) {
      return res.status(201).json({
        success: true,
        message: 'Registration successful',
        data: {
          user: result.user,
          tokens: result.tokens
        }
      });
    } else {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      error: 'Registration failed'
    });
  }
});

// POST /api/auth/refresh - Обновление токена доступа
router.post('/refresh', validateJSON, async (req, res) => {
  try {
    const { error, value } = refreshTokenSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0]?.message || 'Validation error'
      });
    }

    const { refreshToken } = value;
    const result = await AuthService.refreshToken(refreshToken);

    if (result.success) {
      return res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          tokens: result.tokens
        }
      });
    } else {
      return res.status(401).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Refresh token error:', error);
    return res.status(500).json({
      success: false,
      error: 'Token refresh failed'
    });
  }
});

// POST /api/auth/logout - Выход из системы
router.post('/logout', validateJSON, async (req, res) => {
  try {
    const { error, value } = refreshTokenSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0]?.message || 'Validation error'
      });
    }

    const { refreshToken } = value;
    const result = await AuthService.logout(refreshToken);

    return res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({
      success: false,
      error: 'Logout failed'
    });
  }
});

// GET /api/auth/me - Получение информации о текущем пользователе
router.get('/me', authenticateToken, (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        user: req.user
      }
    });
  } catch (error) {
    console.error('Get user info error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user information'
    });
  }
});

// GET /api/auth/verify-token - Проверка валидности токена
router.get('/verify-token', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'Token is valid',
    data: {
      userId: req.jwt?.userId,
      role: req.jwt?.role,
      expiresAt: req.jwt?.exp ? new Date(req.jwt.exp * 1000) : null
    }
  });
});

// GET /api/auth/status - Получение статуса сервисов аутентификации
router.get('/status', (req, res) => {
  try {
    const smsStatus = SMSService.getStatus();
    
    res.json({
      success: true,
      data: {
        environment: process.env.NODE_ENV || 'development',
        features: {
          smsVerification: smsStatus.configured,
          jwtAuth: true,
          refreshTokens: true
        },
        sms: smsStatus
      }
    });
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get status'
    });
  }
});

export default router; 