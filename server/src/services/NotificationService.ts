import { Expo } from 'expo-server-sdk';

export interface PushNotificationData {
  to: string | string[];
  title: string;
  body: string;
  data?: any;
  badge?: number;
  sound?: 'default' | null;
  ttl?: number;
  priority?: 'default' | 'normal' | 'high';
  channelId?: string;
}

export interface UserNotificationPreferences {
  userId: string;
  pushToken?: string;
  isEnabled: boolean;
  sound: boolean;
  vibration: boolean;
  shiftReminders: boolean;
  breakReminders: boolean;
  gpsEvents: boolean;
  violations: boolean;
}

export class ServerNotificationService {
  private expo: Expo;
  private static instance: ServerNotificationService;

  private constructor() {
    this.expo = new Expo({
      accessToken: process.env.EXPO_ACCESS_TOKEN,
      useFcmV1: true, // Использование FCM v1 API
    });
  }

  public static getInstance(): ServerNotificationService {
    if (!ServerNotificationService.instance) {
      ServerNotificationService.instance = new ServerNotificationService();
    }
    return ServerNotificationService.instance;
  }

  // Отправка push-уведомления одному пользователю
  public async sendNotificationToUser(
    pushToken: string,
    notification: Omit<PushNotificationData, 'to'>
  ): Promise<boolean> {
    try {
      if (!Expo.isExpoPushToken(pushToken)) {
        return false;
      }

      const message = {
        to: pushToken,
        ...notification,
      };

      const chunks = this.expo.chunkPushNotifications([message]);
      const sendPromises = chunks.map(chunk => this.expo.sendPushNotificationsAsync(chunk));
      
      const results = await Promise.all(sendPromises);
      
      // Проверяем результаты
      for (const result of results) {
        for (const ticket of result) {
          if (ticket.status === 'error') {
            return false;
          }
        }
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  // Отправка уведомлений множеству пользователей
  public async sendNotificationToMultipleUsers(
    pushTokens: string[],
    notification: Omit<PushNotificationData, 'to'>
  ): Promise<{ success: number; failed: number }> {
    const results = { success: 0, failed: 0 };

    try {
      const validTokens = pushTokens.filter(token => Expo.isExpoPushToken(token));
      
      if (validTokens.length === 0) {
        return results;
      }

      const messages = validTokens.map(token => ({
        to: token,
        ...notification,
      }));

      const chunks = this.expo.chunkPushNotifications(messages);
      const sendPromises = chunks.map(chunk => this.expo.sendPushNotificationsAsync(chunk));
      
      const ticketChunks = await Promise.all(sendPromises);
      
      // Подсчитываем результаты
      for (const ticketChunk of ticketChunks) {
        for (const ticket of ticketChunk) {
          if (ticket.status === 'ok') {
            results.success++;
          } else {
            results.failed++;
            }
        }
      }

      return results;
    } catch (error) {
      results.failed = pushTokens.length;
      return results;
    }
  }

  // Уведомление о нарушении для администраторов
  public async notifyAdminsAboutViolation(
    adminTokens: string[],
    violationType: string,
    workerName: string,
    siteName: string,
    severity: 'low' | 'medium' | 'high'
  ): Promise<void> {
    const severityEmoji = severity === 'high' ? '🚨' : severity === 'medium' ? '⚠️' : '📝';
    
    await this.sendNotificationToMultipleUsers(adminTokens, {
      title: `${severityEmoji} Violation Alert`,
      body: `${workerName} - ${violationType} at ${siteName}`,
      data: {
        type: 'violation_alert',
        violationType,
        workerName,
        siteName,
        severity,
      },
      priority: severity === 'high' ? 'high' : 'default',
      channelId: 'violations',
    });
  }

  // Уведомление о новом назначении
  public async notifyWorkerAboutAssignment(
    workerToken: string,
    siteName: string,
    assignmentType: 'new' | 'updated' | 'removed',
    details?: string
  ): Promise<void> {
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

    await this.sendNotificationToUser(workerToken, {
      title,
      body,
      data: {
        type: 'assignment_update',
        siteName,
        assignmentType,
        details,
      },
      channelId: 'general',
    });
  }

  // Напоминание о смене
  public async sendShiftReminder(
    workerToken: string,
    siteName: string,
    shiftType: 'start' | 'end',
    minutesUntilShift: number
  ): Promise<void> {
    const title = shiftType === 'start' 
      ? '🕒 Shift Starting Soon' 
      : '🕐 Shift Ending Soon';
    
    const body = shiftType === 'start'
      ? `Your shift at ${siteName} starts in ${minutesUntilShift} minutes`
      : `Your shift at ${siteName} ends in ${minutesUntilShift} minutes`;

    await this.sendNotificationToUser(workerToken, {
      title,
      body,
      data: {
        type: 'shift_reminder',
        siteName,
        shiftType,
        minutesUntilShift,
      },
      channelId: 'shift_reminders',
    });
  }

  // Уведомление о сверхурочных
  public async notifyOvertime(
    workerToken: string,
    hours: number,
    siteName: string
  ): Promise<void> {
    await this.sendNotificationToUser(workerToken, {
      title: '⏰ Overtime Alert',
      body: `You have worked ${hours} hours today at ${siteName}. Consider taking a break.`,
      data: {
        type: 'overtime_alert',
        hours,
        siteName,
      },
      channelId: 'violations',
    });
  }

  // Массовое уведомление всем сотрудникам
  public async sendBroadcastNotification(
    workerTokens: string[],
    title: string,
    message: string,
    data?: any
  ): Promise<{ success: number; failed: number }> {
    return this.sendNotificationToMultipleUsers(workerTokens, {
      title,
      body: message,
      data: {
        type: 'broadcast',
        ...data,
      },
      channelId: 'general',
    });
  }

  // Получение статуса доставки уведомлений
  public async getDeliveryReceipts(receiptIds: string[]): Promise<any[]> {
    try {
      const receiptIdChunks = this.expo.chunkPushNotificationReceiptIds(receiptIds);
      const receiptPromises = receiptIdChunks.map(chunk => 
        this.expo.getPushNotificationReceiptsAsync(chunk)
      );
      
      const receiptChunks = await Promise.all(receiptPromises);
      const receipts: any[] = [];
      
      for (const receiptChunk of receiptChunks) {
        for (const receiptId in receiptChunk) {
          const receipt = receiptChunk[receiptId];
          if (receipt) {
            receipts.push({ receiptId, ...receipt });
            
            if (receipt.status === 'error' && 'message' in receipt) {
              // Если токен недействителен, помечаем его для удаления
              if ('details' in receipt && receipt.details && 'error' in receipt.details && receipt.details.error === 'DeviceNotRegistered') {
                // Здесь можно добавить логику для удаления недействительного токена из базы данных
              }
            }
          }
        }
      }
      
      return receipts;
    } catch (error) {
      return [];
    }
  }

  // Проверка валидности push токена
  public validatePushToken(token: string): boolean {
    return Expo.isExpoPushToken(token);
  }

  // Очистка недействительных токенов (заглушка для интеграции с БД)
  public async cleanupInvalidTokens(tokens: string[]): Promise<string[]> {
    // Здесь должна быть логика для проверки токенов через Expo API
    // и удаления недействительных из базы данных
    return tokens.filter(token => this.validatePushToken(token));
  }
}

// Экспорт singleton instance
export const serverNotificationService = ServerNotificationService.getInstance(); 
