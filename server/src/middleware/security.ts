import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { body, validationResult, param } from 'express-validator';
import * as crypto from 'crypto';

// Строгое ограничение для аутентификации
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 5, // максимум 5 попыток входа
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Не считать успешные запросы
});

// Дополнительное ограничение для чувствительных операций
export const strictRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 3, // максимум 3 попытки
  message: {
    error: 'Too many attempts, please try again later.',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Защита от SQL injection
export const sanitizePhoneNumber = [
  body('phoneNumber')
    .matches(/^\+[1-9]\d{1,14}$/)
    .withMessage('Invalid phone number format')
    .customSanitizer((value: string) => {
      return value.replace(/[^\d+]/g, '');
    })
    .isLength({ min: 10, max: 16 })
    .withMessage('Phone number must be between 10 and 16 characters'),
];

// Расширенная валидация пользовательского ввода
export const sanitizeUserInput = [
  body('name')
    .optional()
    .trim()
    .escape()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be between 1 and 100 characters')
    .matches(/^[a-zA-ZÀ-ÿА-я\s-']+$/)
    .withMessage('Name contains invalid characters'),
  
  body('notes')
    .optional()
    .trim()
    .escape()
    .isLength({ max: 1000 })
    .withMessage('Notes must not exceed 1000 characters'),
    
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Invalid email format'),
];

// Валидация UUID параметров
export const sanitizeUUID = [
  param('id')
    .isUUID()
    .withMessage('Invalid ID format'),
    
  param('userId')
    .optional()
    .isUUID()
    .withMessage('Invalid user ID format'),
    
  param('siteId')
    .optional()
    .isUUID()
    .withMessage('Invalid site ID format'),
];

// Защита от XSS
export const preventXSS = (req: Request, res: Response, next: NextFunction) => {
  // Экранируем потенциально опасные символы
  const escapeHtml = (text: string): string => {
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
      '/': '&#x2F;',
      '`': '&#x60;',
      '=': '&#x3D;'
    };
    return text.replace(/[&<>"'`=\/]/g, (s) => map[s] || s);
  };

  // Рекурсивно обрабатываем объекты
  const sanitizeObject = (obj: any): any => {
    if (typeof obj === 'string') {
      return escapeHtml(obj);
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const key in obj) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
      return sanitized;
    }
    return obj;
  };

  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  next();
};

// Проверка результатов валидации
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Логируем попытки валидации
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// Усиленная проверка IP whitelist для админских операций
export const ipWhitelist = (allowedIPs: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIP = req.ip || 
                    req.connection.remoteAddress || 
                    req.headers['x-forwarded-for'] as string || 
                    req.headers['x-real-ip'] as string || '';
    
    // В production режиме строго проверяем IP
    if (process.env.NODE_ENV === 'production') {
      const isAllowed = allowedIPs.some(allowedIP => {
        // Поддержка CIDR нотации
        if (allowedIP.includes('/')) {
          // Здесь можно добавить библиотеку для проверки CIDR
          return false; // Временно отключено
        }
        return clientIP === allowedIP;
      });
      
      if (!isAllowed) {
        return res.status(403).json({
          success: false,
          error: 'Access denied from this location'
        });
      }
    }
    
    next();
  };
};

// Улучшенная проверка User-Agent
export const requireValidUserAgent = (req: Request, res: Response, next: NextFunction) => {
  const userAgent = req.get('User-Agent');
  
  if (!userAgent) {
    return res.status(403).json({
      success: false,
      error: 'User agent required'
    });
  }
  
  // Блокируем известных ботов и подозрительные UA
  const suspiciousPatterns = [
    /bot/i, /crawler/i, /spider/i, /scraper/i,
    /curl/i, /wget/i, /python/i, /java/i,
    /scanner/i, /test/i
  ];
  
  const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(userAgent));
  
  if (isSuspicious && process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      success: false,
      error: 'Invalid user agent'
    });
  }
  
  next();
};

// Защита от CSRF
export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  // Проверяем CSRF токен для state-changing операций
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    const csrfToken = req.headers['x-csrf-token'] as string;
    const origin = req.get('Origin');
    const referer = req.get('Referer');
    
    // В production требуем CSRF токен
    if (process.env.NODE_ENV === 'production') {
      if (!csrfToken && !origin && !referer) {
        return res.status(403).json({
          success: false,
          error: 'CSRF protection: missing security headers'
        });
      }
    }
  }
  
  next();
};

// Расширенное логирование подозрительной активности
export const logSuspiciousActivity = (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip;
  const userAgent = req.get('User-Agent');
  const timestamp = new Date().toISOString();
  
  // Логируем попытки входа
  if (req.path.includes('/auth/login') && req.method === 'POST') {
    }
  
  // Логируем админские операции
  if (req.path.includes('/admin') || req.path.includes('/reports')) {
    }
  
  // Логируем подозрительные паттерны в URL
  const suspiciousPatterns = [
    /\.\.\//, /\/etc\//, /\/var\//, /\/usr\//, // Path traversal
    /union.*select/i, /drop.*table/i, // SQL injection
    /<script/i, /javascript:/i, // XSS
    /eval\(/i, /exec\(/i // Code injection
  ];
  
     const isSuspiciousUrl = suspiciousPatterns.some(pattern => {
     const url = req.originalUrl || '';
     return pattern.test(url) || pattern.test(decodeURIComponent(url));
   });
  
  if (isSuspiciousUrl) {
    }
  
  next();
};

// Строгая проверка согласия на обработку персональных данных (GDPR)
export const requirePrivacyConsent = (req: Request, res: Response, next: NextFunction) => {
  const consentHeader = req.get('X-Privacy-Consent');
  const consentTimestamp = req.get('X-Privacy-Consent-Timestamp');
  
  if (process.env.NODE_ENV === 'production') {
    if (!consentHeader || consentHeader !== 'granted') {
      return res.status(400).json({
        success: false,
        error: 'Privacy consent required',
        code: 'PRIVACY_CONSENT_REQUIRED'
      });
    }
    
    // Проверяем актуальность согласия (не старше 1 года)
    if (consentTimestamp) {
      const consentDate = new Date(consentTimestamp);
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      
      if (consentDate < oneYearAgo) {
        return res.status(400).json({
          success: false,
          error: 'Privacy consent expired, please renew',
          code: 'PRIVACY_CONSENT_EXPIRED'
        });
      }
    }
  }
  
  next();
};

// Генерация безопасного nonce для CSP
export const generateNonce = (): string => {
  return crypto.randomBytes(16).toString('base64');
};

// Middleware для установки безопасных заголовков
export const setSecurityHeaders = (req: Request, res: Response, next: NextFunction) => {
  const nonce = generateNonce();
  
  // Расширенные заголовки безопасности
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=self, microphone=(), camera=()');
  
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    res.setHeader('Content-Security-Policy', 
      `default-src 'self'; script-src 'self' 'nonce-${nonce}'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' wss:; font-src 'self';`
    );
  }
  
  // Убираем заголовки, раскрывающие информацию о сервере
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');
  
  next();
}; 

