import AsyncStorage from '@react-native-async-storage/async-storage';
import { SyncService } from '../../src/services/SyncService';
import { WebSocketService } from '../../src/services/WebSocketService';

// Мокаем зависимости
jest.mock('@react-native-async-storage/async-storage');
jest.mock('../../src/services/ApiDatabaseService');
jest.mock('../../src/services/WebSocketService', () => ({
  WebSocketService: {
    getInstance: jest.fn(() => ({
      isSocketConnected: jest.fn(() => true),
      connect: jest.fn(() => Promise.resolve(true)),
      disconnect: jest.fn(() => Promise.resolve()),
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
    }))
  }
}));
jest.mock('../../src/services/NotificationService');

describe('SyncService', () => {
  let syncService: SyncService;

  beforeEach(() => {
    jest.clearAllMocks();
    syncService = SyncService.getInstance();
  });

  afterEach(() => {
    if (syncService && syncService.stopAllTimers) {
      syncService.stopAllTimers();
    }
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