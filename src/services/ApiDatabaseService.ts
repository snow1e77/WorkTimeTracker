import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthUser, SMSVerification, ConstructionSite, WorkShift, UserSiteAssignment, Violation } from '../types';
import { notificationService } from './NotificationService';
import { API_CONFIG, getApiUrl, getHealthUrl, ApiResponse } from '../config/api';
import { apiClient } from './ApiClient';

// Helper function to get auth token
const getAuthToken = async (): Promise<string | null> => {
  return await AsyncStorage.getItem('authToken');
};

// Helper function to make authenticated API calls
const apiCall = async (endpoint: string, options: RequestInit = {}): Promise<any> => {
  const token = await getAuthToken();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(getApiUrl(endpoint), {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API Error: ${response.status} - ${error}`);
  }

  return await response.json();
};

export class ApiDatabaseService {
  private static instance: ApiDatabaseService;
  private isInitialized: boolean = false;

  private constructor() {}

  static getInstance(): ApiDatabaseService {
    if (!ApiDatabaseService.instance) {
      ApiDatabaseService.instance = new ApiDatabaseService();
    }
    return ApiDatabaseService.instance;
  }

  async initDatabase(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Инициализируем ApiClient
      await apiClient.initialize();
      
      // Проверяем соединение с сервером
      const isConnected = await apiClient.checkConnection();
      if (!isConnected) {
        console.warn('⚠️ Cannot connect to server. Working in offline mode.');
      } else {
        console.log('✅ Connected to API server');
      }

      this.isInitialized = true;
      console.log('✅ API Database service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize API Database service:', error);
      throw error;
    }
  }

  // User management methods
  async createUser(user: AuthUser, passwordHash: string): Promise<void> {
    try {
      const response = await apiClient.post('/users', {
        ...user,
        passwordHash,
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to create user');
      }
      
      console.log(`✅ User created: ${user.phoneNumber}`);
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async getUserByPhone(phoneNumber: string): Promise<AuthUser | null> {
    try {
      const response = await apiClient.get(`/users/by-phone/${encodeURIComponent(phoneNumber)}`);
      return response.success ? response.data : null;
    } catch (error) {
      console.error('Error getting user by phone:', error);
      return null;
    }
  }

  async getUserById(id: string): Promise<AuthUser | null> {
    try {
      const response = await apiClient.get(`/users/${id}`);
      return response.success ? response.data : null;
    } catch (error) {
      console.error('Error getting user by ID:', error);
      return null;
    }
  }

  async getUserPassword(userId: string): Promise<string | null> {
    try {
      const response = await apiClient.get(`/users/${userId}/password`);
      return response.success ? response.data.passwordHash : null;
    } catch (error) {
      console.error('Error getting user password:', error);
      return null;
    }
  }

  async updateUserPassword(userId: string, passwordHash: string): Promise<void> {
    try {
      const response = await apiClient.put(`/users/${userId}/password`, { passwordHash });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to update password');
      }
      
      console.log(`✅ Password updated for user ${userId}`);
    } catch (error) {
      console.error('Error updating user password:', error);
      throw error;
    }
  }

  // SMS Verification methods
  async saveSMSVerification(verification: SMSVerification): Promise<void> {
    // SMS verification is handled on the server side
    console.log('SMS verification saved on server side');
  }

  async getSMSVerification(phoneNumber: string, type: 'registration' | 'login'): Promise<SMSVerification | null> {
    // SMS verification is handled on the server side
    return null;
  }

  async markSMSVerificationAsUsed(verificationId: string): Promise<void> {
    // SMS verification is handled on the server side
    console.log('SMS verification marked as used on server side');
  }

  async cleanupExpiredVerifications(): Promise<void> {
    // Cleanup is handled on the server side
    console.log('Expired verifications cleanup handled on server side');
  }

  // Construction Sites methods
  async getConstructionSites(): Promise<ConstructionSite[]> {
    try {
      const response = await apiClient.get('/sites');
      return response.success ? response.data : [];
    } catch (error) {
      console.error('Error getting construction sites:', error);
      return [];
    }
  }

  async createConstructionSite(site: Omit<ConstructionSite, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    try {
      const response = await apiClient.post('/sites', site);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to create site');
      }
      
      console.log(`✅ Site created: ${site.name}`);
    } catch (error) {
      console.error('Error creating construction site:', error);
      throw error;
    }
  }

  async deleteConstructionSite(siteId: string): Promise<void> {
    try {
      const response = await apiClient.delete(`/sites/${siteId}`);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete site');
      }
      
      console.log(`✅ Site deleted: ${siteId}`);
    } catch (error) {
      console.error('Error deleting construction site:', error);
      throw error;
    }
  }

  async updateSiteStatus(siteId: string, isActive: boolean): Promise<void> {
    try {
      const response = await apiClient.put(`/sites/${siteId}`, { isActive });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to update site status');
      }
      
      console.log(`✅ Site ${siteId} status updated to ${isActive ? 'active' : 'inactive'}`);
    } catch (error) {
      console.error('Error updating site status:', error);
      throw error;
    }
  }

  async updateConstructionSite(site: ConstructionSite): Promise<void> {
    try {
      const response = await apiClient.put(`/sites/${site.id}`, site);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to update site');
      }
      
      console.log(`✅ Site ${site.id} updated successfully`);
    } catch (error) {
      console.error('Error updating construction site:', error);
      throw error;
    }
  }

  // Work Reports methods
  async getWorkReports(period: 'today' | 'week' | 'month'): Promise<any[]> {
    try {
      const response = await apiClient.get(`/reports/work?period=${period}`);
      return response.success ? response.data : [];
    } catch (error) {
      console.error('Error getting work reports:', error);
      return [];
    }
  }

  // Violations methods
  async getViolationsSummary(period: 'today' | 'week' | 'month'): Promise<{
    total: number;
    resolved: number;
    unresolved: number;
    byType: { [key: string]: number };
    bySeverity: { low: number; medium: number; high: number };
  }> {
    try {
      const response = await apiClient.get(`/reports/violations?period=${period}`);
      return response.success ? response.data : {
        total: 0,
        resolved: 0,
        unresolved: 0,
        byType: {},
        bySeverity: { low: 0, medium: 0, high: 0 }
      };
    } catch (error) {
      console.error('Error getting violations summary:', error);
      return {
        total: 0,
        resolved: 0,
        unresolved: 0,
        byType: {},
        bySeverity: { low: 0, medium: 0, high: 0 }
      };
    }
  }

  async getViolations(period: 'today' | 'week' | 'month', severity: 'all' | 'low' | 'medium' | 'high' = 'all'): Promise<any[]> {
    try {
      const response = await apiClient.get(`/reports/violations/list?period=${period}&severity=${severity}`);
      return response.success ? response.data : [];
    } catch (error) {
      console.error('Error getting violations:', error);
      return [];
    }
  }

  async resolveViolation(violationId: string): Promise<void> {
    try {
      const response = await apiClient.put(`/violations/${violationId}/resolve`);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to resolve violation');
      }
      
      console.log(`✅ Violation ${violationId} resolved`);
    } catch (error) {
      console.error('Error resolving violation:', error);
      throw error;
    }
  }

  async deleteViolation(violationId: string): Promise<void> {
    try {
      const response = await apiClient.delete(`/violations/${violationId}`);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete violation');
      }
      
      console.log(`✅ Violation ${violationId} deleted`);
    } catch (error) {
      console.error('Error deleting violation:', error);
      throw error;
    }
  }

  async createViolation(violation: {
    userId: string;
    siteId?: string;
    type: 'unauthorized_departure' | 'late_arrival' | 'early_departure' | 'no_show';
    description: string;
    severity: 'low' | 'medium' | 'high';
  }): Promise<void> {
    try {
      const response = await apiClient.post('/violations', violation);
      
      const violationId = response.data?.id;
      console.log(`✅ Violation created: ${violationId}`);

      // Send notification about new violation
      try {
        await notificationService.sendLocalNotification(
          'Violation Alert',
          `New violation: ${violation.description}`,
          'violation_alert'
        );
      } catch (error) {
        console.error('Error sending violation notification:', error);
      }
    } catch (error) {
      console.error('Error creating violation:', error);
      throw error;
    }
  }

  // User management methods
  async getAllUsers(): Promise<AuthUser[]> {
    try {
      const response = await apiClient.get('/users');
      return response.success ? response.data : [];
    } catch (error) {
      console.error('Error getting all users:', error);
      return [];
    }
  }

  async updateUserRole(userId: string, role: 'worker' | 'admin'): Promise<void> {
    try {
      const response = await apiClient.put(`/users/${userId}`, { role });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to update user role');
      }
      
      console.log(`✅ User ${userId} role updated to ${role}`);
    } catch (error) {
      console.error('Error updating user role:', error);
      throw error;
    }
  }

  async updateUserStatus(userId: string, isActive: boolean): Promise<void> {
    try {
      const response = await apiClient.put(`/users/${userId}`, { isActive });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to update user status');
      }
      
      console.log(`✅ User ${userId} status updated to ${isActive ? 'active' : 'inactive'}`);
    } catch (error) {
      console.error('Error updating user status:', error);
      throw error;
    }
  }

  async deleteUser(userId: string): Promise<void> {
    try {
      const response = await apiClient.delete(`/users/${userId}`);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete user');
      }
      
      console.log(`✅ User ${userId} deleted successfully`);
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  // Location and tracking methods
  async createLocationEvent(event: { 
    userId: string; 
    siteId?: string; 
    latitude: number; 
    longitude: number; 
    timestamp: Date; 
    eventType: 'site_entry' | 'site_exit' | 'tracking_update'; 
    distance?: number;
  }): Promise<void> {
    try {
      const response = await apiClient.post('/locations/events', event);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to create location event');
      }
      
      console.log(`✅ Location event created: ${event.eventType} at ${event.latitude}, ${event.longitude}`);
    } catch (error) {
      console.error('Error creating location event:', error);
      throw error;
    }
  }

  async getRecentLocationEvents(userId?: string, limit: number = 100): Promise<any[]> {
    try {
      const params = new URLSearchParams();
      if (userId) params.append('userId', userId);
      params.append('limit', limit.toString());
      
      const response = await apiClient.get(`/locations/events?${params}`);
      return response.success ? response.data : [];
    } catch (error) {
      console.error('Error getting location events:', error);
      return [];
    }
  }

  async getUsersCurrentLocations(): Promise<any[]> {
    try {
      const response = await apiClient.get('/locations/current');
      return response.success ? response.data : [];
    } catch (error) {
      console.error('Error getting current user locations:', error);
      return [];
    }
  }

  // Work Shifts methods
  async getWorkShifts(userId?: string): Promise<WorkShift[]> {
    try {
      const params = userId ? `?userId=${userId}` : '';
      const response = await apiClient.get(`/shifts${params}`);
      return response.success ? response.data : [];
    } catch (error) {
      console.error('Error getting work shifts:', error);
      return [];
    }
  }

  async startWorkShift(shift: Omit<WorkShift, 'id' | 'createdAt'>): Promise<string> {
    try {
      const response = await apiClient.post('/shifts/start', shift);
      return response.data.id;
    } catch (error) {
      console.error('Error starting work shift:', error);
      throw error;
    }
  }

  async endWorkShift(shiftId: string, endData: { endTime: Date; notes?: string }): Promise<void> {
    try {
      const response = await apiClient.put(`/shifts/${shiftId}/end`, endData);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to end work shift');
      }
      
      console.log(`✅ Work shift ${shiftId} ended successfully`);
    } catch (error) {
      console.error('Error ending work shift:', error);
      throw error;
    }
  }

  // User Site Assignments methods
  async getUserSiteAssignments(userId: string): Promise<UserSiteAssignment[]> {
    try {
      const response = await apiClient.get(`/assignments/user/${userId}`);
      return response.success ? response.data : [];
    } catch (error) {
      console.error('Error getting user site assignments:', error);
      return [];
    }
  }

  async createUserSiteAssignment(assignment: Omit<UserSiteAssignment, 'id' | 'assignedAt'>): Promise<void> {
    try {
      const response = await apiClient.post('/assignments', assignment);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to create user site assignment');
      }
      
      console.log(`✅ User site assignment created: ${assignment.userId} - ${assignment.siteId}`);
    } catch (error) {
      console.error('Error creating user site assignment:', error);
      throw error;
    }
  }

  async updateUserSiteAssignment(assignmentId: string, updates: Partial<UserSiteAssignment>): Promise<void> {
    try {
      const response = await apiClient.put(`/assignments/${assignmentId}`, updates);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to update user site assignment');
      }
      
      console.log(`✅ User site assignment updated: ${assignmentId}`);
    } catch (error) {
      console.error('Error updating user site assignment:', error);
      throw error;
    }
  }

  async deleteUserSiteAssignment(assignmentId: string): Promise<void> {
    try {
      const response = await apiClient.delete(`/assignments/${assignmentId}`);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete user site assignment');
      }
      
      console.log(`✅ User site assignment deleted: ${assignmentId}`);
    } catch (error) {
      console.error('Error deleting user site assignment:', error);
      throw error;
    }
  }

  // Chat system methods
  async getWorkerChat(): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.get('/chat/my-chat');
      return response;
    } catch (error) {
      console.error('Error getting worker chat:', error);
      return { success: false, error: 'Failed to get chat' };
    }
  }

  async getForemanChats(): Promise<ApiResponse<any[]>> {
    try {
      const response = await apiClient.get('/chat/foreman-chats');
      return response;
    } catch (error) {
      console.error('Error getting foreman chats:', error);
      return { success: false, error: 'Failed to get chats' };
    }
  }

  async getChatMessages(chatId: string, limit: number = 50, offset: number = 0): Promise<ApiResponse<any[]>> {
    try {
      const response = await apiClient.get(`/chat/${chatId}/messages?limit=${limit}&offset=${offset}`);
      return response;
    } catch (error) {
      console.error('Error getting chat messages:', error);
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
  }): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post('/chat/send-message', messageData);
      return response;
    } catch (error) {
      console.error('Error sending message:', error);
      return { success: false, error: 'Failed to send message' };
    }
  }

  async assignTask(taskData: {
    chatId: string;
    taskDescription: string;
  }): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post('/chat/assign-task', taskData);
      return response;
    } catch (error) {
      console.error('Error assigning task:', error);
      return { success: false, error: 'Failed to assign task' };
    }
  }

  async getTodaysTask(chatId: string): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.get(`/chat/${chatId}/todays-task`);
      return response;
    } catch (error) {
      console.error('Error getting today\'s task:', error);
      return { success: false, error: 'Failed to get today\'s task' };
    }
  }

  async validatePhoto(reportId: string, notes?: string): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post('/chat/validate-photo', { reportId, notes });
      return response;
    } catch (error) {
      console.error('Error validating photo:', error);
      return { success: false, error: 'Failed to validate photo' };
    }
  }

  // Sync methods
  async getSyncData(lastSyncTimestamp?: Date): Promise<ApiResponse<any>> {
    try {
      const params = lastSyncTimestamp ? `?lastSyncTimestamp=${lastSyncTimestamp.toISOString()}` : '';
      const response = await apiClient.get(`/sync${params}`);
      return response;
    } catch (error) {
      console.error('Error getting sync data:', error);
      return { success: false, error: 'Failed to get sync data' };
    }
  }

  async postSyncData(syncData: any): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post('/sync', syncData);
      return response;
    } catch (error) {
      console.error('Error posting sync data:', error);
      return { success: false, error: 'Failed to post sync data' };
    }
  }

  async getSyncStatus(): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.get('/sync/status');
      return response;
    } catch (error) {
      console.error('Error getting sync status:', error);
      return { success: false, error: 'Failed to get sync status' };
    }
  }

  async performFullSync(deviceId: string): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post('/sync/full', { deviceId });
      return response;
    } catch (error) {
      console.error('Error performing full sync:', error);
      return { success: false, error: 'Failed to perform full sync' };
    }
  }

  async getSyncConflicts(userId: string): Promise<ApiResponse<any[]>> {
    try {
      const response = await apiClient.get(`/sync/conflicts/${userId}`);
      return response;
    } catch (error) {
      console.error('Error getting sync conflicts:', error);
      return { success: false, error: 'Failed to get sync conflicts' };
    }
  }

  async resolveSyncConflict(conflictId: string, resolution: any): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post('/sync/resolve-conflict', { conflictId, resolution });
      return response;
    } catch (error) {
      console.error('Error resolving sync conflict:', error);
      return { success: false, error: 'Failed to resolve sync conflict' };
    }
  }

  async getSyncMetrics(): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.get('/sync/metrics');
      return response;
    } catch (error) {
      console.error('Error getting sync metrics:', error);
      return { success: false, error: 'Failed to get sync metrics' };
    }
  }

  async forceGlobalSync(): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post('/sync/force-all');
      return response;
    } catch (error) {
      console.error('Error forcing global sync:', error);
      return { success: false, error: 'Failed to force global sync' };
    }
  }

  // Notification methods
  async registerPushToken(token: string): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post('/notifications/register-token', { token });
      return response;
    } catch (error) {
      console.error('Error registering push token:', error);
      return { success: false, error: 'Failed to register push token' };
    }
  }

  async sendTestNotification(): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post('/notifications/send-test');
      return response;
    } catch (error) {
      console.error('Error sending test notification:', error);
      return { success: false, error: 'Failed to send test notification' };
    }
  }

  async sendViolationAlert(violationData: any): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post('/notifications/violation-alert', violationData);
      return response;
    } catch (error) {
      console.error('Error sending violation alert:', error);
      return { success: false, error: 'Failed to send violation alert' };
    }
  }

  async sendAssignmentNotification(assignmentData: any): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post('/notifications/assignment-notification', assignmentData);
      return response;
    } catch (error) {
      console.error('Error sending assignment notification:', error);
      return { success: false, error: 'Failed to send assignment notification' };
    }
  }

  async sendShiftReminder(reminderData: any): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post('/notifications/shift-reminder', reminderData);
      return response;
    } catch (error) {
      console.error('Error sending shift reminder:', error);
      return { success: false, error: 'Failed to send shift reminder' };
    }
  }

  async sendBroadcastNotification(notificationData: any): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post('/notifications/broadcast', notificationData);
      return response;
    } catch (error) {
      console.error('Error sending broadcast notification:', error);
      return { success: false, error: 'Failed to send broadcast notification' };
    }
  }

  async sendOvertimeAlert(overtimeData: any): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post('/notifications/overtime-alert', overtimeData);
      return response;
    } catch (error) {
      console.error('Error sending overtime alert:', error);
      return { success: false, error: 'Failed to send overtime alert' };
    }
  }

  async validatePushToken(token: string): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post('/notifications/validate-token', { token });
      return response;
    } catch (error) {
      console.error('Error validating push token:', error);
      return { success: false, error: 'Failed to validate push token' };
    }
  }

  async getDeliveryReceipts(receiptIds: string[]): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post('/notifications/delivery-receipts', { receiptIds });
      return response;
    } catch (error) {
      console.error('Error getting delivery receipts:', error);
      return { success: false, error: 'Failed to get delivery receipts' };
    }
  }

  // Additional site methods
  async getMySites(): Promise<ConstructionSite[]> {
    try {
      const response = await apiClient.get('/sites/my');
      return response.success ? response.data : [];
    } catch (error) {
      console.error('Error getting my sites:', error);
      return [];
    }
  }

  async checkSiteLocation(siteId: string, latitude: number, longitude: number): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post(`/sites/${siteId}/check-location`, { latitude, longitude });
      return response;
    } catch (error) {
      console.error('Error checking site location:', error);
      return { success: false, error: 'Failed to check site location' };
    }
  }

  // Additional assignment methods
  async getMyAssignments(): Promise<UserSiteAssignment[]> {
    try {
      const response = await apiClient.get('/assignments/my');
      return response.success ? response.data : [];
    } catch (error) {
      console.error('Error getting my assignments:', error);
      return [];
    }
  }

  async getAllAssignments(): Promise<UserSiteAssignment[]> {
    try {
      const response = await apiClient.get('/assignments');
      return response.success ? response.data : [];
    } catch (error) {
      console.error('Error getting all assignments:', error);
      return [];
    }
  }

  // Additional shift methods
  async getMyShifts(): Promise<WorkShift[]> {
    try {
      const response = await apiClient.get('/shifts/my');
      return response.success ? response.data : [];
    } catch (error) {
      console.error('Error getting my shifts:', error);
      return [];
    }
  }

  async getShiftById(shiftId: string): Promise<WorkShift | null> {
    try {
      const response = await apiClient.get(`/shifts/${shiftId}`);
      return response.success ? response.data : null;
    } catch (error) {
      console.error('Error getting shift by ID:', error);
      return null;
    }
  }

  async updateShift(shiftId: string, updates: any): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.put(`/shifts/${shiftId}`, updates);
      return response;
    } catch (error) {
      console.error('Error updating shift:', error);
      return { success: false, error: 'Failed to update shift' };
    }
  }

  async deleteShift(shiftId: string): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.delete(`/shifts/${shiftId}`);
      return response;
    } catch (error) {
      console.error('Error deleting shift:', error);
      return { success: false, error: 'Failed to delete shift' };
    }
  }

  // Auth status method
  async getAuthStatus(): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.get('/auth/status');
      return response;
    } catch (error) {
      console.error('Error getting auth status:', error);
      return { success: false, error: 'Failed to get auth status' };
    }
  }

  // Site assignments methods
  async getSiteAssignments(siteId: string): Promise<ApiResponse<UserSiteAssignment[]>> {
    try {
      const response = await apiClient.get(`/assignments/site/${siteId}`);
      return response;
    } catch (error) {
      console.error('Error getting site assignments:', error);
      return { success: false, error: 'Failed to get site assignments' };
    }
  }

  async getAssignmentStats(): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.get('/assignments/stats');
      return response;
    } catch (error) {
      console.error('Error getting assignment stats:', error);
      return { success: false, error: 'Failed to get assignment stats' };
    }
  }

  async bulkAssignUsersToSite(assignmentData: {
    userIds: string[];
    siteId: string;
    validFrom?: Date;
    validTo?: Date;
    notes?: string;
  }): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post('/assignments/bulk', assignmentData);
      return response;
    } catch (error) {
      console.error('Error bulk assigning users to site:', error);
      return { success: false, error: 'Failed to bulk assign users' };
    }
  }
} 