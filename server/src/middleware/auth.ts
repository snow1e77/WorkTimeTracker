import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService';
import { UserService } from '../services/UserService';
import { JWTPayload, User } from '../types';

// Расширяем интерфейс Request для добавления информации о пользователе
declare global {
  namespace Express {
    interface Request {
      user?: User;
      jwt?: JWTPayload;
    }
  }
}

// Middleware для проверки JWT токена
export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: 'Access token required'
      });
    }

    const token = authHeader.split(' ')[1]; // Извлекаем токен из "Bearer TOKEN"
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Invalid authorization header format'
      });
    }

    // Проверяем токен
    const decoded = AuthService.verifyAccessToken(token);
    
    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired access token'
      });
    }

    // Получаем актуальную информацию о пользователе
    const user = await UserService.getUserById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'User account is deactivated'
      });
    }

    // Добавляем информацию о пользователе в request
    req.user = user;
    req.jwt = decoded;
    
    return next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};

// Проверка роли администратора
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    res.status(401).json({ error: 'Пользователь не аутентифицирован' });
    return;
  }

  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    res.status(403).json({ error: 'Требуются права администратора' });
    return;
  }

  next();
};

// Проверка роли суперадмина
export const requireSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    res.status(401).json({ error: 'Пользователь не аутентифицирован' });
    return;
  }

  if (req.user.role !== 'superadmin') {
    res.status(403).json({ error: 'Требуются права суперадмина' });
    return;
  }

  next();
};

// Проверка роли прораба
export const requireForeman = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    res.status(401).json({ error: 'Пользователь не аутентифицирован' });
    return;
  }

  if (req.user.role !== 'foreman' && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    res.status(403).json({ error: 'Требуются права прораба или выше' });
    return;
  }

  next();
};

// Универсальная проверка ролей
export const requireRole = (...roles: Array<'worker' | 'foreman' | 'admin' | 'superadmin'>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: 'Пользователь не аутентифицирован' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ 
        error: `Недостаточно прав. Требуется одна из ролей: ${roles.join(', ')}` 
      });
      return;
    }

    next();
  };
};

// Middleware для проверки доступа к ресурсу (пользователь может получить только свои данные или админ может получить любые)
export const requireOwnershipOrAdmin = (userIdParam: string = 'userId') => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const requestedUserId = req.params[userIdParam];
    
    // Админ может получить любые данные
    if (req.user.role === 'admin') {
      return next();
    }

    // Пользователь может получить только свои данные
    if (req.user.id === requestedUserId) {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: 'Access denied: insufficient permissions'
    });
  };
};

// Опциональная аутентификация (не требует токен, но если он есть, то проверяет его)
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return next(); // Продолжаем без аутентификации
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return next(); // Продолжаем без аутентификации
    }

    const decoded = AuthService.verifyAccessToken(token);
    
    if (decoded) {
      const user = await UserService.getUserById(decoded.userId);
      
      if (user && user.isActive) {
        req.user = user;
        req.jwt = decoded;
      }
    }

    return next();
  } catch (error) {
    // Игнорируем ошибки при опциональной аутентификации
    return next();
  }
};

// Middleware для логирования запросов с информацией о пользователе
export const logUserAction = (action: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    const timestamp = new Date().toISOString();
    const ip = req.ip || req.connection.remoteAddress;
    
    return next();
  };
};

// Middleware для валидации JSON
export const validateJSON = (req: Request, res: Response, next: NextFunction) => {
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Request body is required'
      });
    }
  }
  return next();
}; 

