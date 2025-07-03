import { Platform } from 'react-native';
import logger from '../utils/logger';

// Функция для определения правильного хоста
const getApiHost = () => {
  if (Platform.OS === 'web') {
    return 'http://localhost:3001/api';
  }
  
  if (__DEV__) {
    // В режиме разработки
    if (Platform.OS === 'android') {
      // Приоритет для физических устройств (через USB)
      // Попробуем сначала IP компьютера, затем эмулятор
      return 'http://192.168.0.4:3001/api';  // Изменено: сначала физическое устройство
    }
    // Для iOS симулятора localhost работает
    return 'http://localhost:3001/api';
  }
  
  // Для production сборки
  return 'http://192.168.0.4:3001/api';
};

// Альтернативные URL для отладки
export const ALTERNATIVE_URLS = {
  LOCALHOST: 'http://localhost:3001/api',
  ANDROID_EMULATOR: 'http://10.0.2.2:3001/api',
  LOCAL_IP: 'http://192.168.0.4:3001/api',
};

// Функция для установки кастомного URL
let customBaseUrl: string | null = null;

export const setCustomBaseUrl = (url: string | null) => {
  customBaseUrl = url;
          logger.info('Custom base URL set', { url }, 'api');
};

export const getCustomBaseUrl = () => customBaseUrl;

// API Configuration
export const API_CONFIG = {
  // Базовый URL для API
  get BASE_URL() {
    return customBaseUrl || getApiHost();
  },
    
  // Таймауты
  TIMEOUT: 15000, // 15 секунд
  
  // Endpoints
  ENDPOINTS: {
    AUTH: {
      LOGIN: '/auth/login',
      REGISTER: '/auth/register',
      REFRESH: '/auth/refresh',
      LOGOUT: '/auth/logout',
      ME: '/auth/me',
      VERIFY_TOKEN: '/auth/verify-token',
      STATUS: '/auth/status',
    },
    USERS: {
      LIST: '/users',
      BY_ID: (id: string) => `/users/${id}`,
      BY_PHONE: (phone: string) => `/users/by-phone/${encodeURIComponent(phone)}`,
      UPDATE_PASSWORD: (id: string) => `/users/${id}/password`,
      STATS: '/users/stats',
    },
    SITES: {
      LIST: '/sites',
      BY_ID: (id: string) => `/sites/${id}`,
      CREATE: '/sites',
      MY_SITES: '/sites/my',
      USER_SITES: (userId: string) => `/sites/user/${userId}`,
      STATS: '/sites/stats',
      CHECK_LOCATION: (siteId: string) => `/sites/${siteId}/check-location`,
    },
    SHIFTS: {
      LIST: '/shifts',
      BY_ID: (id: string) => `/shifts/${id}`,
      START: '/shifts/start',
      END: (id: string) => `/shifts/end/${id}`,
      MY_SHIFTS: '/shifts/my',
      USER_SHIFTS: (userId: string) => `/shifts/user/${userId}`,
      ACTIVE: '/shifts/active',
      STATS: '/shifts/stats',
    },
    ASSIGNMENTS: {
      LIST: '/assignments',
      BY_ID: (id: string) => `/assignments/${id}`,
      CREATE: '/assignments',
      MY_ASSIGNMENTS: '/assignments/my',
      USER_ASSIGNMENTS: (userId: string) => `/assignments/user/${userId}`,
      SITE_ASSIGNMENTS: (siteId: string) => `/assignments/site/${siteId}`,
      STATS: '/assignments/stats',
    },
    REPORTS: {
      WORK: '/reports/work',
      VIOLATIONS: '/reports/violations',
      VIOLATIONS_LIST: '/reports/violations/list',
      STATISTICS: '/reports/statistics',
      EXPORT: (type: string) => `/reports/export/${type}`,
    },
    VIOLATIONS: {
      LIST: '/violations',
      BY_ID: (id: string) => `/violations/${id}`,
      CREATE: '/violations',
      RESOLVE: (id: string) => `/violations/${id}/resolve`,
    },
    LOCATIONS: {
      EVENTS: '/locations/events',
      CURRENT: '/locations/current',
    },
    CHAT: {
      MY_CHAT: '/chat/my-chat',
      FOREMAN_CHATS: '/chat/foreman-chats',
      MESSAGES: (chatId: string) => `/chat/${chatId}/messages`,
      SEND_MESSAGE: '/chat/send-message',
      ASSIGN_TASK: '/chat/assign-task',
      TODAYS_TASK: (chatId: string) => `/chat/${chatId}/todays-task`,
      VALIDATE_PHOTO: '/chat/validate-photo',
    },
    SYNC: {
      GET: '/sync',
      POST: '/sync',
      STATUS: '/sync/status',
      FULL: '/sync/full',
      WEB_CHANGES: '/sync/web-changes',
      DEVICES: (userId: string) => `/sync/devices/${userId}`,
      INIT_TABLES: '/sync/init-tables',
      HISTORY: '/sync/history',
      CONFLICTS: (userId: string) => `/sync/conflicts/${userId}`,
      RESOLVE_CONFLICT: '/sync/resolve-conflict',
      METRICS: '/sync/metrics',
      FORCE_ALL: '/sync/force-all',
      SHIFT: '/sync/shift',
      ASSIGNMENT: '/sync/assignment',
    },
    NOTIFICATIONS: {
      LIST: '/notifications',
      BY_ID: (id: string) => `/notifications/${id}`,
      SEND: '/notifications/send',
      MARK_READ: (id: string) => `/notifications/${id}/read`,
      MARK_ALL_READ: '/notifications/mark-all-read',
      SETTINGS: (userId: string) => `/notifications/settings/${userId}`,
      TEST: '/notifications/test',
      REGISTER_TOKEN: '/notifications/register-token',
      SEND_TEST: '/notifications/send-test',
      VIOLATION_ALERT: '/notifications/violation-alert',
      ASSIGNMENT_NOTIFICATION: '/notifications/assignment-notification',
      SHIFT_REMINDER: '/notifications/shift-reminder',
      BROADCAST: '/notifications/broadcast',
      DELIVERY_RECEIPTS: '/notifications/delivery-receipts',
      VALIDATE_TOKEN: '/notifications/validate-token',
      OVERTIME_ALERT: '/notifications/overtime-alert',
    },
  },
  
  // Заголовки по умолчанию
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  
  // Коды статусов для обработки
  STATUS_CODES: {
    SUCCESS: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503,
  },
};

// Функция для получения полного URL
export const getApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// Функция для получения URL health check'а
export const getHealthUrl = (): string => {
  return API_CONFIG.BASE_URL.replace('/api', '/health');
};

// Функция для проверки доступности сервера
export const checkServerHealth = async (): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5 секунд для health check
    
            logger.info('Checking server health', { url: getHealthUrl() }, 'api');
    
    const response = await fetch(getHealthUrl(), {
      method: 'GET',
      headers: API_CONFIG.DEFAULT_HEADERS,
      signal: controller.signal
    });
    
    clearTimeout(timeout);
            logger.info('Health check response received', { status: response.status, ok: response.ok }, 'api');
    return response.ok;
  } catch (error) {
            logger.error('Health check failed', { error: error instanceof Error ? error.message : 'Unknown error' }, 'api');
    return false;
  }
};

// Функция для отладки подключения
export const debugConnection = async (): Promise<{
  baseUrl: string;
  healthUrl: string;
  platform: string;
  isDev: boolean;
  healthCheck: boolean;
  error?: string;
}> => {
  const baseUrl = API_CONFIG.BASE_URL;
  const healthUrl = getHealthUrl();
  const platform = Platform.OS;
  const isDev = __DEV__;
  
  let healthCheck = false;
  let error: string | undefined;
  
  try {
    healthCheck = await checkServerHealth();
  } catch (err) {
    error = err instanceof Error ? err.message : 'Unknown error';
  }
  
  const debugInfo = {
    baseUrl,
    healthUrl,
    platform,
    isDev,
    healthCheck,
    error
  };
  
      logger.debug('Connection debug info', debugInfo, 'api');
  return debugInfo;
};

// Типы для API ответов
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

// Интерфейс для токенов
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
} 
