// Клиентский logger для React Native
import { Platform } from 'react-native';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: Record<string, unknown>;
  context?: string;
  timestamp: Date;
}

class ClientLogger {
  private isDevelopment: boolean;
  private logs: LogEntry[] = [];
  private maxLogs = 1000;

  constructor() {
    this.isDevelopment = __DEV__;
  }

  private log(level: LogLevel, message: string, data?: Record<string, unknown>, context?: string) {
    const timestamp = new Date();
    const entry: LogEntry = {
      level,
      message,
      data,
      context,
      timestamp,
    };

    this.logs.push(entry);

    // Limit log size to prevent memory issues
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Console output for development
    if (this.isDevelopment) {
      const contextStr = context ? `[${context.toUpperCase()}] ` : '';
      const logMessage = `${contextStr}${message}`;
      
      switch (level) {
        case 'debug':
          console.log(`[DEBUG] ${logMessage}`, data || '');
          break;
        case 'info':
          console.info(`[INFO] ${logMessage}`, data || '');
          break;
        case 'warn':
          console.warn(`[WARN] ${logMessage}`, data || '');
          break;
        case 'error':
          console.error(`[ERROR] ${logMessage}`, data || '');
          break;
      }
    }
    
    // Send critical errors to server in production
    if (!this.isDevelopment && level === 'error') {
      this.sendErrorToServer(entry);
    }
  }

  debug(message: string, data?: Record<string, unknown>, context?: string) {
    this.log('debug', message, data, context);
  }

  info(message: string, data?: Record<string, unknown>, context?: string) {
    this.log('info', message, data, context);
  }

  warn(message: string, data?: Record<string, unknown>, context?: string) {
    this.log('warn', message, data, context);
  }

  error(message: string, data?: Record<string, unknown>, context?: string) {
    this.log('error', message, data, context);
  }

  // Specialized logging methods
  auth(message: string, data?: Record<string, unknown>) {
    this.log('info', `[AUTH] ${message}`, data, 'auth');
  }

  sync(message: string, data?: Record<string, unknown>) {
    this.log('info', `[SYNC] ${message}`, data, 'sync');
  }

  api(message: string, data?: Record<string, unknown>) {
    this.log('info', `[API] ${message}`, data, 'api');
  }

  location(message: string, data?: Record<string, unknown>) {
    this.log('debug', `[LOCATION] ${message}`, data, 'location');
  }

  // Получить логи для отправки на сервер
  getLogs(level?: LogLevel): LogEntry[] {
    if (level) {
      return this.logs.filter(log => log.level === level);
    }
    return [...this.logs];
  }

  // Очистить логи
  clearLogs() {
    this.logs = [];
  }

  // Отправка ошибки на сервер (в продакшене)
  private async sendErrorToServer(entry: LogEntry) {
    try {
      // Здесь можно добавить отправку на сервер логирования
      // Например, через API endpoint /api/logs
      
      // Пока просто сохраняем в AsyncStorage для последующей отправки
      const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
      const existingLogs = await AsyncStorage.getItem('error_logs');
      const logs = existingLogs ? JSON.parse(existingLogs) : [];
      logs.push(entry);
      
      // Ограничиваем количество ошибок в хранилище
      if (logs.length > 100) {
        logs.splice(0, logs.length - 100);
      }
      
      await AsyncStorage.setItem('error_logs', JSON.stringify(logs));
    } catch (error) {
      // Если не удалось сохранить лог, игнорируем ошибку
    }
  }

  // Отправить накопленные ошибки на сервер
  async flushErrorsToServer() {
    try {
      const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
      const errorLogs = await AsyncStorage.getItem('error_logs');
      
      if (errorLogs) {
        const logs = JSON.parse(errorLogs);
        
        // Здесь можно добавить API вызов для отправки логов
        // await apiClient.post('/logs/errors', { logs });
        
        // Очищаем после успешной отправки
        await AsyncStorage.removeItem('error_logs');
        
        this.info('Error logs flushed to server', { count: logs.length });
      }
    } catch (error) {
      this.error('Failed to flush error logs', { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }
}

// Создаем единственный экземпляр logger
const logger = new ClientLogger();

export default logger;

// Вспомогательные функции для совместимости с console
export const logInfo = (message: string, data?: Record<string, unknown>) => logger.info(message, data);
export const logError = (message: string, data?: Record<string, unknown>) => logger.error(message, data);
export const logWarn = (message: string, data?: Record<string, unknown>) => logger.warn(message, data);
export const logDebug = (message: string, data?: Record<string, unknown>) => logger.debug(message, data); 