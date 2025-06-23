import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { APP_CONFIG } from '../config/appConfig';
import { Notification } from '../types';
import { AuthService } from './AuthService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Типы уведомлений
export type NotificationType = 
  | 'shift_reminder'
  | 'break_reminder'
  | 'gps_event'
  | 'violation_alert'
  | 'overtime_alert'
  | 'assignment_update'
  | 'general';

export interface NotificationChannelConfig {
  id: string;
  name: string;
  description: string;
  importance: Notifications.AndroidImportance;
  sound?: string;
  vibrationPattern?: number[];
  enableLights?: boolean;
  enableVibrate?: boolean;
}

export interface ScheduledNotificationData {
  id: string;
  title: string;
  body: string;
  type: NotificationType;
  data?: any;
  trigger: Date | Notifications.TimeIntervalTriggerInput | Notifications.DateTriggerInput;
  categoryId?: string;
}

export class NotificationService {
  private static instance: NotificationService;
  private isInitialized = false;
  private expoPushToken: string | null = null;
  private channels: NotificationChannelConfig[] = [];

  private constructor() {}

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Инициализация сервиса уведомлений
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Настройка обработчика уведомлений
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
                shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
        }),
      });

      // Создание каналов уведомлений
      await this.createNotificationChannels();

      // Запрос разрешений
      const { status } = await this.requestPermissions();
      
      if (status === 'granted') {
        // Получение push токена
        this.expoPushToken = await this.getPushToken();
        
        // Сохранение токена в БД
        if (this.expoPushToken) {
          await this.savePushToken(this.expoPushToken);
        }
      }

      // Настройка обработчиков
      this.setupNotificationHandlers();

      this.isInitialized = true;
      console.log('NotificationService initialized successfully');
    } catch (error) {
      console.error('Failed to initialize NotificationService:', error);
    }
  }

  // Создание каналов уведомлений
  private async createNotificationChannels(): Promise<void> {
    if (Platform.OS !== 'android') return;

    this.channels = [
      {
        id: 'shift_reminders',
        name: 'Shift Reminders',
        description: 'Notifications about shift start/end times',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
        enableVibrate: true,
        vibrationPattern: [0, 250, 250, 250],
      },
      {
        id: 'gps_events',
        name: 'GPS Events',
        description: 'Location-based notifications for site entry/exit',
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: 'default',
        enableVibrate: true,
      },
      {
        id: 'violations',
        name: 'Violations & Alerts',
        description: 'Important alerts about violations and issues',
        importance: Notifications.AndroidImportance.MAX,
        sound: 'default',
        enableLights: true,
        enableVibrate: true,
        vibrationPattern: [0, 500, 500, 500],
      },
      {
        id: 'general',
        name: 'General Notifications',
        description: 'General app notifications',
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: 'default',
      },
    ];

    // Создание каналов
    for (const channel of this.channels) {
      await Notifications.setNotificationChannelAsync(channel.id, {
        name: channel.name,
        description: channel.description,
        importance: channel.importance,
        sound: channel.sound,
        vibrationPattern: channel.vibrationPattern,
        enableLights: channel.enableLights,
        enableVibrate: channel.enableVibrate,
      });
    }
  }

  // Запрос разрешений на уведомления
  private async requestPermissions(): Promise<{ status: string }> {
    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      return { status: finalStatus };
    } else {
      return { status: 'granted' }; // Для симулятора
    }
  }

  // Получение push токена
  private async getPushToken(): Promise<string | null> {
    try {
      if (!Device.isDevice) {
        console.log('Must use physical device for Push Notifications');
        return null;
      }

      const token = await Notifications.getExpoPushTokenAsync({
        projectId: APP_CONFIG.EXPO_PROJECT_ID || 'your-project-id',
      });

      return token.data;
    } catch (error) {
      console.error('Failed to get push token:', error);
      return null;
    }
  }

  // Сохранение push токена в БД
  private async savePushToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem('expoPushToken', token);
      
      // Сохранение в БД для отправки с сервера
      const authService = AuthService.getInstance();
      const user = await authService.getCurrentUser();
      
      if (user) {
        // Здесь можно добавить API вызов для сохранения токена на сервере
        console.log('Push token saved for user:', user.id);
      }
    } catch (error) {
      console.error('Failed to save push token:', error);
    }
  }

  // Настройка обработчиков уведомлений
  private setupNotificationHandlers(): void {
    // Обработчик нажатия на уведомление
    Notifications.addNotificationResponseReceivedListener(response => {
      const { notification } = response;
      const data = notification.request.content.data;
      
      this.handleNotificationPress(data);
    });

    // Обработчик получения уведомления в foreground
    Notifications.addNotificationReceivedListener(notification => {
      const data = notification.request.content.data;
      console.log('Notification received:', data);
    });
  }

  // Обработка нажатия на уведомление
  private handleNotificationPress(data: any): void {
    console.log('Notification pressed:', data);
    
    // Здесь можно добавить навигацию в зависимости от типа уведомления
    switch (data?.type) {
      case 'shift_reminder':
        // Навигация к экрану отслеживания времени
        break;
      case 'gps_event':
        // Навигация к карте или истории локаций
        break;
      case 'violation_alert':
        // Навигация к экрану нарушений
        break;
      default:
        // Навигация к главному экрану
        break;
    }
  }

  // Отправка локального уведомления
  public async sendLocalNotification(
    title: string,
    body: string,
    type: NotificationType = 'general',
    data?: any
  ): Promise<string> {
    try {
      const channelId = this.getChannelIdByType(type);
      
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { type, ...data },
          sound: 'default',
        },
        trigger: { 
          seconds: 1,
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL
        } as Notifications.TimeIntervalTriggerInput,
        ...(Platform.OS === 'android' && { channelId }),
      });

      return identifier;
    } catch (error) {
      console.error('Failed to send local notification:', error);
      throw error;
    }
  }

  // Планирование уведомления
  public async scheduleNotification(notificationData: ScheduledNotificationData): Promise<string> {
    try {
      const channelId = this.getChannelIdByType(notificationData.type);
      
      let trigger: Notifications.NotificationTriggerInput;
      
      if (notificationData.trigger instanceof Date) {
        // Для Date используем DateTriggerInput
        trigger = {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: notificationData.trigger
        } as Notifications.DateTriggerInput;
      } else {
        // Уже правильно типизированный trigger
        trigger = notificationData.trigger;
      }
      
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: notificationData.title,
          body: notificationData.body,
          data: { type: notificationData.type, ...notificationData.data },
          sound: 'default',
        },
        trigger,
        ...(Platform.OS === 'android' && { channelId }),
      });

      return identifier;
    } catch (error) {
      console.error('Failed to schedule notification:', error);
      throw error;
    }
  }

  // Отмена уведомления
  public async cancelNotification(identifier: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
    } catch (error) {
      console.error('Failed to cancel notification:', error);
    }
  }

  // Отмена всех уведомлений
  public async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Failed to cancel all notifications:', error);
    }
  }

  // Получение канала по типу уведомления
  private getChannelIdByType(type: NotificationType): string {
    switch (type) {
      case 'shift_reminder':
      case 'break_reminder':
        return 'shift_reminders';
      case 'gps_event':
        return 'gps_events';
      case 'violation_alert':
      case 'overtime_alert':
        return 'violations';
      default:
        return 'general';
    }
  }

  // Уведомление о напоминании смены
  public async scheduleShiftReminder(
    time: Date,
    siteName: string,
    shiftType: 'start' | 'end' = 'start'
  ): Promise<string> {
    const title = shiftType === 'start' 
      ? 'Shift Starting Soon' 
      : 'Shift Ending Soon';
    
    const body = shiftType === 'start'
      ? `Your shift at ${siteName} starts in 15 minutes`
      : `Your shift at ${siteName} ends in 15 minutes`;

    return this.scheduleNotification({
      id: `shift_${shiftType}_${Date.now()}`,
      title,
      body,
      type: 'shift_reminder',
      data: { siteName, shiftType },
      trigger: time,
    });
  }

  // Уведомление о GPS событии
  public async notifyGeofenceEvent(
    type: 'entry' | 'exit',
    siteName: string,
    timestamp: Date = new Date()
  ): Promise<string> {
    const title = type === 'entry' ? 'Site Entry Detected' : 'Site Exit Detected';
    const body = type === 'entry' 
      ? `You have entered ${siteName}` 
      : `You have left ${siteName}`;

    return this.sendLocalNotification(
      title,
      body,
      'gps_event',
      { eventType: type, siteName, timestamp: timestamp.toISOString() }
    );
  }

  // Уведомление о нарушении
  public async notifyViolation(
    violationType: string,
    description: string,
    severity: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<string> {
    const title = severity === 'high' ? '🚨 Urgent Violation Alert' : '⚠️ Violation Alert';
    
    return this.sendLocalNotification(
      title,
      description,
      'violation_alert',
      { violationType, severity }
    );
  }

  // Уведомление о сверхурочных
  public async notifyOvertime(
    hours: number,
    siteName: string
  ): Promise<string> {
    const title = '⏰ Overtime Alert';
    const body = `You have worked ${hours} hours today at ${siteName}. Consider taking a break.`;

    return this.sendLocalNotification(
      title,
      body,
      'overtime_alert',
      { hours, siteName }
    );
  }

  // Уведомление о назначении
  public async notifyAssignment(
    siteName: string,
    assignmentType: 'new' | 'updated' | 'removed',
    details?: string
  ): Promise<string> {
    let title: string;
    let body: string;

    switch (assignmentType) {
      case 'new':
        title = '📋 New Assignment';
        body = `You have been assigned to ${siteName}`;
        break;
      case 'updated':
        title = '📝 Assignment Updated';
        body = `Your assignment at ${siteName} has been updated`;
        break;
      case 'removed':
        title = '❌ Assignment Removed';
        body = `You have been removed from ${siteName}`;
        break;
    }

    if (details) {
      body += `\n${details}`;
    }

    return this.sendLocalNotification(
      title,
      body,
      'assignment_update',
      { siteName, assignmentType, details }
    );
  }

  // Уведомление о перерыве
  public async scheduleBreakReminder(time: Date): Promise<string> {
    return this.scheduleNotification({
      id: `break_reminder_${Date.now()}`,
      title: '☕ Break Time',
      body: 'Time for your scheduled break',
      type: 'break_reminder',
      trigger: time,
    });
  }

  // Получение настроек уведомлений из БД
  public async getNotificationSettings(): Promise<{
    enabled: boolean;
    sound: boolean;
    vibration: boolean;
    shiftReminders: boolean;
    breakReminders: boolean;
    gpsEvents: boolean;
    violations: boolean;
  }> {
    try {
      const settings = await AsyncStorage.getItem('notificationSettings');
      return settings ? JSON.parse(settings) : {
        enabled: true,
        sound: true,
        vibration: true,
        shiftReminders: true,
        breakReminders: true,
        gpsEvents: true,
        violations: true,
      };
    } catch (error) {
      console.error('Failed to get notification settings:', error);
      return {
        enabled: true,
        sound: true,
        vibration: true,
        shiftReminders: true,
        breakReminders: true,
        gpsEvents: true,
        violations: true,
      };
    }
  }

  // Сохранение настроек уведомлений
  public async saveNotificationSettings(settings: {
    enabled: boolean;
    sound: boolean;
    vibration: boolean;
    shiftReminders: boolean;
    breakReminders: boolean;
    gpsEvents: boolean;
    violations: boolean;
  }): Promise<void> {
    try {
      await AsyncStorage.setItem('notificationSettings', JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save notification settings:', error);
    }
  }

  // Получение push токена (публичный метод)
  public getExpoPushToken(): string | null {
    return this.expoPushToken;
  }

  // Проверка статуса уведомлений
  public async getNotificationStatus(): Promise<{
    isEnabled: boolean;
    hasPermission: boolean;
    pushToken: string | null;
  }> {
    const { status } = await Notifications.getPermissionsAsync();
    const settings = await this.getNotificationSettings();
    
    return {
      isEnabled: settings.enabled,
      hasPermission: status === 'granted',
      pushToken: this.expoPushToken,
    };
  }

  // Тестовое уведомление
  public async sendTestNotification(): Promise<void> {
    await this.sendLocalNotification(
      'Test Notification',
      'This is a test notification from WorkTime Tracker',
      'general',
      { test: true }
    );
  }
}

// Экспорт singleton instance
export const notificationService = NotificationService.getInstance(); 