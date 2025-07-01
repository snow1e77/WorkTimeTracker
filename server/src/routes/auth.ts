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

// POST /api/auth/login - Простой вход только по номеру телефона
router.post('/login', validateJSON, async (req, res) => {
  try {
    const { error, value } = phoneSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0]?.message || 'Validation error'
      });
    }

    const loginData: LoginRequest = value;
    const result = await AuthService.login(loginData);

    if (result.success && result.user && result.tokens) {
      return res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: result.user,
          tokens: result.tokens
        }
      });
    } else {
      const statusCode = result.needsContact ? 403 : 400;
      return res.status(statusCode).json({
        success: false,
        error: result.error,
        needsContact: result.needsContact || false
      });
    }
  } catch (error) {
    logger.error('Login error', { error });
    return res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
});

// POST /api/auth/register - Регистрация нового пользователя (только для предварительно зарегистрированных)
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
