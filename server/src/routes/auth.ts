import express from 'express';
import Joi from 'joi';
import { AuthService } from '../services/AuthService';
import { authenticateToken, validateJSON } from '../middleware/auth';
import { LoginRequest, RegisterRequest } from '../types';
import logger from '../utils/logger';

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
    })
});

const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required()
});

// POST /api/auth/login - Упрощенный вход без валидации
router.post('/login', async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    // Простая проверка что номер телефона передан
    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required'
      });
    }

    // Всегда возвращаем успешный логин с мок-пользователем
    const mockUser = {
      id: '12345678-1234-1234-1234-123456789012',
      phoneNumber: phoneNumber,
      name: 'Test User',
      role: 'worker',
      isActive: true,
      isVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const mockTokens = {
      accessToken: 'mock-access-token-12345',
      refreshToken: 'mock-refresh-token-12345'
    };

    logger.info('Упрощенный логин', { phoneNumber });

    return res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: mockUser,
        tokens: mockTokens
      }
    });

  } catch (error) {
    logger.error('Login error', { error });
    return res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
});

// POST /api/auth/register - Упрощенная регистрация
router.post('/register', async (req, res) => {
  try {
    const { phoneNumber, name } = req.body;

    if (!phoneNumber || !name) {
      return res.status(400).json({
        success: false,
        error: 'Phone number and name are required'
      });
    }

    // Всегда возвращаем успешную регистрацию с мок-пользователем
    const mockUser = {
      id: '12345678-1234-1234-1234-123456789012',
      phoneNumber: phoneNumber,
      name: name,
      role: 'worker',
      isActive: true,
      isVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const mockTokens = {
      accessToken: 'mock-access-token-12345',
      refreshToken: 'mock-refresh-token-12345'
    };

    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user: mockUser,
        tokens: mockTokens
      }
    });

  } catch (error) {
    logger.error('Registration error', { error });
    return res.status(500).json({
      success: false,
      error: 'Registration failed'
    });
  }
});

// POST /api/auth/refresh - Обновление токена
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
        data: result.tokens
      });
    } else {
      return res.status(401).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Token refresh error', { error });
    return res.status(500).json({
      success: false,
      error: 'Token refresh failed'
    });
  }
});

// POST /api/auth/logout - Выход
router.post('/logout', validateJSON, async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token is required'
      });
    }

    await AuthService.logout(refreshToken);

    return res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    logger.error('Logout error', { error });
    return res.status(500).json({
      success: false,
      error: 'Logout failed'
    });
  }
});

// GET /api/auth/me - Получение текущего пользователя
router.get('/me', authenticateToken, async (req, res) => {
  try {
    return res.json({
      success: true,
      data: {
        user: req.user
      }
    });
  } catch (error) {
    logger.error('Get current user error', { error });
    return res.status(500).json({
      success: false,
      error: 'Failed to get user info'
    });
  }
});

export default router; 
