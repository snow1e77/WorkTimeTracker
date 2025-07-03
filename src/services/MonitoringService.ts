import * as Sentry from '@sentry/react-native';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from '../utils/logger';

// Импорт глобальных переменных React Native
declare const __DEV__: boolean;
declare const ErrorUtils: {
  getGlobalHandler(): ((error: any, isFatal?: boolean) => void) | undefined;
  setGlobalHandler(handler: (error: any, isFatal?: boolean) => void): void;
};

// Интерфейс для memory API (доступно только в браузерах)
interface PerformanceMemory {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

// Вспомогательная функция для безопасного доступа к performance.memory
const getMemoryUsage = (): number | undefined => {
  try {
    const perf = global.performance as any;
    return perf?.memory?.usedJSHeapSize;
  } catch {
    return undefined;
  }
};

export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface ErrorMetric {
  error: Error | string;
  level: 'error' | 'warning' | 'info';
  timestamp: Date;
  context?: Record<string, any>;
}

export interface SyncMetrics {
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  averageSyncDuration: number;
  lastSyncTime: Date | null;
  lastSyncStatus: 'success' | 'failed' | 'in_progress';
  networkErrors: number;
  serverErrors: number;
}

export interface AppMetrics {
  performance: PerformanceMetric[];
  errors: ErrorMetric[];
  sync: SyncMetrics;
  uptime: number;
  startTime: Date;
  crashCount: number;
  memoryUsage?: number;
}

export class MonitoringService {
  private static instance: MonitoringService;
  private isInitialized = false;
  private startTime = new Date();
  private performanceMetrics: PerformanceMetric[] = [];
  private errorMetrics: ErrorMetric[] = [];
  private syncMetrics: SyncMetrics = {
    totalSyncs: 0,
    successfulSyncs: 0,
    failedSyncs: 0,
    averageSyncDuration: 0,
    lastSyncTime: null,
    lastSyncStatus: 'success',
    networkErrors: 0,
    serverErrors: 0
  };
  private crashCount = 0;
  private maxMetricsCount = 1000; // Максимальное количество метрик в памяти
  
  // Добавляем поля для хранения интервалов
  private memoryMonitoringInterval: NodeJS.Timeout | null = null;
  private uptimeMonitoringInterval: NodeJS.Timeout | null = null;

  private constructor() {}

  static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  public async initialize(sentryDsn?: string): Promise<void> {
    if (this.isInitialized) return;

    this.isInitialized = true;

    // Загружаем сохраненные метрики
    await this.loadPersistedMetrics();

    // Настраиваем глобальный обработчик ошибок
    this.setupGlobalErrorHandler();

    // Запускаем мониторинг производительности
    this.startPerformanceMonitoring();

    // Настраиваем Sentry если DSN предоставлен
    if (sentryDsn && !__DEV__) {
      Sentry.init({
        dsn: sentryDsn,
        debug: __DEV__,
        beforeSend: (event) => {
          // Фильтруем события в зависимости от настроек
          return event;
        }
      });
    }
  }

  // Настройка глобального обработчика ошибок
  private setupGlobalErrorHandler(): void {
    const originalErrorHandler = ErrorUtils.getGlobalHandler();
    
    ErrorUtils.setGlobalHandler((error, isFatal) => {
      this.crashCount++;
      this.trackError(error, 'error', { isFatal });
      
      // Сохраняем метрики при критических ошибках
      if (isFatal) {
        this.persistMetricsSync();
      }
      
      // Вызываем оригинальный обработчик
      if (originalErrorHandler) {
        originalErrorHandler(error, isFatal);
      }
    });
  }

  // Запуск мониторинга производительности
  private startPerformanceMonitoring(): void {
    // Мониторинг использования памяти (только для разработки и если доступно)
    if (__DEV__) {
      this.memoryMonitoringInterval = setInterval(() => {
        const memoryUsage = getMemoryUsage();
        if (memoryUsage) {
          this.trackPerformance('memory_usage', memoryUsage / 1024 / 1024);
        }
      }, 60000); // каждую минуту
    }

    // Мониторинг времени работы приложения
    this.uptimeMonitoringInterval = setInterval(() => {
      this.trackPerformance('app_uptime', this.getUptime());
    }, 300000); // каждые 5 минут
  }

  // Метод для остановки мониторинга и очистки ресурсов
  public stopMonitoring(): void {
    if (this.memoryMonitoringInterval) {
      clearInterval(this.memoryMonitoringInterval);
      this.memoryMonitoringInterval = null;
    }

    if (this.uptimeMonitoringInterval) {
      clearInterval(this.uptimeMonitoringInterval);
      this.uptimeMonitoringInterval = null;
    }
  }

  // Отслеживание производительности
  public trackPerformance(name: string, value: number, metadata?: Record<string, any>): void {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: new Date(),
      metadata
    };

    this.performanceMetrics.push(metric);
    
    // Ограничиваем количество метрик в памяти
    if (this.performanceMetrics.length > this.maxMetricsCount) {
      this.performanceMetrics = this.performanceMetrics.slice(-this.maxMetricsCount / 2);
    }

    // В продакшне отправляем в Sentry
    if (!__DEV__) {
      Sentry.addBreadcrumb({
        message: `Performance: ${name}`,
        level: 'info',
        data: { value, ...metadata }
      });
    }
  }

  // Отслеживание ошибок
  public trackError(error: Error | string, level: 'error' | 'warning' | 'info' = 'error', context?: Record<string, any>): void {
    const errorMetric: ErrorMetric = {
      error,
      level,
      timestamp: new Date(),
      context
    };

    this.errorMetrics.push(errorMetric);
    
    // Ограничиваем количество ошибок в памяти
    if (this.errorMetrics.length > this.maxMetricsCount) {
      this.errorMetrics = this.errorMetrics.slice(-this.maxMetricsCount / 2);
    }

    // В продакшне отправляем в Sentry
    if (!__DEV__) {
      if (error instanceof Error) {
        Sentry.captureException(error, { level, extra: context });
      } else {
        Sentry.captureMessage(error, level);
      }
    }

    // Логируем в консоль для разработки
    if (__DEV__) {
      logger.error(`[${level.toUpperCase()}] ${error instanceof Error ? error.message : error}`, { context }, 'monitoring');
    }
  }

  // Отслеживание событий
  public trackEvent(eventName: string, properties?: Record<string, any>): void {
    const timestamp = new Date();
    
    // В продакшне отправляем в Sentry
    if (!__DEV__) {
      Sentry.addBreadcrumb({
        message: eventName,
        level: 'info',
        data: properties
      });
    }

    // Логируем в консоль для разработки
    if (__DEV__) {
      logger.info(`Event: ${eventName}`, properties, 'monitoring');
    }
  }

  // Отслеживание синхронизации
  public trackSyncStart(): void {
    this.syncMetrics.totalSyncs++;
    this.syncMetrics.lastSyncStatus = 'in_progress';
    this.trackEvent('sync_started');
  }

  public trackSyncSuccess(duration: number): void {
    this.syncMetrics.successfulSyncs++;
    this.syncMetrics.lastSyncTime = new Date();
    this.syncMetrics.lastSyncStatus = 'success';
    
    // Обновляем среднее время синхронизации
    this.updateAverageSyncDuration(duration);
    
    this.trackPerformance('sync_duration', duration);
    this.trackEvent('sync_completed', { duration, status: 'success' });
  }

  public trackSyncFailure(error: Error | string, errorType: 'network' | 'server' | 'other' = 'other'): void {
    this.syncMetrics.failedSyncs++;
    this.syncMetrics.lastSyncStatus = 'failed';
    
    if (errorType === 'network') {
      this.syncMetrics.networkErrors++;
    } else if (errorType === 'server') {
      this.syncMetrics.serverErrors++;
    }
    
    this.trackError(error, 'error', { type: 'sync_failure', errorType });
    this.trackEvent('sync_failed', { error: error.toString(), errorType });
  }

  // Обновление среднего времени синхронизации
  private updateAverageSyncDuration(duration: number): void {
    const { successfulSyncs, averageSyncDuration } = this.syncMetrics;
    
    if (successfulSyncs === 1) {
      this.syncMetrics.averageSyncDuration = duration;
    } else {
      this.syncMetrics.averageSyncDuration = 
        (averageSyncDuration * (successfulSyncs - 1) + duration) / successfulSyncs;
    }
  }

  // Получение времени работы приложения
  public getUptime(): number {
    return Date.now() - this.startTime.getTime();
  }

  // Получение всех метрик
  public getMetrics(): AppMetrics {
    return {
      performance: [...this.performanceMetrics],
      errors: [...this.errorMetrics],
      sync: { ...this.syncMetrics },
      uptime: this.getUptime(),
      startTime: this.startTime,
      crashCount: this.crashCount,
      memoryUsage: getMemoryUsage()
    };
  }

  // Получение метрик синхронизации
  public getSyncMetrics(): SyncMetrics {
    return { ...this.syncMetrics };
  }

  // Получение последних ошибок
  public getRecentErrors(count: number = 10): ErrorMetric[] {
    return this.errorMetrics.slice(-count);
  }

  // Получение метрик производительности
  public getPerformanceMetrics(name?: string, limit: number = 100): PerformanceMetric[] {
    const metrics = name 
      ? this.performanceMetrics.filter(m => m.name === name)
      : this.performanceMetrics;
    
    return metrics.slice(-limit);
  }

  // Сохранение метрик в AsyncStorage
  public async persistMetrics(): Promise<void> {
    try {
      const metricsData = {
        sync: this.syncMetrics,
        crashCount: this.crashCount,
        startTime: this.startTime.toISOString(),
        errors: this.errorMetrics.slice(-50), // Сохраняем только последние 50 ошибок
        performance: this.performanceMetrics.slice(-100) // Сохраняем только последние 100 метрик
      };

      await AsyncStorage.setItem('monitoring_metrics', JSON.stringify(metricsData));
    } catch (error) {
      logger.error('Failed to persist metrics', { error: error instanceof Error ? error.message : 'Unknown error' }, 'monitoring');
    }
  }

  // Синхронное сохранение метрик (для критических ситуаций)
  private persistMetricsSync(): void {
    try {
      this.persistMetrics();
    } catch (error) {
      logger.error('Failed to persist metrics synchronously', { error: error instanceof Error ? error.message : 'Unknown error' }, 'monitoring');
    }
  }

  // Загрузка сохраненных метрик
  private async loadPersistedMetrics(): Promise<void> {
    try {
      const metricsData = await AsyncStorage.getItem('monitoring_metrics');
      if (metricsData) {
        const parsed = JSON.parse(metricsData);
        
        if (parsed.sync) {
          this.syncMetrics = { ...this.syncMetrics, ...parsed.sync };
        }
        
        if (parsed.crashCount) {
          this.crashCount = parsed.crashCount;
        }
        
        if (parsed.errors) {
          this.errorMetrics = parsed.errors;
        }
        
        if (parsed.performance) {
          this.performanceMetrics = parsed.performance;
        }
      }
    } catch (error) {
      logger.error('Failed to load persisted metrics', { error: error instanceof Error ? error.message : 'Unknown error' }, 'monitoring');
    }
  }

  // Сброс метрик
  public resetMetrics(): void {
    // Останавливаем мониторинг
    this.stopMonitoring();
    
    this.performanceMetrics = [];
    this.errorMetrics = [];
    this.syncMetrics = {
      totalSyncs: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      averageSyncDuration: 0,
      lastSyncTime: null,
      lastSyncStatus: 'success',
      networkErrors: 0,
      serverErrors: 0
    };
    this.crashCount = 0;
    this.startTime = new Date();
    
    // Перезапускаем мониторинг
    this.startPerformanceMonitoring();
    
    // Очищаем сохраненные метрики
    AsyncStorage.removeItem('monitoring_metrics');
  }

  // Получение отчета о состоянии приложения
  public getHealthReport(): {
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    metrics: {
      errorRate: number;
      syncSuccessRate: number;
      averagePerformance: number;
      uptime: number;
    };
  } {
    const errorRate = this.errorMetrics.length / Math.max(this.getUptime() / 3600000, 1); // ошибок в час
    const syncSuccessRate = this.syncMetrics.totalSyncs > 0 
      ? this.syncMetrics.successfulSyncs / this.syncMetrics.totalSyncs 
      : 1;
    
    const issues: string[] = [];
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    // Проверяем критические проблемы
    if (errorRate > 10) {
      issues.push('High error rate detected');
      status = 'critical';
    } else if (errorRate > 5) {
      issues.push('Elevated error rate');
      status = 'warning';
    }

    if (syncSuccessRate < 0.5) {
      issues.push('Poor sync success rate');
      status = 'critical';
    } else if (syncSuccessRate < 0.8) {
      issues.push('Sync success rate below optimal');
      if (status !== 'critical') status = 'warning';
    }

    if (this.crashCount > 0) {
      issues.push(`${this.crashCount} crashes detected`);
      status = 'critical';
    }

    return {
      status,
      issues,
      metrics: {
        errorRate,
        syncSuccessRate,
        averagePerformance: this.syncMetrics.averageSyncDuration,
        uptime: this.getUptime()
      }
    };
  }

  // Экспорт метрик для отладки
  public exportMetrics(): string {
    return JSON.stringify(this.getMetrics(), null, 2);
  }
}

export default MonitoringService; 