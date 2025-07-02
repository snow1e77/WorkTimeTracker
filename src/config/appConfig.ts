// Global application configuration for international use
import {
  APP_NAME,
  VERSION,
  ENVIRONMENT
} from '@env';

export const APP_CONFIG = {
  // Basic settings
  APP_NAME: APP_NAME || 'WorkTime Tracker',
  VERSION: VERSION || '1.0.0',
  ENVIRONMENT: ENVIRONMENT || 'production',
  
  // Localization - default international
  DEFAULT_LOCALE: 'en-US',
  DEFAULT_TIMEZONE: 'UTC',
  DEFAULT_CURRENCY: 'USD',
  
  // International phone numbers
  PHONE_CONFIG: {
    // Support for international formats
    INTERNATIONAL_SUPPORT: true,
    DEFAULT_COUNTRY_CODE: null, // Auto-detection
    REQUIRE_COUNTRY_CODE: true, // Required country code
    FORMAT_EXAMPLE: '+1 555 123 4567',
    MIN_LENGTH: 7, // Minimum length of the number (without country code)
    MAX_LENGTH: 15, // Maximum length according to ITU-T E.164
    
    // Popular countries for quick access
    POPULAR_COUNTRIES: [
      'US', 'CA', 'GB', 'DE', 'FR', 'ES', 'IT', 'RU', 'CN', 'JP', 
      'KR', 'AU', 'IN', 'BR', 'MX', 'SE', 'NO', 'FI', 'DK', 'NL'
    ],
    
    // Validation settings
    VALIDATION: {
      STRICT_MODE: false, // Strict validation (only existing numbers)
      ALLOW_INCOMPLETE: true, // Allow incomplete numbers when entering
      AUTO_FORMAT: true, // Automatic formatting when entering
    }
  },
  
  // Date formatting (adaptive depending on locale)
  DATE_CONFIG: {
    SHORT_FORMAT: 'YYYY-MM-DD',
    LONG_FORMAT: 'dddd, D MMMM YYYY',
    TIME_FORMAT: 'HH:mm',
    DATETIME_FORMAT: 'YYYY-MM-DD HH:mm',
    USE_24_HOUR: true,
    AUTO_DETECT_LOCALE: true
  },
  
  // Currency (will adapt to location)
  CURRENCY_CONFIG: {
    CODE: 'USD',
    SYMBOL: '$',
    SYMBOL_POSITION: 'before',
    DECIMAL_PLACES: 2,
    THOUSANDS_SEPARATOR: ',',
    DECIMAL_SEPARATOR: '.',
    AUTO_DETECT_BY_LOCATION: true
  },
  
  // Work time (international standards)
  WORK_TIME_CONFIG: {
    STANDARD_WORK_DAY_HOURS: 8,
    STANDARD_WORK_WEEK_HOURS: 40,
    OVERTIME_THRESHOLD: 8, // hours per day
    BREAK_TIME_MINUTES: 30,
    LUNCH_BREAK_MINUTES: 60,
    MAX_DAILY_HOURS: 12,
    
    // Adaptation to local laws
    COUNTRY_SPECIFIC_RULES: {
      'US': { maxDailyHours: 12, overtimeThreshold: 8 },
      'DE': { maxDailyHours: 10, overtimeThreshold: 8 },
      'FR': { maxDailyHours: 10, overtimeThreshold: 7 },
      'SE': { maxDailyHours: 12, overtimeThreshold: 8 },
      'JP': { maxDailyHours: 12, overtimeThreshold: 8 },
      'CN': { maxDailyHours: 12, overtimeThreshold: 8 },
    }
  },
  
  // GPS settings
  GPS_CONFIG: {
    DEFAULT_ACCURACY: 10, // meters
    UPDATE_INTERVAL: 5000, // milliseconds
    GEOFENCE_RADIUS: 100, // meters
    BACKGROUND_TRACKING: true,
    HIGH_ACCURACY: true
  },
  
  // Expo Project ID for push notifications
  EXPO_PROJECT_ID: process.env.EXPO_PROJECT_ID || 'your-project-id',

  // Notifications
  NOTIFICATION_CONFIG: {
    ENABLED: true,
    SOUND_ENABLED: true,
    VIBRATION_ENABLED: true,
    SHIFT_REMINDERS: true,
    BREAK_REMINDERS: true,
    OVERTIME_ALERTS: true,
    MULTILINGUAL_SUPPORT: true,
    CHANNELS: {
      SHIFT_REMINDERS: 'shift_reminders',
      GPS_EVENTS: 'gps_events',
      VIOLATIONS: 'violations',
      GENERAL: 'general'
    }
  },
  
  // API settings
  API_CONFIG: {
    BASE_URL: 'https://api.worktimetracker.global',
    TIMEOUT: 30000,
    RETRY_ATTEMPTS: 3
  },
  
  // Localization and internationalization
  I18N_CONFIG: {
    SUPPORTED_LANGUAGES: [
      'en', // English
      'ru', // Russian
      'de', // German
      'fr', // French
      'es', // Spanish
      'it', // Italian
      'pt', // Portuguese
      'zh', // Chinese
      'ja', // Japanese
      'ko', // Korean
      'sv', // Swedish
      'no', // Norwegian
      'fi', // Finnish
      'da', // Danish
      'nl', // Dutch
      'pl', // Polish
      'cs', // Czech
      'uk', // Ukrainian
    ],
    DEFAULT_LANGUAGE: 'en',
    AUTO_DETECT_LANGUAGE: true,
    FALLBACK_LANGUAGE: 'en'
  },
  
  // Regional settings
  REGIONAL_CONFIG: {
    AUTO_DETECT_REGION: true,
    DEFAULT_REGION: 'GLOBAL',
    REGIONS: {
      'NORTH_AMERICA': ['US', 'CA', 'MX'],
      'EUROPE': ['GB', 'DE', 'FR', 'ES', 'IT', 'SE', 'NO', 'FI', 'DK', 'NL', 'BE', 'CH', 'AT', 'PL', 'CZ'],
      'ASIA_PACIFIC': ['CN', 'JP', 'KR', 'AU', 'IN', 'SG', 'HK', 'TW'],
      'LATIN_AMERICA': ['BR', 'AR', 'CL', 'CO', 'PE'],
      'AFRICA': ['ZA', 'NG', 'EG', 'KE'],
      'MIDDLE_EAST': ['AE', 'SA', 'IL', 'TR']
    }
  }
};

// Utility functions
export const getConfig = (key: string): unknown => {
  const keys = key.split('.');
  let current: unknown = APP_CONFIG;
  
  for (const k of keys) {
    if (current && typeof current === 'object' && k in current) {
      current = (current as Record<string, unknown>)[k];
    } else {
      return undefined;
    }
  }
  
  return current;
};

export const isFeatureEnabled = (feature: string): boolean => {
  const featureConfig = getConfig(feature);
  return Boolean(featureConfig);
};

export const getApiUrl = (endpoint: string = ''): string => {
  const baseUrl = getConfig('API_CONFIG.BASE_URL') as string;
  return `${baseUrl}${endpoint}`;
}; 