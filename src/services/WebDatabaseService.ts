import { AuthUser, SMSVerification, UserSiteAssignment } from '../types';

// Веб-версия DatabaseService для работы с localStorage
export class WebDatabaseService {
  private static instance: WebDatabaseService;

  private constructor() {}

  static getInstance(): WebDatabaseService {
    if (!WebDatabaseService.instance) {
      WebDatabaseService.instance = new WebDatabaseService();
    }
    return WebDatabaseService.instance;
  }

  async initDatabase(): Promise<void> {
    // Инициализируем начальные данные если они не существуют
    if (!localStorage.getItem('worktime_users')) {
      const defaultUsers: AuthUser[] = [
        {
          id: 'admin-1',
          phoneNumber: '+1234567890',
          name: 'Admin User',
          role: 'admin',
          companyId: 'default-company',
          isVerified: true,
          isActive: true,
          createdAt: new Date(),
        },
        {
          id: 'worker-1',
          phoneNumber: '+1234567891',
          name: 'John Worker',
          role: 'worker',
          companyId: 'default-company',
          isVerified: true,
          isActive: true,
          createdAt: new Date(),
        },
        {
          id: 'worker-2',
          phoneNumber: '+1234567892',
          name: 'Jane Worker',
          role: 'worker',
          companyId: 'default-company',
          isVerified: true,
          isActive: false,
          createdAt: new Date(),
        },
      ];
      
      localStorage.setItem('worktime_users', JSON.stringify(defaultUsers));
      
      // Создаем пароли для демонстрации (в реальном проекте используйте хэширование)
      const passwords = {
        'admin-1': 'admin123',
        'worker-1': 'worker123',
        'worker-2': 'worker123',
      };
      localStorage.setItem('worktime_passwords', JSON.stringify(passwords));
    }
  }

  async createUser(user: AuthUser, passwordHash: string): Promise<void> {
    const users = await this.getAllUsers();
    users.push(user);
    localStorage.setItem('worktime_users', JSON.stringify(users));
    
    const passwords = JSON.parse(localStorage.getItem('worktime_passwords') || '{}');
    passwords[user.id] = passwordHash;
    localStorage.setItem('worktime_passwords', JSON.stringify(passwords));
  }

  async getUserByPhone(phoneNumber: string): Promise<AuthUser | null> {
    const users = await this.getAllUsers();
    return users.find(user => user.phoneNumber === phoneNumber) || null;
  }

  async getUserById(id: string): Promise<AuthUser | null> {
    const users = await this.getAllUsers();
    return users.find(user => user.id === id) || null;
  }

  async getUserPassword(userId: string): Promise<string | null> {
    const passwords = JSON.parse(localStorage.getItem('worktime_passwords') || '{}');
    return passwords[userId] || null;
  }

  async updateUserPassword(userId: string, passwordHash: string): Promise<void> {
    const passwords = JSON.parse(localStorage.getItem('worktime_passwords') || '{}');
    passwords[userId] = passwordHash;
    localStorage.setItem('worktime_passwords', JSON.stringify(passwords));
  }

  async getAllUsers(): Promise<AuthUser[]> {
    const usersData = localStorage.getItem('worktime_users');
    if (!usersData) {
      return [];
    }
    const users = JSON.parse(usersData);
    // Преобразуем строки createdAt обратно в Date объекты
    return users.map((user: any) => ({
      ...user,
      createdAt: typeof user.createdAt === 'string' ? new Date(user.createdAt) : user.createdAt
    }));
  }

  async updateUserRole(userId: string, role: 'worker' | 'admin'): Promise<void> {
    const users = await this.getAllUsers();
    const userIndex = users.findIndex(user => user.id === userId);
    if (userIndex !== -1) {
      users[userIndex].role = role;
      localStorage.setItem('worktime_users', JSON.stringify(users));
    }
  }

  async updateUserStatus(userId: string, isActive: boolean): Promise<void> {
    const users = await this.getAllUsers();
    const userIndex = users.findIndex(user => user.id === userId);
    if (userIndex !== -1) {
      users[userIndex].isActive = isActive;
      localStorage.setItem('worktime_users', JSON.stringify(users));
    }
  }

  async deleteUser(userId: string): Promise<void> {
    const users = await this.getAllUsers();
    const filteredUsers = users.filter(user => user.id !== userId);
    localStorage.setItem('worktime_users', JSON.stringify(filteredUsers));
    
    // Также удаляем пароль
    const passwords = JSON.parse(localStorage.getItem('worktime_passwords') || '{}');
    delete passwords[userId];
    localStorage.setItem('worktime_passwords', JSON.stringify(passwords));
  }

  // Методы для SMS верификации (заглушки для веб версии)
  async saveSMSVerification(verification: SMSVerification): Promise<void> {
    // В веб версии SMS не используется
  }

  async getSMSVerification(phoneNumber: string, type: 'registration' | 'login'): Promise<SMSVerification | null> {
    return null;
  }

  async markSMSVerificationAsUsed(verificationId: string): Promise<void> {
    // В веб версии SMS не используется
  }

  async cleanupExpiredVerifications(): Promise<void> {
    // В веб версии SMS не используется
  }

  // Методы для строительных площадок (заглушки)
  async getConstructionSites(): Promise<any[]> {
    const sitesData = localStorage.getItem('worktime_sites');
    if (!sitesData) {
      const defaultSites = [
        {
          id: 'site-1',
          name: 'Construction Site Alpha',
          address: '123 Main St, City',
          latitude: 40.7128,
          longitude: -74.0060,
          radius: 100,
          companyId: 'default-company',
          isActive: true,
          createdAt: new Date(),
        },
        {
          id: 'site-2',
          name: 'Construction Site Beta',
          address: '456 Oak Ave, City',
          latitude: 40.7589,
          longitude: -73.9851,
          radius: 150,
          companyId: 'default-company',
          isActive: true,
          createdAt: new Date(),
        },
      ];
      localStorage.setItem('worktime_sites', JSON.stringify(defaultSites));
      return defaultSites;
    }
    const sites = JSON.parse(sitesData);
    // Преобразуем строки createdAt обратно в Date объекты
    return sites.map((site: any) => ({
      ...site,
      createdAt: typeof site.createdAt === 'string' ? new Date(site.createdAt) : site.createdAt
    }));
  }

  async deleteConstructionSite(siteId: string): Promise<void> {
    const sites = await this.getConstructionSites();
    const filteredSites = sites.filter(site => site.id !== siteId);
    localStorage.setItem('worktime_sites', JSON.stringify(filteredSites));
  }

  async updateSiteStatus(siteId: string, isActive: boolean): Promise<void> {
    const sites = await this.getConstructionSites();
    const siteIndex = sites.findIndex(site => site.id === siteId);
    if (siteIndex !== -1) {
      sites[siteIndex].isActive = isActive;
      localStorage.setItem('worktime_sites', JSON.stringify(sites));
    }
  }

  // Методы для отчетов о работе (заглушки)
  async getWorkReports(period: 'today' | 'week' | 'month'): Promise<any[]> {
    // Возвращаем демонстрационные данные
    const demoReports = [
      {
        userId: 'worker-1',
        userName: 'John Worker',
        siteId: 'site-1',
        siteName: 'Construction Site Alpha',
        totalHours: 8.5,
        totalMinutes: 510,
        shiftsCount: 1,
        violations: 0,
        date: new Date().toISOString(),
      },
      {
        userId: 'worker-2',
        userName: 'Jane Worker',
        siteId: 'site-2',
        siteName: 'Construction Site Beta',
        totalHours: 7.2,
        totalMinutes: 432,
        shiftsCount: 1,
        violations: 1,
        date: new Date().toISOString(),
      },
      {
        userId: 'worker-1',
        userName: 'John Worker',
        siteId: 'site-2',
        siteName: 'Construction Site Beta',
        totalHours: 9.0,
        totalMinutes: 540,
        shiftsCount: 1,
        violations: 0,
        date: new Date(Date.now() - 86400000).toISOString(), // вчера
      },
    ];
    return demoReports;
  }

  // Методы для назначений рабочих на объекты
  async getAllAssignments(): Promise<UserSiteAssignment[]> {
    const assignmentsData = localStorage.getItem('worktime_assignments');
    if (!assignmentsData) {
      // Создаем демонстрационные назначения
      const defaultAssignments: UserSiteAssignment[] = [
        {
          id: 'assignment-1',
          userId: 'worker-1',
          siteId: 'site-1',
          assignedBy: 'admin-1',
          isActive: true,
          assignedAt: new Date(),
          notes: 'Primary assignment for John Worker'
        },
        {
          id: 'assignment-2',
          userId: 'worker-2',
          siteId: 'site-2',
          assignedBy: 'admin-1',
          isActive: true,
          assignedAt: new Date(),
          notes: 'Primary assignment for Jane Worker'
        },
      ];
      localStorage.setItem('worktime_assignments', JSON.stringify(defaultAssignments));
      return defaultAssignments;
    }
    
    const assignments = JSON.parse(assignmentsData);
    // Преобразуем строки дат обратно в Date объекты
    return assignments.map((assignment: any) => ({
      ...assignment,
      assignedAt: typeof assignment.assignedAt === 'string' ? new Date(assignment.assignedAt) : assignment.assignedAt,
      validFrom: assignment.validFrom ? (typeof assignment.validFrom === 'string' ? new Date(assignment.validFrom) : assignment.validFrom) : undefined,
      validTo: assignment.validTo ? (typeof assignment.validTo === 'string' ? new Date(assignment.validTo) : assignment.validTo) : undefined,
    }));
  }

  async createAssignment(assignment: UserSiteAssignment): Promise<void> {
    const assignments = await this.getAllAssignments();
    assignments.push(assignment);
    localStorage.setItem('worktime_assignments', JSON.stringify(assignments));
  }

  async updateAssignment(assignmentId: string, updates: Partial<UserSiteAssignment>): Promise<void> {
    const assignments = await this.getAllAssignments();
    const assignmentIndex = assignments.findIndex(assignment => assignment.id === assignmentId);
    if (assignmentIndex !== -1) {
      assignments[assignmentIndex] = { ...assignments[assignmentIndex], ...updates };
      localStorage.setItem('worktime_assignments', JSON.stringify(assignments));
    }
  }

  async deleteAssignment(assignmentId: string): Promise<void> {
    const assignments = await this.getAllAssignments();
    const filteredAssignments = assignments.filter(assignment => assignment.id !== assignmentId);
    localStorage.setItem('worktime_assignments', JSON.stringify(filteredAssignments));
  }

  async getUserAssignments(userId: string): Promise<UserSiteAssignment[]> {
    const assignments = await this.getAllAssignments();
    return assignments.filter(assignment => assignment.userId === userId);
  }

  async getSiteAssignments(siteId: string): Promise<UserSiteAssignment[]> {
    const assignments = await this.getAllAssignments();
    return assignments.filter(assignment => assignment.siteId === siteId);
  }

  async getUserAssignedSites(userId: string): Promise<any[]> {
    const assignments = await this.getUserAssignments(userId);
    const sites = await this.getConstructionSites();
    const activeAssignments = assignments.filter(assignment => assignment.isActive);
    
    return sites.filter(site => 
      activeAssignments.some(assignment => assignment.siteId === site.id) && site.isActive
    );
  }
} 