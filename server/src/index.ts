import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { testConnection } from './config/database';
import { AuthService } from './services/AuthService';
import { SyncService, setWebSocketServiceGetter } from './services/SyncService';
import { WebSocketService } from './services/WebSocketService';
import logger, { logSecurityEvent, logPerformance } from './utils/logger';
import { 
  strictRateLimit, 
  authRateLimit,
  requireValidUserAgent, 
  logSuspiciousActivity,
  setSecurityHeaders,
  csrfProtection,
  preventXSS
} from './middleware/security';

// Загружаем переменные окружения
dotenv.config();

// Проверяем критические переменные окружения
const requiredEnvVars = ['JWT_SECRET', 'DB_PASSWORD'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0 && process.env.NODE_ENV === 'production') {
  console.error('🚨 Missing required environment variables:', missingEnvVars);
  process.exit(1);
}

// Проверяем силу JWT секрета
if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
  console.warn('⚠️ JWT_SECRET should be at least 32 characters long for security');
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}

// Импорт маршрутов
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import siteRoutes from './routes/sites';
import assignmentRoutes from './routes/assignments';
import shiftRoutes from './routes/shifts';
import reportRoutes from './routes/reports';
import syncRoutes from './routes/sync';
import notificationRoutes from './routes/notifications';
import chatRoutes from './routes/chat';

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3001;

// Инициализация WebSocket сервера
let webSocketService: WebSocketService;

// Экспортируем WebSocket сервис для использования в других модулях
export const getWebSocketService = (): WebSocketService => webSocketService;

// Расширенная настройка CORS с проверкой origin
const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || [
  'http://localhost:19006',
  'http://localhost:3000',
  'http://localhost:8081'
];

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Разрешаем запросы без origin (мобильные приложения)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`🚨 CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'X-CSRF-Token',
    'X-Privacy-Consent',
    'X-Privacy-Consent-Timestamp'
  ],
  maxAge: 86400 // 24 hours
};

// Улучшенная конфигурация Helmet
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: process.env.NODE_ENV === 'production' ? ["'self'"] : ["'self'", "'unsafe-eval'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "ws:"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

app.use(cors(corsOptions));
app.use(compression());

// Ограничиваем размер тела запроса
app.use(express.json({ 
  limit: '1mb',
  verify: (req, res, buf) => {
    // Проверяем на потенциально опасный JSON
    const body = buf.toString();
    if (body.includes('<script') || body.includes('javascript:')) {
      throw new Error('Potentially malicious JSON detected');
    }
  }
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: '1mb',
  parameterLimit: 100 // Ограничиваем количество параметров
}));

// Применяем middleware безопасности
app.use(setSecurityHeaders);
app.use(requireValidUserAgent);
app.use(preventXSS);
app.use(csrfProtection);
app.use(logSuspiciousActivity);

// Глобальное rate limiting
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 минут
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000'), // 1000 запросов на IP
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Пропускаем health check
    return req.path === '/health';
  }
});

app.use(globalLimiter);

// Middleware для логирования всех запросов с расширенной информацией
app.use((req, res, next) => {
  const start = Date.now();
  const requestId = Math.random().toString(36).substring(7);
  
  // Добавляем ID запроса для трассировки
  req.headers['x-request-id'] = requestId;
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      requestId,
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id,
      contentLength: req.get('Content-Length'),
      referer: req.get('Referer')
    };
    
    // Различные уровни логирования в зависимости от статуса
    if (res.statusCode >= 500) {
      logger.error('Server Error', logData);
    } else if (res.statusCode >= 400) {
      logger.warn('Client Error', logData);
    } else {
      logger.http('HTTP Request', logData);
    }
    
    // Логируем медленные запросы
    if (duration > 1000) {
      logPerformance('slow_request', duration, {
        method: req.method,
        url: req.originalUrl,
        userId: req.user?.id
      });
    }
    
    // Логируем подозрительную активность
    if (res.statusCode === 403 || res.statusCode === 401) {
      logSecurityEvent('unauthorized_access', {
        ip: req.ip,
        url: req.originalUrl,
        userAgent: req.get('User-Agent')
      });
    }
  });
  
  next();
});

// Маршруты API с различными уровнями rate limiting
app.use('/api/auth', authRateLimit, authRoutes); // Строгий лимит для аутентификации
app.use('/api/users', userRoutes);
app.use('/api/sites', siteRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/reports', strictRateLimit, reportRoutes); // Строгий лимит для отчетов
app.use('/api/sync', syncRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/chat', chatRoutes);

// Базовый маршрут для проверки здоровья сервера
app.get('/health', async (req, res) => {
  try {
    const dbConnection = await testConnection();
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: dbConnection ? 'connected' : 'disconnected',
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

// Маршрут для получения информации о сервере
app.get('/api/info', (req, res) => {
  res.json({
    name: 'WorkTime Tracker API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    features: [
      'JWT Authentication',
      'SMS Verification',
      'User Management',
      'Site Management',
      'Work Shifts Tracking',
      'Real-time Sync',
      'Reports Generation'
    ],
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      sites: '/api/sites',
      assignments: '/api/assignments',
      shifts: '/api/shifts',
      reports: '/api/reports',
      sync: '/api/sync',
      notifications: '/api/notifications'
    }
  });
});

// Обработка 404
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    message: `Route ${req.method} ${req.originalUrl} not found`
  });
});

// Глобальная обработка ошибок
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', { 
    message: error.message, 
    stack: error.stack,
    url: req.url,
    method: req.method
  });
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error' 
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Запуск сервера
const startServer = async () => {
  try {
    logger.info('Starting WorkTime Tracker Server...');
    
    // Проверяем подключение к базе данных
    logger.info('Testing database connection...');
    const isDbConnected = await testConnection();
    
    if (!isDbConnected) {
      logger.error('Failed to connect to database');
      process.exit(1);
    }
    
    logger.info('Database connection successful');
    
    // Инициализируем таблицы синхронизации
    logger.info('Initializing sync tables...');
    await SyncService.initializeSyncTables();
    logger.info('Sync tables initialized');
    
    // Инициализируем WebSocket сервер
    logger.info('Initializing WebSocket server...');
    webSocketService = new WebSocketService(httpServer);
    
    // Связываем WebSocket сервис с SyncService
    setWebSocketServiceGetter(() => webSocketService);
    
    logger.info('WebSocket server initialized');
    
    // Запускаем очистку истекших токенов каждый час
    setInterval(() => {
      AuthService.cleanupExpiredTokens();
    }, 60 * 60 * 1000);
    
    // Запуск сервера
    httpServer.listen(PORT, () => {
      logger.info('Server started successfully', {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        apiBaseUrl: `http://localhost:${PORT}/api`,
        healthCheck: `http://localhost:${PORT}/health`,
        webSocketUrl: `ws://localhost:${PORT}`,
        connectedUsers: webSocketService.getConnectedUsersCount()
      });
      
      if (process.env.NODE_ENV !== 'production') {
        logger.debug('Available endpoints', {
          endpoints: [
            'POST /api/auth/send-code - Send SMS verification code',
            'POST /api/auth/login - Login with phone and code',
            'POST /api/auth/register - Register new user',
            'POST /api/auth/refresh - Refresh access token',
            'POST /api/auth/logout - Logout user',
            'GET  /api/users - Get all users',
            'GET  /api/sites - Get all construction sites',
            'GET  /api/assignments - Get user assignments',
            'GET  /api/shifts - Get work shifts',
            'GET  /api/reports - Get work reports',
            'POST /api/sync - Synchronize data'
          ]
        });
      }
    });
    
  } catch (error) {
    logger.error('Failed to start server', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    process.exit(1);
  }
};

// Запускаем сервер
startServer();

export default app; 