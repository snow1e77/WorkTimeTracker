import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

const { combine, timestamp, errors, json, simple, colorize, printf } = winston.format;

// Создаем директорию для логов
const logDir = process.env.LOG_DIR || './logs';

// Кастомный формат для консоли
const consoleFormat = printf(({ level, message, timestamp, ...meta }) => {
  const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
  return `${timestamp} [${level}]: ${message} ${metaStr}`;
});

// Создание транспортов
const transports: winston.transport[] = [
  // Консольный вывод
  new winston.transports.Console({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: combine(
      colorize(),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      errors({ stack: true }),
      consoleFormat
    )
  }),

  // Общий лог файл с ротацией
  new DailyRotateFile({
    filename: path.join(logDir, 'application-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '30d',
    level: 'info',
    format: combine(
      timestamp(),
      errors({ stack: true }),
      json()
    )
  }),

  // Лог ошибок
  new DailyRotateFile({
    filename: path.join(logDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '30d',
    level: 'error',
    format: combine(
      timestamp(),
      errors({ stack: true }),
      json()
    )
  }),

  // Лог HTTP запросов
  new DailyRotateFile({
    filename: path.join(logDir, 'http-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    level: 'http',
    format: combine(
      timestamp(),
      json()
    )
  }),

  // Лог безопасности
  new DailyRotateFile({
    filename: path.join(logDir, 'security-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '60d',
    level: 'warn',
    format: combine(
      timestamp(),
      json()
    )
  })
];

// Создание основного логгера
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp(),
    errors({ stack: true }),
    json()
  ),
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
  logger.warn('Security Event', {
    event,
    severity,
    timestamp: new Date().toISOString(),
    ...details
  });
};

// Функция для логирования производительности
export const logPerformance = (
  operation: string,
  duration: number,
  metadata: Record<string, any> = {}
): void => {
  const level = duration > 5000 ? 'warn' : duration > 1000 ? 'info' : 'debug';
  
  logger.log(level, 'Performance Metric', {
    operation,
    duration,
    timestamp: new Date().toISOString(),
    ...metadata
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
    ...details
  });
};

// Функция для логирования API вызовов
export const logApiCall = (
  method: string,
  endpoint: string,
  statusCode: number,
  duration: number,
  userId?: string,
  details: Record<string, any> = {}
): void => {
  const level = statusCode >= 400 ? 'error' : statusCode >= 300 ? 'warn' : 'http';
  
  logger.log(level, 'API Call', {
    method,
    endpoint,
    statusCode,
    duration,
    userId,
    timestamp: new Date().toISOString(),
    ...details
  });
};

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
    ...details
  });
};

// Функция для логирования ошибок базы данных
export const logDatabaseError = (
  operation: string,
  error: Error,
  query?: string,
  params?: any[]
): void => {
  logger.error('Database Error', {
    operation,
    error: error.message,
    stack: error.stack,
    query,
    params,
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