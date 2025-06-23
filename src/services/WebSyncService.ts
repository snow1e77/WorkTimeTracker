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
  private autoSyncInterval: NodeJS.Timeout | null = null;
  private notificationTimeout: NodeJS.Timeout | null = null;
  private apiBaseUrl: string = 'http://localhost:3001/api'; // URL сервера

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
      
      // Запускаем автосинхронизацию
      this.startAutoSync();
      
      console.log('🔄 WebSyncService initialized');
    } catch (error) {
      console.error('Error initializing web sync:', error);
    }
  }

  // Синхронизация данных с сервером
  public async syncData(): Promise<{ success: boolean; error?: string }> {
    if (this.syncInProgress) {
      return { success: false, error: 'Sync already in progress' };
    }

    this.syncInProgress = true;
    console.log('🔄 Starting web sync...');

    try {
      // Получаем JWT токен для авторизации
      const token = localStorage.getItem('worktime_admin_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Отправляем изменения на сервер
      const result = await this.sendChangesToServer(token);
      
      if (result.success) {
        this.lastSyncTimestamp = new Date();
        localStorage.setItem('worktime_last_sync', this.lastSyncTimestamp.toISOString());
        console.log('✅ Web sync completed successfully');
      }

      return result;
      
    } catch (error) {
      console.error('❌ Web sync failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    } finally {
      this.syncInProgress = false;
    }
  }

  // Отправка изменений на сервер
  private async sendChangesToServer(token: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Собираем все изменения для отправки
      const assignments = await this.dbService.getAllAssignments();
      const sites = await this.dbService.getConstructionSites();
      const users = await this.dbService.getAllUsers();

      const changes = {
        assignments: this.filterChangedAssignments(assignments),
        sites: this.filterChangedSites(sites),
        users: this.filterChangedUsers(users)
      };

      // Отправляем POST запрос на сервер
      const response = await fetch(`${this.apiBaseUrl}/sync/web-changes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(changes)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      return { success: result.success };

    } catch (error) {
      console.error('Failed to send changes to server:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Network error' };
    }
  }

  // Фильтрация измененных назначений
  private filterChangedAssignments(assignments: UserSiteAssignment[]): UserSiteAssignment[] {
    // В реальном приложении здесь была бы логика определения измененных записей
    // Для демонстрации возвращаем все назначения, созданные за последний час
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    return assignments.filter(assignment => 
      new Date(assignment.assignedAt) > oneHourAgo ||
      (this.lastSyncTimestamp && new Date(assignment.assignedAt) > this.lastSyncTimestamp)
    );
  }

  // Фильтрация измененных объектов
  private filterChangedSites(sites: ConstructionSite[]): ConstructionSite[] {
    // Для демонстрации возвращаем объекты, обновленные за последний час
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    return sites.filter(site => 
      site.updatedAt && new Date(site.updatedAt) > oneHourAgo ||
      (this.lastSyncTimestamp && site.updatedAt && new Date(site.updatedAt) > this.lastSyncTimestamp)
    );
  }

  // Фильтрация измененных пользователей
  private filterChangedUsers(users: AuthUser[]): AuthUser[] {
    // Для демонстрации возвращаем пользователей, созданных за последний час
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    return users.filter(user => 
      new Date(user.createdAt) > oneHourAgo ||
      (this.lastSyncTimestamp && new Date(user.createdAt) > this.lastSyncTimestamp)
    );
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
      metadata: [],
      timestamp: new Date(),
      deviceId: 'web-admin'
    };
  }

  // Обработать данные от мобильных устройств
  public async processMobileData(payload: SyncPayload): Promise<{ success: boolean; conflicts?: SyncConflict[] }> {
    console.log('📱 Processing mobile sync data:', payload);

    try {
      // В реальном приложении здесь была бы логика обработки конфликтов
      // и обновления данных от мобильных устройств
      
      // Сохраняем смены от мобильных устройств
      if (payload.shifts) {
        for (const shift of payload.shifts) {
          await this.saveMobileShift(shift);
        }
      }

      // Обновляем статус назначений
      if (payload.assignments) {
        for (const assignment of payload.assignments) {
          await this.updateAssignmentFromMobile(assignment);
        }
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error processing mobile data:', error);
      return { success: false };
    }
  }

  // Сохранить смену от мобильного устройства
  private async saveMobileShift(shift: WorkShift): Promise<void> {
    try {
      // Сохраняем в localStorage для веб-версии
      const shiftsData = localStorage.getItem('worktime_mobile_shifts');
      const shifts = shiftsData ? JSON.parse(shiftsData) : [];
      
      const existingIndex = shifts.findIndex((s: WorkShift) => s.id === shift.id);
      if (existingIndex >= 0) {
        shifts[existingIndex] = shift;
      } else {
        shifts.push(shift);
      }
      
      localStorage.setItem('worktime_mobile_shifts', JSON.stringify(shifts));
      console.log('📱 Mobile shift saved:', shift.id);
    } catch (error) {
      console.error('Failed to save mobile shift:', error);
    }
  }

  // Обновить назначение от мобильного устройства
  private async updateAssignmentFromMobile(assignment: UserSiteAssignment): Promise<void> {
    try {
      await this.dbService.updateAssignment(assignment.id, assignment);
      console.log('📱 Assignment updated from mobile:', assignment.id);
    } catch (error) {
      console.error('Failed to update assignment from mobile:', error);
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
      
      const result = await this.syncData();
      
      if (result.success) {
        console.log('✅ Assignments synced successfully');
      }
      
      return result;
    } catch (error) {
      console.error('Error syncing assignments:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Автоматическая синхронизация каждые 5 минут
  public startAutoSync(): void {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
    }

    this.autoSyncInterval = setInterval(async () => {
      if (!this.syncInProgress) {
        console.log('🔄 Auto-sync triggered');
        await this.syncData();
      }
    }, 5 * 60 * 1000); // 5 минут

    console.log('✅ Auto-sync started (every 5 minutes)');
  }

  public stopAutoSync(): void {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
      this.autoSyncInterval = null;
      console.log('⏹️ Auto-sync stopped');
    }

    // Также очищаем таймаут уведомлений
    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
      this.notificationTimeout = null;
    }
  }

  // Получить историю синхронизации
  public async getSyncHistory(): Promise<any[]> {
    try {
      const token = localStorage.getItem('worktime_admin_token');
      if (!token) {
        return [];
      }

      const response = await fetch(`${this.apiBaseUrl}/sync/history`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      return result.data || [];

    } catch (error) {
      console.error('Failed to get sync history:', error);
      return [];
    }
  }

  // Принудительная полная синхронизация
  public async forceFullSync(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔄 Starting forced full sync...');
      
      const result = await this.syncData();
      
      if (result.success) {
        console.log('✅ Full sync completed successfully');
        // Очищаем кэш для принудительного обновления
        localStorage.removeItem('worktime_last_sync');
        this.lastSyncTimestamp = new Date();
        localStorage.setItem('worktime_last_sync', this.lastSyncTimestamp.toISOString());
      }
      
      return result;
    } catch (error) {
      console.error('Full sync failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Уведомление о изменениях для мгновенной синхронизации
  public async notifyAssignmentChange(assignment: UserSiteAssignment): Promise<void> {
    console.log('📡 Assignment changed, triggering sync:', assignment.id);
    
    // Очищаем предыдущий таймаут если он есть
    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
    }
    
    // Асинхронно запускаем синхронизацию без ожидания
    this.notificationTimeout = setTimeout(() => {
      this.notificationTimeout = null;
      this.syncAssignments();
    }, 1000); // Задержка в 1 секунду для группировки изменений
  }

  // Проверка подключения к серверу
  public async checkServerConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/health`, {
        method: 'GET',
        timeout: 5000
      } as RequestInit);

      return response.ok;
    } catch (error) {
      console.warn('Server connection check failed:', error);
      return false;
    }
  }
} 