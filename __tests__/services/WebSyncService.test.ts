import { WebSyncService } from '../../src/services/WebSyncService';
import { WebDatabaseService } from '../../src/services/WebDatabaseService';
import { NetworkService } from '../../src/services/NetworkService';
import { MonitoringService } from '../../src/services/MonitoringService';

// Мокаем зависимости
jest.mock('../../src/services/WebDatabaseService');
jest.mock('../../src/services/NetworkService');
jest.mock('../../src/services/MonitoringService');
jest.mock('axios');

import axios from 'axios';
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Мокаем localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('WebSyncService', () => {
  let webSyncService: WebSyncService;
  let mockDbService: jest.Mocked<WebDatabaseService>;
  let mockNetworkService: jest.Mocked<NetworkService>;
  let mockMonitoringService: jest.Mocked<MonitoringService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Мокаем NetworkService
    mockNetworkService = {
      getNetworkStatus: jest.fn().mockReturnValue({
        isConnected: true,
        type: 'wifi',
        quality: 'excellent'
      }),
      checkInternetConnectivity: jest.fn().mockResolvedValue(true),
      getMetrics: jest.fn().mockReturnValue({
        connectionChecks: 1,
        connectionFailures: 0,
        averageLatency: 50,
        lastSuccessfulCheck: new Date(),
        lastFailure: null,
        isMonitoring: false
      }),
      getSyncRecommendation: jest.fn().mockReturnValue({
        shouldSync: true,
        reason: 'Network conditions are optimal',
        quality: 'excellent'
      }),
      waitForConnection: jest.fn().mockResolvedValue(true)
    } as any;
    (NetworkService.getInstance as jest.Mock).mockReturnValue(mockNetworkService);
    
    // Мокаем MonitoringService
    mockMonitoringService = {
      trackSyncStart: jest.fn(),
      trackSyncSuccess: jest.fn(),
      trackSyncError: jest.fn(),
      trackPerformance: jest.fn(),
      logError: jest.fn(),
      logInfo: jest.fn(),
      getAppReport: jest.fn().mockReturnValue({
        appVersion: '1.0.0',
        crashCount: 0,
        errorCount: 0,
        uptime: 1000
      })
    } as any;
    (MonitoringService.getInstance as jest.Mock).mockReturnValue(mockMonitoringService);
    
    webSyncService = WebSyncService.getInstance();
    mockDbService = WebDatabaseService.getInstance() as jest.Mocked<WebDatabaseService>;
  });

  afterEach(() => {
    webSyncService.stopAutoSync();
  });

  describe('Инициализация', () => {
    it('должен быть синглтоном', () => {
      const instance1 = WebSyncService.getInstance();
      const instance2 = WebSyncService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('должен инициализировать NetworkService и MonitoringService', () => {
      expect(NetworkService.getInstance).toHaveBeenCalled();
      expect(MonitoringService.getInstance).toHaveBeenCalled();
    });
  });

  describe('Проверка сети', () => {
    it('должен проверять доступность сети перед синхронизацией', async () => {
      localStorageMock.getItem.mockReturnValue('fake-token');
      mockNetworkService.getNetworkStatus.mockReturnValue({
        isConnected: false,
        type: 'none',
        quality: 'unknown'
      });
      
      const result = await webSyncService.syncData();
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('No network connection');
      expect(mockNetworkService.getNetworkStatus).toHaveBeenCalled();
    });

    it('должен использовать рекомендации сети для синхронизации', async () => {
      localStorageMock.getItem.mockReturnValue('fake-token');
      mockNetworkService.getSyncRecommendation.mockReturnValue({
        shouldSync: false,
        reason: 'Poor network conditions',
        quality: 'poor'
      });
      
      const result = await webSyncService.syncData();
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Network conditions not suitable for sync');
      expect(mockNetworkService.getSyncRecommendation).toHaveBeenCalled();
    });
  });

  describe('Мониторинг синхронизации', () => {
    it('должен отслеживать начало синхронизации', async () => {
      localStorageMock.getItem.mockReturnValue('fake-token');
      mockDbService.getAllAssignments.mockResolvedValue([]);
      mockDbService.getConstructionSites.mockResolvedValue([]);
      mockDbService.getAllUsers.mockResolvedValue([]);

      mockedAxios.post.mockResolvedValue({
        status: 200,
        data: { success: true }
      });

      await webSyncService.syncData();
      
      expect(mockMonitoringService.trackSyncStart).toHaveBeenCalled();
    });

    it('должен отслеживать успешную синхронизацию', async () => {
      localStorageMock.getItem.mockReturnValue('fake-token');
      mockDbService.getAllAssignments.mockResolvedValue([]);
      mockDbService.getConstructionSites.mockResolvedValue([]);
      mockDbService.getAllUsers.mockResolvedValue([]);

      mockedAxios.post.mockResolvedValue({
        status: 200,
        data: { success: true }
      });

      const result = await webSyncService.syncData();
      
      expect(result.success).toBe(true);
      expect(mockMonitoringService.trackSyncSuccess).toHaveBeenCalled();
      expect(mockMonitoringService.trackPerformance).toHaveBeenCalled();
    });

    it('должен отслеживать ошибки синхронизации', async () => {
      localStorageMock.getItem.mockReturnValue('fake-token');
      mockDbService.getAllAssignments.mockResolvedValue([]);
      mockDbService.getConstructionSites.mockResolvedValue([]);
      mockDbService.getAllUsers.mockResolvedValue([]);

      const networkError = new Error('Network Error');
      mockedAxios.post.mockRejectedValue(networkError);

      const result = await webSyncService.syncData();
      
      expect(result.success).toBe(false);
      expect(mockMonitoringService.trackError).toHaveBeenCalledWith(networkError, 'error', expect.any(Object));
    });
  });

  describe('Статус синхронизации', () => {
    it('должен возвращать корректный статус', () => {
      const status = webSyncService.getSyncStatus();
      
      expect(status).toHaveProperty('lastSync');
      expect(status).toHaveProperty('isInProgress');
      expect(status).toHaveProperty('nextSync');
      expect(typeof status.isInProgress).toBe('boolean');
    });

    it('должен возвращать информацию о времени следующей синхронизации', () => {
      const status = webSyncService.getSyncStatus();
      
      expect(status).toHaveProperty('nextSync');
      expect(typeof status.nextSync).toBe('object');
    });
  });

  describe('Синхронизация данных', () => {
    it('должен возвращать ошибку если нет токена', async () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const result = await webSyncService.syncData();
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('No authentication token found');
    });

    it('не должен запускать синхронизацию если уже выполняется', async () => {
      localStorageMock.getItem.mockReturnValue('fake-token');
      
      // Мокаем длительный запрос
      mockedAxios.post.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ status: 200, data: { success: true } }), 1000))
      );

      // Мокаем данные БД
      mockDbService.getAllAssignments.mockResolvedValue([]);
      mockDbService.getConstructionSites.mockResolvedValue([]);
      mockDbService.getAllUsers.mockResolvedValue([]);

      // Запускаем первую синхронизацию
      const firstSync = webSyncService.syncData();
      
      // Пытаемся запустить вторую сразу
      const secondSync = await webSyncService.syncData();
      
      // Вторая должна вернуть ошибку
      expect(secondSync.success).toBe(false);
      expect(secondSync.error).toContain('Sync already in progress');

      // Ждем завершения первой
      await firstSync;
    });

    it('должен обрабатывать успешную синхронизацию', async () => {
      localStorageMock.getItem.mockReturnValue('fake-token');
      mockDbService.getAllAssignments.mockResolvedValue([]);
      mockDbService.getConstructionSites.mockResolvedValue([]);
      mockDbService.getAllUsers.mockResolvedValue([]);

      mockedAxios.post.mockResolvedValue({
        status: 200,
        data: { success: true }
      });

      const result = await webSyncService.syncData();
      
      expect(result.success).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'worktime_last_sync', 
        expect.any(String)
      );
    });

    it('должен обрабатывать ошибки сети с повторными попытками', async () => {
      localStorageMock.getItem.mockReturnValue('fake-token');
      mockDbService.getAllAssignments.mockResolvedValue([]);
      mockDbService.getConstructionSites.mockResolvedValue([]);
      mockDbService.getAllUsers.mockResolvedValue([]);

      const networkError = new Error('Network Error');
      (networkError as any).code = 'NETWORK_ERROR';
      mockedAxios.post.mockRejectedValue(networkError);

      const result = await webSyncService.syncData();
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Network Error');
      expect(mockNetworkService.waitForConnection).toHaveBeenCalled();
    });
  });

  describe('Обработка данных от мобильных устройств', () => {
    it('должен обрабатывать данные о сменах', async () => {
      const payload = {
        shifts: [
          { 
            id: 'shift-1', 
            userId: 'user-1', 
            siteId: 'site-1', 
            startTime: new Date(),
            status: 'active' as const,
            startMethod: 'manual' as const,
            adminConfirmed: false,
            createdAt: new Date()
          }
        ],
        users: [],
        sites: [],
        assignments: [],
        metadata: [],
        timestamp: new Date(),
        deviceId: 'mobile-device'
      };

      const result = await webSyncService.processMobileData(payload);
      
      expect(result.success).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'worktime_mobile_shifts',
        expect.any(String)
      );
    });

    it('должен обрабатывать данные о назначениях', async () => {
      const payload = {
        assignments: [
          { 
            id: 'assignment-1', 
            userId: 'user-1', 
            siteId: 'site-1',
            assignedBy: 'admin-1',
            isActive: true,
            assignedAt: new Date()
          }
        ],
        shifts: [],
        users: [],
        sites: [],
        metadata: [],
        timestamp: new Date(),
        deviceId: 'mobile-device'
      };

      mockDbService.updateAssignment.mockResolvedValue(undefined);

      const result = await webSyncService.processMobileData(payload);
      
      expect(result.success).toBe(true);
      expect(mockDbService.updateAssignment).toHaveBeenCalled();
    });
  });

  describe('Принудительная синхронизация', () => {
    it('должен выполнять полную синхронизацию', async () => {
      localStorageMock.getItem.mockReturnValue('fake-token');
      mockDbService.getAllAssignments.mockResolvedValue([]);
      mockDbService.getConstructionSites.mockResolvedValue([]);
      mockDbService.getAllUsers.mockResolvedValue([]);

      mockedAxios.post.mockResolvedValue({
        status: 200,
        data: { success: true }
      });

      const result = await webSyncService.forceFullSync();
      
      expect(result.success).toBe(true);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('worktime_last_sync');
    });
  });

  describe('Автосинхронизация', () => {
    it('должен запускать автосинхронизацию', () => {
      jest.useFakeTimers();
      
      webSyncService.startAutoSync();
      
      // Проверяем что таймер установлен
      expect(setInterval).toHaveBeenCalledWith(expect.any(Function), 5 * 60 * 1000);
      
      jest.useRealTimers();
    });

    it('должен останавливать автосинхронизацию', () => {
      jest.useFakeTimers();
      
      webSyncService.startAutoSync();
      webSyncService.stopAutoSync();
      
      expect(clearInterval).toHaveBeenCalled();
      
      jest.useRealTimers();
    });
  });

  describe('Новая функциональность мониторинга', () => {
    it('должен отслеживать производительность синхронизации', async () => {
      localStorageMock.getItem.mockReturnValue('fake-token');
      mockDbService.getAllAssignments.mockResolvedValue([]);
      mockDbService.getConstructionSites.mockResolvedValue([]);
      mockDbService.getAllUsers.mockResolvedValue([]);

      mockedAxios.post.mockResolvedValue({
        status: 200,
        data: { success: true }
      });

      await webSyncService.syncData();
      
      expect(mockMonitoringService.trackPerformance).toHaveBeenCalledWith(
        'sync_operation',
        expect.any(Number)
      );
    });

    it('должен проверять подключение к серверу', async () => {
      const isConnected = await webSyncService.checkServerConnection();
      
      expect(typeof isConnected).toBe('boolean');
      expect(mockNetworkService.checkInternetConnectivity).toHaveBeenCalled();
    });
  });
}); 