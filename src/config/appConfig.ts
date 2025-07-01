// Глобальная конфигурация приложения для международного использования
import {
  APP_NAME,
  VERSION,
  ENVIRONMENT
} from '@env';

export const APP_CONFIG = {
  // Основные настройки
  APP_NAME: APP_NAME || 'WorkTime Tracker',
  VERSION: VERSION || '1.0.0',
  ENVIRONMENT: ENVIRONMENT || 'production',
  
  // Локализация - по умолчанию международная
  DEFAULT_LOCALE: 'en-US',
  DEFAULT_TIMEZONE: 'UTC',
  DEFAULT_CURRENCY: 'USD',
  
  // Международные телефонные номера
  PHONE_CONFIG: {
    // Поддержка международных форматов
    INTERNATIONAL_SUPPORT: true,
    DEFAULT_COUNTRY_CODE: null, // Автоопределение
    REQUIRE_COUNTRY_CODE: true, // Обязательный код страны
    FORMAT_EXAMPLE: '+1 555 123 4567',
    MIN_LENGTH: 7, // Минимальная длина номера (без кода страны)
    MAX_LENGTH: 15, // Максимальная длина согласно ITU-T E.164
    
    // Популярные страны для быстрого доступа
    POPULAR_COUNTRIES: [
      'US', 'CA', 'GB', 'DE', 'FR', 'ES', 'IT', 'RU', 'CN', 'JP', 
      'KR', 'AU', 'IN', 'BR', 'MX', 'SE', 'NO', 'FI', 'DK', 'NL'
    ],
    
    // Настройки валидации
    VALIDATION: {
      STRICT_MODE: false, // Строгая валидация (только существующие номера)
      ALLOW_INCOMPLETE: true, // Разрешить неполные номера при вводе
      AUTO_FORMAT: true, // Автоматическое форматирование при вводе
    }
  },
  
  // Форматирование дат (адаптивное в зависимости от локали)
  DATE_CONFIG: {
    SHORT_FORMAT: 'YYYY-MM-DD',
    LONG_FORMAT: 'dddd, D MMMM YYYY',
    TIME_FORMAT: 'HH:mm',
    DATETIME_FORMAT: 'YYYY-MM-DD HH:mm',
    USE_24_HOUR: true,
    AUTO_DETECT_LOCALE: true
  },
  
  // Валюта (будет адаптироваться по геолокации)
  CURRENCY_CONFIG: {
    CODE: 'USD',
    SYMBOL: '$',
    SYMBOL_POSITION: 'before',
    DECIMAL_PLACES: 2,
    THOUSANDS_SEPARATOR: ',',
    DECIMAL_SEPARATOR: '.',
    AUTO_DETECT_BY_LOCATION: true
  },
  
  // Рабочее время (международные стандарты)
  WORK_TIME_CONFIG: {
    STANDARD_WORK_DAY_HOURS: 8,
    STANDARD_WORK_WEEK_HOURS: 40,
    OVERTIME_THRESHOLD: 8, // часов в день
    BREAK_TIME_MINUTES: 30,
    LUNCH_BREAK_MINUTES: 60,
    MAX_DAILY_HOURS: 12,
    
    // Адаптация под местные законы
    COUNTRY_SPECIFIC_RULES: {
      'US': { maxDailyHours: 12, overtimeThreshold: 8 },
      'DE': { maxDailyHours: 10, overtimeThreshold: 8 },
      'FR': { maxDailyHours: 10, overtimeThreshold: 7 },
      'SE': { maxDailyHours: 12, overtimeThreshold: 8 },
      'JP': { maxDailyHours: 12, overtimeThreshold: 8 },
      'CN': { maxDailyHours: 12, overtimeThreshold: 8 },
    }
  },
  
  // GPS настройки
  GPS_CONFIG: {
    DEFAULT_ACCURACY: 10, // метров
    UPDATE_INTERVAL: 5000, // миллисекунд
    GEOFENCE_RADIUS: 100, // метров
    BACKGROUND_TRACKING: true,
    HIGH_ACCURACY: true
  },
  
  // Expo Project ID для push уведомлений
  EXPO_PROJECT_ID: process.env.EXPO_PROJECT_ID || 'your-project-id',

  // Уведомления
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
  
  // API настройки
  API_CONFIG: {
    BASE_URL: 'https://api.worktimetracker.global',
    TIMEOUT: 30000,
    RETRY_ATTEMPTS: 3
  },
  
  // Локализация и интернационализация
  I18N_CONFIG: {
    SUPPORTED_LANGUAGES: [
      'en', // English
      'ru', // Русский
      'de', // Deutsch
      'fr', // Français
      'es', // Español
      'it', // Italiano
      'pt', // Português
      'zh', // 中文
      'ja', // 日本語
      'ko', // 한국어
      'sv', // Svenska
      'no', // Norsk
      'fi', // Suomi
      'da', // Dansk
      'nl', // Nederlands
      'pl', // Polski
      'cs', // Čeština
      'uk', // Українська
    ],
    DEFAULT_LANGUAGE: 'en',
    AUTO_DETECT_LANGUAGE: true,
    FALLBACK_LANGUAGE: 'en'
  },
  
  // Региональные настройки
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