import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  SyncPayload, 
  SyncMetadata, 
  SyncConflict, 
  AuthUser, 
  ConstructionSite, 
  UserSiteAssignment,
  WorkShift 
} from '../types';
import { ApiDatabaseService } from './ApiDatabaseService';
import { WebSocketService } from './WebSocketService';

// Новые типы для улучшенной синхронизации
interface SyncOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  entityType: 'user' | 'site' | 'assignment' | 'shift';
  entityId: string;
  data: any;
  timestamp: Date;
  attempts: number;
  maxAttempts: number;
  status: 'pending' | 'syncing' | 'completed' | 'failed';
}

interface SyncQueue {
  operations: SyncOperation[];
  lastProcessed: Date | null;
}

interface SyncStatus {
  isOnline: boolean;
  lastSyncTime: Date | null;
  pendingOperations: number;
  failedOperations: number;
  isInProgress: boolean;
  error?: string;
}

export class SyncService {
  private static instance: SyncService;
  private dbService: ApiDatabaseService;
  private webSocketService: WebSocketService;
  private syncInProgress = false;
  private lastSyncTimestamp: Date | null = null;
  private deviceId: string = '';
  private syncQueue: SyncQueue = { operations: [], lastProcessed: null };
  private retryInterval: NodeJS.Timeout | null = null;
  private queueProcessorInterval: NodeJS.Timeout | null = null;
  private syncStatusCallbacks: Array<(status: SyncStatus) => void> = [];
  private maxRetryAttempts = 3;
  private retryDelay = 5000; // 5 секунд
  private retryTimeouts: Set<NodeJS.Timeout> = new Set();

  private constructor() {
    this.dbService = ApiDatabaseService.getInstance();
    this.webSocketService = WebSocketService.getInstance();
    this.initializeDeviceId();
    this.setupWebSocketConnection();
    this.loadSyncQueue();
    this.startQueueProcessor();
  }

  static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService();
    }
    return SyncService.instance;
  }

  // Подписка на изменения статуса синхронизации
  public onSyncStatusChange(callback: (status: SyncStatus) => void): () => void {
    this.syncStatusCallbacks.push(callback);
    
    // Возвращаем функцию отписки
    return () => {
      const index = this.syncStatusCallbacks.indexOf(callback);
      if (index > -1) {
        this.syncStatusCallbacks.splice(index, 1);
      }
    };
  }

  // Уведомление об изменении статуса
  private notifySyncStatusChange(): void {
    const status = this.getSyncStatus();
    this.syncStatusCallbacks.forEach(callback => callback(status));
  }

  // Получить текущий статус синхронизации
  public getSyncStatus(): SyncStatus {
    return {
      isOnline: this.isOnline(),
      lastSyncTime: this.lastSyncTimestamp,
      pendingOperations: this.syncQueue.operations.filter(op => op.status === 'pending').length,
      failedOperations: this.syncQueue.operations.filter(op => op.status === 'failed').length,
      isInProgress: this.syncInProgress
    };
  }

  // Загрузить очередь операций из локального хранилища
  private async loadSyncQueue(): Promise<void> {
    try {
      const queueJson = await AsyncStorage.getItem('syncQueue');
      if (queueJson) {
        this.syncQueue = JSON.parse(queueJson);
        // Конвертируем строки дат обратно в Date объекты
        this.syncQueue.operations = this.syncQueue.operations.map(op => ({
          ...op,
          timestamp: new Date(op.timestamp)
        }));
        if (this.syncQueue.lastProcessed) {
          this.syncQueue.lastProcessed = new Date(this.syncQueue.lastProcessed);
        }
      }
    } catch (error) {
      console.error('Failed to load sync queue:', error);
      this.syncQueue = { operations: [], lastProcessed: null };
    }
  }

  // Сохранить очередь операций в локальное хранилище
  private async saveSyncQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem('syncQueue', JSON.stringify(this.syncQueue));
    } catch (error) {
      console.error('Failed to save sync queue:', error);
    }
  }

  // Добавить операцию в очередь
  public async addToSyncQueue(
    type: SyncOperation['type'],
    entityType: SyncOperation['entityType'],
    entityId: string,
    data: any
  ): Promise<void> {
    const operation: SyncOperation = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      entityType,
      entityId,
      data,
      timestamp: new Date(),
      attempts: 0,
      maxAttempts: this.maxRetryAttempts,
      status: 'pending'
    };

    this.syncQueue.operations.push(operation);
    await this.saveSyncQueue();
    
    console.log(`➕ Added operation to sync queue: ${type} ${entityType} ${entityId}`);
    this.notifySyncStatusChange();

    // Если онлайн, сразу попробуем обработать
    if (this.isOnline()) {
      this.processQueueOperation(operation);
    }
  }

  // Запустить процессор очереди
  private startQueueProcessor(): void {
    // Очищаем предыдущий интервал если он есть
    if (this.queueProcessorInterval) {
      clearInterval(this.queueProcessorInterval);
    }

    // Обрабатываем очередь каждые 30 секунд
    this.queueProcessorInterval = setInterval(() => {
      if (this.isOnline() && !this.syncInProgress) {
        this.processQueue();
      }
    }, 30000);
  }

  // Обработать очередь операций
  private async processQueue(): Promise<void> {
    const pendingOperations = this.syncQueue.operations.filter(
      op => op.status === 'pending' || (op.status === 'failed' && op.attempts < op.maxAttempts)
    );

    if (pendingOperations.length === 0) return;

    console.log(`🔄 Processing ${pendingOperations.length} queued operations`);

    for (const operation of pendingOperations) {
      if (!this.isOnline()) break;
      await this.processQueueOperation(operation);
    }

    this.syncQueue.lastProcessed = new Date();
    await this.saveSyncQueue();
    this.notifySyncStatusChange();
  }

  // Обработать одну операцию из очереди
  private async processQueueOperation(operation: SyncOperation): Promise<void> {
    if (operation.status === 'syncing') return;

    operation.status = 'syncing';
    operation.attempts++;

    try {
      console.log(`🔄 Processing operation: ${operation.type} ${operation.entityType} ${operation.entityId} (attempt ${operation.attempts})`);

      switch (operation.entityType) {
        case 'shift':
          await this.syncShiftOperation(operation);
          break;
        case 'assignment':
          await this.syncAssignmentOperation(operation);
          break;
        case 'user':
          await this.syncUserOperation(operation);
          break;
        case 'site':
          await this.syncSiteOperation(operation);
          break;
      }

      operation.status = 'completed';
      console.log(`✅ Operation completed: ${operation.type} ${operation.entityType} ${operation.entityId}`);

    } catch (error) {
      console.error(`❌ Operation failed: ${operation.type} ${operation.entityType} ${operation.entityId}`, error);
      
      if (operation.attempts >= operation.maxAttempts) {
        operation.status = 'failed';
        console.error(`💥 Operation permanently failed after ${operation.attempts} attempts`);
      } else {
        operation.status = 'pending';
        // Увеличиваем задержку с каждой попыткой
        const retryTimeout = setTimeout(() => {
          this.retryTimeouts.delete(retryTimeout);
          this.processQueueOperation(operation);
        }, this.retryDelay * operation.attempts);
        this.retryTimeouts.add(retryTimeout);
      }
    }

    await this.saveSyncQueue();
    this.notifySyncStatusChange();
  }

  // Синхронизация операций со сменами
  private async syncShiftOperation(operation: SyncOperation): Promise<void> {
    const token = await AsyncStorage.getItem('authToken');
    if (!token) throw new Error('No authentication token');

    const response = await fetch('http://localhost:3001/api/sync/shift', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        operation: operation.type,
        entityId: operation.entityId,
        data: operation.data,
        deviceId: this.deviceId
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Operation failed');
    }
  }

  // Синхронизация операций с назначениями
  private async syncAssignmentOperation(operation: SyncOperation): Promise<void> {
    // Аналогично syncShiftOperation, но для назначений
    const token = await AsyncStorage.getItem('authToken');
    if (!token) throw new Error('No authentication token');

    const response = await fetch('http://localhost:3001/api/sync/assignment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        operation: operation.type,
        entityId: operation.entityId,
        data: operation.data,
        deviceId: this.deviceId
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }
  }

  // Синхронизация операций с пользователями
  private async syncUserOperation(operation: SyncOperation): Promise<void> {
    // Реализация для пользователей
    console.log('Syncing user operation:', operation);
  }

  // Синхронизация операций с объектами
  private async syncSiteOperation(operation: SyncOperation): Promise<void> {
    // Реализация для объектов
    console.log('Syncing site operation:', operation);
  }

  // Проверить подключение к интернету
  private isOnline(): boolean {
    // В реальном приложении здесь была бы проверка сетевого подключения
    // Для демонстрации возвращаем true
    return true;
  }

  // Очистить завершенные операции из очереди
  public async cleanupQueue(): Promise<void> {
    const before = this.syncQueue.operations.length;
    
    // Удаляем операции, выполненные более 24 часов назад
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
    this.syncQueue.operations = this.syncQueue.operations.filter(
      op => op.status !== 'completed' || new Date(op.timestamp) > cutoffTime
    );

    const after = this.syncQueue.operations.length;
    
    if (before !== after) {
      await this.saveSyncQueue();
      console.log(`🧹 Cleaned up ${before - after} completed operations from queue`);
      this.notifySyncStatusChange();
    }
  }

  // Получить статистику очереди
  public getQueueStats(): {
    total: number;
    pending: number;
    completed: number;
    failed: number;
    oldestPending?: Date;
  } {
    const stats = {
      total: this.syncQueue.operations.length,
      pending: 0,
      completed: 0,
      failed: 0,
      oldestPending: undefined as Date | undefined
    };

    let oldestPendingTime: number | null = null;

    this.syncQueue.operations.forEach(op => {
      switch (op.status) {
        case 'pending':
          stats.pending++;
          const opTime = new Date(op.timestamp).getTime();
          if (!oldestPendingTime || opTime < oldestPendingTime) {
            oldestPendingTime = opTime;
            stats.oldestPending = new Date(op.timestamp);
          }
          break;
        case 'completed':
          stats.completed++;
          break;
        case 'failed':
          stats.failed++;
          break;
      }
    });

    return stats;
  }

  private async initializeDeviceId(): Promise<void> {
    try {
      let deviceId = await AsyncStorage.getItem('deviceId');
      if (!deviceId) {
        deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await AsyncStorage.setItem('deviceId', deviceId);
      }
      this.deviceId = deviceId;
    } catch (error) {
      console.error('Failed to initialize device ID:', error);
      this.deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  }

  // Получить последнее время синхронизации
  private async getLastSyncTimestamp(): Promise<Date | null> {
    try {
      const timestamp = await AsyncStorage.getItem('lastSyncTimestamp');
      return timestamp ? new Date(timestamp) : null;
    } catch (error) {
      console.error('Failed to get last sync timestamp:', error);
      return null;
    }
  }

  // Сохранить время синхронизации
  private async setLastSyncTimestamp(timestamp: Date): Promise<void> {
    try {
      await AsyncStorage.setItem('lastSyncTimestamp', timestamp.toISOString());
      this.lastSyncTimestamp = timestamp;
    } catch (error) {
      console.error('Failed to set last sync timestamp:', error);
    }
  }

  // Проверить, нужна ли синхронизация
  public async needsSync(): Promise<boolean> {
    const lastSync = await this.getLastSyncTimestamp();
    if (!lastSync) return true;

    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    return lastSync < fiveMinutesAgo;
  }

  // Основная функция синхронизации
  public async sync(force: boolean = false): Promise<{ success: boolean; error?: string }> {
    if (this.syncInProgress) {
      return { success: false, error: 'Sync already in progress' };
    }

    if (!force && !(await this.needsSync())) {
      return { success: true };
    }

    this.syncInProgress = true;
    console.log('🔄 Starting sync process...');

    try {
      // 1. Подготовить данные для отправки
      const outgoingData = await this.prepareOutgoingData();
      
      // 2. Отправить данные на сервер
      const syncResult = await this.sendDataToServer(outgoingData);
      
      // 3. Обработать входящие данные
      if (syncResult.success && syncResult.incomingData) {
        await this.processIncomingData(syncResult.incomingData);
      }
      
      // 4. Обновить время синхронизации
      await this.setLastSyncTimestamp(new Date());
      
      console.log('✅ Sync completed successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ Sync failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    } finally {
      this.syncInProgress = false;
    }
  }

  // Подготовить данные для отправки на сервер
  private async prepareOutgoingData(): Promise<SyncPayload> {
    const lastSync = await this.getLastSyncTimestamp();
    
    // Получить все изменения с момента последней синхронизации
    const pendingMetadata = await this.getPendingMetadata(lastSync);
    
    const payload: SyncPayload = {
      metadata: pendingMetadata,
      timestamp: new Date(),
      deviceId: this.deviceId,
    };

    // Добавить данные в зависимости от типа изменений
    for (const meta of pendingMetadata) {
      switch (meta.entityType) {
        case 'user':
          if (!payload.users) payload.users = [];
          const user = await this.dbService.getUserById(meta.entityId);
          if (user) payload.users.push(user);
          break;
        case 'shift':
          if (!payload.shifts) payload.shifts = [];
          const shift = await this.getShiftById(meta.entityId);
          if (shift) payload.shifts.push(shift);
          break;
      }
    }

    return payload;
  }

  // Получить метаданные ожидающих синхронизации
  private async getPendingMetadata(since: Date | null): Promise<SyncMetadata[]> {
    try {
      const metadataJson = await AsyncStorage.getItem('pendingSync');
      if (!metadataJson) return [];

      const allMetadata: SyncMetadata[] = JSON.parse(metadataJson);
      
      if (!since) return allMetadata;

      return allMetadata.filter(meta => 
        meta.syncStatus === 'pending' && 
        new Date(meta.lastModified) > since
      );
    } catch (error) {
      console.error('Failed to get pending metadata:', error);
      return [];
    }
  }

  // Отправить данные на сервер
  private async sendDataToServer(payload: SyncPayload): Promise<{ 
    success: boolean; 
    incomingData?: SyncPayload; 
    conflicts?: SyncConflict[] 
  }> {
    try {
      console.log('📤 Sending data to server:', payload);
      
      // Получаем токен авторизации
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Отправляем данные на реальный API сервер
      const response = await fetch('http://localhost:3001/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          deviceId: this.deviceId,
          lastSyncTimestamp: this.lastSyncTimestamp,
          data: {
            shifts: payload.shifts,
            assignments: payload.assignments
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        return {
          success: true,
          incomingData: result.data.serverData
        };
      } else {
        throw new Error(result.error || 'Server returned error');
      }
      
    } catch (error) {
      console.error('Failed to send data to server:', error);
      
      // Fallback к локальным данным веб-панели для демонстрации
      console.log('📤 Falling back to local web panel data...');
      const incomingData = await this.getDataFromWebPanel();
      
      return {
        success: true,
        incomingData
      };
    }
  }

  // Получить данные из веб админ-панели (имитация)
  private async getDataFromWebPanel(): Promise<SyncPayload> {
    try {
      // В реальном приложении здесь будет API запрос
      // Сейчас читаем из localStorage (эмуляция)
      
      const webUsers = JSON.parse(localStorage.getItem('worktime_users') || '[]');
      const webSites = JSON.parse(localStorage.getItem('worktime_sites') || '[]');
      const webAssignments = JSON.parse(localStorage.getItem('worktime_assignments') || '[]');
      
      return {
        users: webUsers,
        sites: webSites,
        assignments: webAssignments,
        metadata: [],
        timestamp: new Date(),
        deviceId: 'web_admin_panel'
      };
    } catch (error) {
      console.error('Failed to get data from web panel:', error);
      return {
        metadata: [],
        timestamp: new Date(),
        deviceId: 'web_admin_panel'
      };
    }
  }

  // Обработать входящие данные
  private async processIncomingData(data: SyncPayload): Promise<void> {
    console.log('📥 Processing incoming data:', data);

    // Обработать пользователей
    if (data.users) {
      for (const user of data.users) {
        await this.syncUser(user);
      }
    }

    // Обработать объекты
    if (data.sites) {
      for (const site of data.sites) {
        await this.syncSite(site);
      }
    }

    // Обработать назначения
    if (data.assignments) {
      for (const assignment of data.assignments) {
        await this.syncAssignment(assignment);
      }
    }
  }

  // Синхронизировать пользователя
  private async syncUser(user: AuthUser): Promise<void> {
    try {
      const existingUser = await this.dbService.getUserById(user.id);
      
      if (existingUser) {
        // Обновить существующего пользователя
        await this.updateUser(user);
      } else {
        // Создать нового пользователя
        await this.createUser(user);
      }
    } catch (error) {
      console.error('Failed to sync user:', error);
    }
  }

  // Синхронизировать объект
  private async syncSite(site: ConstructionSite): Promise<void> {
    try {
      // Сохранить объект в локальной базе
      await this.saveSiteToLocal(site);
    } catch (error) {
      console.error('Failed to sync site:', error);
    }
  }

  // Синхронизировать назначение
  private async syncAssignment(assignment: UserSiteAssignment): Promise<void> {
    try {
      // Сохранить назначение в локальной базе
      await this.saveAssignmentToLocal(assignment);
    } catch (error) {
      console.error('Failed to sync assignment:', error);
    }
  }

  // Получить назначенные пользователю объекты
  public async getUserAssignedSites(userId: string): Promise<ConstructionSite[]> {
    try {
      const assignments = await this.getUserAssignments(userId);
      const sites: ConstructionSite[] = [];
      
      for (const assignment of assignments) {
        if (assignment.isActive) {
          const site = await this.getSiteById(assignment.siteId);
          if (site) {
            sites.push(site);
          }
        }
      }
      
      return sites;
    } catch (error) {
      console.error('Failed to get user assigned sites:', error);
      return [];
    }
  }

  // Проверить, может ли пользователь работать на объекте
  public async canUserWorkOnSite(userId: string, siteId: string): Promise<boolean> {
    try {
      const assignments = await this.getUserAssignments(userId);
      
      return assignments.some(assignment => 
        assignment.siteId === siteId && 
        assignment.isActive &&
        (!assignment.validFrom || new Date(assignment.validFrom) <= new Date()) &&
        (!assignment.validTo || new Date(assignment.validTo) >= new Date())
      );
    } catch (error) {
      console.error('Failed to check user site access:', error);
      return false;
    }
  }

  // Вспомогательные методы для работы с локальной базой данных
  private async updateUser(user: AuthUser): Promise<void> {
    // Реализация обновления пользователя в локальной базе
    console.log('Updating user:', user.id);
  }

  private async createUser(user: AuthUser): Promise<void> {
    // Реализация создания пользователя в локальной базе
    console.log('Creating user:', user.id);
  }

  private async saveSiteToLocal(site: ConstructionSite): Promise<void> {
    // Реализация сохранения объекта в локальной базе
    console.log('Saving site:', site.id);
  }

  private async saveAssignmentToLocal(assignment: UserSiteAssignment): Promise<void> {
    // Реализация сохранения назначения в локальной базе
    console.log('Saving assignment:', assignment.id);
  }

  private async getUserAssignments(userId: string): Promise<UserSiteAssignment[]> {
    try {
      const assignmentsJson = await AsyncStorage.getItem(`assignments_${userId}`);
      return assignmentsJson ? JSON.parse(assignmentsJson) : [];
    } catch (error) {
      console.error('Failed to get user assignments:', error);
      return [];
    }
  }

  private async getSiteById(siteId: string): Promise<ConstructionSite | null> {
    try {
      const sitesJson = await AsyncStorage.getItem('local_sites');
      if (!sitesJson) return null;
      
      const sites: ConstructionSite[] = JSON.parse(sitesJson);
      return sites.find(site => site.id === siteId) || null;
    } catch (error) {
      console.error('Failed to get site by ID:', error);
      return null;
    }
  }

  private async getShiftById(shiftId: string): Promise<WorkShift | null> {
    // Реализация получения смены по ID
    console.log('Getting shift:', shiftId);
    return null;
  }

  // Добавить метаданные для синхронизации
  public async addSyncMetadata(
    entityType: SyncMetadata['entityType'],
    entityId: string,
    operation: 'create' | 'update' | 'delete'
  ): Promise<void> {
    try {
      const metadata: SyncMetadata = {
        entityType,
        entityId,
        lastModified: new Date(),
        version: 1,
        deviceId: this.deviceId,
        syncStatus: 'pending'
      };

      const existingJson = await AsyncStorage.getItem('pendingSync');
      const existing: SyncMetadata[] = existingJson ? JSON.parse(existingJson) : [];
      
      // Удалить существующие метаданные для этой сущности
      const filtered = existing.filter(meta => 
        !(meta.entityType === entityType && meta.entityId === entityId)
      );
      
      filtered.push(metadata);
      
      await AsyncStorage.setItem('pendingSync', JSON.stringify(filtered));
    } catch (error) {
      console.error('Failed to add sync metadata:', error);
    }
  }

  // Автоматическая синхронизация каждые 5 минут
  public startAutoSync(): void {
    // Очищаем предыдущий интервал автосинхронизации
    if (this.retryInterval) {
      clearInterval(this.retryInterval);
    }

    this.retryInterval = setInterval(async () => {
      if (await this.needsSync()) {
        await this.sync();
      }
    }, 5 * 60 * 1000); // 5 минут
  }

  // Метод для остановки всех таймеров и очистки ресурсов
  public stopAllTimers(): void {
    // Очищаем интервал процессора очереди
    if (this.queueProcessorInterval) {
      clearInterval(this.queueProcessorInterval);
      this.queueProcessorInterval = null;
    }

    // Очищаем интервал автосинхронизации
    if (this.retryInterval) {
      clearInterval(this.retryInterval);
      this.retryInterval = null;
    }

    // Очищаем все таймауты повторных попыток
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout));
    this.retryTimeouts.clear();

    console.log('🧹 All SyncService timers have been cleared');
  }

  // Принудительная синхронизация
  public async forcSync(): Promise<{ success: boolean; error?: string }> {
    return await this.sync(true);
  }

  // Настройка WebSocket подключения
  private async setupWebSocketConnection(): Promise<void> {
    try {
      // Подключаемся к WebSocket серверу
      const connected = await this.webSocketService.connect();
      
      if (connected) {
        console.log('✅ WebSocket connected for sync service');
        
        // Подписываемся на события синхронизации
        this.webSocketService.on('sync_response', (data) => {
          this.handleWebSocketSyncResponse(data);
        });

        this.webSocketService.on('new_assignment', (data) => {
          this.handleNewAssignmentFromWebSocket(data);
        });

        this.webSocketService.on('assignment_updated', (data) => {
          this.handleAssignmentUpdateFromWebSocket(data);
        });
      }
    } catch (error) {
      console.error('Failed to setup WebSocket connection:', error);
    }
  }

  // Обработка ответа синхронизации через WebSocket
  private async handleWebSocketSyncResponse(data: any): Promise<void> {
    console.log('🔄 Handling WebSocket sync response:', data);
    
    if (data.success) {
      // Принудительная синхронизация при получении уведомления
      await this.sync(true);
    }
  }

  // Обработка нового назначения через WebSocket
  private async handleNewAssignmentFromWebSocket(data: any): Promise<void> {
    console.log('📋 Handling new assignment from WebSocket:', data);
    
    try {
      // Принудительная синхронизация для получения полных данных
      await this.sync(true);
    } catch (error) {
      console.error('Failed to handle new assignment from WebSocket:', error);
    }
  }

  // Обработка обновления назначения через WebSocket
  private async handleAssignmentUpdateFromWebSocket(data: any): Promise<void> {
    console.log('📋 Handling assignment update from WebSocket:', data);
    
    try {
      // Принудительная синхронизация для получения обновленных данных
      await this.sync(true);
    } catch (error) {
      console.error('Failed to handle assignment update from WebSocket:', error);
    }
  }

  // Уведомление о начале смены через WebSocket
  public async notifyShiftStarted(data: {
    shiftId: string;
    siteId: string;
    siteName?: string;
    location?: { latitude: number; longitude: number };
  }): Promise<void> {
    await this.webSocketService.notifyShiftStarted(data);
  }

  // Уведомление об окончании смены через WebSocket
  public async notifyShiftEnded(data: {
    shiftId: string;
    duration?: number;
    location?: { latitude: number; longitude: number };
  }): Promise<void> {
    await this.webSocketService.notifyShiftEnded(data);
  }

  // Проверка статуса WebSocket подключения
  public isWebSocketConnected(): boolean {
    return this.webSocketService.isSocketConnected();
  }

  // Переподключение WebSocket
  public async reconnectWebSocket(): Promise<boolean> {
    return await this.webSocketService.connect();
  }
} 