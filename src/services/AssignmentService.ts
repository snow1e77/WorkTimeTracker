import { UserSiteAssignment, AuthUser, ConstructionSite } from '../types';
import { ApiDatabaseService } from './ApiDatabaseService';
import { SyncService } from './SyncService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export class AssignmentService {
  private static instance: AssignmentService;
  private dbService: ApiDatabaseService;
  private syncService: SyncService;

  private constructor() {
    this.dbService = ApiDatabaseService.getInstance();
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
      const site = sites.find((s: ConstructionSite) => s.id === siteId);

      if (!user) {
        return { success: false, error: 'User not found' };
      }

      if (!site) {
        return { success: false, error: 'Construction site not found' };
      }

      // Создать назначение через API
      const newAssignment: UserSiteAssignment = {
        id: `assignment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId,
        siteId,
        assignedBy,
        isActive: true,
        assignedAt: new Date(),
        validFrom,
        validTo,
        notes
      };

      const result = await this.dbService.createUserSiteAssignment(newAssignment);

      return { success: true };
    } catch (error) {
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

      // Обновить назначение через API
      await this.dbService.updateUserSiteAssignment(assignmentId, updates);

      return { success: true };
    } catch (error) {
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
      return await this.dbService.getUserSiteAssignments(userId);
    } catch (error) {
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
        const site = allSites.find((s: ConstructionSite) => s.id === assignment.siteId);
        if (site && site.isActive) {
          sites.push(site);
        }
      }
      
      return sites;
    } catch (error) {
      return [];
    }
  }

  // Проверить, может ли пользователь работать на объекте
  public async canUserWorkOnSite(userId: string, siteId: string): Promise<boolean> {
    try {
      const activeAssignments = await this.getUserActiveAssignments(userId);
      return activeAssignments.some(assignment => assignment.siteId === siteId);
    } catch (error) {
      return false;
    }
  }

  // Получить все назначения для объекта
  public async getSiteAssignments(siteId: string): Promise<UserSiteAssignment[]> {
    try {
      const response = await this.dbService.getSiteAssignments(siteId);
      if (response.success && response.data) {
        return response.data;
      }
      return [];
    } catch (error) {
      return [];
    }
  }

  // Получить активных сотрудников на объекте
  public async getSiteActiveWorkers(siteId: string): Promise<AuthUser[]> {
    try {
      const assignments = await this.getSiteAssignments(siteId);
      const activeAssignments = assignments.filter(a => a.isActive);
      const workers: AuthUser[] = [];
      
      for (const assignment of activeAssignments) {
        const user = await this.dbService.getUserById(assignment.userId);
        if (user) {
          workers.push(user);
        }
      }
      
      return workers;
    } catch (error) {
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
      const response = await this.dbService.getAssignmentStats();
      if (response.success && response.data) {
        return {
          totalAssignments: response.data.totalAssignments || 0,
          activeAssignments: response.data.activeAssignments || 0,
          usersWithAssignments: response.data.completedToday || 0,
          sitesWithAssignments: response.data.averageHoursPerDay ? Math.floor(response.data.averageHoursPerDay) : 0
        };
      }
      return {
        totalAssignments: 0,
        activeAssignments: 0,
        usersWithAssignments: 0,
        sitesWithAssignments: 0
      };
    } catch (error) {
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
      // Получаем все активные назначения пользователя
      const activeAssignments = await this.getUserActiveAssignments(userId);
      
      // Проверяем есть ли перекрывающиеся назначения
      const conflicts: UserSiteAssignment[] = [];
      const now = new Date();
      
      for (let i = 0; i < activeAssignments.length; i++) {
        for (let j = i + 1; j < activeAssignments.length; j++) {
          const assignment1 = activeAssignments[i];
          const assignment2 = activeAssignments[j];
          
          // Проверяем что назначения не undefined
          if (!assignment1 || !assignment2) {
            continue;
          }
          
          // Проверяем временные пересечения
          const start1 = assignment1.validFrom || new Date(0);
          const end1 = assignment1.validTo || new Date('2099-12-31');
          const start2 = assignment2.validFrom || new Date(0);
          const end2 = assignment2.validTo || new Date('2099-12-31');
          
          // Есть пересечение если одно назначение начинается до окончания другого
          if (start1 <= end2 && start2 <= end1) {
            if (!conflicts.find(c => c.id === assignment1.id)) {
              conflicts.push(assignment1);
            }
            if (!conflicts.find(c => c.id === assignment2.id)) {
              conflicts.push(assignment2);
            }
          }
        }
      }
      
      return conflicts;
    } catch (error) {
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
    try {
      const response = await this.dbService.bulkAssignUsersToSite({
        userIds,
        siteId,
        validFrom,
        validTo
      });
      
      if (response.success && response.data) {
        return {
          success: true,
          assignments: Array.isArray(response.data) ? response.data : [],
          errors: []
        };
      } else {
        return {
          success: false,
          errors: [response.error || 'Failed to bulk assign users']
        };
      }
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }
} 
