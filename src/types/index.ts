// Main types for work time tracking application

// Authentication types
export interface AuthUser {
  id: string;
  phoneNumber: string;
  name: string;
  role: 'worker' | 'foreman' | 'admin' | 'superadmin';
  companyId?: string;
  companyName?: string;
  foremanId?: string; // ID прораба для работников
  isVerified: boolean;
  isActive: boolean;
  createdAt: Date;
}

export interface RegisterRequest {
  phoneNumber: string;
  name: string;
}

export interface LoginRequest {
  phoneNumber: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  isLoading: boolean;
}

export interface User {
  id: string;
  name: string;
  phoneNumber: string;
  role: 'worker' | 'foreman' | 'admin' | 'superadmin';
  companyId?: string;
  companyName?: string;
  foremanId?: string; // ID прораба для работников
  isVerified: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

export interface Company {
  id: string;
  name: string;
  createdAt: Date;
}

// Проект строительства
export interface Project {
  id: string;
  name: string;
  description?: string;
  companyId: string;
  startDate: Date;
  endDate?: Date;
  status: 'planning' | 'active' | 'paused' | 'completed' | 'cancelled';
  budget?: number;
  currency?: string;
  address?: string;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface ConstructionSite {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radius: number; // radius in meters
  companyId?: string;
  projectId?: string; // связь с проектом
  isActive: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

export interface WorkShift {
  id: string;
  userId: string;
  siteId: string;
  startTime: Date;
  endTime?: Date;
  totalMinutes?: number;
  status: 'active' | 'completed' | 'pending_approval';
  startMethod: 'manual' | 'gps';
  endMethod?: 'manual' | 'gps';
  adminConfirmed: boolean;
  notes?: string;
  createdAt: Date;
}

export interface LocationEvent {
  id: string;
  userId: string;
  siteId?: string;
  latitude: number;
  longitude: number;
  timestamp: Date;
  eventType: 'site_entry' | 'site_exit' | 'tracking_update';
  distance?: number; // distance to construction site center
}

export interface TemporaryAbsence {
  id: string;
  userId: string;
  shiftId: string;
  startTime: Date;
  endTime?: Date;
  reason: string;
  isApproved: boolean;
  createdAt: Date;
}

export interface Violation {
  id: string;
  userId: string;
  siteId: string;
  shiftId?: string;
  type: 'late_start' | 'early_end' | 'location_violation' | 'no_checkout' | 'other';
  description: string;
  severity: 'low' | 'medium' | 'high';
  resolvedAt?: Date;
  resolvedBy?: string;
  createdAt: Date;
}

export interface ViolationsSummary {
  total: number;
  resolved: number;
  unresolved: number;
  byType: { [key: string]: number };
  bySeverity: { low: number; medium: number; high: number };
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'violation' | 'shift_reminder' | 'approval_needed' | 'general';
  isRead: boolean;
  timestamp: Date;
}

export interface AppSettings {
  id: string;
  userId: string;
  gpsTrackingEnabled: boolean;
  notificationsEnabled: boolean;
  privacyModeEnabled: boolean;
  privacyModeStartTime?: string; // HH:MM
  privacyModeEndTime?: string; // HH:MM
  locationUpdateInterval: number; // minutes
}

export interface Location {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: number;
}

export interface TrackingState {
  isTracking: boolean;
  currentShift?: WorkShift;
  currentSite?: ConstructionSite;
  lastLocation?: Location;
  privacyModeActive: boolean;
}

// Admin Panel Types
export interface WorkReport {
  userId: string;
  userName: string;
  siteId: string;
  siteName: string;
  totalHours: number;
  totalMinutes: number;
  shiftsCount: number;
  date: string;
  violations: number;
}

// Назначение рабочих на объекты
export interface UserSiteAssignment {
  id: string;
  userId: string;
  siteId: string;
  assignedBy: string; // ID администратора
  isActive: boolean;
  assignedAt: Date;
  validFrom?: Date;
  validTo?: Date;
  notes?: string;
}

// Метаданные синхронизации
export interface SyncMetadata {
  entityType: 'user' | 'site' | 'assignment' | 'shift' | 'report';
  entityId: string;
  lastModified: Date;
  version: number;
  deviceId: string;
  syncStatus: 'pending' | 'synced' | 'conflict';
  conflictData?: Record<string, unknown>;
}

// Пакет данных для синхронизации
export interface SyncPayload {
  users?: AuthUser[];
  sites?: ConstructionSite[];
  assignments?: UserSiteAssignment[];
  shifts?: WorkShift[];
  metadata: SyncMetadata[];
  timestamp: Date;
  deviceId: string;
}

// Конфликт синхронизации
export interface SyncConflict {
  id: string;
  entityType: string;
  entityId: string;
  localData: Record<string, unknown>;
  remoteData: Record<string, unknown>;
  timestamp: Date;
  resolution?: 'local' | 'remote' | 'manual';
}

export interface SiteFormData {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radius: number;
}

export interface MapCoordinate {
  latitude: number;
  longitude: number;
}

// Фото отчёты
export interface PhotoReport {
  id: string;
  chatId?: string;
  messageId?: string;
  userId: string;
  siteId: string;
  shiftId?: string;
  photoUri: string;
  latitude: number;
  longitude: number;
  timestamp: Date;
  isValidated: boolean;
  validatedBy?: string;
  validatedAt?: Date;
  notes?: string;
}

// Новые типы для расписаний
export interface WorkSchedule {
  id: string;
  siteId: string;
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  lunchStart?: string; // HH:MM format
  lunchEnd?: string; // HH:MM format
  isActive: boolean;
  createdAt: Date;
}

// Расширенный тип для отслеживания рабочих в реальном времени
export interface WorkerLocation {
  userId: string;
  userName: string;
  userAvatar?: string;
  currentSiteId?: string;
  currentSiteName?: string;
  latitude: number;
  longitude: number;
  timestamp: Date;
  isOnSite: boolean;
  shiftStartTime?: Date;
  timeOnSite?: number; // в минутах
  lastPhotoReportTime?: Date;
  status: 'working' | 'lunch' | 'offline' | 'left_site';
}

// Chat system types
export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderRole: 'worker' | 'admin';
  messageType: 'text' | 'photo' | 'task' | 'audio';
  content: string;
  photoUri?: string;
  audioUri?: string;
  latitude?: number;
  longitude?: number;
  timestamp: Date;
  isRead: boolean;
  isPinned?: boolean;
}

export interface Chat {
  id: string;
  workerId: string;
  workerName: string;
  foremanId: string;
  foremanName: string;
  lastMessage?: ChatMessage;
  unreadCount: number;
  currentTask?: string;
  lastPhotoTime?: Date;
  isActive: boolean;
  createdAt: Date;
}

export interface DailyTask {
  id: string;
  chatId: string;
  assignedBy: string;
  assignedTo: string;
  taskDescription: string;
  assignedDate: Date;
  isCompleted: boolean;
  completedAt?: Date;
}

// API Response types for specific endpoints
export interface SyncDataResponse {
  users: AuthUser[];
  sites: ConstructionSite[];
  assignments: UserSiteAssignment[];
  shifts: WorkShift[];
  lastSyncTimestamp: Date;
  version: number;
}

export interface SyncStatusResponse {
  isOnline: boolean;
  lastSync: Date | null;
  pendingCount: number;
  conflictCount: number;
  deviceId: string;
}

export interface SyncMetricsResponse {
  syncCount: number;
  lastSyncDuration: number;
  averageSyncDuration: number;
  errorCount: number;
  totalDataSize: number;
}

export interface ValidationResponse {
  isValid: boolean;
  message: string;
  timestamp: Date;
}

export interface LocationCheckResponse {
  isWithinSite: boolean;
  distance: number;
  siteName: string;
  siteRadius: number;
}

export interface AssignmentStatsResponse {
  totalAssignments: number;
  activeAssignments: number;
  completedToday: number;
  averageHoursPerDay: number;
  mostActiveWorker: string;
}

export interface NotificationDeliveryReceipt {
  id: string;
  status: 'delivered' | 'failed' | 'pending';
  timestamp: Date;
  errorMessage?: string;
}

export interface ViolationAlertData {
  userId: string;
  userName: string;
  siteId: string;
  siteName: string;
  violationType: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  timestamp: Date;
}

export interface AssignmentNotificationData {
  workerId: string;
  workerName: string;
  siteId: string;
  siteName: string;
  startDate: Date;
  endDate?: Date;
  notes?: string;
}

export interface ShiftReminderData {
  workerId: string;
  workerName: string;
  siteId: string;
  siteName: string;
  scheduledStartTime: Date;
  reminderType: 'start' | 'end' | 'break';
}

export interface BroadcastNotificationData {
  title: string;
  message: string;
  targetRole?: 'worker' | 'admin';
  targetSiteId?: string;
  priority: 'low' | 'normal' | 'high';
}

export interface OvertimeAlertData {
  workerId: string;
  workerName: string;
  siteId: string;
  siteName: string;
  regularHours: number;
  overtimeHours: number;
  totalHours: number;
  date: Date;
}

// Navigation types
export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Home: undefined;
  Profile: undefined;
  TimeTracking: undefined;
  Schedule: undefined;
  Documents: undefined;
  Assignments: undefined;
  History: undefined;
  Settings: undefined;
  Admin: undefined;
  SiteManagement: undefined;
  CreateSite: undefined;
  EditSite: { siteId: string };
  WorkReports: undefined;
  UserManagement: undefined;
  ViolationsReport: undefined;
  Reports: undefined;
  Chat: undefined;
  ChatDetails: { chatId: string; workerName: string };
};