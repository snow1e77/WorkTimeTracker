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
import { DatabaseService } from './DatabaseService';

export class SyncService {
  private static instance: SyncService;
  private dbService: DatabaseService;
  private syncInProgress = false;
  private lastSyncTimestamp: Date | null = null;
  private deviceId: string = '';

  private constructor() {
    this.dbService = DatabaseService.getInstance();
    this.initializeDeviceId();
  }

  static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService();
    }
    return SyncService.instance;
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

  // Отправить данные на сервер (имитация API)
  private async sendDataToServer(payload: SyncPayload): Promise<{ 
    success: boolean; 
    incomingData?: SyncPayload; 
    conflicts?: SyncConflict[] 
  }> {
    try {
      // В реальном приложении здесь будет HTTP запрос
      console.log('📤 Sending data to server:', payload);
      
      // Имитация ответа сервера
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Получить данные с сервера (из веб админ-панели)
      const incomingData = await this.getDataFromWebPanel();
      
      return {
        success: true,
        incomingData
      };
    } catch (error) {
      console.error('Failed to send data to server:', error);
      return { success: false };
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
    setInterval(async () => {
      if (await this.needsSync()) {
        await this.sync();
      }
    }, 5 * 60 * 1000); // 5 минут
  }

  // Принудительная синхронизация
  public async forcSync(): Promise<{ success: boolean; error?: string }> {
    return await this.sync(true);
  }
} 