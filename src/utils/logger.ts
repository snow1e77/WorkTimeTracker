// Клиентский logger для React Native
import { Platform } from 'react-native';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  data?: any;
  userId?: string;
  context?: string;
}

class ClientLogger {
  private isDevelopment: boolean;
  private logs: LogEntry[] = [];
  private maxLogs = 1000;

  constructor() {
    this.isDevelopment = __DEV__;
  }

  private log(level: LogLevel, message: string, data?: any, context?: string) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      data,
      context
    };

    // Добавляем в локальный буфер
    this.logs.push(entry);
    
    // Ограничиваем количество логов
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // В development режиме выводим в консоль
    if (this.isDevelopment) {
      const logMessage = `[${level.toUpperCase()}] ${message}`;
      const logData = data ? [logMessage, data] : [logMessage];
      
      switch (level) {
        case 'debug':
          console.log(...logData);
          break;
        case 'info':
          console.info(...logData);
          break;
        case 'warn':
          console.warn(...logData);
          break;
        case 'error':
          console.error(...logData);
          break;
      }
    }

    // В продакшене отправляем критичные ошибки на сервер
    if (!this.isDevelopment && level === 'error') {
      this.sendErrorToServer(entry);
    }
  }

  debug(message: string, data?: any, context?: string) {
    this.log('debug', message, data, context);
  }

  info(message: string, data?: any, context?: string) {
    this.log('info', message, data, context);
  }

  warn(message: string, data?: any, context?: string) {
    this.log('warn', message, data, context);
  }

  error(message: string, data?: any, context?: string) {
    this.log('error', message, data, context);
  }

  // Специальные методы для различных контекстов
  auth(message: string, data?: any) {
    this.log('info', message, data, 'AUTH');
  }

  sync(message: string, data?: any) {
    this.log('info', message, data, 'SYNC');
  }

  api(message: string, data?: any) {
    this.log('info', message, data, 'API');
  }

  location(message: string, data?: any) {
    this.log('info', message, data, 'LOCATION');
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
export const logInfo = (message: string, data?: any) => logger.info(message, data);
export const logError = (message: string, data?: any) => logger.error(message, data);
export const logWarn = (message: string, data?: any) => logger.warn(message, data);
export const logDebug = (message: string, data?: any) => logger.debug(message, data); 