import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

const { combine, timestamp, errors, json, simple, colorize, printf } = winston.format;

// Создаем директорию для логов
const logDir = process.env.LOG_DIR || './logs';

// Список чувствительных полей, которые нужно маскировать
const SENSITIVE_FIELDS = [
  'password',
  'passwordHash',
  'token',
  'accessToken',
  'refreshToken',
  'secret',
  'key',
  'phoneNumber',
  'email',
  'authorization',
  'cookie',
  'x-api-key',
  'jwt',
  'auth'
];

// Функция для маскировки чувствительных данных
const sanitizeLogData = (data: any): any => {
  if (typeof data === 'string') {
    // Маскируем номера телефонов
    return data.replace(/\+?\d{1,3}[\s-]?\d{3,4}[\s-]?\d{3,4}[\s-]?\d{2,4}/g, '+***-***-****');
  }
  
  if (Array.isArray(data)) {
    return data.map(sanitizeLogData);
  }
  
  if (data && typeof data === 'object') {
    const sanitized: any = {};
    
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      
      // Проверяем, является ли поле чувствительным
      const isSensitive = SENSITIVE_FIELDS.some(field => 
        lowerKey.includes(field) || lowerKey === field
      );
      
      if (isSensitive) {
        if (typeof value === 'string') {
          // Показываем только первые и последние символы
          sanitized[key] = value.length > 8 ? 
            `${value.substring(0, 3)}***${value.substring(value.length - 3)}` : 
            '***';
        } else {
          sanitized[key] = '[REDACTED]';
        }
      } else {
        sanitized[key] = sanitizeLogData(value);
      }
    }
    
    return sanitized;
  }
  
  return data;
};

// Кастомный формат с маскировкой чувствительных данных
const secureFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    // Маскируем чувствительные данные в meta
    const sanitizedMeta = sanitizeLogData(meta);
    
    const metaStr = Object.keys(sanitizedMeta).length > 0 ? 
      JSON.stringify(sanitizedMeta, null, 2) : '';
    
    return `${timestamp} [${level.toUpperCase()}]: ${message}${metaStr ? '\n' + metaStr : ''}`;
  })
);

// Создание транспортов
const transports: winston.transport[] = [
  // Консольный вывод только в разработке
  ...(process.env.NODE_ENV !== 'production' ? [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        secureFormat
      )
    })
  ] : []),

  // Файлы логов с ротацией
  new DailyRotateFile({
    filename: path.join(logDir, 'application-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: process.env.LOG_RETENTION_DAYS || '14d',
    level: 'info'
  }),

  // Отдельный файл для ошибок
  new DailyRotateFile({
    filename: path.join(logDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: process.env.LOG_RETENTION_DAYS || '30d',
    level: 'error'
  }),

  // Отдельный файл для событий безопасности
  new DailyRotateFile({
    filename: path.join(logDir, 'security-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: process.env.LOG_RETENTION_DAYS || '90d',
    level: 'warn',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        // Для логов безопасности применяем особую маскировку
        const sanitizedMeta = sanitizeLogData(meta);
        return `${timestamp} [SECURITY-${level.toUpperCase()}]: ${message} ${JSON.stringify(sanitizedMeta)}`;
      })
    )
  })
];

// Создание основного логгера
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: secureFormat,
  defaultMeta: {
    service: 'worktime-tracker-server',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  },
  transports,
  exitOnError: false
});

// Добавляем кастомный уровень для HTTP логов
winston.addColors({
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue'
});

// Функция для логирования событий безопасности
export const logSecurityEvent = (
  event: string,
  details: Record<string, any> = {},
  severity: 'low' | 'medium' | 'high' = 'medium'
): void => {
  const sanitizedDetails = sanitizeLogData(details);
  
  logger.warn('Security Event', {
    event,
    severity,
    timestamp: new Date().toISOString(),
    ...sanitizedDetails
  });
};

// Функция для логирования производительности
export const logPerformance = (
  operation: string,
  duration: number,
  details: Record<string, any> = {}
): void => {
  const sanitizedDetails = sanitizeLogData(details);
  
  logger.info('Performance Metric', {
    operation,
    duration,
    timestamp: new Date().toISOString(),
    ...sanitizedDetails
  });
};

// Функция для логирования аутентификации
export const logAuthEvent = (
  event: 'login' | 'logout' | 'token_refresh' | 'auth_failure',
  userId?: string,
  details: Record<string, any> = {}
): void => {
  const level = event === 'auth_failure' ? 'warn' : 'info';
  
  logger.log(level, 'Authentication Event', {
    event,
    userId,
    timestamp: new Date().toISOString(),
    ...sanitizeLogData(details)
  });
};

// Функция для безопасного логирования API вызовов
export const logApiCall = (
  method: string,
  endpoint: string,
  statusCode: number,
  duration: number,
  userId?: string,
  details: Record<string, any> = {}
): void => {
  const level = statusCode >= 400 ? 'error' : statusCode >= 300 ? 'warn' : 'http';
  const sanitizedDetails = sanitizeLogData(details);
  
  // Ограничиваем размер логируемых данных
  const limitedDetails = Object.fromEntries(
    Object.entries(sanitizedDetails).map(([key, value]) => [
      key,
      typeof value === 'string' && value.length > 1000 ? 
        value.substring(0, 1000) + '...[truncated]' : value
    ])
  );
  
  logger.log(level, 'API Call', {
    method,
    endpoint,
    statusCode,
    duration,
    userId,
    timestamp: new Date().toISOString(),
    ...limitedDetails
  });
};

// Алиас для совместимости
export const logAPIRequest = logApiCall;

// Функция для логирования синхронизации
export const logSyncEvent = (
  event: string,
  userId: string,
  deviceId: string,
  details: Record<string, any> = {}
): void => {
  logger.info('Sync Event', {
    event,
    userId,
    deviceId,
    timestamp: new Date().toISOString(),
    ...sanitizeLogData(details)
  });
};

// Функция для логирования ошибок базы данных
export const logDatabaseError = (
  operation: string,
  error: Error,
  query?: string,
  params?: any[]
): void => {
  // Особая обработка для SQL запросов - маскируем потенциально чувствительные параметры
  const sanitizedParams = params ? sanitizeLogData(params) : undefined;
  
  logger.error('Database Error', {
    operation,
    error: error.message,
    stack: error.stack,
    query: query?.substring(0, 200) + (query && query.length > 200 ? '...' : ''), // Ограничиваем длину запроса
    params: sanitizedParams,
    timestamp: new Date().toISOString()
  });
};

// Функция для логирования WebSocket событий
export const logWebSocketEvent = (
  event: string,
  userId?: string,
  details: Record<string, any> = {}
): void => {
  logger.info('WebSocket Event', {
    event,
    userId,
    timestamp: new Date().toISOString(),
    ...details
  });
};

// Экспорт основного логгера по умолчанию
export default logger; 