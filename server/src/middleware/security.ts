import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { body, param } from 'express-validator';
import * as crypto from 'crypto';
import { logSecurityEvent } from '../utils/logger';

// Строгое ограничение для аутентификации
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 5, // максимум 5 попыток входа
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: 15 * 60,
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
    retryAfter: 15 * 60,
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
  param('id').isUUID().withMessage('Invalid ID format'),

  param('userId').optional().isUUID().withMessage('Invalid user ID format'),

  param('siteId').optional().isUUID().withMessage('Invalid site ID format'),
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
      '=': '&#x3D;',
    };
    return text.replace(/[&<>"'`=/]/g, (s) => map[s] || s);
  };

  // Рекурсивно обрабатываем объекты
  const sanitizeObject = (obj: unknown): unknown => {
    if (typeof obj === 'string') {
      return escapeHtml(obj);
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    if (obj && typeof obj === 'object') {
      const sanitized: Record<string, unknown> = {};
      for (const key in obj as Record<string, unknown>) {
        sanitized[key] = sanitizeObject((obj as Record<string, unknown>)[key]);
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

// Генерация и валидация CSRF токенов
const csrfTokens = new Map<
  string,
  { token: string; expires: Date; userId?: string }
>();

export const generateCSRFToken = (userId?: string): string => {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date();
  expires.setHours(expires.getHours() + 1); // Токен живет 1 час

  csrfTokens.set(token, { token, expires, userId });

  // Очищаем просроченные токены
  setTimeout(() => cleanupExpiredTokens(), 60000);

  return token;
};

const cleanupExpiredTokens = () => {
  const now = new Date();
  for (const [token, data] of csrfTokens.entries()) {
    if (data.expires < now) {
      csrfTokens.delete(token);
    }
  }
};

// Усиленная проверка IP whitelist для админских операций
export const ipWhitelist = (allowedIPs: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const clientIP =
      req.ip ||
      req.connection.remoteAddress ||
      (req.headers['x-forwarded-for'] as string) ||
      (req.headers['x-real-ip'] as string) ||
      '';

    // В production режиме строго проверяем IP
    if (process.env.NODE_ENV === 'production') {
      const isAllowed = allowedIPs.some((allowedIP) => {
        // Поддержка CIDR нотации
        if (allowedIP.includes('/')) {
          // Здесь можно добавить библиотеку для проверки CIDR
          return false; // Временно отключено
        }
        return clientIP === allowedIP;
      });

      if (!isAllowed) {
        logSecurityEvent('ip_blocked', { clientIP, allowedIPs }, 'high');
        res.status(403).json({
          success: false,
          error: 'Access denied from this location',
        });
        return;
      }
    }

    next();
  };
};

// Улучшенная проверка User-Agent
export const requireValidUserAgent = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const userAgent = req.get('User-Agent');

  if (!userAgent) {
    logSecurityEvent('missing_user_agent', { ip: req.ip }, 'medium');
    res.status(403).json({
      success: false,
      error: 'User agent required',
    });
    return;
  }

  // Блокируем известных ботов и подозрительные UA
  const suspiciousPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /python/i,
    /java/i,
    /scanner/i,
    /test/i,
  ];

  const isSuspicious = suspiciousPatterns.some((pattern) =>
    pattern.test(userAgent)
  );

  if (isSuspicious && process.env.NODE_ENV === 'production') {
    logSecurityEvent(
      'suspicious_user_agent',
      {
        userAgent,
        ip: req.ip,
        url: req.originalUrl,
      },
      'medium'
    );
    res.status(403).json({
      success: false,
      error: 'Invalid user agent',
    });
    return;
  }

  next();
};

// Усиленная защита от CSRF
export const csrfProtection = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Проверяем CSRF токен для state-changing операций
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    const csrfToken = req.headers['x-csrf-token'] as string;
    const origin = req.get('Origin');
    const referer = req.get('Referer');

    // В production требуем CSRF токен
    if (process.env.NODE_ENV === 'production') {
      if (!csrfToken) {
        logSecurityEvent(
          'missing_csrf_token',
          {
            ip: req.ip,
            url: req.originalUrl,
            method: req.method,
            userAgent: req.get('User-Agent'),
          },
          'high'
        );
        res.status(403).json({
          success: false,
          error: 'CSRF protection: missing security token',
        });
        return;
      }

      // Проверяем валидность токена
      const tokenData = csrfTokens.get(csrfToken);
      if (!tokenData || tokenData.expires < new Date()) {
        logSecurityEvent(
          'invalid_csrf_token',
          {
            ip: req.ip,
            url: req.originalUrl,
            token: csrfToken.substring(0, 8) + '...', // Частично маскируем токен
            expired: tokenData ? tokenData.expires < new Date() : 'not_found',
          },
          'high'
        );
        res.status(403).json({
          success: false,
          error: 'CSRF protection: invalid or expired token',
        });
        return;
      }

      // Проверяем origin/referer
      if (!origin && !referer) {
        logSecurityEvent(
          'missing_origin_referer',
          {
            ip: req.ip,
            url: req.originalUrl,
          },
          'medium'
        );
        res.status(403).json({
          success: false,
          error: 'CSRF protection: missing origin validation',
        });
        return;
      }

      // Дополнительная проверка - валидируем allowed origins
      const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || [];
      if (origin && !allowedOrigins.includes(origin)) {
        logSecurityEvent(
          'csrf_invalid_origin',
          {
            ip: req.ip,
            origin,
            allowedOrigins,
          },
          'high'
        );
        res.status(403).json({
          success: false,
          error: 'CSRF protection: invalid origin',
        });
        return;
      }
    }
  }

  next();
};

// Расширенное логирование подозрительной активности
export const logSuspiciousActivity = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const ip = req.ip;
  const userAgent = req.get('User-Agent');

  // Логируем попытки входа
  if (req.path.includes('/auth/login') && req.method === 'POST') {
    logSecurityEvent(
      'login_attempt',
      {
        ip,
        userAgent,
        phoneNumber: req.body?.phoneNumber?.replace(/\d(?=\d{4})/g, '*'), // Маскируем номер
      },
      'low'
    );
  }

  // Логируем админские операции
  if (req.path.includes('/admin') || req.path.includes('/reports')) {
    logSecurityEvent(
      'admin_operation',
      {
        ip,
        userAgent,
        path: req.path,
        method: req.method,
        userId: req.user?.id,
      },
      'medium'
    );
  }

  // Логируем подозрительные паттерны в URL
  const suspiciousPatterns = [
    /\.\.\//,
    /\/etc\//,
    /\/var\//,
    /\/usr\//, // Path traversal
    /union.*select/i,
    /drop.*table/i, // SQL injection
    /<script/i,
    /javascript:/i, // XSS
    /eval\(/i,
    /exec\(/i, // Code injection
  ];

  const isSuspiciousUrl = suspiciousPatterns.some((pattern) => {
    const url = req.originalUrl || '';
    return pattern.test(url) || pattern.test(decodeURIComponent(url));
  });

  if (isSuspiciousUrl) {
    logSecurityEvent(
      'suspicious_url_pattern',
      {
        ip,
        userAgent,
        url: req.originalUrl,
        decodedUrl: decodeURIComponent(req.originalUrl || ''),
      },
      'high'
    );
  }

  next();
};

// Строгая проверка согласия на обработку персональных данных (GDPR)
export const requirePrivacyConsent = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const consentHeader = req.get('X-Privacy-Consent');
  const consentTimestamp = req.get('X-Privacy-Consent-Timestamp');

  if (process.env.NODE_ENV === 'production') {
    if (!consentHeader || consentHeader !== 'granted') {
      logSecurityEvent(
        'privacy_consent_missing',
        {
          ip: req.ip,
          consentHeader,
        },
        'medium'
      );
      res.status(400).json({
        success: false,
        error: 'Privacy consent required',
        code: 'PRIVACY_CONSENT_REQUIRED',
      });
      return;
    }

    // Проверяем актуальность согласия (не старше 1 года)
    if (consentTimestamp) {
      const consentDate = new Date(consentTimestamp);
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      if (consentDate < oneYearAgo) {
        logSecurityEvent(
          'privacy_consent_expired',
          {
            ip: req.ip,
            consentDate: consentDate.toISOString(),
          },
          'medium'
        );
        res.status(400).json({
          success: false,
          error: 'Privacy consent expired, please renew',
          code: 'PRIVACY_CONSENT_EXPIRED',
        });
        return;
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
export const setSecurityHeaders = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const nonce = generateNonce();

  // Расширенные заголовки безопасности
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Permissions-Policy',
    'geolocation=self, microphone=(), camera=()'
  );

  if (process.env.NODE_ENV === 'production') {
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
    res.setHeader(
      'Content-Security-Policy',
      `default-src 'self'; script-src 'self' 'nonce-${nonce}'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' wss:; font-src 'self';`
    );
  }

  // Убираем заголовки, раскрывающие информацию о сервере
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');

  next();
};
