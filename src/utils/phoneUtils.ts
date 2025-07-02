import { parsePhoneNumber, isValidPhoneNumber, formatIncompletePhoneNumber, AsYouType, CountryCode, PhoneNumber } from 'libphonenumber-js';
import * as Location from 'expo-location';

// Маппинг ISO кодов стран к телефонным кодам
const COUNTRY_TO_PHONE_CODE_MAPPING: Record<string, CountryCode> = {
  'US': 'US', // United States
  'CA': 'CA', // Canada
  'GB': 'GB', // United Kingdom
  'DE': 'DE', // Germany
  'FR': 'FR', // France
  'ES': 'ES', // Spain
  'IT': 'IT', // Italy
  'RU': 'RU', // Russia
  'CN': 'CN', // China
  'JP': 'JP', // Japan
  'KR': 'KR', // South Korea
  'AU': 'AU', // Australia
  'IN': 'IN', // India
  'BR': 'BR', // Brazil
  'MX': 'MX', // Mexico
  'SE': 'SE', // Sweden
  'NO': 'NO', // Norway
  'FI': 'FI', // Finland
  'DK': 'DK', // Denmark
  'NL': 'NL', // Netherlands
  'BE': 'BE', // Belgium
  'CH': 'CH', // Switzerland
  'AT': 'AT', // Austria
  'PL': 'PL', // Poland
  'CZ': 'CZ', // Czech Republic
  'UA': 'UA', // Ukraine
  'AR': 'AR', // Argentina
  'CL': 'CL', // Chile
  'CO': 'CO', // Colombia
  'PE': 'PE', // Peru
  'AE': 'AE', // United Arab Emirates
  'SA': 'SA', // Saudi Arabia
  'ZA': 'ZA', // South Africa
  'EG': 'EG', // Egypt
  'IL': 'IL', // Israel
  'TR': 'TR', // Turkey
  'SG': 'SG', // Singapore
  'HK': 'HK', // Hong Kong
  'TW': 'TW', // Taiwan
  'TH': 'TH', // Thailand
  'MY': 'MY', // Malaysia
  'ID': 'ID', // Indonesia
  'PH': 'PH', // Philippines
  'VN': 'VN', // Vietnam
  'NZ': 'NZ', // New Zealand
};

/**
 * Определяет страну пользователя по геолокации
 */
export const detectUserCountryByLocation = async (): Promise<CountryCode | null> => {
  try {
    // Запрашиваем разрешение на геолокацию
    const { status } = await Location.requestForegroundPermissionsAsync();
    
    if (status !== 'granted') {
      return null;
    }

    // Функция с таймаутом для геолокации
    const locationWithTimeout = Promise.race([
      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      }),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Location timeout')), 3000) // 3 секунды таймаут
      )
    ]);

    const location = await locationWithTimeout;
    
    
    // Обратное геокодирование с таймаутом
    const geocodeWithTimeout = Promise.race([
      Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      }),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Geocoding timeout')), 3000) // 3 секунды таймаут
      )
    ]);

    const reverseGeocode = await geocodeWithTimeout;

    if (reverseGeocode && reverseGeocode.length > 0) {
      const address = reverseGeocode[0];
      const isoCountryCode = address?.isoCountryCode;
      
      if (isoCountryCode && COUNTRY_TO_PHONE_CODE_MAPPING[isoCountryCode]) {
        return COUNTRY_TO_PHONE_CODE_MAPPING[isoCountryCode];
      }
    }

    return null;
  } catch (error: any) {
    // Молча обрабатываем ошибки геолокации
    return null;
  }
};

/**
 * Determines user's country by timezone (fallback method)
 */
export const detectUserCountryByTimezone = (): CountryCode | null => {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    // Extended mapping of timezones to countries
    const timezoneToCountry: Record<string, CountryCode> = {
      // USA
      'America/New_York': 'US',
      'America/Los_Angeles': 'US',
      'America/Chicago': 'US',
      'America/Denver': 'US',
      'America/Phoenix': 'US',
      'America/Anchorage': 'US',
      'Pacific/Honolulu': 'US',
      
      // Canada
      'America/Toronto': 'CA',
      'America/Vancouver': 'CA',
      'America/Montreal': 'CA',
      'America/Winnipeg': 'CA',
      'America/Halifax': 'CA',
      
      // United Kingdom and Ireland
      'Europe/London': 'GB',
      'Europe/Dublin': 'GB',
      
      // Western Europe
      'Europe/Berlin': 'DE',
      'Europe/Paris': 'FR',
      'Europe/Madrid': 'ES',
      'Europe/Rome': 'IT',
      'Europe/Amsterdam': 'NL',
      'Europe/Brussels': 'BE',
      'Europe/Zurich': 'CH',
      'Europe/Vienna': 'AT',
      'Europe/Stockholm': 'SE',
      'Europe/Oslo': 'NO',
      'Europe/Helsinki': 'FI',
      'Europe/Copenhagen': 'DK',
      
      // Eastern Europe
      'Europe/Warsaw': 'PL',
      'Europe/Prague': 'CZ',
      'Europe/Kiev': 'UA',
      'Europe/Bucharest': 'RU', // Closer to Russia by timezone
      
      // Russia - all main timezones
      'Europe/Moscow': 'RU',
      'Europe/Kaliningrad': 'RU',
      'Europe/Volgograd': 'RU',
      'Europe/Samara': 'RU',
      'Asia/Yekaterinburg': 'RU',    // ← This is your timezone!
      'Asia/Omsk': 'RU',
      'Asia/Novosibirsk': 'RU',
      'Asia/Krasnoyarsk': 'RU',
      'Asia/Irkutsk': 'RU',
      'Asia/Yakutsk': 'RU',
      'Asia/Vladivostok': 'RU',
      'Asia/Magadan': 'RU',
      'Asia/Kamchatka': 'RU',
      'Asia/Sakhalin': 'RU',
      'Asia/Chukotka': 'RU',
      
      // Asia
      'Asia/Shanghai': 'CN',
      'Asia/Beijing': 'CN',
      'Asia/Hong_Kong': 'HK',
      'Asia/Tokyo': 'JP',
      'Asia/Seoul': 'KR',
      'Asia/Kolkata': 'IN',
      'Asia/Mumbai': 'IN',
      'Asia/Singapore': 'SG',
      'Asia/Bangkok': 'TH',
      'Asia/Kuala_Lumpur': 'MY',
      'Asia/Jakarta': 'ID',
      'Asia/Manila': 'PH',
      'Asia/Ho_Chi_Minh': 'VN',
      'Asia/Taipei': 'TW',
      
      // Middle East
      'Asia/Dubai': 'AE',
      'Asia/Riyadh': 'SA',
      'Asia/Tel_Aviv': 'IL',
      'Europe/Istanbul': 'TR',
      
      // Africa
      'Africa/Cairo': 'EG',
      'Africa/Johannesburg': 'ZA',
      
      // Oceania
      'Australia/Sydney': 'AU',
      'Australia/Melbourne': 'AU',
      'Australia/Perth': 'AU',
      'Pacific/Auckland': 'NZ',
      
      // South America
      'America/Sao_Paulo': 'BR',
      'America/Buenos_Aires': 'AR',
      'America/Santiago': 'CL',
      'America/Lima': 'PE',
      'America/Bogota': 'CO',
      'America/Mexico_City': 'MX',
    };

    if (timezoneToCountry[timezone]) {
      return timezoneToCountry[timezone];
    }

    // Additional logic for Russian timezones
    if (timezone.includes('Asia/') && (timezone.includes('Russia') || timezone.includes('Yekaterinburg') || timezone.includes('Omsk') || timezone.includes('Novosibirsk'))) {
      return 'RU';
    }
    
    return null;
  } catch (error) {
    return null;
  }
};

/**
 * Автоматическое определение страны пользователя (комбинированный метод)
 */
export const autoDetectUserCountry = async (): Promise<CountryCode> => {
  try {
    // Сначала пробуем определить по геолокации
    const locationCountry = await detectUserCountryByLocation();
    if (locationCountry) {
      return locationCountry;
    }

    // Fallback: определяем по часовому поясу
    const timezoneCountry = detectUserCountryByTimezone();
    if (timezoneCountry) {
      return timezoneCountry;
    }

    // Если ничего не получилось, возвращаем США по умолчанию
    return 'US';
  } catch (error) {
    return 'US';
  }
};

/**
 * Определяет код страны по номеру телефона или возвращает null
 */
export const detectCountryFromPhoneNumber = (phoneNumber: string): CountryCode | null => {
  try {
    const parsedNumber = parsePhoneNumber(phoneNumber);
    return parsedNumber?.country || null;
  } catch {
    return null;
  }
};

/**
 * Форматирует международный номер телефона
 */
export const formatInternationalPhoneNumber = (phoneNumber: string, countryCode?: CountryCode): string => {
  try {
    // Если код страны не указан, пытаемся определить автоматически
    if (!countryCode) {
      const parsedNumber = parsePhoneNumber(phoneNumber);
      if (parsedNumber) {
        return parsedNumber.formatInternational();
      }
    } else {
      const parsedNumber = parsePhoneNumber(phoneNumber, countryCode);
      if (parsedNumber) {
        return parsedNumber.formatInternational();
      }
    }
    
    // Если не удалось распарсить, используем форматирование "на лету"
    return formatIncompletePhoneNumber(phoneNumber);
  } catch {
    return phoneNumber;
  }
};

/**
 * Форматирует номер для отображения в национальном формате
 */
export const formatNationalPhoneNumber = (phoneNumber: string, countryCode?: CountryCode): string => {
  try {
    if (!countryCode) {
      const parsedNumber = parsePhoneNumber(phoneNumber);
      if (parsedNumber) {
        return parsedNumber.formatNational();
      }
    } else {
      const parsedNumber = parsePhoneNumber(phoneNumber, countryCode);
      if (parsedNumber) {
        return parsedNumber.formatNational();
      }
    }
    
    return formatIncompletePhoneNumber(phoneNumber);
  } catch {
    return phoneNumber;
  }
};

/**
 * Проверяет валидность международного номера телефона
 */
export const isValidInternationalPhoneNumber = (phoneNumber: string, countryCode?: CountryCode): boolean => {
  try {
    if (!countryCode) {
      return isValidPhoneNumber(phoneNumber);
    }
    return isValidPhoneNumber(phoneNumber, countryCode);
  } catch {
    return false;
  }
};

/**
 * Возвращает чистый номер телефона в международном формате E.164
 */
export const getCleanInternationalPhoneNumber = (phoneNumber: string, countryCode?: CountryCode): string => {
  try {
    let parsedNumber: PhoneNumber | undefined;
    
    if (!countryCode) {
      parsedNumber = parsePhoneNumber(phoneNumber);
    } else {
      parsedNumber = parsePhoneNumber(phoneNumber, countryCode);
    }
    
    if (parsedNumber) {
      return parsedNumber.format('E.164');
    }
    
    // Если не удалось распарсить, возвращаем только цифры с плюсом
    const digitsOnly = phoneNumber.replace(/\D/g, '');
    return digitsOnly.startsWith('+') ? phoneNumber : '+' + digitsOnly;
  } catch {
    const digitsOnly = phoneNumber.replace(/\D/g, '');
    return '+' + digitsOnly;
  }
};

/**
 * Форматирование номера телефона "на лету" при вводе
 */
export const formatPhoneNumberAsYouType = (input: string, countryCode?: CountryCode): string => {
  try {
    const formatter = new AsYouType(countryCode);
    return formatter.input(input);
  } catch {
    return input;
  }
};

/**
 * Получает информацию о номере телефона
 */
export const getPhoneNumberInfo = (phoneNumber: string, countryCode?: CountryCode) => {
  try {
    let parsedNumber: PhoneNumber | undefined;
    
    if (!countryCode) {
      parsedNumber = parsePhoneNumber(phoneNumber);
    } else {
      parsedNumber = parsePhoneNumber(phoneNumber, countryCode);
    }
    
    if (parsedNumber) {
      return {
        isValid: parsedNumber.isValid(),
        country: parsedNumber.country,
        countryCallingCode: parsedNumber.countryCallingCode,
        nationalNumber: parsedNumber.nationalNumber,
        international: parsedNumber.formatInternational(),
        national: parsedNumber.formatNational(),
        e164: parsedNumber.format('E.164'),
        type: parsedNumber.getType()
      };
    }
    
    return null;
  } catch {
    return null;
  }
};

/**
 * Returns a hint for entering a phone number
 */
export const getPhoneNumberHint = (countryCode?: CountryCode): string => {
  if (countryCode) {
    // Some examples for popular countries
    const examples: Record<string, string> = {
      'US': '+1 (555) 123-4567',
      'GB': '+44 20 7946 0958',
      'DE': '+49 30 12345678',
      'FR': '+33 1 23 45 67 89',
      'RU': '+7 495 123-45-67',
      'CN': '+86 138 0013 8000',
      'JP': '+81 90 1234 5678',
      'KR': '+82 2 1234 5678',
      'AU': '+61 2 1234 5678',
      'CA': '+1 (416) 123-4567',
      'IN': '+91 98765 43210',
      'BR': '+55 11 99999-9999',
      'MX': '+52 55 1234 5678',
      'ES': '+34 912 34 56 78',
      'IT': '+39 06 1234 5678',
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
    };
    
    return examples[countryCode] || `Format: +${countryCode} XXXX XXXX`;
  }
  
  return 'Enter number with country code, e.g.: +1 555 123 4567';
};

/**
 * Возвращает пример номера телефона для указанной страны
 */
export const getExamplePhoneNumber = (countryCode?: CountryCode): string => {
  return getPhoneNumberHint(countryCode);
};

/**
 * Popular country codes for quick access
 */
export const POPULAR_COUNTRY_CODES: Array<{code: CountryCode, name: string, callingCode: string}> = [
  { code: 'US', name: 'United States', callingCode: '+1' },
  { code: 'CA', name: 'Canada', callingCode: '+1' },
  { code: 'GB', name: 'United Kingdom', callingCode: '+44' },
  { code: 'DE', name: 'Germany', callingCode: '+49' },
  { code: 'FR', name: 'France', callingCode: '+33' },
  { code: 'ES', name: 'Spain', callingCode: '+34' },
  { code: 'IT', name: 'Italy', callingCode: '+39' },
  { code: 'RU', name: 'Russia', callingCode: '+7' },
  { code: 'CN', name: 'China', callingCode: '+86' },
  { code: 'JP', name: 'Japan', callingCode: '+81' },
  { code: 'KR', name: 'South Korea', callingCode: '+82' },
  { code: 'AU', name: 'Australia', callingCode: '+61' },
  { code: 'IN', name: 'India', callingCode: '+91' },
  { code: 'BR', name: 'Brazil', callingCode: '+55' },
  { code: 'MX', name: 'Mexico', callingCode: '+52' },
  { code: 'SE', name: 'Sweden', callingCode: '+46' },
  { code: 'NO', name: 'Norway', callingCode: '+47' },
  { code: 'FI', name: 'Finland', callingCode: '+358' },
  { code: 'DK', name: 'Denmark', callingCode: '+45' },
  { code: 'NL', name: 'Netherlands', callingCode: '+31' },
  { code: 'BE', name: 'Belgium', callingCode: '+32' },
  { code: 'CH', name: 'Switzerland', callingCode: '+41' },
  { code: 'AT', name: 'Austria', callingCode: '+43' },
  { code: 'PL', name: 'Poland', callingCode: '+48' },
  { code: 'CZ', name: 'Czech Republic', callingCode: '+420' },
  { code: 'UA', name: 'Ukraine', callingCode: '+380' },
];

// Обратная совместимость - старые функции
export const formatUSPhoneNumber = (phoneNumber: string): string => formatInternationalPhoneNumber(phoneNumber, 'US');
export const formatSwedishPhoneNumber = (phoneNumber: string): string => formatInternationalPhoneNumber(phoneNumber, 'SE');
export const isValidUSPhoneNumber = (phoneNumber: string): boolean => isValidInternationalPhoneNumber(phoneNumber, 'US');
export const isValidSwedishPhoneNumber = (phoneNumber: string): boolean => isValidInternationalPhoneNumber(phoneNumber, 'SE');
export const getCleanPhoneNumber = (phoneNumber: string): string => getCleanInternationalPhoneNumber(phoneNumber);
export const formatPhoneNumberForDisplay = (phoneNumber: string): string => formatInternationalPhoneNumber(phoneNumber); 
