// User types
export interface User {
  id: string;
  phoneNumber: string;
  name: string;
  role: 'worker' | 'admin';
  companyId?: string;
  isVerified: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserWithPassword extends User {
  passwordHash?: string;
}

// Authentication types
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface JWTPayload {
  userId: string;
  phoneNumber: string;
  role: 'worker' | 'admin';
  iat?: number;
  exp?: number;
}

// Construction Site types
export interface ConstructionSite {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radius: number;
  isActive: boolean;
  companyId?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Work Shift types
export interface WorkShift {
  id: string;
  userId: string;
  siteId: string;
  startTime: Date;
  endTime?: Date | undefined;
  totalHours?: number | undefined;
  isActive: boolean;
  startLocation?: {
    latitude: number;
    longitude: number;
  } | undefined;
  endLocation?: {
    latitude: number;
    longitude: number;
  } | undefined;
  notes?: string | undefined;
  createdAt: Date;
  updatedAt: Date;
  userName?: string;
  userPhone?: string;
  siteName?: string;
  siteAddress?: string;
}

// User Site Assignment types
export interface UserSiteAssignment {
  id: string;
  userId: string;
  siteId: string;
  assignedBy: string;
  isActive: boolean;
  assignedAt: Date;
  validFrom?: Date | undefined;
  validTo?: Date | undefined;
  notes?: string | undefined;
}

// Work Report types
export interface WorkReport {
  userId?: string;
  userName?: string;
  userPhone?: string;
  siteId?: string;
  siteName?: string;
  date?: Date;
  totalHours: number;
  shiftsCount: number;
  violationsCount: number;
  lastShiftDate?: Date;
}

// Violation types
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

// Violations Summary type for reports
export interface ViolationsSummary {
  total: number;
  resolved: number;
  unresolved: number;
  bySeverity: {
    low: number;
    medium: number;
    high: number;
  };
  byType: { [key: string]: number };
  details?: Violation[];
}

// Sync types
export interface SyncPayload {
  users: User[];
  sites: ConstructionSite[];
  assignments: UserSiteAssignment[];
  shifts: WorkShift[];
  reports: WorkReport[];
  metadata: {
    timestamp: Date;
    version: number;
    deviceId: string;
  };
}

export interface SyncConflict {
  entityType: string;
  entityId: string;
  localVersion: any;
  remoteVersion: any;
  conflictType: 'UPDATE_CONFLICT' | 'DELETE_CONFLICT';
  resolution?: 'LOCAL_WINS' | 'REMOTE_WINS' | 'MERGE';
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Request types for API endpoints
export interface LoginRequest {
  phoneNumber: string;
}

export interface RegisterRequest {
  phoneNumber: string;
  name: string;
}

export interface CreateSiteRequest {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radius: number;
  companyId?: string;
}

export interface UpdateSiteRequest extends Partial<CreateSiteRequest> {
  isActive?: boolean;
}

export interface CreateAssignmentRequest {
  userId: string;
  siteId: string;
  validFrom?: Date;
  validTo?: Date;
  notes?: string;
}

export interface StartShiftRequest {
  siteId: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  notes?: string;
}

export interface EndShiftRequest {
  shiftId: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  notes?: string;
}

// Database row types (for mapping from DB)
export interface UserRow {
  id: string;
  phone_number: string;
  name: string;
  role: string;
  company_id: string | null;
  is_verified: boolean;
  is_active: boolean;
    created_at: Date;
  updated_at: Date;
}

export interface SiteRow {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radius: number;
  is_active: boolean;
  company_id: string | null;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface ShiftRow {
  id: string;
  user_id: string;
  site_id: string;
  start_time: Date;
  end_time: Date | null;
  total_hours: number | null;
  is_active: boolean;
  start_location: string | null;
  end_location: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface AssignmentRow {
  id: string;
  user_id: string;
  site_id: string;
  assigned_by: string;
  is_active: boolean;
  assigned_at: Date;
  valid_from: Date | null;
  valid_to: Date | null;
  notes: string | null;
}

// Chat system types
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

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderRole: 'worker' | 'admin';
  messageType: 'text' | 'photo' | 'task';
  content: string;
  photoUri?: string;
  latitude?: number;
  longitude?: number;
  timestamp: Date;
  isRead: boolean;
  isPinned?: boolean;
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

export interface PhotoReport {
  id: string;
  chatId: string;
  messageId: string;
  userId: string;
  photoUri: string;
  latitude: number;
  longitude: number;
  timestamp: Date;
  isValidated: boolean;
  validatedBy?: string;
  validatedAt?: Date;
  notes?: string;
}

// Request types for chat API
export interface SendMessageRequest {
  chatId: string;
  messageType: 'text' | 'photo' | 'task';
  content: string;
  photoUri?: string;
  latitude?: number;
  longitude?: number;
}

export interface AssignTaskRequest {
  chatId: string;
  taskDescription: string;
}

export interface ValidatePhotoRequest {
  reportId: string;
  notes?: string;
} 