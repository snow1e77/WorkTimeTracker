import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

// Конфигурация логирования для production
export const createProductionLogger = () => {
  const logFormat = winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  );

  const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    defaultMeta: {
      service: 'worktime-tracker',
      environment: process.env.NODE_ENV || 'development'
    },
    transports: [
      // Файл для всех логов с ротацией
      new DailyRotateFile({
        filename: 'logs/app-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '14d',
        level: 'info'
      }),

      // Отдельный файл для ошибок
      new DailyRotateFile({
        filename: 'logs/error-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '30d',
        level: 'error'
      }),

      // Консоль в development
      ...(process.env.NODE_ENV !== 'production' ? [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })
      ] : [])
    ],

    // Обработка необработанных исключений
    exceptionHandlers: [
      new DailyRotateFile({
        filename: 'logs/exceptions-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '30d'
      })
    ],

    // Обработка необработанных отклонений промисов
    rejectionHandlers: [
      new DailyRotateFile({
        filename: 'logs/rejections-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '30d'
      })
    ]
  });

  return logger;
};

// Метрики производительности
export interface PerformanceMetrics {
  requestCount: number;
  averageResponseTime: number;
  errorCount: number;
  activeConnections: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: NodeJS.CpuUsage;
}

class MetricsCollector {
  private metrics: PerformanceMetrics;
  private startTime: number;

  constructor() {
    this.metrics = {
      requestCount: 0,
      averageResponseTime: 0,
      errorCount: 0,
      activeConnections: 0,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage()
    };
    this.startTime = Date.now();
  }

  incrementRequests(responseTime: number) {
    this.metrics.requestCount++;
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime + responseTime) / this.metrics.requestCount;
  }

  incrementErrors() {
    this.metrics.errorCount++;
  }

  updateConnections(count: number) {
    this.metrics.activeConnections = count;
  }

  updateSystemMetrics() {
    this.metrics.memoryUsage = process.memoryUsage();
    this.metrics.cpuUsage = process.cpuUsage();
  }

  getMetrics(): PerformanceMetrics & { uptime: number } {
    this.updateSystemMetrics();
    return {
      ...this.metrics,
      uptime: Date.now() - this.startTime
    };
  }

  reset() {
    this.metrics.requestCount = 0;
    this.metrics.averageResponseTime = 0;
    this.metrics.errorCount = 0;
  }
}

export const metricsCollector = new MetricsCollector();

// Health check функция
export const healthCheck = async () => {
  const health = {
    status: 'ok' as 'ok' | 'error',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    metrics: metricsCollector.getMetrics(),
    services: {
      database: 'unknown' as 'connected' | 'disconnected' | 'unknown',
      redis: 'unknown' as 'connected' | 'disconnected' | 'unknown'
    }
  };

  try {
    // Проверка базы данных (импортируем динамически чтобы избежать циклических зависимостей)
    const { testConnection } = await import('./database');
    health.services.database = await testConnection() ? 'connected' : 'disconnected';
  } catch (error) {
    health.services.database = 'disconnected';
    health.status = 'error';
  }

  // Можно добавить проверку Redis если используется
  
  return health;
};

// Автоматический сбор метрик каждые 30 секунд
if (process.env.NODE_ENV === 'production') {
  setInterval(() => {
    metricsCollector.updateSystemMetrics();
  }, 30000);
} 