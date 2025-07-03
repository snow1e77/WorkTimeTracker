import { MonitoringService } from '../../src/services/MonitoringService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sentry from '@sentry/react-native';

// Мокаем зависимости
jest.mock('@react-native-async-storage/async-storage');
jest.mock('@sentry/react-native');
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' }
}));

const mockedAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockedSentry = Sentry as jest.Mocked<typeof Sentry>;

// Мокаем глобальные переменные
(global as any).__DEV__ = true;
(global as any).ErrorUtils = {
  getGlobalHandler: jest.fn(),
  setGlobalHandler: jest.fn()
};

describe('MonitoringService', () => {
  let monitoringService: MonitoringService;

  beforeEach(() => {
    jest.clearAllMocks();
    monitoringService = MonitoringService.getInstance();
  });

  describe('Инициализация', () => {
    it('должен быть синглтоном', () => {
      const instance1 = MonitoringService.getInstance();
      const instance2 = MonitoringService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('должен инициализироваться без Sentry в dev режиме', async () => {
      await monitoringService.initialize();
      
      expect(mockedSentry.init).not.toHaveBeenCalled();
    });

    it('должен инициализироваться с Sentry в продакшне', async () => {
      (global as any).__DEV__ = false;
      
      await monitoringService.initialize('test-dsn');
      
      expect(mockedSentry.init).toHaveBeenCalledWith(expect.objectContaining({
        dsn: 'test-dsn',
        environment: 'production'
      }));
      
      (global as any).__DEV__ = true;
    });
  });

  describe('Отслеживание производительности', () => {
    it('должен записывать метрики производительности', () => {
      monitoringService.trackPerformance('test_metric', 100, { extra: 'data' });
      
      const metrics = monitoringService.getPerformanceMetrics();
      expect(metrics.length).toBeGreaterThan(0);
      expect(metrics[0]).toEqual(expect.objectContaining({
        name: 'test_metric',
        value: 100,
        metadata: { extra: 'data' }
      }));
    });

    it('должен ограничивать количество метрик в памяти', () => {
      // Добавляем много метрик
      for (let i = 0; i < 1200; i++) {
        monitoringService.trackPerformance(`metric_${i}`, i);
      }
      
      const metrics = monitoringService.getPerformanceMetrics();
      expect(metrics.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('Отслеживание ошибок', () => {
    it('должен записывать ошибки', () => {
      const testError = new Error('Test error');
      monitoringService.trackError(testError, 'error', { context: 'test' });
      
      const errors = monitoringService.getRecentErrors();
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toEqual(expect.objectContaining({
        error: testError,
        level: 'error',
        context: { context: 'test' }
      }));
    });

    it('должен обрабатывать строковые ошибки', () => {
      monitoringService.trackError('String error', 'warning');
      
      const errors = monitoringService.getRecentErrors();
      expect(errors[0].error).toBe('String error');
      expect(errors[0].level).toBe('warning');
    });
  });

  describe('Мониторинг синхронизации', () => {
    it('должен отслеживать начало синхронизации', () => {
      monitoringService.trackSyncStart();
      
      const syncMetrics = monitoringService.getSyncMetrics();
      expect(syncMetrics.totalSyncs).toBe(1);
      expect(syncMetrics.lastSyncStatus).toBe('in_progress');
    });

    it('должен отслеживать успешную синхронизацию', () => {
      monitoringService.trackSyncStart();
      monitoringService.trackSyncSuccess(5000);
      
      const syncMetrics = monitoringService.getSyncMetrics();
      expect(syncMetrics.successfulSyncs).toBe(1);
      expect(syncMetrics.lastSyncStatus).toBe('success');
      expect(syncMetrics.averageSyncDuration).toBe(5000);
    });

    it('должен отслеживать неудачную синхронизацию', () => {
      monitoringService.trackSyncStart();
      monitoringService.trackSyncFailure(new Error('Sync failed'), 'network');
      
      const syncMetrics = monitoringService.getSyncMetrics();
      expect(syncMetrics.failedSyncs).toBe(1);
      expect(syncMetrics.networkErrors).toBe(1);
      expect(syncMetrics.lastSyncStatus).toBe('failed');
    });

    it('должен правильно вычислять среднее время синхронизации', () => {
      monitoringService.trackSyncStart();
      monitoringService.trackSyncSuccess(1000);
      
      monitoringService.trackSyncStart();
      monitoringService.trackSyncSuccess(3000);
      
      const syncMetrics = monitoringService.getSyncMetrics();
      expect(syncMetrics.averageSyncDuration).toBe(2000);
    });
  });

  describe('События и отчеты', () => {
    it('должен отслеживать события', () => {
      monitoringService.trackEvent('user_action', { action: 'click', button: 'sync' });
      
      // События не сохраняются отдельно, но должны обрабатываться без ошибок
      expect(() => {
        monitoringService.trackEvent('test_event');
      }).not.toThrow();
    });

    it('должен возвращать время работы приложения', () => {
      const uptime = monitoringService.getUptime();
      expect(typeof uptime).toBe('number');
      expect(uptime).toBeGreaterThanOrEqual(0);
    });

    it('должен генерировать отчет о состоянии', () => {
      monitoringService.trackError(new Error('Test'), 'error');
      monitoringService.trackSyncStart();
      monitoringService.trackSyncSuccess(1000);
      
      const healthReport = monitoringService.getHealthReport();
      
      expect(healthReport).toHaveProperty('status');
      expect(healthReport).toHaveProperty('issues');
      expect(healthReport).toHaveProperty('metrics');
      expect(['healthy', 'warning', 'critical']).toContain(healthReport.status);
    });
  });

  describe('Сохранение метрик', () => {
    it('должен сохранять метрики в AsyncStorage', async () => {
      await monitoringService.persistMetrics();
      
      expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith(
        'monitoring_metrics',
        expect.any(String)
      );
    });

    it('должен загружать сохраненные метрики', async () => {
      const mockMetrics = JSON.stringify({
        syncMetrics: {
          totalSyncs: 5,
          successfulSyncs: 4,
          failedSyncs: 1
        }
      });
      
      mockedAsyncStorage.getItem.mockResolvedValue(mockMetrics);
      
      // Создаем новый экземпляр для тестирования загрузки
      await monitoringService.initialize();
      
      expect(mockedAsyncStorage.getItem).toHaveBeenCalledWith('monitoring_metrics');
    });
  });

  describe('Сброс и экспорт', () => {
    it('должен сбрасывать все метрики', () => {
      monitoringService.trackPerformance('test', 100);
      monitoringService.trackError(new Error('test'), 'error');
      monitoringService.trackSyncStart();
      
      monitoringService.resetMetrics();
      
      const metrics = monitoringService.getMetrics();
      expect(metrics.performance).toHaveLength(0);
      expect(metrics.errors).toHaveLength(0);
      expect(metrics.sync.totalSyncs).toBe(0);
    });

    it('должен экспортировать метрики в JSON', () => {
      monitoringService.trackPerformance('test', 100);
      
      const exported = monitoringService.exportMetrics();
      
      expect(typeof exported).toBe('string');
      expect(() => JSON.parse(exported)).not.toThrow();
    });
  });

  describe('Фильтрация метрик', () => {
    it('должен фильтровать метрики производительности по имени', () => {
      monitoringService.trackPerformance('metric_a', 100);
      monitoringService.trackPerformance('metric_b', 200);
      monitoringService.trackPerformance('metric_a', 150);
      
      const filteredMetrics = monitoringService.getPerformanceMetrics('metric_a');
      expect(filteredMetrics).toHaveLength(2);
      expect(filteredMetrics.every(m => m.name === 'metric_a')).toBe(true);
    });

    it('должен ограничивать количество возвращаемых метрик', () => {
      for (let i = 0; i < 20; i++) {
        monitoringService.trackPerformance('test', i);
      }
      
      const limitedMetrics = monitoringService.getPerformanceMetrics(undefined, 5);
      expect(limitedMetrics).toHaveLength(5);
    });

    it('должен возвращать последние ошибки', () => {
      for (let i = 0; i < 15; i++) {
        monitoringService.trackError(`Error ${i}`, 'error');
      }
      
      const recentErrors = monitoringService.getRecentErrors(5);
      expect(recentErrors).toHaveLength(5);
    });
  });
}); 