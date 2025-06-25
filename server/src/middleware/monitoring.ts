import { Request, Response, NextFunction } from 'express';
import { performance } from 'perf_hooks';

interface RequestMetrics {
  timestamp: Date;
  method: string;
  url: string;
  ip: string;
  userAgent: string;
  duration: number;
  statusCode: number;
  userId?: string;
  responseSize: number;
}

class MonitoringService {
  private metrics: RequestMetrics[] = [];
  private readonly maxMetrics = 10000;

  logRequest(metrics: RequestMetrics) {
    this.metrics.push(metrics);
    
    // Сохраняем только последние N метрик в памяти
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Логируем медленные запросы
    if (metrics.duration > 1000) {
      }

    // Логируем ошибки
    if (metrics.statusCode >= 400) {
      }
  }

  getMetrics(limit = 100): RequestMetrics[] {
    return this.metrics.slice(-limit);
  }

  getAverageResponseTime(): number {
    if (this.metrics.length === 0) return 0;
    const total = this.metrics.reduce((sum, metric) => sum + metric.duration, 0);
    return total / this.metrics.length;
  }

  getErrorRate(): number {
    if (this.metrics.length === 0) return 0;
    const errors = this.metrics.filter(m => m.statusCode >= 400).length;
    return (errors / this.metrics.length) * 100;
  }
}

const monitoringService = new MonitoringService();

// Middleware для метрик производительности
export const performanceMonitoring = (req: Request, res: Response, next: NextFunction) => {
  const startTime = performance.now();
  const originalSend = res.send;
  let responseSize = 0;

  // Переопределяем метод send для подсчета размера ответа
  res.send = function(data) {
    responseSize = Buffer.byteLength(data || '', 'utf8');
    return originalSend.call(this, data);
  };

  res.on('finish', () => {
    const duration = performance.now() - startTime;
    
    const metrics: RequestMetrics = {
      timestamp: new Date(),
      method: req.method,
      url: req.url,
      ip: req.ip || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown',
      duration: Math.round(duration),
      statusCode: res.statusCode,
      userId: req.user?.id,
      responseSize
    };

    monitoringService.logRequest(metrics);
  });

  next();
};

// Endpoint для получения метрик (только для админов)
export const getMetricsHandler = (req: Request, res: Response) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const limit = parseInt(req.query.limit as string) || 100;
  
  res.json({
    success: true,
    data: {
      metrics: monitoringService.getMetrics(limit),
      averageResponseTime: monitoringService.getAverageResponseTime(),
      errorRate: monitoringService.getErrorRate(),
      totalRequests: monitoringService.getMetrics().length
    }
  });
};

// Health check endpoint
export const healthCheck = (req: Request, res: Response) => {
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();
  
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(uptime),
    memory: {
      rss: Math.round(memoryUsage.rss / 1024 / 1024) + ' MB',
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + ' MB',
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + ' MB'
    },
    averageResponseTime: monitoringService.getAverageResponseTime(),
    errorRate: monitoringService.getErrorRate()
  });
};

export { monitoringService }; 
