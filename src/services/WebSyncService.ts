import { 
  SyncPayload, 
  SyncMetadata, 
  SyncConflict, 
  AuthUser, 
  ConstructionSite, 
  UserSiteAssignment,
  WorkShift 
} from '../types';
import { WebDatabaseService } from './WebDatabaseService';

export class WebSyncService {
  private static instance: WebSyncService;
  private dbService: WebDatabaseService;
  private syncInProgress = false;
  private lastSyncTimestamp: Date | null = null;

  private constructor() {
    this.dbService = WebDatabaseService.getInstance();
    this.initializeSync();
  }

  static getInstance(): WebSyncService {
    if (!WebSyncService.instance) {
      WebSyncService.instance = new WebSyncService();
    }
    return WebSyncService.instance;
  }

  private async initializeSync(): Promise<void> {
    try {
      const lastSync = localStorage.getItem('worktime_last_sync');
      if (lastSync) {
        this.lastSyncTimestamp = new Date(lastSync);
      }
    } catch (error) {
      console.error('Error initializing sync:', error);
    }
  }

  // Синхронизация данных с мобильными устройствами
  public async syncData(): Promise<{ success: boolean; error?: string }> {
    if (this.syncInProgress) {
      return { success: false, error: 'Sync already in progress' };
    }

    this.syncInProgress = true;
    console.log('🔄 Starting web sync...');

    try {
      // В реальном приложении здесь был бы API вызов
      // Для демонстрации просто обновляем timestamp
      this.lastSyncTimestamp = new Date();
      localStorage.setItem('worktime_last_sync', this.lastSyncTimestamp.toISOString());

      console.log('✅ Web sync completed successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ Web sync failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    } finally {
      this.syncInProgress = false;
    }
  }

  // Получить данные для синхронизации с мобильными устройствами
  public async getDataForMobileSync(): Promise<SyncPayload> {
    const users = await this.dbService.getAllUsers();
    const sites = await this.dbService.getConstructionSites();
    const assignments = await this.dbService.getAllAssignments();

    return {
      users,
      sites,
      assignments,
      shifts: [], // В демо версии пустой массив
      reports: [],
      metadata: {
        timestamp: new Date(),
        version: 1,
        deviceId: 'web-admin'
      }
    };
  }

  // Обработать данные от мобильных устройств
  public async processMobileData(payload: SyncPayload): Promise<{ success: boolean; conflicts?: SyncConflict[] }> {
    console.log('📱 Processing mobile sync data:', payload);

    try {
      // В реальном приложении здесь была бы логика обработки конфликтов
      // и обновления данных от мобильных устройств
      
      return { success: true };
    } catch (error) {
      console.error('Error processing mobile data:', error);
      return { success: false };
    }
  }

  // Получить статус синхронизации
  public getSyncStatus(): {
    lastSync: Date | null;
    isInProgress: boolean;
    nextSync: Date | null;
  } {
    return {
      lastSync: this.lastSyncTimestamp,
      isInProgress: this.syncInProgress,
      nextSync: this.lastSyncTimestamp 
        ? new Date(this.lastSyncTimestamp.getTime() + 5 * 60 * 1000) // каждые 5 минут
        : null
    };
  }

  // Принудительная синхронизация назначений
  public async syncAssignments(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔄 Syncing assignments...');
      
      // В реальном приложении здесь был бы API вызов для отправки 
      // обновленных назначений на мобильные устройства
      
      return { success: true };
    } catch (error) {
      console.error('Error syncing assignments:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Автоматическая синхронизация каждые 5 минут
  public startAutoSync(): void {
    setInterval(async () => {
      if (!this.syncInProgress) {
        await this.syncData();
      }
    }, 5 * 60 * 1000); // 5 минут
  }

  public stopAutoSync(): void {
    // В реальном приложении здесь была бы остановка интервала
  }
} 