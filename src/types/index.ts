// Main types for work time tracking application

// Authentication types
export interface AuthUser {
  id: string;
  phoneNumber: string;
  name: string;
  role: 'worker' | 'admin';
  companyId?: string;
  isVerified: boolean;
  isActive: boolean;
  createdAt: Date;
}

export interface RegisterRequest {
  phoneNumber: string;
  password: string;
  name: string;
  verificationCode?: string;
}

export interface LoginRequest {
  phoneNumber: string;
  password: string;
}

export interface ResetPasswordRequest {
  phoneNumber: string;
  newPassword: string;
  verificationCode: string;
}

export interface SMSVerification {
  id: string;
  phoneNumber: string;
  code: string;
  type: 'registration' | 'password_reset';
  isUsed: boolean;
  expiresAt: Date;
  createdAt: Date;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  isLoading: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'worker' | 'admin';
  companyId: string;
  isActive: boolean;
  createdAt: Date;
}

export interface Company {
  id: string;
  name: string;
  createdAt: Date;
}

export interface ConstructionSite {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radius: number; // radius in meters
  companyId: string;
  isActive: boolean;
  createdAt: Date;
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
  siteId?: string;
  type: 'unauthorized_departure' | 'late_arrival' | 'early_departure' | 'no_show';
  description: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high';
  isResolved: boolean;
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

// Navigation types
export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  VerifyPhone: { phoneNumber: string; type: 'registration' | 'password_reset' };
  ResetPassword: undefined;
  Home: undefined;
  Profile: undefined;
  TimeTracking: undefined;
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
};