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
        } else {
        }

      this.isInitialized = true;
      } catch (error) {
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
      
      } catch (error) {
      throw error;
    }
  }

  async getUserByPhone(phoneNumber: string): Promise<AuthUser | null> {
    try {
      const response = await apiClient.get(`/users/by-phone/${encodeURIComponent(phoneNumber)}`);
      return response.success ? response.data : null;
    } catch (error) {
      return null;
    }
  }

  async getUserById(id: string): Promise<AuthUser | null> {
    try {
      const response = await apiClient.get(`/users/${id}`);
      return response.success ? response.data : null;
    } catch (error) {
      return null;
    }
  }

  async getUserPassword(userId: string): Promise<string | null> {
    try {
      const response = await apiClient.get(`/users/${userId}/password`);
      return response.success ? response.data.passwordHash : null;
    } catch (error) {
      return null;
    }
  }

  async updateUserPassword(userId: string, passwordHash: string): Promise<void> {
    try {
      const response = await apiClient.put(`/users/${userId}/password`, { passwordHash });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to update password');
      }
      
      } catch (error) {
      throw error;
    }
  }

  // SMS Verification methods
  async saveSMSVerification(verification: SMSVerification): Promise<void> {
    // SMS verification is handled on the server side
    }

  async getSMSVerification(phoneNumber: string, type: 'registration' | 'login'): Promise<SMSVerification | null> {
    // SMS verification is handled on the server side
    return null;
  }

  async markSMSVerificationAsUsed(verificationId: string): Promise<void> {
    // SMS verification is handled on the server side
    }

  async cleanupExpiredVerifications(): Promise<void> {
    // Cleanup is handled on the server side
    }

  // Construction Sites methods
  async getConstructionSites(): Promise<ConstructionSite[]> {
    try {
      const response = await apiClient.get('/sites');
      return response.success ? response.data : [];
    } catch (error) {
      return [];
    }
  }

  async createConstructionSite(site: Omit<ConstructionSite, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    try {
      const response = await apiClient.post('/sites', site);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to create site');
      }
      
      } catch (error) {
      throw error;
    }
  }

  async deleteConstructionSite(siteId: string): Promise<void> {
    try {
      const response = await apiClient.delete(`/sites/${siteId}`);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete site');
      }
      
      } catch (error) {
      throw error;
    }
  }

  async updateSiteStatus(siteId: string, isActive: boolean): Promise<void> {
    try {
      const response = await apiClient.put(`/sites/${siteId}`, { isActive });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to update site status');
      }
      
      } catch (error) {
      throw error;
    }
  }

  async updateConstructionSite(site: ConstructionSite): Promise<void> {
    try {
      const response = await apiClient.put(`/sites/${site.id}`, site);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to update site');
      }
      
      } catch (error) {
      throw error;
    }
  }

  // Work Reports methods
  async getWorkReports(period: 'today' | 'week' | 'month'): Promise<any[]> {
    try {
      const response = await apiClient.get(`/reports/work?period=${period}`);
      return response.success ? response.data : [];
    } catch (error) {
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
      return [];
    }
  }

  async resolveViolation(violationId: string): Promise<void> {
    try {
      const response = await apiClient.put(`/violations/${violationId}/resolve`);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to resolve violation');
      }
      
      } catch (error) {
      throw error;
    }
  }

  async deleteViolation(violationId: string): Promise<void> {
    try {
      const response = await apiClient.delete(`/violations/${violationId}`);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete violation');
      }
      
      } catch (error) {
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
      // Send notification about new violation
      try {
        await notificationService.sendLocalNotification(
          'Violation Alert',
          `New violation: ${violation.description}`,
          'violation_alert'
        );
      } catch (error) {
        }
    } catch (error) {
      throw error;
    }
  }

  // User management methods
  async getAllUsers(): Promise<AuthUser[]> {
    try {
      const response = await apiClient.get('/users');
      return response.success ? response.data : [];
    } catch (error) {
      return [];
    }
  }

  async updateUserRole(userId: string, role: 'worker' | 'admin'): Promise<void> {
    try {
      const response = await apiClient.put(`/users/${userId}`, { role });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to update user role');
      }
      
      } catch (error) {
      throw error;
    }
  }

  async updateUserStatus(userId: string, isActive: boolean): Promise<void> {
    try {
      const response = await apiClient.put(`/users/${userId}`, { isActive });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to update user status');
      }
      
      } catch (error) {
      throw error;
    }
  }

  async deleteUser(userId: string): Promise<void> {
    try {
      const response = await apiClient.delete(`/users/${userId}`);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete user');
      }
      
      } catch (error) {
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
      
      } catch (error) {
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
      return [];
    }
  }

  async getUsersCurrentLocations(): Promise<any[]> {
    try {
      const response = await apiClient.get('/locations/current');
      return response.success ? response.data : [];
    } catch (error) {
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
      return [];
    }
  }

  async startWorkShift(shift: Omit<WorkShift, 'id' | 'createdAt'>): Promise<string> {
    try {
      const response = await apiClient.post('/shifts/start', shift);
      return response.data.id;
    } catch (error) {
      throw error;
    }
  }

  async endWorkShift(shiftId: string, endData: { endTime: Date; notes?: string }): Promise<void> {
    try {
      const response = await apiClient.put(`/shifts/${shiftId}/end`, endData);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to end work shift');
      }
      
      } catch (error) {
      throw error;
    }
  }

  // User Site Assignments methods
  async getUserSiteAssignments(userId: string): Promise<UserSiteAssignment[]> {
    try {
      const response = await apiClient.get(`/assignments/user/${userId}`);
      return response.success ? response.data : [];
    } catch (error) {
      return [];
    }
  }

  async createUserSiteAssignment(assignment: Omit<UserSiteAssignment, 'id' | 'assignedAt'>): Promise<void> {
    try {
      const response = await apiClient.post('/assignments', assignment);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to create user site assignment');
      }
      
      } catch (error) {
      throw error;
    }
  }

  async updateUserSiteAssignment(assignmentId: string, updates: Partial<UserSiteAssignment>): Promise<void> {
    try {
      const response = await apiClient.put(`/assignments/${assignmentId}`, updates);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to update user site assignment');
      }
      
      } catch (error) {
      throw error;
    }
  }

  async deleteUserSiteAssignment(assignmentId: string): Promise<void> {
    try {
      const response = await apiClient.delete(`/assignments/${assignmentId}`);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete user site assignment');
      }
      
      } catch (error) {
      throw error;
    }
  }

  // Chat system methods
  async getWorkerChat(): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.get('/chat/my-chat');
      return response;
    } catch (error) {
      return { success: false, error: 'Failed to get chat' };
    }
  }

  async getForemanChats(): Promise<ApiResponse<any[]>> {
    try {
      const response = await apiClient.get('/chat/foreman-chats');
      return response;
    } catch (error) {
      return { success: false, error: 'Failed to get chats' };
    }
  }

  async getChatMessages(chatId: string, limit: number = 50, offset: number = 0): Promise<ApiResponse<any[]>> {
    try {
      const response = await apiClient.get(`/chat/${chatId}/messages?limit=${limit}&offset=${offset}`);
      return response;
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
  }): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post('/chat/send-message', messageData);
      return response;
    } catch (error) {
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
      return { success: false, error: 'Failed to assign task' };
    }
  }

  async getTodaysTask(chatId: string): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.get(`/chat/${chatId}/todays-task`);
      return response;
    } catch (error) {
      return { success: false, error: 'Failed to get today\'s task' };
    }
  }

  async validatePhoto(reportId: string, notes?: string): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post('/chat/validate-photo', { reportId, notes });
      return response;
    } catch (error) {
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
      return { success: false, error: 'Failed to get sync data' };
    }
  }

  async postSyncData(syncData: any): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post('/sync', syncData);
      return response;
    } catch (error) {
      return { success: false, error: 'Failed to post sync data' };
    }
  }

  async getSyncStatus(): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.get('/sync/status');
      return response;
    } catch (error) {
      return { success: false, error: 'Failed to get sync status' };
    }
  }

  async performFullSync(deviceId: string): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post('/sync/full', { deviceId });
      return response;
    } catch (error) {
      return { success: false, error: 'Failed to perform full sync' };
    }
  }

  async getSyncConflicts(userId: string): Promise<ApiResponse<any[]>> {
    try {
      const response = await apiClient.get(`/sync/conflicts/${userId}`);
      return response;
    } catch (error) {
      return { success: false, error: 'Failed to get sync conflicts' };
    }
  }

  async resolveSyncConflict(conflictId: string, resolution: any): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post('/sync/resolve-conflict', { conflictId, resolution });
      return response;
    } catch (error) {
      return { success: false, error: 'Failed to resolve sync conflict' };
    }
  }

  async getSyncMetrics(): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.get('/sync/metrics');
      return response;
    } catch (error) {
      return { success: false, error: 'Failed to get sync metrics' };
    }
  }

  async forceGlobalSync(): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post('/sync/force-all');
      return response;
    } catch (error) {
      return { success: false, error: 'Failed to force global sync' };
    }
  }

  // Notification methods
  async registerPushToken(token: string): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post('/notifications/register-token', { token });
      return response;
    } catch (error) {
      return { success: false, error: 'Failed to register push token' };
    }
  }

  async sendTestNotification(): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post('/notifications/send-test');
      return response;
    } catch (error) {
      return { success: false, error: 'Failed to send test notification' };
    }
  }

  async sendViolationAlert(violationData: any): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post('/notifications/violation-alert', violationData);
      return response;
    } catch (error) {
      return { success: false, error: 'Failed to send violation alert' };
    }
  }

  async sendAssignmentNotification(assignmentData: any): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post('/notifications/assignment-notification', assignmentData);
      return response;
    } catch (error) {
      return { success: false, error: 'Failed to send assignment notification' };
    }
  }

  async sendShiftReminder(reminderData: any): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post('/notifications/shift-reminder', reminderData);
      return response;
    } catch (error) {
      return { success: false, error: 'Failed to send shift reminder' };
    }
  }

  async sendBroadcastNotification(notificationData: any): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post('/notifications/broadcast', notificationData);
      return response;
    } catch (error) {
      return { success: false, error: 'Failed to send broadcast notification' };
    }
  }

  async sendOvertimeAlert(overtimeData: any): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post('/notifications/overtime-alert', overtimeData);
      return response;
    } catch (error) {
      return { success: false, error: 'Failed to send overtime alert' };
    }
  }

  async validatePushToken(token: string): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post('/notifications/validate-token', { token });
      return response;
    } catch (error) {
      return { success: false, error: 'Failed to validate push token' };
    }
  }

  async getDeliveryReceipts(receiptIds: string[]): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post('/notifications/delivery-receipts', { receiptIds });
      return response;
    } catch (error) {
      return { success: false, error: 'Failed to get delivery receipts' };
    }
  }

  // Additional site methods
  async getMySites(): Promise<ConstructionSite[]> {
    try {
      const response = await apiClient.get('/sites/my');
      return response.success ? response.data : [];
    } catch (error) {
      return [];
    }
  }

  async checkSiteLocation(siteId: string, latitude: number, longitude: number): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post(`/sites/${siteId}/check-location`, { latitude, longitude });
      return response;
    } catch (error) {
      return { success: false, error: 'Failed to check site location' };
    }
  }

  // Additional assignment methods
  async getMyAssignments(): Promise<UserSiteAssignment[]> {
    try {
      const response = await apiClient.get('/assignments/my');
      return response.success ? response.data : [];
    } catch (error) {
      return [];
    }
  }

  async getAllAssignments(): Promise<UserSiteAssignment[]> {
    try {
      const response = await apiClient.get('/assignments');
      return response.success ? response.data : [];
    } catch (error) {
      return [];
    }
  }

  // Additional shift methods
  async getMyShifts(): Promise<WorkShift[]> {
    try {
      const response = await apiClient.get('/shifts/my');
      return response.success ? response.data : [];
    } catch (error) {
      return [];
    }
  }

  async getShiftById(shiftId: string): Promise<WorkShift | null> {
    try {
      const response = await apiClient.get(`/shifts/${shiftId}`);
      return response.success ? response.data : null;
    } catch (error) {
      return null;
    }
  }

  async updateShift(shiftId: string, updates: any): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.put(`/shifts/${shiftId}`, updates);
      return response;
    } catch (error) {
      return { success: false, error: 'Failed to update shift' };
    }
  }

  async deleteShift(shiftId: string): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.delete(`/shifts/${shiftId}`);
      return response;
    } catch (error) {
      return { success: false, error: 'Failed to delete shift' };
    }
  }

  // Auth status method
  async getAuthStatus(): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.get('/auth/status');
      return response;
    } catch (error) {
      return { success: false, error: 'Failed to get auth status' };
    }
  }

  // Site assignments methods
  async getSiteAssignments(siteId: string): Promise<ApiResponse<UserSiteAssignment[]>> {
    try {
      const response = await apiClient.get(`/assignments/site/${siteId}`);
      return response;
    } catch (error) {
      return { success: false, error: 'Failed to get site assignments' };
    }
  }

  async getAssignmentStats(): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.get('/assignments/stats');
      return response;
    } catch (error) {
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
      return { success: false, error: 'Failed to bulk assign users' };
    }
  }
} 
