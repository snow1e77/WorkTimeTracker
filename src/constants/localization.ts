// Constants for international localization and phone number support

export const INTERNATIONAL_LOCALIZATION = {
  // Main
  APP_NAME: 'Work Time Tracker',
  COUNTRY_CODE: null, // Auto-detection
  CURRENCY: 'USD',
  LANGUAGE: 'en-US', // Main language is English
  
  // Phone number format examples by country
  PHONE_FORMATS: {
    'US': '+1 (555) 123-4567',
    'CA': '+1 (416) 123-4567',
    'GB': '+44 20 7946 0958',
    'DE': '+49 30 12345678',
    'FR': '+33 1 23 45 67 89',
    'ES': '+34 912 34 56 78',
    'IT': '+39 06 1234 5678',
    'RU': '+7 495 123-45-67',
    'CN': '+86 138 0013 8000',
    'JP': '+81 90 1234 5678',
    'KR': '+82 2 1234 5678',
    'AU': '+61 2 1234 5678',
    'IN': '+91 98765 43210',
    'BR': '+55 11 99999-9999',
    'MX': '+52 55 1234 5678',
    'SE': '+46 8 123 456 78',
    'NO': '+47 123 45 678',
    'FI': '+358 50 123 4567',
    'DK': '+45 12 34 56 78',
    'NL': '+31 6 12345678',
    'BE': '+32 2 123 45 67',
    'CH': '+41 44 123 45 67',
    'AT': '+43 1 234 5678',
    'PL': '+48 12 345 67 89',
    'CZ': '+420 123 456 789',
    'UA': '+380 44 123 4567',
    'AE': '+971 4 123 4567',
    'SA': '+966 11 123 4567',
    'ZA': '+27 11 123 4567',
    'EG': '+20 2 1234 5678',
    'IL': '+972 2 123 4567',
    'TR': '+90 212 123 45 67',
    'SG': '+65 6123 4567',
    'HK': '+852 1234 5678',
    'TW': '+886 2 1234 5678',
    'TH': '+66 2 123 4567',
    'MY': '+60 3 1234 5678',
    'ID': '+62 21 1234 5678',
    'PH': '+63 2 123 4567',
    'VN': '+84 24 1234 5678',
    'NZ': '+64 9 123 4567',
    'AR': '+54 11 1234 5678',
    'CL': '+56 2 1234 5678',
    'CO': '+57 1 234 5678',
    'PE': '+51 1 234 5678'
  },
  
  // Phone validation messages
  PHONE_VALIDATION: {
    INVALID_NUMBER: 'Invalid phone number',
    INVALID_COUNTRY_CODE: 'Invalid country code',
    NUMBER_TOO_SHORT: 'Number too short',
    NUMBER_TOO_LONG: 'Number too long',
    ENTER_VALID_NUMBER: 'Enter valid number',
    COUNTRY_NOT_SUPPORTED: 'Country not supported',
    FORMAT_HINT: 'Enter number with country code'
  },
  
  // Country selection
  COUNTRY_SELECTION: {
    SELECT_COUNTRY: 'Select country',
    SEARCH_COUNTRIES: 'Search countries...',
    POPULAR_COUNTRIES: 'Popular countries',
    ALL_COUNTRIES: 'All countries',
    COUNTRY_CODE: 'Country code',
    NO_RESULTS: 'No countries found'
  },
  
  // International formats
  INTERNATIONAL_FORMATS: {
    E164: 'E.164',
    INTERNATIONAL: 'International',
    NATIONAL: 'National',
    RFC3966: 'RFC3966'
  },
  
  // Days of the week (English)
  DAYS: {
    MONDAY: 'Monday',
    TUESDAY: 'Tuesday', 
    WEDNESDAY: 'Wednesday',
    THURSDAY: 'Thursday',
    FRIDAY: 'Friday',
    SATURDAY: 'Saturday',
    SUNDAY: 'Sunday'
  },
  
  // Months (English)
  MONTHS: {
    JANUARY: 'January',
    FEBRUARY: 'February',
    MARCH: 'March',
    APRIL: 'April',
    MAY: 'May',
    JUNE: 'June',
    JULY: 'July',
    AUGUST: 'August',
    SEPTEMBER: 'September',
    OCTOBER: 'October',
    NOVEMBER: 'November',
    DECEMBER: 'December'
  },
  
  // Time formats
  TIME_FORMAT: '12h', // 12-hour format (standard for US/UK)
  DATE_FORMAT: 'MM/DD/YYYY', // American format
  DATETIME_FORMAT: 'MM/DD/YYYY hh:mm A',
  
  // Currency (adaptive)
  CURRENCY_SYMBOL: '$',
  CURRENCY_FORMAT: '{symbol}{amount}',
  
  // Common phrases (English)
  COMMON: {
    YES: 'Yes',
    NO: 'No',
    OK: 'OK',
    CANCEL: 'Cancel',
    SAVE: 'Save',
    DELETE: 'Delete',
    EDIT: 'Edit',
    ADD: 'Add',
    SEARCH: 'Search',
    LOADING: 'Loading...',
    ERROR: 'Error',
    SUCCESS: 'Success',
    TODAY: 'Today',
    YESTERDAY: 'Yesterday',
    TOMORROW: 'Tomorrow',
    THIS_WEEK: 'This week',
    THIS_MONTH: 'This month',
    HOURS: 'hours',
    MINUTES: 'minutes',
    SECONDS: 'seconds',
    OPTIONAL: 'optional',
    REQUIRED: 'required'
  },
  
  // Work time (English)
  WORK_TIME: {
    START_WORK: 'Start work',
    END_WORK: 'End work',
    BREAK_START: 'Start break',
    BREAK_END: 'End break',
    TOTAL_HOURS: 'Total hours',
    OVERTIME: 'Overtime',
    REGULAR_HOURS: 'Regular hours',
    WORK_SESSION: 'Work session',
    TIME_TRACKING: 'Time tracking'
  },
  
  // GPS settings (English)
  GPS_SETTINGS: {
    GPS_TRACKING: 'GPS tracking',
    BACKGROUND_TRACKING: 'Background tracking',
    HIGH_ACCURACY: 'High accuracy',
    UPDATE_INTERVAL: 'Update interval',
    LOCATION_PERMISSION: 'Location permission',
    GPS_DISABLED: 'GPS disabled'
  },
  
  // Notifications (English)
  NOTIFICATIONS: {
    NOTIFICATIONS_ENABLED: 'Notifications enabled',
    VIOLATION_ALERTS: 'Violation alerts',
    SHIFT_REMINDERS: 'Shift reminders',
    SOUND_ENABLED: 'Sound enabled',
    VIBRATION_ENABLED: 'Vibration enabled',
    PUSH_NOTIFICATIONS: 'Push notifications'
  },
  
  // Construction sites (English)
  CONSTRUCTION_SITES: {
    SITE_NAME: 'Site name',
    ADDRESS: 'Address',
    COORDINATES: 'Coordinates',
    RADIUS: 'Radius (meters)',
    ACTIVE: 'Active',
    INACTIVE: 'Inactive',
    CREATE_SITE: 'Create site',
    EDIT_SITE: 'Edit site'
  },
  
  // Authentication (English)
  AUTH: {
    LOGIN: 'Login',
    REGISTER: 'Register',
    LOGOUT: 'Logout',
    PHONE_NUMBER: 'Phone number',
    PASSWORD: 'Password',
    CONFIRM_PASSWORD: 'Confirm password',
    FORGOT_PASSWORD: 'Forgot password?',
    RESET_PASSWORD: 'Reset password',
    VERIFY_PHONE: 'Verify phone',
    VERIFICATION_CODE: 'Verification code',
    SEND_CODE: 'Send code',
    RESEND_CODE: 'Resend code',
    FULL_NAME: 'Full name',
    EMAIL: 'Email'
  },
  
  // Form validation (English)
  VALIDATION: {
    FIELD_REQUIRED: 'This field is required',
    INVALID_EMAIL: 'Invalid email format',
    INVALID_PHONE: 'Invalid phone number format',
    PASSWORD_TOO_SHORT: 'Password too short',
    PASSWORDS_DO_NOT_MATCH: 'Passwords do not match',
    NAME_TOO_SHORT: 'Name too short',
    INVALID_CODE: 'Invalid verification code'
  },
  
  // Regional settings
  REGIONAL_SETTINGS: {
    REGION: 'Region',
    COUNTRY: 'Country',
    LANGUAGE: 'Language',
    CURRENCY: 'Currency',
    TIME_ZONE: 'Time zone',
    DATE_FORMAT: 'Date format',
    TIME_FORMAT: 'Time format',
    WORK_WEEK: 'Work week',
    AUTO_DETECT: 'Auto detect'
  }
};

// Function to get localized text
export const t = (key: string, params?: Record<string, string>): string => {
  const keys = key.split('.');
  let value: unknown = INTERNATIONAL_LOCALIZATION;
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in (value as Record<string, unknown>)) {
      value = (value as Record<string, unknown>)[k];
    } else {
      return key; // Return key if translation not found
    }
  }
  
  let result = typeof value === 'string' ? value : key;
  
  // Replace parameters if provided
  if (params) {
    Object.entries(params).forEach(([paramKey, paramValue]) => {
      result = result.replace(new RegExp(`{{${paramKey}}}`, 'g'), paramValue);
    });
  }
  
  return result;
};

// Function to format currency with international support
export const formatCurrency = (amount: number, currencyCode: string = 'USD'): string => {
  const currencySymbols: Record<string, string> = {
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'RUB': '₽',
    'JPY': '¥',
    'CNY': '¥',
    'KRW': '₩',
    'AUD': 'A$',
    'CAD': 'C$',
    'CHF': 'CHF',
    'SEK': 'kr',
    'NOK': 'kr',
    'DKK': 'kr'
  };
  
  const symbol = currencySymbols[currencyCode] || currencyCode;
  return `${symbol}${amount.toLocaleString('en-US')}`;
};

// Function to get locale settings with international support
export const getLocaleSettings = (countryCode?: string) => {
  const defaultSettings = {
    locale: 'en-US',
    currency: 'USD',
    countryCode: null,
    timeFormat: '12h',
    dateFormat: 'MM/DD/YYYY'
  };
  
  // Regional adaptations
  const regionalSettings: Record<string, any> = {
    'US': { locale: 'en-US', currency: 'USD', timeFormat: '12h', dateFormat: 'MM/DD/YYYY' },
    'GB': { locale: 'en-GB', currency: 'GBP', timeFormat: '24h', dateFormat: 'DD/MM/YYYY' },
    'DE': { locale: 'de-DE', currency: 'EUR', timeFormat: '24h', dateFormat: 'DD.MM.YYYY' },
    'FR': { locale: 'fr-FR', currency: 'EUR', timeFormat: '24h', dateFormat: 'DD/MM/YYYY' },
    'RU': { locale: 'ru-RU', currency: 'RUB', timeFormat: '24h', dateFormat: 'DD.MM.YYYY' },
    'CN': { locale: 'zh-CN', currency: 'CNY', timeFormat: '24h', dateFormat: 'YYYY/MM/DD' },
    'JP': { locale: 'ja-JP', currency: 'JPY', timeFormat: '24h', dateFormat: 'YYYY/MM/DD' },
    'SE': { locale: 'sv-SE', currency: 'SEK', timeFormat: '24h', dateFormat: 'YYYY-MM-DD' }
  };
  
  return countryCode && regionalSettings[countryCode] 
    ? { ...defaultSettings, ...regionalSettings[countryCode] }
    : defaultSettings;
};

// Backward compatibility
export const ENGLISH_LOCALIZATION = INTERNATIONAL_LOCALIZATION; 