import { query } from '../config/database';
import logger from '../utils/logger';
import { User, ConstructionSite, UserSiteAssignment, WorkShift, SyncConflict } from '../types';
import { ShiftService } from './ShiftService';
import { UserService } from './UserService';
import { SiteService } from './SiteService';
import { AssignmentService } from './AssignmentService';

// Типы для данных синхронизации
interface SyncedItem {
  type: 'shift' | 'assignment' | 'user' | 'site';
  action: 'created' | 'updated' | 'deleted';
  id: string;
}

interface SyncHistoryItem {
  id: string;
  deviceId: string;
  syncType: string;
  timestamp: Date;
  success: boolean;
  errorMessage?: string;
}

interface SyncDataInput {
  shifts?: Partial<WorkShift>[];
  assignments?: Partial<UserSiteAssignment>[];
  users?: Partial<User>[];
  sites?: Partial<ConstructionSite>[];
}

interface WebSocketData {
  userId?: string;
  shiftId?: string;
  siteId?: string;
  location?: { latitude: number; longitude: number };
  endTime?: Date;
  [key: string]: unknown;
}

// Получить getter для WebSocket сервиса
let getWebSocketService: () => unknown;

export const setWebSocketServiceGetter = (getter: () => unknown) => {
  getWebSocketService = getter;
};

export class SyncService {
  // Получение данных для синхронизации
  static async getSyncData(userId: string, options: {
    lastSyncTimestamp?: Date;
  } = {}): Promise<{
    users: User[];
    sites: ConstructionSite[];
    assignments: UserSiteAssignment[];
    shifts: WorkShift[];
    metadata: {
      timestamp: Date;
      version: number;
    };
  }> {
    const { lastSyncTimestamp } = options;

    try {
      // Получаем пользователей
      const usersResult = await UserService.getAllUsers();
      const users = Array.isArray(usersResult) ? usersResult : usersResult.users || [];
      
      // Получаем сайты
      const sitesResult = await SiteService.getAllSites();
      const sites = Array.isArray(sitesResult) ? sitesResult : sitesResult.sites || [];
      
      // Получаем назначения пользователя
      const assignments = await AssignmentService.getUserAssignments(userId);
      
      // Получаем смены пользователя
      const shiftsResult = await ShiftService.getUserShifts(userId, {
        ...(lastSyncTimestamp && { startDate: lastSyncTimestamp })
      });
      const shifts = Array.isArray(shiftsResult) ? shiftsResult : shiftsResult.shifts || [];

      return {
        users,
        sites,
        assignments,
        shifts,
        metadata: {
          timestamp: new Date(),
          version: 1,
        }
      };
    } catch (error) {
      logger.error('Error getting sync data', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        lastSyncTimestamp
      });
      throw error;
    }
  }

  // Обработка синхронизации
  static async processSync(userId: string, syncData: {
    lastSyncTimestamp?: Date;
    deviceId: string;
    data?: SyncDataInput;
  }): Promise<{
    synced: SyncedItem[];
    conflicts: SyncConflict[];
    serverData: {
      users: User[];
      sites: ConstructionSite[];
      assignments: UserSiteAssignment[];
      shifts: WorkShift[];
      metadata: {
        timestamp: Date;
        version: number;
      };
    };
  }> {
    const { lastSyncTimestamp, deviceId, data } = syncData;
    const synced: SyncedItem[] = [];
    const conflicts: SyncConflict[] = [];

    // Записываем информацию о синхронизации
    await this.recordSyncActivity(userId, deviceId);

    // Обрабатываем локальные изменения смен
    if (data?.shifts) {
      for (const shift of data.shifts) {
        if (!shift.id) continue;
        
        try {
          // Проверяем существование смены на сервере
          const existingShift = await ShiftService.getShiftById(shift.id);

          if (!existingShift) {
            // Создаем новую смену
            if (shift.isActive && !shift.endTime && shift.userId && shift.siteId) {
              const newShift = await ShiftService.startShift({
                userId: shift.userId,
                siteId: shift.siteId,
                startLocation: shift.startLocation,
                notes: shift.notes
              });
              synced.push({ type: 'shift', action: 'created', id: newShift.id });
              
              // Уведомляем админов через WebSocket
              this.notifyAdminsViaWebSocket('shift_started', {
                userId,
                shiftId: newShift.id,
                siteId: shift.siteId,
                location: shift.startLocation
              });
            }
          } else {
            // Проверяем на конфликты
            if (shift.updatedAt && existingShift.updatedAt > shift.updatedAt) {
              conflicts.push({
                entityType: 'shift',
                entityId: shift.id,
                localVersion: shift,
                remoteVersion: existingShift,
                conflictType: 'UPDATE_CONFLICT'
              });
            } else {
              // Обновляем смену
              if (!shift.isActive && shift.endTime && existingShift.isActive) {
                const updatedShift = await ShiftService.endShift(shift.id, {
                  endLocation: shift.endLocation,
                  notes: shift.notes
                });
                synced.push({ type: 'shift', action: 'updated', id: shift.id });
                
                // Уведомляем админов через WebSocket
                this.notifyAdminsViaWebSocket('shift_ended', {
                  userId,
                  shiftId: shift.id,
                  endTime: updatedShift?.endTime,
                  location: shift.endLocation
                });
              }
            }
          }
        } catch (error) {
          logger.error('Error processing shift sync', {
            error: error instanceof Error ? error.message : 'Unknown error',
            shiftId: shift.id,
            userId: shift.userId
          });
        }
      }
    }

    // Получаем обновленные данные с сервера
    const serverData = await this.getSyncData(userId, { 
      ...(lastSyncTimestamp && { lastSyncTimestamp }) 
    });

    return {
      synced,
      conflicts,
      serverData
    };
  }

  // Получение статуса синхронизации
  static async getSyncStatus(userId: string): Promise<{
    lastSyncTimestamp?: Date;
    pendingChanges: number;
    syncHistory: SyncHistoryItem[];
  }> {
    // Получаем последнюю синхронизацию
    const lastSyncResult = await query(
      'SELECT * FROM sync_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [userId]
    );

    // Получаем историю синхронизации
    const historyResult = await query(
      'SELECT * FROM sync_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10',
      [userId]
    );

    // Подсчитываем количество изменений, которые нужно синхронизировать
    const pendingChanges = await this.countPendingChanges(userId, 
      lastSyncResult.rows[0]?.created_at || new Date(0)
    );

    return {
      lastSyncTimestamp: lastSyncResult.rows[0]?.created_at,
      pendingChanges,
      syncHistory: historyResult.rows.map((row: {
        id: string;
        device_id: string;
        sync_type: string;
        created_at: Date;
        success: boolean;
        error_message?: string;
      }) => ({
        id: row.id,
        deviceId: row.device_id,
        syncType: row.sync_type,
        timestamp: row.created_at,
        success: row.success,
        errorMessage: row.error_message
      }))
    };
  }

  // Полная синхронизация
  static async fullSync(userId: string, deviceId: string): Promise<{
    users: User[];
    sites: ConstructionSite[];
    assignments: UserSiteAssignment[];
    shifts: WorkShift[];
    metadata: {
      timestamp: Date;
      version: number;
      syncType: string;
    };
  }> {
    await this.recordSyncActivity(userId, deviceId, 'full');
    
    const data = await this.getSyncData(userId);
    
    return {
      ...data,
      metadata: {
        ...data.metadata,
        syncType: 'full'
      }
    };
  }

  // Записать активность синхронизации
  private static async recordSyncActivity(
    userId: string, 
    deviceId: string, 
    syncType: string = 'incremental'
  ): Promise<void> {
    try {
      await query(
        'INSERT INTO sync_history (user_id, device_id, sync_type, success) VALUES ($1, $2, $3, $4)',
        [userId, deviceId, syncType, true]
      );
    } catch (error) {
      logger.error('Failed to record sync activity', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        userId, 
        deviceId 
      });
    }
  }

  // Подсчет изменений для синхронизации
  private static async countPendingChanges(userId: string, lastSyncTime: Date): Promise<number> {
    try {
      const result = await query(
        `SELECT COUNT(*) as count FROM (
           SELECT id FROM work_shifts WHERE user_id = $1 AND updated_at > $2
           UNION
           SELECT id FROM user_site_assignments WHERE user_id = $1 AND assigned_at > $2
         ) as pending`,
        [userId, lastSyncTime]
      );
      return parseInt(result.rows[0].count);
    } catch (error) {
      logger.error('Failed to count pending changes', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        userId 
      });
      return 0;
    }
  }

  // Инициализация таблиц синхронизации
  static async initializeSyncTables(): Promise<void> {
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS sync_history (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          device_id VARCHAR(255) NOT NULL,
          sync_type VARCHAR(50) DEFAULT 'incremental',
          success BOOLEAN DEFAULT true,
          error_message TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_sync_history_user_id ON sync_history(user_id);
        CREATE INDEX IF NOT EXISTS idx_sync_history_created_at ON sync_history(created_at);
      `);
    } catch (error) {
      logger.error('Failed to initialize sync tables', { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Обработка данных от веб админ-панели
  static async processWebAdminChanges(changes: {
    assignments?: UserSiteAssignment[];
    sites?: ConstructionSite[];
    users?: User[];
  }): Promise<{ success: boolean; message: string }> {
    try {
      // Обрабатываем назначения
      if (changes.assignments) {
        for (const assignment of changes.assignments) {
          await AssignmentService.createAssignment(assignment);
          
          // Уведомляем пользователя о новом назначении
          this.notifyUserViaWebSocket(assignment.userId, 'assignment_updated', {
            assignmentId: assignment.id,
            siteId: assignment.siteId,
            isActive: assignment.isActive,
            validFrom: assignment.validFrom,
            validTo: assignment.validTo,
            notes: assignment.notes
          });
        }
        logger.info('Processed assignments from web admin', { 
      count: changes.assignments.length 
    });
      }

      // Обрабатываем изменения объектов
      if (changes.sites) {
        for (const site of changes.sites) {
          await this.updateSiteFromWeb(site);
          
          // Уведомляем всех пользователей об изменении объекта
          this.notifyAdminsViaWebSocket('site_updated', {
            siteId: site.id,
            siteName: site.name,
            isActive: site.isActive
          });
        }
        logger.info('Processed sites from web admin', { 
      count: changes.sites.length 
    });
      }

      // Обрабатываем изменения пользователей
      if (changes.users) {
        for (const user of changes.users) {
          await this.updateUserFromWeb(user);
          
          // Уведомляем пользователя об изменении его данных
          this.notifyUserViaWebSocket(user.id, 'profile_updated', {
            userId: user.id,
            name: user.name,
            role: user.role,
            isActive: user.isActive
          });
        }
        logger.info('Processed users from web admin', { 
      count: changes.users.length 
    });
      }

      return { success: true, message: 'Changes processed successfully' };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Обновление объекта из веб-панели
  private static async updateSiteFromWeb(site: ConstructionSite): Promise<void> {
    await query(
      `INSERT INTO construction_sites (id, name, address, latitude, longitude, radius, is_active, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       address = EXCLUDED.address,
       latitude = EXCLUDED.latitude,
       longitude = EXCLUDED.longitude,
       radius = EXCLUDED.radius,
       is_active = EXCLUDED.is_active,
       updated_at = EXCLUDED.updated_at`,
      [site.id, site.name, site.address, site.latitude, site.longitude, site.radius, site.isActive]
    );
  }

  // Обновление пользователя из веб-панели
  private static async updateUserFromWeb(user: User): Promise<void> {
    await query(
      `UPDATE users SET
       name = $2,
       role = $3,
       is_active = $4,
       updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [user.id, user.name, user.role, user.isActive]
    );
  }

  // Получить все активные устройства для уведомления о синхронизации
  static async getActiveDevicesForUser(userId: string): Promise<string[]> {
    try {
      const result = await query(
        'SELECT DISTINCT device_id FROM sync_history WHERE user_id = $1 AND created_at > $2',
        [userId, new Date(Date.now() - 24 * 60 * 60 * 1000)] // за последние 24 часа
      );
             return result.rows.map((row: any) => row.device_id);
    } catch (error) {
      return [];
    }
  }

  // Уведомление админов через WebSocket
  private static notifyAdminsViaWebSocket(event: string, data: WebSocketData): void {
    try {
      if (getWebSocketService) {
        const wsService = getWebSocketService() as { notifyAdmins?: (event: string, data: WebSocketData) => void };
        if (wsService && typeof wsService.notifyAdmins === 'function') {
          wsService.notifyAdmins(event, data);
        }
      }
    } catch (error) {
      logger.error('Failed to notify admins via WebSocket', { error });
    }
  }

  // Уведомление конкретного пользователя через WebSocket
  private static notifyUserViaWebSocket(userId: string, event: string, data: WebSocketData): void {
    try {
      if (getWebSocketService) {
        const wsService = getWebSocketService() as { notifyUser?: (userId: string, event: string, data: WebSocketData) => void };
        if (wsService && typeof wsService.notifyUser === 'function') {
          wsService.notifyUser(userId, event, data);
        }
      }
    } catch (error) {
      logger.error('Failed to notify user via WebSocket', { error, userId });
    }
  }

  // Создание смены из синхронизации
  static async createShiftFromSync(userId: string, shiftData: any): Promise<any> {
    const { ShiftService } = await import('./ShiftService');
    
    const newShift = await ShiftService.startShift({
      userId: shiftData.userId || userId,
      siteId: shiftData.siteId,
      startLocation: shiftData.startLocation,
      notes: shiftData.notes
    });

    // Уведомляем админов
    this.notifyAdminsViaWebSocket('shift_created_from_sync', {
      shiftId: newShift.id,
      userId,
      siteId: shiftData.siteId
    });

    return newShift;
  }

  // Обновление смены из синхронизации
  static async updateShiftFromSync(shiftId: string, shiftData: any): Promise<any> {
    const { ShiftService } = await import('./ShiftService');
    
    const updatedShift = await ShiftService.endShift(shiftId, {
      endLocation: shiftData.endLocation,
      notes: shiftData.notes
    });

    this.notifyAdminsViaWebSocket('shift_updated_from_sync', {
      shiftId,
      endTime: updatedShift?.endTime
    });

    return updatedShift;
  }

  // Удаление смены из синхронизации
  static async deleteShiftFromSync(shiftId: string): Promise<any> {
    // В данной системе смены обычно не удаляются, только деактивируются
    const result = await query(
      'UPDATE work_shifts SET is_active = false WHERE id = $1 RETURNING *',
      [shiftId]
    );

    this.notifyAdminsViaWebSocket('shift_deleted_from_sync', {
      shiftId
    });

    return result.rows[0];
  }

  // Создание назначения из синхронизации
  static async createAssignmentFromSync(userId: string, assignmentData: any): Promise<any> {
    const { AssignmentService } = await import('./AssignmentService');
    
    const newAssignment = await AssignmentService.createAssignment({
      userId: assignmentData.userId,
      siteId: assignmentData.siteId,
      assignedBy: userId,
      validFrom: assignmentData.validFrom,
      validTo: assignmentData.validTo,
      notes: assignmentData.notes
    });

    this.notifyUserViaWebSocket(assignmentData.userId, 'assignment_created', {
      assignmentId: newAssignment.id,
      siteId: assignmentData.siteId
    });

    return newAssignment;
  }

  // Обновление назначения из синхронизации
  static async updateAssignmentFromSync(assignmentId: string, assignmentData: any): Promise<any> {
    const result = await query(
      `UPDATE user_site_assignments 
       SET is_active = $1, valid_from = $2, valid_to = $3, notes = $4, updated_at = NOW()
       WHERE id = $5 RETURNING *`,
      [
        assignmentData.isActive,
        assignmentData.validFrom,
        assignmentData.validTo,
        assignmentData.notes,
        assignmentId
      ]
    );

    if (result.rows[0]) {
      this.notifyUserViaWebSocket(result.rows[0].user_id, 'assignment_updated', {
        assignmentId,
        isActive: assignmentData.isActive
      });
    }

    return result.rows[0];
  }

  // Удаление назначения из синхронизации
  static async deleteAssignmentFromSync(assignmentId: string): Promise<any> {
    const result = await query(
      'UPDATE user_site_assignments SET is_active = false WHERE id = $1 RETURNING *',
      [assignmentId]
    );

    if (result.rows[0]) {
      this.notifyUserViaWebSocket(result.rows[0].user_id, 'assignment_deleted', {
        assignmentId
      });
    }

    return result.rows[0];
  }

  // Получение конфликтов синхронизации
  static async getSyncConflicts(userId: string): Promise<any[]> {
    const result = await query(
      `SELECT * FROM sync_conflicts 
       WHERE user_id = $1 AND status = 'pending'
       ORDER BY created_at DESC`,
      [userId]
    );

    return result.rows.map((row: any) => ({
      id: row.id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      localVersion: row.local_version,
      remoteVersion: row.remote_version,
      conflictType: row.conflict_type,
      createdAt: row.created_at,
      status: row.status
    }));
  }

  // Разрешение конфликта синхронизации
  static async resolveConflict(conflictId: string, resolution: {
    resolution: 'LOCAL_WINS' | 'REMOTE_WINS' | 'MERGE';
    data?: any;
    resolvedBy: string;
  }): Promise<any> {
    await query(
      `UPDATE sync_conflicts 
       SET status = 'resolved', resolution = $1, resolved_by = $2, resolved_at = NOW()
       WHERE id = $3`,
      [resolution.resolution, resolution.resolvedBy, conflictId]
    );

    // Применяем разрешение конфликта
    if (resolution.data) {
      // Здесь была бы логика применения разрешенного конфликта
      }

    return { success: true, conflictId, resolution: resolution.resolution };
  }

  // Получение метрик синхронизации
  static async getSyncMetrics(): Promise<any> {
    const [syncStats, deviceStats, conflictStats] = await Promise.all([
      // Статистика синхронизации
      query(`
        SELECT 
          COUNT(*) as total_syncs,
          COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as syncs_24h,
          AVG(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 ELSE 0 END) as avg_syncs_per_day
        FROM sync_activity
      `),
      
      // Статистика устройств
      query(`
        SELECT 
          COUNT(DISTINCT device_id) as active_devices,
          COUNT(DISTINCT user_id) as active_users
        FROM sync_activity 
        WHERE last_sync > NOW() - INTERVAL '7 days'
      `),
      
      // Статистика конфликтов
      query(`
        SELECT 
          COUNT(*) as total_conflicts,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_conflicts,
          COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_conflicts
        FROM sync_conflicts
      `)
    ]);

    return {
      sync: syncStats.rows[0],
      devices: deviceStats.rows[0],
      conflicts: conflictStats.rows[0],
      timestamp: new Date()
    };
  }

  // Принудительная глобальная синхронизация
  static async forceGlobalSync(): Promise<{ devicesNotified: number; usersNotified: string[] }> {
    // Получаем всех активных пользователей
    const activeUsersResult = await query(`
      SELECT DISTINCT user_id, device_id 
      FROM sync_activity 
      WHERE last_sync > NOW() - INTERVAL '7 days'
    `);

    const userIds: string[] = Array.from(new Set<string>(activeUsersResult.rows.map((row: any) => String(row.user_id))));
    
    // Уведомляем всех пользователей о необходимости синхронизации
    userIds.forEach((userId: string) => {
      this.notifyUserViaWebSocket(userId, 'force_sync_required', {
        timestamp: new Date(),
        reason: 'Global sync initiated by admin'
      });
    });

    // Также уведомляем админов
    this.notifyAdminsViaWebSocket('global_sync_initiated', {
      devicesNotified: activeUsersResult.rows.length,
      usersNotified: userIds.length,
      timestamp: new Date()
    });

    return {
      devicesNotified: activeUsersResult.rows.length,
      usersNotified: userIds
    };
  }
} 
