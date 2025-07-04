import { AuthUser, UserSiteAssignment, PhotoReport, WorkSchedule, WorkerLocation, ConstructionSite, WorkReport, LocationEvent, Chat, ChatMessage, Project } from '../types';

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
    // Инициализируем пустые данные для продакшена
    if (!localStorage.getItem('worktime_users')) {
      localStorage.setItem('worktime_users', JSON.stringify([]));
    }
    if (!localStorage.getItem('worktime_passwords')) {
      localStorage.setItem('worktime_passwords', JSON.stringify({}));
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
    if (!usersData) return [];
    
    const users = JSON.parse(usersData);
    // Преобразуем строки createdAt обратно в Date объекты
    return users.map((user: AuthUser) => ({
      ...user,
      createdAt: typeof user.createdAt === 'string' ? new Date(user.createdAt) : user.createdAt
    }));
  }

  async updateUserRole(userId: string, role: 'worker' | 'admin'): Promise<void> {
    const users = await this.getAllUsers();
    const userIndex = users.findIndex(user => user.id === userId);
    if (userIndex !== -1 && users[userIndex]) {
      users[userIndex].role = role;
      localStorage.setItem('worktime_users', JSON.stringify(users));
    }
  }

  async updateUserStatus(userId: string, isActive: boolean): Promise<void> {
    const users = await this.getAllUsers();
    const userIndex = users.findIndex(user => user.id === userId);
    if (userIndex !== -1 && users[userIndex]) {
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

  // Методы для строительных площадок (заглушка)
  async getConstructionSites(): Promise<ConstructionSite[]> {
    const sitesData = localStorage.getItem('worktime_sites');
    if (!sitesData) {
      localStorage.setItem('worktime_sites', JSON.stringify([]));
      return [];
    }
    const sites = JSON.parse(sitesData);
    // Преобразуем строки createdAt обратно в Date объекты
    return sites.map((site: ConstructionSite) => ({
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
    if (siteIndex !== -1 && sites[siteIndex]) {
      sites[siteIndex].isActive = isActive;
      localStorage.setItem('worktime_sites', JSON.stringify(sites));
    }
  }

  // Методы для отчетов о работе (заглушка)
  async getWorkReports(period: 'today' | 'week' | 'month'): Promise<WorkReport[]> {
    // Возвращаем пустой массив - данные должны поступать из реального API
    return [];
  }

  // Методы для назначений рабочих на объекты
  async getAllAssignments(): Promise<UserSiteAssignment[]> {
    const assignmentsData = localStorage.getItem('worktime_assignments');
    if (!assignmentsData) {
      localStorage.setItem('worktime_assignments', JSON.stringify([]));
      return [];
    }
    
    const assignments = JSON.parse(assignmentsData);
    // Преобразуем строки дат обратно в Date объекты
    return assignments.map((assignment: UserSiteAssignment) => ({
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
    if (assignmentIndex !== -1 && assignments[assignmentIndex]) {
      const currentAssignment = assignments[assignmentIndex];
      const updatedAssignment: UserSiteAssignment = {
        id: currentAssignment.id,
        userId: updates.userId ?? currentAssignment.userId,
        siteId: updates.siteId ?? currentAssignment.siteId,
        assignedBy: updates.assignedBy ?? currentAssignment.assignedBy,
        isActive: updates.isActive ?? currentAssignment.isActive,
        assignedAt: updates.assignedAt ?? currentAssignment.assignedAt,
        validFrom: updates.validFrom ?? currentAssignment.validFrom,
        validTo: updates.validTo ?? currentAssignment.validTo,
        notes: updates.notes ?? currentAssignment.notes
      };
      assignments[assignmentIndex] = updatedAssignment;
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

  async getUserAssignedSites(userId: string): Promise<ConstructionSite[]> {
    const assignments = await this.getUserAssignments(userId);
    const sites = await this.getConstructionSites();
    const activeAssignments = assignments.filter(assignment => assignment.isActive);
    
    return sites.filter(site => 
      activeAssignments.some(assignment => assignment.siteId === site.id) && site.isActive
    );
  }

  // Методы для отслеживания местоположения работников
  async getUsersCurrentLocations(): Promise<LocationEvent[]> {
    // В веб версии возвращаем пустой массив - данные должны поступать из реального API
    return [];
  }

  async getRecentLocationEvents(userId?: string, limit: number = 100): Promise<LocationEvent[]> {
    const eventsData = localStorage.getItem('worktime_location_events');
    if (!eventsData) return [];
    
    let events = JSON.parse(eventsData);
    
    if (userId) {
      events = events.filter((event: LocationEvent) => event.userId === userId);
    }
    
    // Сортируем по времени (новые сначала) и ограничиваем количество
    events.sort((a: LocationEvent, b: LocationEvent) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return events.slice(0, limit);
  }

  // Методы для работы с фотоотчётами
  async createPhotoReport(report: PhotoReport): Promise<void> {
    const reports = await this.getPhotoReports();
    reports.push(report);
    localStorage.setItem('worktime_photo_reports', JSON.stringify(reports));
  }

  async getPhotoReports(userId?: string, siteId?: string): Promise<PhotoReport[]> {
    const reportsData = localStorage.getItem('worktime_photo_reports');
    if (!reportsData) {
      localStorage.setItem('worktime_photo_reports', JSON.stringify([]));
      return [];
    }
    
    let reports: PhotoReport[] = JSON.parse(reportsData);
    
    if (userId) {
      reports = reports.filter((report: PhotoReport) => report.userId === userId);
    }
    
    if (siteId) {
      reports = reports.filter((report: PhotoReport) => report.siteId === siteId);
    }
    
    return reports.map((report: PhotoReport) => ({
      ...report,
      timestamp: new Date(report.timestamp)
    }));
  }

  async validatePhotoReport(reportId: string, isValid: boolean): Promise<void> {
    const reports = await this.getPhotoReports();
    const reportIndex = reports.findIndex(report => report.id === reportId);
    if (reportIndex !== -1 && reports[reportIndex]) {
      reports[reportIndex].isValidated = isValid;
      if (isValid && reports[reportIndex]) {
        reports[reportIndex].validatedBy = 'admin-1';
        reports[reportIndex].validatedAt = new Date();
      }
      localStorage.setItem('worktime_photo_reports', JSON.stringify(reports));
    }
  }

  // Методы для работы с расписаниями
  async createWorkSchedule(schedule: WorkSchedule): Promise<void> {
    const schedules = await this.getWorkSchedules();
    schedules.push(schedule);
    localStorage.setItem('worktime_schedules', JSON.stringify(schedules));
  }

  async getWorkSchedules(siteId?: string): Promise<WorkSchedule[]> {
    const schedulesData = localStorage.getItem('worktime_schedules');
    if (!schedulesData) return [];
    
    let schedules: WorkSchedule[] = JSON.parse(schedulesData);
    
    if (siteId) {
      schedules = schedules.filter((schedule: WorkSchedule) => schedule.siteId === siteId);
    }
    
    return schedules.map((schedule: WorkSchedule) => ({
      ...schedule,
      createdAt: new Date(schedule.createdAt)
    }));
  }

  async updateWorkSchedule(scheduleId: string, updates: Partial<WorkSchedule>): Promise<void> {
    const schedules = await this.getWorkSchedules();
    const scheduleIndex = schedules.findIndex(schedule => schedule.id === scheduleId);
    if (scheduleIndex !== -1 && schedules[scheduleIndex]) {
      const currentSchedule = schedules[scheduleIndex];
      const updatedSchedule: WorkSchedule = {
        id: currentSchedule.id,
        siteId: updates.siteId ?? currentSchedule.siteId,
        dayOfWeek: updates.dayOfWeek ?? currentSchedule.dayOfWeek,
        startTime: updates.startTime ?? currentSchedule.startTime,
        endTime: updates.endTime ?? currentSchedule.endTime,
        lunchStart: updates.lunchStart ?? currentSchedule.lunchStart,
        lunchEnd: updates.lunchEnd ?? currentSchedule.lunchEnd,
        isActive: updates.isActive ?? currentSchedule.isActive,
        createdAt: updates.createdAt ?? currentSchedule.createdAt
      };
      schedules[scheduleIndex] = updatedSchedule;
      localStorage.setItem('worktime_schedules', JSON.stringify(schedules));
    }
  }

  async deleteWorkSchedule(scheduleId: string): Promise<void> {
    const schedules = await this.getWorkSchedules();
    const filteredSchedules = schedules.filter(schedule => schedule.id !== scheduleId);
    localStorage.setItem('worktime_schedules', JSON.stringify(filteredSchedules));
  }

  // Методы для отслеживания рабочих в реальном времени
  async getWorkersLocations(): Promise<WorkerLocation[]> {
    const locationsData = localStorage.getItem('worktime_workers_locations');
    if (!locationsData) {
      localStorage.setItem('worktime_workers_locations', JSON.stringify([]));
      return [];
    }
    
    const locations: WorkerLocation[] = JSON.parse(locationsData);
    return locations.map((location: WorkerLocation) => ({
      ...location,
      timestamp: new Date(location.timestamp),
      shiftStartTime: location.shiftStartTime ? new Date(location.shiftStartTime) : undefined,
      lastPhotoReportTime: location.lastPhotoReportTime ? new Date(location.lastPhotoReportTime) : undefined
    }));
  }

  async updateWorkerLocation(userId: string, location: Partial<WorkerLocation>): Promise<void> {
    const locations = await this.getWorkersLocations();
    const locationIndex = locations.findIndex(loc => loc.userId === userId);
    
    if (locationIndex !== -1 && locations[locationIndex]) {
      // Создаем правильно типизированный объект
      const currentLocation = locations[locationIndex];
      const updatedLocation: WorkerLocation = {
        userId: currentLocation.userId,
        userName: currentLocation.userName,
        userAvatar: location.userAvatar ?? currentLocation.userAvatar,
        currentSiteId: location.currentSiteId ?? currentLocation.currentSiteId,
        currentSiteName: location.currentSiteName ?? currentLocation.currentSiteName,
        latitude: location.latitude ?? currentLocation.latitude,
        longitude: location.longitude ?? currentLocation.longitude,
        timestamp: location.timestamp ?? currentLocation.timestamp,
        isOnSite: location.isOnSite ?? currentLocation.isOnSite,
        shiftStartTime: location.shiftStartTime ?? currentLocation.shiftStartTime,
        timeOnSite: location.timeOnSite ?? currentLocation.timeOnSite,
        lastPhotoReportTime: location.lastPhotoReportTime ?? currentLocation.lastPhotoReportTime,
        status: location.status ?? currentLocation.status
      };
      locations[locationIndex] = updatedLocation;
    } else {
      // Если локация не найдена, создаем новую (нужно будет заполнить обязательные поля)
      const user = await this.getUserById(userId);
      if (user) {
        const newLocation: WorkerLocation = {
          userId,
          userName: user.name,
          userAvatar: location.userAvatar,
          currentSiteId: location.currentSiteId,
          currentSiteName: location.currentSiteName,
          latitude: location.latitude || 0,
          longitude: location.longitude || 0,
          timestamp: location.timestamp || new Date(),
          isOnSite: location.isOnSite || false,
          shiftStartTime: location.shiftStartTime,
          timeOnSite: location.timeOnSite,
          lastPhotoReportTime: location.lastPhotoReportTime,
          status: location.status || 'offline'
        };
        locations.push(newLocation);
      }
    }
    
    localStorage.setItem('worktime_workers_locations', JSON.stringify(locations));
  }

  // Chat system methods
  async getForemanChats(): Promise<{ success: boolean; data?: Chat[]; error?: string }> {
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const chats: Chat[] = JSON.parse(localStorage.getItem('worktime_chats') || '[]');
      const users = await this.getAllUsers();
      
      // Get workers and create chat entries
      const workers = users.filter(u => u.role === 'worker');
      const foremanChats = workers.map(worker => {
        const existingChat = chats.find((c: Chat) => c.workerId === worker.id);
        const messages: ChatMessage[] = JSON.parse(localStorage.getItem(`worktime_messages_${worker.id}`) || '[]');
        const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
        
        return {
          id: `chat-${worker.id}`,
          workerId: worker.id,
          workerName: worker.name,
          foremanId: 'admin-1',
          foremanName: 'Admin User',
          unreadCount: messages.filter((m: ChatMessage) => !m.isRead && m.senderId === worker.id).length,
          currentTask: existingChat?.currentTask || undefined,
          lastPhotoTime: messages.find((m: ChatMessage) => m.messageType === 'photo')?.timestamp || undefined,
          isActive: true,
          createdAt: new Date(),
          lastMessage: lastMessage ? {
            id: lastMessage.id,
            chatId: `chat-${worker.id}`,
            senderId: lastMessage.senderId,
            senderName: lastMessage.senderName,
            senderRole: lastMessage.senderRole,
            messageType: lastMessage.messageType,
            content: lastMessage.content,
            timestamp: new Date(lastMessage.timestamp),
            isRead: lastMessage.isRead,
            photoUri: lastMessage.photoUri,
            latitude: lastMessage.latitude,
            longitude: lastMessage.longitude,
            isPinned: lastMessage.isPinned
          } : undefined
        };
      });
      
      return { success: true, data: foremanChats };
    } catch (error) {
      return { success: false, error: 'Failed to get chats' };
    }
  }

  async getChatMessages(chatId: string): Promise<{ success: boolean; data?: ChatMessage[]; error?: string }> {
    try {
      // Extract worker ID from chat ID
      const workerId = chatId.replace('chat-', '');
      const messages = JSON.parse(localStorage.getItem(`worktime_messages_${workerId}`) || '[]');
      
      // Mark messages as read
      const updatedMessages = messages.map((m: ChatMessage) => ({ ...m, isRead: true }));
      localStorage.setItem(`worktime_messages_${workerId}`, JSON.stringify(updatedMessages));
      
      return { success: true, data: messages };
    } catch (error) {
      return { success: false, error: 'Failed to get messages' };
    }
  }

  async sendMessage(messageData: {
    chatId: string;
    messageType: 'text' | 'photo' | 'task';
    content: string;
    photoUri?: string;
    latitude?: number;
    longitude?: number;
  }): Promise<{ success: boolean; data?: ChatMessage; error?: string }> {
    try {
      const workerId = messageData.chatId.replace('chat-', '');
      const messages = JSON.parse(localStorage.getItem(`worktime_messages_${workerId}`) || '[]');
      
      const newMessage = {
        id: `msg-${Date.now()}`,
        chatId: messageData.chatId,
        senderId: 'admin-1',
        senderName: 'Admin User',
        senderRole: 'admin' as const,
        messageType: messageData.messageType,
        content: messageData.content,
        photoUri: messageData.photoUri,
        latitude: messageData.latitude,
        longitude: messageData.longitude,
        timestamp: new Date(),
        isRead: false,
        isPinned: messageData.messageType === 'task'
      };
      
      messages.push(newMessage);
      localStorage.setItem(`worktime_messages_${workerId}`, JSON.stringify(messages));
      
      return { success: true, data: newMessage };
    } catch (error) {
      return { success: false, error: 'Failed to send message' };
    }
  }

  async assignTask(taskData: {
    chatId: string;
    taskDescription: string;
  }): Promise<{ success: boolean; data?: string; error?: string }> {
    try {
      // Extract worker ID from chat ID
      const workerId = taskData.chatId.replace('chat-', '');
      
      // Update chat with current task
      const chats: Chat[] = JSON.parse(localStorage.getItem('worktime_chats') || '[]');
      const chatIndex = chats.findIndex((c: Chat) => c.workerId === workerId);
      
      if (chatIndex !== -1 && chats[chatIndex]) {
        chats[chatIndex].currentTask = taskData.taskDescription;
      } else {
        // Create new chat entry
        chats.push({
          id: taskData.chatId,
          workerId: workerId,
          workerName: 'Worker',
          foremanId: 'admin-1',
          foremanName: 'Admin User',
          unreadCount: 0,
          currentTask: taskData.taskDescription,
          isActive: true,
          createdAt: new Date()
        });
      }
      
      localStorage.setItem('worktime_chats', JSON.stringify(chats));
      
      // Create task message
      const messageData = {
        chatId: taskData.chatId,
        messageType: 'task' as const,
        content: `Task assigned: ${taskData.taskDescription}`,
      };
      
      const result = await this.sendMessage(messageData);
      return { success: result.success, data: taskData.taskDescription, error: result.error };
    } catch (error) {
      return { success: false, error: 'Failed to assign task' };
    }
  }

  async getTodaysTask(chatId: string): Promise<{ success: boolean; data?: string; error?: string }> {
    try {
      // Extract worker ID from chat ID
      const workerId = chatId.replace('chat-', '');
      const chats: Chat[] = JSON.parse(localStorage.getItem('worktime_chats') || '[]');
      const chat = chats.find((c: Chat) => c.workerId === workerId);
      
      if (chat && chat.currentTask) {
        return { success: true, data: chat.currentTask };
      } else {
        return { success: true, data: 'No task assigned for today' };
      }
    } catch (error) {
      return { success: false, error: 'Failed to get today\'s task' };
    }
  }

  async validatePhoto(reportId: string, notes?: string): Promise<{ success: boolean; error?: string }> {
    try {
      // For demo purposes, just log the validation
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to validate photo' };
    }
  }

  // Project management methods
  async getProjects(): Promise<Project[]> {
    const projectsData = localStorage.getItem('worktime_projects');
    if (!projectsData) {
      localStorage.setItem('worktime_projects', JSON.stringify([]));
      return [];
    }
    
    const projects = JSON.parse(projectsData);
    // Преобразуем строки дат обратно в Date объекты
    return projects.map((project: Project) => ({
      ...project,
      startDate: typeof project.startDate === 'string' ? new Date(project.startDate) : project.startDate,
      endDate: project.endDate && typeof project.endDate === 'string' ? new Date(project.endDate) : project.endDate,
      createdAt: typeof project.createdAt === 'string' ? new Date(project.createdAt) : project.createdAt,
      updatedAt: project.updatedAt && typeof project.updatedAt === 'string' ? new Date(project.updatedAt) : project.updatedAt,
    }));
  }

  async createProject(project: Project): Promise<void> {
    const projects = await this.getProjects();
    projects.push(project);
    localStorage.setItem('worktime_projects', JSON.stringify(projects));
  }

  async updateProject(projectId: string, updates: Partial<Project>): Promise<void> {
    const projects = await this.getProjects();
    const projectIndex = projects.findIndex(project => project.id === projectId);
    if (projectIndex !== -1 && projects[projectIndex]) {
      projects[projectIndex] = { ...projects[projectIndex], ...updates };
      localStorage.setItem('worktime_projects', JSON.stringify(projects));
    }
  }

  async deleteProject(projectId: string): Promise<void> {
    const projects = await this.getProjects();
    const filteredProjects = projects.filter(project => project.id !== projectId);
    localStorage.setItem('worktime_projects', JSON.stringify(filteredProjects));
  }

  async updateProjectStatus(projectId: string, isActive: boolean): Promise<void> {
    const projects = await this.getProjects();
    const projectIndex = projects.findIndex(project => project.id === projectId);
    if (projectIndex !== -1 && projects[projectIndex]) {
      projects[projectIndex].isActive = isActive;
      localStorage.setItem('worktime_projects', JSON.stringify(projects));
    }
  }

  async getProjectById(projectId: string): Promise<Project | null> {
    const projects = await this.getProjects();
    return projects.find(project => project.id === projectId) || null;
  }

  async getProjectSites(projectId: string): Promise<ConstructionSite[]> {
    const sites = await this.getConstructionSites();
    return sites.filter(site => site.projectId === projectId);
  }

  async getActiveProjects(): Promise<Project[]> {
    const projects = await this.getProjects();
    return projects.filter(project => project.isActive && project.status === 'active');
  }
} 
