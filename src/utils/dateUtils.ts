// Date utilities for US format

/**
 * Formats date in US format
 * US format: MM/DD/YYYY
 */
export const formatDateUS = (date: Date): string => {
  return date.toLocaleDateString('en-US');
};

/**
 * Formats date and time in US format
 * Format: MM/DD/YYYY hh:mm AM/PM
 */
export const formatDateTimeUS = (date: Date): string => {
  return date.toLocaleString('en-US');
};

/**
 * Formats time in 12-hour format
 * Format: hh:mm AM/PM
 */
export const formatTimeUS = (date: Date): string => {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

/**
 * Parses US date string to Date object
 */
export const parseDateUS = (dateString: string): Date => {
  return new Date(dateString);
};

/**
 * Returns today's date in US format
 */
export const getTodayUS = (): string => {
  return formatDateUS(new Date());
};

/**
 * Returns current week's date range
 */
export const getCurrentWeekRange = (): { start: Date; end: Date } => {
  const now = new Date();
  const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
  const endOfWeek = new Date(now.setDate(startOfWeek.getDate() + 6));
  
  return {
    start: startOfWeek,
    end: endOfWeek
  };
};

/**
 * Returns current month's date range
 */
export const getCurrentMonthRange = (): { start: Date; end: Date } => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  return {
    start: startOfMonth,
    end: endOfMonth
  };
};

/**
 * Formats relative date (today, yesterday, etc.)
 */
export const formatRelativeDate = (date: Date): string => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  if (formatDateUS(date) === formatDateUS(today)) {
    return 'Today';
  } else if (formatDateUS(date) === formatDateUS(yesterday)) {
    return 'Yesterday';
  } else if (formatDateUS(date) === formatDateUS(tomorrow)) {
    return 'Tomorrow';
  } else {
    return formatDateUS(date);
  }
};

/**
 * Gets month name in English
 */
export const getMonthName = (monthIndex: number): string => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  if (monthIndex < 0 || monthIndex >= months.length) {
    return 'Unknown';
  }
  
  return months[monthIndex]!;
};

/**
 * Gets day name in English
 */
export const getDayName = (dayIndex: number): string => {
  const days = [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
  ];
  
  if (dayIndex < 0 || dayIndex >= days.length) {
    return 'Unknown';
  }
  
  return days[dayIndex]!;
};

/**
 * Formats duration in hours and minutes
 */
export const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) {
    return `${mins} min`;
  } else if (mins === 0) {
    return `${hours} hr`;
  } else {
    return `${hours} hr ${mins} min`;
  }
};

// Legacy function names for compatibility
export const formatSwedishDate = formatDateUS;
export const formatSwedishDateTime = formatDateTimeUS;
export const formatSwedishTime = formatTimeUS;
export const getCurrentSwedishDate = getTodayUS;
export const getCurrentSwedishDateTime = formatDateTimeUS;
export const parseSwedishDate = parseDateUS;
export const getSwedishMonthName = getMonthName;
export const getSwedishDayName = getDayName; 