import AsyncStorage from '@react-native-async-storage/async-storage';
import { SyncService } from '../../src/services/SyncService';

// Мокаем зависимости
jest.mock('@react-native-async-storage/async-storage');
jest.mock('../../src/services/ApiDatabaseService');
jest.mock('../../src/services/WebSocketService');
jest.mock('../../src/services/NotificationService');

describe('SyncService', () => {
  let syncService: SyncService;

  beforeEach(() => {
    jest.clearAllMocks();
    syncService = SyncService.getInstance();
  });

  afterEach(() => {
    syncService.stopAllTimers();
  });

  describe('Статус синхронизации', () => {
    it('должен возвращать корректный статус', () => {
      const status = syncService.getSyncStatus();
      
      expect(status).toHaveProperty('isOnline');
      expect(status).toHaveProperty('lastSyncTime');
      expect(status).toHaveProperty('pendingOperations');
      expect(status).toHaveProperty('failedOperations');
      expect(status).toHaveProperty('isInProgress');
      expect(typeof status.isOnline).toBe('boolean');
      expect(typeof status.pendingOperations).toBe('number');
      expect(typeof status.failedOperations).toBe('number');
      expect(typeof status.isInProgress).toBe('boolean');
    });
  });

  describe('Очередь синхронизации', () => {
    it('должен добавлять операции в очередь', async () => {
      await syncService.addToSyncQueue('create', 'shift', 'test-id', { test: 'data' });
      
      const stats = syncService.getQueueStats();
      expect(stats.total).toBeGreaterThan(0);
      expect(stats.pending).toBeGreaterThan(0);
    });

    it('должен возвращать статистику очереди', () => {
      const stats = syncService.getQueueStats();
      
      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('pending');
      expect(stats).toHaveProperty('completed');
      expect(stats).toHaveProperty('failed');
      expect(typeof stats.total).toBe('number');
      expect(typeof stats.pending).toBe('number');
      expect(typeof stats.completed).toBe('number');
      expect(typeof stats.failed).toBe('number');
    });
  });

  describe('Методы синхронизации', () => {
    it('должен проверять необходимость синхронизации', async () => {
      const needsSync = await syncService.needsSync();
      expect(typeof needsSync).toBe('boolean');
    });

    it('не должен запускать синхронизацию если уже выполняется', async () => {
      // Мокаем чтобы первый вызов "завис"
      const originalSync = syncService.sync;
      let firstSyncResolve: () => void;
      const firstSyncPromise = new Promise<void>((resolve) => {
        firstSyncResolve = resolve;
      });

      syncService.sync = jest.fn().mockImplementation(() => firstSyncPromise);

      // Запускаем первую синхронизацию
      const firstSync = syncService.sync();
      
      // Пытаемся запустить вторую
      const secondSync = await syncService.sync();
      
      // Вторая должна вернуть ошибку
      expect(secondSync.success).toBe(false);
      expect(secondSync.error).toContain('already in progress');

      // Завершаем первую синхронизацию
      firstSyncResolve!();
      await firstSync;

      // Восстанавливаем оригинальный метод
      syncService.sync = originalSync;
    });
  });

  describe('WebSocket функциональность', () => {
    it('должен проверять статус WebSocket подключения', () => {
      const isConnected = syncService.isWebSocketConnected();
      expect(typeof isConnected).toBe('boolean');
    });

    it('должен переподключаться к WebSocket', async () => {
      const result = await syncService.reconnectWebSocket();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Управление назначениями', () => {
    it('должен получать назначенные объекты пользователя', async () => {
      const sites = await syncService.getUserAssignedSites('test-user-id');
      expect(Array.isArray(sites)).toBe(true);
    });

    it('должен проверять права пользователя на объект', async () => {
      const canWork = await syncService.canUserWorkOnSite('test-user-id', 'test-site-id');
      expect(typeof canWork).toBe('boolean');
    });
  });
}); 