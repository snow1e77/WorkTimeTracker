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
import { API_CONFIG } from '../config/api';
import NetworkService from './NetworkService';
import MonitoringService from './MonitoringService';
import axios, { AxiosResponse } from 'axios';
import logger from '../utils/logger';

export class WebSyncService {
  private static instance: WebSyncService;
  private dbService: WebDatabaseService;
  private networkService: NetworkService;
  private monitoringService: MonitoringService;
  private syncInProgress = false;
  private lastSyncTimestamp: Date | null = null;
  private autoSyncInterval: NodeJS.Timeout | null = null;
  private notificationTimeout: NodeJS.Timeout | null = null;
  private apiBaseUrl: string = API_CONFIG.BASE_URL;
  private retryAttempts = 0;
  private maxRetryAttempts = 3;
  private retryDelay = 5000;

  private constructor() {
    this.dbService = WebDatabaseService.getInstance();
    this.networkService = NetworkService.getInstance();
    this.monitoringService = MonitoringService.getInstance();
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
      // Инициализируем сетевой сервис
      await this.networkService.initialize();
      
      // Инициализируем мониторинг
      await this.monitoringService.initialize();
      
      const lastSync = localStorage.getItem('worktime_last_sync');
      if (lastSync) {
        this.lastSyncTimestamp = new Date(lastSync);
      }
      
      // Запускаем мониторинг сети
      this.networkService.startMonitoring(60000); // проверка каждую минуту
      
      // Добавляем слушатель изменений сети
      this.networkService.addStatusListener((status) => {
        this.monitoringService.trackEvent('network_status_changed', {
          isConnected: status.isConnected,
          type: status.type,
          quality: status.quality
        });
        
        // Автоматическая синхронизация при восстановлении соединения
        if (status.isConnected && status.quality !== 'poor') {
          setTimeout(() => this.syncData(), 1000);
        }
      });
      
      // Запускаем автосинхронизацию
      this.startAutoSync();
      
      this.monitoringService.trackEvent('sync_service_initialized');
      
    } catch (error) {
      this.monitoringService.trackError(error instanceof Error ? error : new Error('Sync initialization failed'));
    }
  }

  // Синхронизация данных с сервером
  public async syncData(): Promise<{ success: boolean; error?: string }> {
    if (this.syncInProgress) {
      return { success: false, error: 'Sync already in progress' };
    }

    // Проверяем состояние сети
    const networkStatus = this.networkService.getNetworkStatus();
    if (!networkStatus.isConnected) {
      this.monitoringService.trackSyncFailure('No network connection', 'network');
      return { success: false, error: 'No network connection' };
    }

    // Получаем рекомендацию по синхронизации
    const syncRecommendation = this.networkService.getSyncRecommendation();
    if (!syncRecommendation.shouldSync) {
      this.monitoringService.trackSyncFailure(syncRecommendation.reason, 'network');
      return { success: false, error: syncRecommendation.reason };
    }

    this.syncInProgress = true;
    const startTime = Date.now();
    this.monitoringService.trackSyncStart();
    
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
        
        const duration = Date.now() - startTime;
        this.monitoringService.trackSyncSuccess(duration);
        this.retryAttempts = 0; // Сбрасываем счетчик попыток
      } else {
        this.monitoringService.trackSyncFailure(result.error || 'Unknown sync error', 'server');
      }

      return result;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorType = errorMessage.includes('network') || errorMessage.includes('fetch') ? 'network' : 'server';
      
      this.monitoringService.trackSyncFailure(error instanceof Error ? error : new Error(errorMessage), errorType);
      
      // Попытка повторной синхронизации при сетевых ошибках
      if (errorType === 'network' && this.retryAttempts < this.maxRetryAttempts) {
        this.retryAttempts++;
        setTimeout(() => this.syncData(), this.retryDelay * this.retryAttempts);
      }
      
      return { success: false, error: errorMessage };
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

      // Отправляем POST запрос на сервер с использованием axios
      const response: AxiosResponse = await axios.post(
        `${this.apiBaseUrl}/sync/web-changes`,
        changes,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          timeout: 30000, // 30 секунд таймаут
          validateStatus: (status) => status < 600 // Обрабатываем все коды < 600
        }
      );

      // Проверяем статус ответа
      if (response.status >= 200 && response.status < 300) {
        return { success: response.data?.success !== false };
      } else if (response.status >= 400 && response.status < 500) {
        const errorMessage = response.data?.error || response.data?.message || `Client error: ${response.status}`;
        return { success: false, error: errorMessage };
      } else if (response.status >= 500) {
        const errorMessage = response.data?.error || response.data?.message || `Server error: ${response.status}`;
        return { success: false, error: errorMessage };
      }

      return { success: true };

    } catch (error) {
      // Правильная обработка Axios ошибок
      if (axios.isAxiosError(error)) {
        // Таймаут
        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
          return { success: false, error: 'Превышено время ожидания запроса' };
        }
        
        // Нет соединения с сетью
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
          return { success: false, error: 'Нет соединения с сервером' };
        }
        
        // Ответ сервера с ошибкой
        if (error.response) {
          const status = error.response.status;
          const data = error.response.data;
          
          if (status === 401) {
            return { success: false, error: 'Требуется авторизация' };
          } else if (status === 403) {
            return { success: false, error: 'Доступ запрещен' };
          } else if (status === 404) {
            return { success: false, error: 'Эндпоинт не найден' };
          } else if (status >= 500) {
            return { success: false, error: data?.error || data?.message || 'Ошибка сервера' };
          } else {
            return { success: false, error: data?.error || data?.message || `HTTP ${status}` };
          }
        }
        
        // Запрос был отправлен, но ответа не получено
        if (error.request) {
          return { success: false, error: 'Нет ответа от сервера' };
        }
        
        // Ошибка настройки запроса
        return { success: false, error: `Ошибка запроса: ${error.message}` };
      }
      
      // Неизвестная ошибка
      return { success: false, error: error instanceof Error ? error.message : 'Неизвестная ошибка сети' };
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
    } catch (error) {
      logger.error('Failed to save mobile shift', { error: error instanceof Error ? error.message : 'Unknown error', shiftId: shift.id }, 'sync');
    }
  }

  // Обновить назначение от мобильного устройства
  private async updateAssignmentFromMobile(assignment: UserSiteAssignment): Promise<void> {
    try {
      await this.dbService.updateAssignment(assignment.id, assignment);
    } catch (error) {
      logger.error('Failed to update assignment from mobile', { error: error instanceof Error ? error.message : 'Unknown error', assignmentId: assignment.id }, 'sync');
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
      const result = await this.syncData();
      
      if (result.success) {
        logger.info('Assignments sync completed successfully', {}, 'sync');
      } else {
        logger.error('Assignments sync failed', { error: result.error }, 'sync');
      }
      
      return result;
    } catch (error) {
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
        await this.syncData();
      }
    }, 5 * 60 * 1000); // 5 минут

    logger.info('Auto sync started', { interval: '5 minutes' }, 'sync');
  }

  public stopAutoSync(): void {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
      this.autoSyncInterval = null;
      logger.info('Auto sync stopped', {}, 'sync');
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
      return [];
    }
  }

  // Принудительная полная синхронизация
  public async forceFullSync(): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await this.syncData();
      
      if (result.success) {
        // Очищаем кэш для принудительного обновления
        localStorage.removeItem('worktime_last_sync');
        this.lastSyncTimestamp = new Date();
        localStorage.setItem('worktime_last_sync', this.lastSyncTimestamp.toISOString());
      }
      
      return result;
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Уведомление о изменениях для мгновенной синхронизации
  public async notifyAssignmentChange(assignment: UserSiteAssignment): Promise<void> {
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
      // Сначала проверяем общее сетевое соединение
      const hasInternetConnection = await this.networkService.checkInternetConnectivity();
      if (!hasInternetConnection) {
        return false;
      }

      // Затем проверяем доступность нашего сервера
      const response = await axios.get(`${this.apiBaseUrl}/health`, {
        timeout: 10000,
        validateStatus: (status) => status < 500
      });
      
      const isServerOk = response.status >= 200 && response.status < 300;
      
      this.monitoringService.trackEvent('server_connection_check', {
        success: isServerOk,
        status: response.status,
        latency: response.headers['x-response-time'] || 'unknown'
      });
      
      return isServerOk;
    } catch (error) {
      this.monitoringService.trackError(error instanceof Error ? error : new Error('Server connection check failed'));
      return false;
    }
  }
} 

