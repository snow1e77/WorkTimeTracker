import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AuthUser,
  ConstructionSite,
  WorkShift,
  UserSiteAssignment,
  Violation,
  Chat,
  ChatMessage,
  DailyTask,
  SyncDataResponse,
  SyncStatusResponse,
  SyncMetricsResponse,
  ValidationResponse,
  LocationCheckResponse,
  AssignmentStatsResponse,
  NotificationDeliveryReceipt,
  ViolationAlertData,
  AssignmentNotificationData,
  ShiftReminderData,
  BroadcastNotificationData,
  OvertimeAlertData,
  WorkReport,
  SyncPayload,
  SyncConflict,
  LocationEvent,
  WorkerLocation,
} from '../types';
import { notificationService } from './NotificationService';
import {
  API_CONFIG,
  getApiUrl,
  getHealthUrl,
  ApiResponse,
} from '../config/api';
import { apiClient } from './ApiClient';
import logger from '../utils/logger';

// Helper function to get auth token
const getAuthToken = async (): Promise<string | null> => {
  return await AsyncStorage.getItem('authToken');
};

// Helper function to make authenticated API calls
const apiCall = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse> => {
  const token = await getAuthToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
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
        logger.warn(
          'Failed to connect to server during initialization',
          {},
          'api'
        );
      } else {
        logger.info('Successfully connected to server', {}, 'api');
      }

      this.isInitialized = true;
    } catch (error) {


      logger.error('initDatabase failed', {


        error: error instanceof Error ? error.message : 'Unknown error'


      }, 'api');


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

      logger.error('Failed to create User', {

        error: error instanceof Error ? error.message : 'Unknown error'

      }, 'api');

      throw error;

    }
  }

  async getUserByPhone(phoneNumber: string): Promise<AuthUser | null> {
    try {
      const response = await apiClient.get(
        `/users/by-phone/${encodeURIComponent(phoneNumber)}`
      );
      return response.success ? (response.data as AuthUser) : null;
    } catch (error) {
      return null;
    }
  }

  async getUserById(id: string): Promise<AuthUser | null> {
    try {
      const response = await apiClient.get(`/users/${id}`);
      return response.success ? (response.data as AuthUser) : null;
    } catch (error) {
      return null;
    }
  }

  async getUserPassword(userId: string): Promise<string | null> {
    try {
      const response = await apiClient.get(`/users/${userId}/password`);
      return response.success
        ? (response.data as { passwordHash: string }).passwordHash
        : null;
    } catch (error) {
      return null;
    }
  }

  async updateUserPassword(
    userId: string,
    passwordHash: string
  ): Promise<void> {
    try {
      const response = await apiClient.put(`/users/${userId}/password`, {
        passwordHash,
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to update password');
      }
    } catch (error) {

      logger.error('Failed to get UserByPhone', {

        error: error instanceof Error ? error.message : 'Unknown error'

      }, 'api');

      throw error;

    }
  }

  // Construction Sites methods
  async getConstructionSites(): Promise<ConstructionSite[]> {
    try {
      const response = await apiClient.get('/sites');
      return response.success ? (response.data as ConstructionSite[]) : [];
    } catch (error) {
      logger.error(
        'Error getting construction sites',
        { error: error instanceof Error ? error.message : 'Unknown error' },
        'api'
      );
      return [];
    }
  }

  async createConstructionSite(
    site: Omit<ConstructionSite, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<void> {
    try {
      const response = await apiClient.post(
        '/sites',
        site as unknown as Record<string, unknown>
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to create site');
      }
    } catch (error) {

      logger.error('Failed to get ConstructionSites', {

        error: error instanceof Error ? error.message : 'Unknown error'

      }, 'api');

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

      logger.error('Failed to delete ConstructionSite', {

        error: error instanceof Error ? error.message : 'Unknown error'

      }, 'api');

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

      logger.error('Failed to update SiteStatus', {

        error: error instanceof Error ? error.message : 'Unknown error'

      }, 'api');

      throw error;

    }
  }

  async updateConstructionSite(site: ConstructionSite): Promise<void> {
    try {
      const response = await apiClient.put(
        `/sites/${site.id}`,
        site as unknown as Record<string, unknown>
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to update site');
      }
    } catch (error) {

      logger.error('Failed to update ConstructionSite', {

        error: error instanceof Error ? error.message : 'Unknown error'

      }, 'api');

      throw error;

    }
  }

  // Work Reports methods
  async getWorkReports(
    period: 'today' | 'week' | 'month'
  ): Promise<WorkReport[]> {
    try {
      const response = await apiClient.get(`/reports/work?period=${period}`);
      return response.success ? (response.data as WorkReport[]) : [];
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
      const response = await apiClient.get(
        `/violations/summary?period=${period}`
      );
      return response.success
        ? (response.data as {
            total: number;
            resolved: number;
            unresolved: number;
            byType: { [key: string]: number };
            bySeverity: { low: number; medium: number; high: number };
          })
        : {
            total: 0,
            resolved: 0,
            unresolved: 0,
            byType: {},
            bySeverity: { low: 0, medium: 0, high: 0 },
          };
    } catch (error) {
      return {
        total: 0,
        resolved: 0,
        unresolved: 0,
        byType: {},
        bySeverity: { low: 0, medium: 0, high: 0 },
      };
    }
  }

  async getViolations(
    period: 'today' | 'week' | 'month',
    severity: 'all' | 'low' | 'medium' | 'high' = 'all'
  ): Promise<Violation[]> {
    try {
      const response = await apiClient.get(
        `/violations?period=${period}&severity=${severity}`
      );
      if (!response.success) {
        throw new Error(response.error || 'Failed to get violations');
      }
      return response.data as Violation[];
    } catch (error) {
      logger.error(
        'Error getting violations',
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          period,
          severity,
        },
        'api'
      );
      throw error;
    }
  }

  async resolveViolation(violationId: string): Promise<void> {
    try {
      const response = await apiClient.put(
        `/violations/${violationId}/resolve`
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to resolve violation');
      }
    } catch (error) {

      logger.error('Failed to update ConstructionSite', {

        error: error instanceof Error ? error.message : 'Unknown error'

      }, 'api');

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

      logger.error('Failed to delete Violation', {

        error: error instanceof Error ? error.message : 'Unknown error'

      }, 'api');

      throw error;

    }
  }

  async createViolation(violation: Omit<Violation, 'id'>): Promise<string> {
    try {
      const response = await apiClient.post('/violations', violation);

      if (!response.success) {
        throw new Error(response.error || 'Failed to create violation');
      }

      const violationId = (response.data as { id: string })?.id;
      return violationId || '';
    } catch (error) {

      logger.error('Failed to create Violation', {

        error: error instanceof Error ? error.message : 'Unknown error'

      }, 'api');

      throw error;

    }
  }

  // User management methods
  async getAllUsers(): Promise<AuthUser[]> {
    try {
      const response = await apiClient.get('/users');
      if (!response.success) {
        throw new Error(response.error || 'Failed to get users');
      }
      return response.data as AuthUser[];
    } catch (error) {
      logger.error(
        'Error getting users',
        { error: error instanceof Error ? error.message : 'Unknown error' },
        'api'
      );
      throw error;
    }
  }

  async updateUserRole(
    userId: string,
    role: 'worker' | 'admin'
  ): Promise<void> {
    try {
      const response = await apiClient.put(`/users/${userId}`, { role });

      if (!response.success) {
        throw new Error(response.error || 'Failed to update user role');
      }
    } catch (error) {

      logger.error('Failed to get AllUsers', {

        error: error instanceof Error ? error.message : 'Unknown error'

      }, 'api');

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

      logger.error('Failed to update UserStatus', {

        error: error instanceof Error ? error.message : 'Unknown error'

      }, 'api');

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

      logger.error('Failed to delete User', {

        error: error instanceof Error ? error.message : 'Unknown error'

      }, 'api');

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
      const eventData = {
        id: '', // Will be generated by server
        userId: event.userId,
        siteId: event.siteId,
        latitude: event.latitude,
        longitude: event.longitude,
        timestamp: event.timestamp,
        eventType: event.eventType,
        distance: event.distance,
      };

      const response = await apiClient.post('/locations/events', eventData);

      if (!response.success) {
        throw new Error(response.error || 'Failed to create location event');
      }
    } catch (error) {

      logger.error('Failed to delete User', {

        error: error instanceof Error ? error.message : 'Unknown error'

      }, 'api');

      throw error;

    }
  }

  async getRecentLocationEvents(
    userId?: string,
    limit: number = 100
  ): Promise<LocationEvent[]> {
    try {
      const params = new URLSearchParams();
      if (userId) params.append('userId', userId);
      params.append('limit', limit.toString());

      const response = await apiClient.get(
        `/locations/events?${params.toString()}`
      );
      return response.success ? (response.data as LocationEvent[]) : [];
    } catch (error) {
      return [];
    }
  }

  async getUsersCurrentLocations(): Promise<WorkerLocation[]> {
    try {
      const response = await apiClient.get('/locations/current');
      return response.success ? (response.data as WorkerLocation[]) : [];
    } catch (error) {
      return [];
    }
  }

  // Work Shifts methods
  async getWorkShifts(userId?: string): Promise<WorkShift[]> {
    try {
      const params = userId ? `?userId=${userId}` : '';
      const response = await apiClient.get(`/shifts${params}`);
      return response.success ? (response.data as WorkShift[]) : [];
    } catch (error) {
      return [];
    }
  }

  async startWorkShift(
    shift: Omit<WorkShift, 'id' | 'createdAt'>
  ): Promise<string> {
    try {
      const response = await apiClient.post('/shifts/start', shift);
      return response.success ? (response.data as { id: string }).id : '';
    } catch (error) {

      logger.error('Failed to delete User', {

        error: error instanceof Error ? error.message : 'Unknown error'

      }, 'api');

      throw error;

    }
  }

  async endWorkShift(
    shiftId: string,
    endData: { endTime: Date; notes?: string }
  ): Promise<void> {
    try {
      const response = await apiClient.put(`/shifts/${shiftId}/end`, endData);

      if (!response.success) {
        throw new Error(response.error || 'Failed to end work shift');
      }
    } catch (error) {

      logger.error('Failed to get WorkShifts', {

        error: error instanceof Error ? error.message : 'Unknown error'

      }, 'api');

      throw error;

    }
  }

  // User Site Assignments methods
  async getUserSiteAssignments(userId: string): Promise<UserSiteAssignment[]> {
    try {
      const response = await apiClient.get(`/assignments/user/${userId}`);
      return response.success ? (response.data as UserSiteAssignment[]) : [];
    } catch (error) {
      return [];
    }
  }

  async createUserSiteAssignment(
    assignment: UserSiteAssignment
  ): Promise<ApiResponse<UserSiteAssignment[]>> {
    const response = await apiClient.post(
      '/assignments',
      assignment as unknown as Record<string, unknown>
    );
    return {
      success: response.success,
      data: response.success
        ? (response.data as UserSiteAssignment[])
        : undefined,
      error: response.error,
    };
  }

  async updateUserSiteAssignment(
    assignmentId: string,
    updates: Partial<UserSiteAssignment>
  ): Promise<void> {
    try {
      const response = await apiClient.put(
        `/assignments/${assignmentId}`,
        updates
      );

      if (!response.success) {
        throw new Error(
          response.error || 'Failed to update user site assignment'
        );
      }
    } catch (error) {

      logger.error('Failed to get UserSiteAssignments', {

        error: error instanceof Error ? error.message : 'Unknown error'

      }, 'api');

      throw error;

    }
  }

  async deleteUserSiteAssignment(assignmentId: string): Promise<void> {
    try {
      const response = await apiClient.delete(`/assignments/${assignmentId}`);

      if (!response.success) {
        throw new Error(
          response.error || 'Failed to delete user site assignment'
        );
      }
    } catch (error) {

      logger.error('Failed to delete UserSiteAssignment', {

        error: error instanceof Error ? error.message : 'Unknown error'

      }, 'api');

      throw error;

    }
  }

  // Chat system methods
  async getWorkerChat(): Promise<ApiResponse<Chat>> {
    return await apiClient.get('/chat/worker');
  }

  async getForemanChats(): Promise<ApiResponse<Chat[]>> {
    return await apiClient.get('/chat/foreman');
  }

  async getChatMessages(
    chatId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<ApiResponse<ChatMessage[]>> {
    return await apiClient.get(
      `/chat/${chatId}/messages?limit=${limit}&offset=${offset}`
    );
  }

  async sendMessage(messageData: {
    chatId: string;
    messageType: 'text' | 'photo' | 'task';
    content: string;
    photoUri?: string;
    latitude?: number;
    longitude?: number;
  }): Promise<ApiResponse<ChatMessage>> {
    return await apiClient.post(
      `/chat/${messageData.chatId}/messages`,
      messageData
    );
  }

  async assignTask(taskData: {
    chatId: string;
    taskDescription: string;
  }): Promise<ApiResponse<DailyTask>> {
    return await apiClient.post(`/chat/${taskData.chatId}/task`, taskData);
  }

  async getTodaysTask(chatId: string): Promise<ApiResponse<DailyTask | null>> {
    return await apiClient.get(`/chat/${chatId}/task`);
  }

  async validatePhoto(
    reportId: string,
    notes?: string
  ): Promise<ApiResponse<ValidationResponse>> {
    return await apiClient.post(`/reports/${reportId}/validate`, { notes });
  }

  // Sync methods
  async getSyncData(
    lastSyncTimestamp?: Date
  ): Promise<ApiResponse<SyncDataResponse>> {
    const params = lastSyncTimestamp
      ? `?since=${lastSyncTimestamp.toISOString()}`
      : '';
    return await apiClient.get(`/sync/data${params}`);
  }

  async postSyncData(
    syncData: SyncPayload
  ): Promise<ApiResponse<SyncConflict[]>> {
    return await apiClient.post(
      '/sync/data',
      syncData as unknown as Record<string, unknown>
    );
  }

  async getSyncStatus(): Promise<ApiResponse<SyncStatusResponse>> {
    return await apiClient.get('/sync/status');
  }

  async performFullSync(
    deviceId: string
  ): Promise<ApiResponse<SyncDataResponse>> {
    return await apiClient.post('/sync/full', { deviceId });
  }

  async getSyncConflicts(userId: string): Promise<ApiResponse<SyncConflict[]>> {
    return await apiClient.get(`/sync/conflicts?userId=${userId}`);
  }

  async resolveSyncConflict(
    conflictId: string,
    resolution: SyncConflict
  ): Promise<ApiResponse<boolean>> {
    return await apiClient.post(
      `/sync/conflicts/${conflictId}/resolve`,
      resolution as unknown as Record<string, unknown>
    );
  }

  async getSyncMetrics(): Promise<ApiResponse<SyncMetricsResponse>> {
    return await apiClient.get('/sync/metrics');
  }

  async forceGlobalSync(): Promise<ApiResponse<boolean>> {
    return await apiClient.post('/sync/force-global');
  }

  // Notification methods
  async registerPushToken(token: string): Promise<ApiResponse<boolean>> {
    return await apiClient.post('/notifications/register-token', { token });
  }

  async sendTestNotification(): Promise<ApiResponse<boolean>> {
    return await apiClient.post('/notifications/test');
  }

  async sendViolationAlert(
    violationData: ViolationAlertData
  ): Promise<ApiResponse<NotificationDeliveryReceipt>> {
    return await apiClient.post(
      '/notifications/violation-alert',
      violationData as unknown as Record<string, unknown>
    );
  }

  async sendAssignmentNotification(
    assignmentData: AssignmentNotificationData
  ): Promise<ApiResponse<NotificationDeliveryReceipt>> {
    return await apiClient.post(
      '/notifications/assignment',
      assignmentData as unknown as Record<string, unknown>
    );
  }

  async sendShiftReminder(
    reminderData: ShiftReminderData
  ): Promise<ApiResponse<NotificationDeliveryReceipt>> {
    return await apiClient.post(
      '/notifications/shift-reminder',
      reminderData as unknown as Record<string, unknown>
    );
  }

  async sendBroadcastNotification(
    notificationData: BroadcastNotificationData
  ): Promise<ApiResponse<NotificationDeliveryReceipt>> {
    return await apiClient.post(
      '/notifications/broadcast',
      notificationData as unknown as Record<string, unknown>
    );
  }

  async sendOvertimeAlert(
    overtimeData: OvertimeAlertData
  ): Promise<ApiResponse<NotificationDeliveryReceipt>> {
    return await apiClient.post(
      '/notifications/overtime-alert',
      overtimeData as unknown as Record<string, unknown>
    );
  }

  async validatePushToken(
    token: string
  ): Promise<ApiResponse<ValidationResponse>> {
    return await apiClient.post('/notifications/validate-token', { token });
  }

  async getDeliveryReceipts(
    receiptIds: string[]
  ): Promise<ApiResponse<NotificationDeliveryReceipt[]>> {
    return await apiClient.post('/notifications/delivery-receipts', {
      receiptIds,
    });
  }

  // Additional site methods
  async getMySites(): Promise<ConstructionSite[]> {
    try {
      const response = await apiClient.get('/sites/my');
      if (response.success && Array.isArray(response.data)) {
        return response.data as ConstructionSite[];
      }
      return [];
    } catch (error) {
      return [];
    }
  }

  async checkSiteLocation(
    siteId: string,
    latitude: number,
    longitude: number
  ): Promise<ApiResponse<LocationCheckResponse>> {
    return await apiClient.post(`/sites/${siteId}/check-location`, {
      latitude,
      longitude,
    });
  }

  // Additional assignment methods
  async getMyAssignments(): Promise<UserSiteAssignment[]> {
    try {
      const response = await apiClient.get('/assignments/my');
      if (response.success && Array.isArray(response.data)) {
        return response.data as UserSiteAssignment[];
      }
      return [];
    } catch (error) {
      return [];
    }
  }

  async getAllAssignments(): Promise<UserSiteAssignment[]> {
    try {
      const response = await apiClient.get('/assignments');
      return response.success ? (response.data as UserSiteAssignment[]) : [];
    } catch (error) {
      return [];
    }
  }

  // Additional shift methods
  async getMyShifts(): Promise<WorkShift[]> {
    try {
      const response = await apiClient.get('/shifts/my');
      if (response.success && Array.isArray(response.data)) {
        return response.data as WorkShift[];
      }
      return [];
    } catch (error) {
      return [];
    }
  }

  async getShiftById(shiftId: string): Promise<WorkShift | null> {
    try {
      const response = await apiClient.get(`/shifts/${shiftId}`);
      return response.success ? (response.data as WorkShift) : null;
    } catch (error) {
      return null;
    }
  }

  async updateShift(
    shiftId: string,
    updates: Partial<WorkShift>
  ): Promise<ApiResponse<WorkShift>> {
    return await apiClient.put(`/shifts/${shiftId}`, updates);
  }

  async deleteShift(shiftId: string): Promise<ApiResponse<boolean>> {
    return await apiClient.delete(`/shifts/${shiftId}`);
  }

  // Auth status method
  async getAuthStatus(): Promise<
    ApiResponse<{ isAuthenticated: boolean; user?: AuthUser }>
  > {
    return await apiClient.get('/auth/status');
  }

  // Site assignments methods
  async getSiteAssignments(
    siteId: string
  ): Promise<ApiResponse<UserSiteAssignment[]>> {
    try {
      const response = await apiClient.get(`/assignments/site/${siteId}`);
      return {
        success: response.success,
        data:
          response.success && Array.isArray(response.data)
            ? (response.data as UserSiteAssignment[])
            : undefined,
        error: response.error,
      };
    } catch (error) {
      return { success: false, error: 'Failed to get site assignments' };
    }
  }

  async getAssignmentStats(): Promise<ApiResponse<AssignmentStatsResponse>> {
    return await apiClient.get('/assignments/stats');
  }

  async bulkAssignUsersToSite(assignmentData: {
    userIds: string[];
    siteId: string;
    validFrom?: Date;
    validTo?: Date;
    notes?: string;
  }): Promise<ApiResponse<UserSiteAssignment[]>> {
    return await apiClient.post('/assignments/bulk', assignmentData);
  }

  async getAssignedSitesToUser(userId: string): Promise<ConstructionSite[]> {
    try {
      const response = await apiClient.get(`/assignments/user/${userId}/sites`);
      if (response.success && Array.isArray(response.data)) {
        return response.data as ConstructionSite[];
      }
      return [];
    } catch (error) {
      return [];
    }
  }

  async getAssignmentsForSite(siteId: string): Promise<UserSiteAssignment[]> {
    try {
      const response = await apiClient.get(`/assignments/site/${siteId}`);
      if (response.success && Array.isArray(response.data)) {
        return response.data as UserSiteAssignment[];
      }
      return [];
    } catch (error) {
      return [];
    }
  }

  async getCurrentUserShifts(): Promise<WorkShift[]> {
    try {
      const response = await apiClient.get('/shifts/current');
      if (response.success && Array.isArray(response.data)) {
        return response.data as WorkShift[];
      }
      return [];
    } catch (error) {
      return [];
    }
  }

  async resolveConflict(
    conflictId: string,
    resolution: SyncConflict
  ): Promise<ApiResponse<unknown>> {
    return await apiClient.post(
      `/sync/conflicts/${conflictId}/resolve`,
      resolution as unknown as Record<string, unknown>
    );
  }
}
