import { UserSiteAssignment, AuthUser, ConstructionSite } from '../types';
import { DatabaseService } from './DatabaseService';
import { SyncService } from './SyncService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export class AssignmentService {
  private static instance: AssignmentService;
  private dbService: DatabaseService;
  private syncService: SyncService;

  private constructor() {
    this.dbService = DatabaseService.getInstance();
    this.syncService = SyncService.getInstance();
  }

  static getInstance(): AssignmentService {
    if (!AssignmentService.instance) {
      AssignmentService.instance = new AssignmentService();
    }
    return AssignmentService.instance;
  }

  // Создать новое назначение (только для администраторов)
  public async createAssignment(
    userId: string,
    siteId: string,
    assignedBy: string,
    validFrom?: Date,
    validTo?: Date,
    notes?: string
  ): Promise<{ success: boolean; assignment?: UserSiteAssignment; error?: string }> {
    try {
      // Проверить, что назначающий является администратором
      const admin = await this.dbService.getUserById(assignedBy);
      if (!admin || admin.role !== 'admin') {
        return { success: false, error: 'Only administrators can create assignments' };
      }

      // Проверить, что пользователь и объект существуют
      const user = await this.dbService.getUserById(userId);
      const sites = await this.dbService.getConstructionSites();
      const site = sites.find(s => s.id === siteId);

      if (!user) {
        return { success: false, error: 'User not found' };
      }

      if (!site) {
        return { success: false, error: 'Construction site not found' };
      }

      // Создать назначение
      const assignment: UserSiteAssignment = {
        id: `assignment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        siteId,
        assignedBy,
        isActive: true,
        assignedAt: new Date(),
        validFrom,
        validTo,
        notes
      };

      // Сохранить в локальном хранилище
      await this.saveAssignmentToLocal(assignment);

      // Добавить в очередь синхронизации
      await this.syncService.addSyncMetadata('assignment', assignment.id, 'create');

      console.log('✅ Assignment created:', assignment);
      return { success: true, assignment };
    } catch (error) {
      console.error('Failed to create assignment:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Обновить назначение
  public async updateAssignment(
    assignmentId: string,
    updates: Partial<UserSiteAssignment>,
    updatedBy: string
  ): Promise<{ success: boolean; assignment?: UserSiteAssignment; error?: string }> {
    try {
      // Проверить права администратора
      const admin = await this.dbService.getUserById(updatedBy);
      if (!admin || admin.role !== 'admin') {
        return { success: false, error: 'Only administrators can update assignments' };
      }

      // Получить существующее назначение
      const existingAssignment = await this.getAssignmentById(assignmentId);
      if (!existingAssignment) {
        return { success: false, error: 'Assignment not found' };
      }

      // Обновить назначение
      const updatedAssignment: UserSiteAssignment = {
        ...existingAssignment,
        ...updates,
        id: assignmentId // Убедиться, что ID не изменился
      };

      // Сохранить обновление
      await this.saveAssignmentToLocal(updatedAssignment);

      // Добавить в очередь синхронизации
      await this.syncService.addSyncMetadata('assignment', assignmentId, 'update');

      console.log('✅ Assignment updated:', updatedAssignment);
      return { success: true, assignment: updatedAssignment };
    } catch (error) {
      console.error('Failed to update assignment:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Деактивировать назначение
  public async deactivateAssignment(
    assignmentId: string,
    deactivatedBy: string
  ): Promise<{ success: boolean; error?: string }> {
    return await this.updateAssignment(assignmentId, { isActive: false }, deactivatedBy);
  }

  // Активировать назначение
  public async activateAssignment(
    assignmentId: string,
    activatedBy: string
  ): Promise<{ success: boolean; error?: string }> {
    return await this.updateAssignment(assignmentId, { isActive: true }, activatedBy);
  }

  // Получить все назначения пользователя
  public async getUserAssignments(userId: string): Promise<UserSiteAssignment[]> {
    try {
      const allAssignments = await this.getAllAssignments();
      return allAssignments.filter(assignment => assignment.userId === userId);
    } catch (error) {
      console.error('Failed to get user assignments:', error);
      return [];
    }
  }

  // Получить активные назначения пользователя
  public async getUserActiveAssignments(userId: string): Promise<UserSiteAssignment[]> {
    try {
      const assignments = await this.getUserAssignments(userId);
      const now = new Date();
      
      return assignments.filter(assignment => 
        assignment.isActive &&
        (!assignment.validFrom || new Date(assignment.validFrom) <= now) &&
        (!assignment.validTo || new Date(assignment.validTo) >= now)
      );
    } catch (error) {
      console.error('Failed to get user active assignments:', error);
      return [];
    }
  }

  // Получить назначенные пользователю объекты
  public async getUserAssignedSites(userId: string): Promise<ConstructionSite[]> {
    try {
      const activeAssignments = await this.getUserActiveAssignments(userId);
      const sites: ConstructionSite[] = [];
      const allSites = await this.dbService.getConstructionSites();
      
      for (const assignment of activeAssignments) {
        const site = allSites.find(s => s.id === assignment.siteId);
        if (site && site.isActive) {
          sites.push(site);
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
      const activeAssignments = await this.getUserActiveAssignments(userId);
      return activeAssignments.some(assignment => assignment.siteId === siteId);
    } catch (error) {
      console.error('Failed to check user site access:', error);
      return false;
    }
  }

  // Получить все назначения для объекта
  public async getSiteAssignments(siteId: string): Promise<UserSiteAssignment[]> {
    try {
      const allAssignments = await this.getAllAssignments();
      return allAssignments.filter(assignment => assignment.siteId === siteId);
    } catch (error) {
      console.error('Failed to get site assignments:', error);
      return [];
    }
  }

  // Получить активных работников на объекте
  public async getSiteActiveWorkers(siteId: string): Promise<AuthUser[]> {
    try {
      const assignments = await this.getSiteAssignments(siteId);
      const activeAssignments = assignments.filter(assignment => assignment.isActive);
      const workers: AuthUser[] = [];
      
      for (const assignment of activeAssignments) {
        const user = await this.dbService.getUserById(assignment.userId);
        if (user && user.isActive) {
          workers.push(user);
        }
      }
      
      return workers;
    } catch (error) {
      console.error('Failed to get site active workers:', error);
      return [];
    }
  }

  // Получить статистику назначений
  public async getAssignmentStats(): Promise<{
    totalAssignments: number;
    activeAssignments: number;
    usersWithAssignments: number;
    sitesWithAssignments: number;
  }> {
    try {
      const allAssignments = await this.getAllAssignments();
      const activeAssignments = allAssignments.filter(a => a.isActive);
      
      const uniqueUsers = new Set(allAssignments.map(a => a.userId));
      const uniqueSites = new Set(allAssignments.map(a => a.siteId));
      
      return {
        totalAssignments: allAssignments.length,
        activeAssignments: activeAssignments.length,
        usersWithAssignments: uniqueUsers.size,
        sitesWithAssignments: uniqueSites.size
      };
    } catch (error) {
      console.error('Failed to get assignment stats:', error);
      return {
        totalAssignments: 0,
        activeAssignments: 0,
        usersWithAssignments: 0,
        sitesWithAssignments: 0
      };
    }
  }

  // Проверить конфликты назначений (пользователь назначен на несколько объектов одновременно)
  public async checkAssignmentConflicts(userId: string): Promise<UserSiteAssignment[]> {
    try {
      const activeAssignments = await this.getUserActiveAssignments(userId);
      
      // Если у пользователя больше одного активного назначения, это может быть конфликтом
      if (activeAssignments.length > 1) {
        return activeAssignments;
      }
      
      return [];
    } catch (error) {
      console.error('Failed to check assignment conflicts:', error);
      return [];
    }
  }

  // Массовое назначение пользователей на объект
  public async bulkAssignUsersToSite(
    userIds: string[],
    siteId: string,
    assignedBy: string,
    validFrom?: Date,
    validTo?: Date
  ): Promise<{ success: boolean; assignments?: UserSiteAssignment[]; errors?: string[] }> {
    const assignments: UserSiteAssignment[] = [];
    const errors: string[] = [];

    for (const userId of userIds) {
      const result = await this.createAssignment(userId, siteId, assignedBy, validFrom, validTo);
      
      if (result.success && result.assignment) {
        assignments.push(result.assignment);
      } else {
        errors.push(`Failed to assign user ${userId}: ${result.error}`);
      }
    }

    return {
      success: errors.length === 0,
      assignments: assignments.length > 0 ? assignments : undefined,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  // Вспомогательные методы для работы с локальным хранилищем
  private async getAllAssignments(): Promise<UserSiteAssignment[]> {
    try {
      const assignmentsJson = await AsyncStorage.getItem('local_assignments');
      return assignmentsJson ? JSON.parse(assignmentsJson) : [];
    } catch (error) {
      console.error('Failed to get all assignments:', error);
      return [];
    }
  }

  private async getAssignmentById(assignmentId: string): Promise<UserSiteAssignment | null> {
    try {
      const allAssignments = await this.getAllAssignments();
      return allAssignments.find(assignment => assignment.id === assignmentId) || null;
    } catch (error) {
      console.error('Failed to get assignment by ID:', error);
      return null;
    }
  }

  private async saveAssignmentToLocal(assignment: UserSiteAssignment): Promise<void> {
    try {
      const allAssignments = await this.getAllAssignments();
      
      // Удалить существующее назначение с таким же ID
      const filteredAssignments = allAssignments.filter(a => a.id !== assignment.id);
      
      // Добавить обновленное назначение
      filteredAssignments.push(assignment);
      
      await AsyncStorage.setItem('local_assignments', JSON.stringify(filteredAssignments));
    } catch (error) {
      console.error('Failed to save assignment to local storage:', error);
      throw error;
    }
  }

  // Синхронизация назначений с веб-панелью
  public async syncAssignmentsFromWeb(): Promise<void> {
    try {
      // В реальном приложении здесь будет API запрос
      // Сейчас читаем из localStorage веб-панели
      if (typeof localStorage !== 'undefined') {
        const webAssignments = JSON.parse(localStorage.getItem('worktime_assignments') || '[]');
        
        for (const webAssignment of webAssignments) {
          await this.saveAssignmentToLocal(webAssignment);
        }
        
        console.log('✅ Assignments synced from web panel');
      }
    } catch (error) {
      console.error('Failed to sync assignments from web:', error);
    }
  }

  // Отправить назначения в веб-панель
  public async syncAssignmentsToWeb(): Promise<void> {
    try {
      const localAssignments = await this.getAllAssignments();
      
      // В реальном приложении здесь будет API запрос
      // Сейчас записываем в localStorage веб-панели
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('worktime_assignments', JSON.stringify(localAssignments));
        console.log('✅ Assignments synced to web panel');
      }
    } catch (error) {
      console.error('Failed to sync assignments to web:', error);
    }
  }
} 