import twilio from 'twilio';

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Интерфейс для ответа Twilio API
interface TwilioResponse {
  sid?: string;
  code?: number;
  message?: string;
  more_info?: string;
}

export class SMSService {
  private static twilioClient: twilio.Twilio | null = null;
  private static isInitialized = false;

  // Инициализация Twilio клиента
  static initialize(): void {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    // Проверяем, что credentials действительно настроены (не placeholder значения)
    if (accountSid && 
        authToken && 
        accountSid !== 'your_twilio_account_sid' && 
        accountSid.startsWith('AC') &&
        authToken !== 'your_twilio_auth_token') {
      try {
        this.twilioClient = twilio(accountSid, authToken);
        this.isInitialized = true;
        } catch (error) {
        this.isInitialized = false;
      }
    } else {
      if (accountSid && !accountSid.startsWith('AC')) {
        }
      this.isInitialized = false;
    }
  }

  // Отправка SMS сообщения
  static async sendSMS(
    phoneNumber: string, 
    message: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Проверяем, является ли это тестовым аккаунтом
      const isTestAccount = phoneNumber === '+79999999999';
      
      // В режиме разработки или для тестового аккаунта просто логируем сообщение
      if (process.env.NODE_ENV !== 'production' || isTestAccount || !this.isInitialized || !this.twilioClient) {
        if (isTestAccount) {
          console.log('🚫 SMS blocked for test account:', { phoneNumber, message: message.substring(0, 50) + '...' });
        } else {
          console.log('📱 SMS demo mode:', { phoneNumber, message: message.substring(0, 50) + '...' });
        }
        
        return { 
          success: true, 
          messageId: `demo_${Date.now()}` 
        };
      }

      // Форматируем номер телефона
      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      
      // Отправляем SMS через Twilio
      const result = await this.twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: formattedPhone
      });

      return { 
        success: true, 
        messageId: result.sid 
      };

    } catch (error) {
      let errorMessage = 'Failed to send SMS';
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      return { 
        success: false, 
        error: errorMessage 
      };
    }
  }

  // Отправка кода верификации
  static async sendVerificationCode(
    phoneNumber: string, 
    code: string,
    type: 'login' | 'registration' | 'password_reset' = 'login'
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    let message = '';
    
    switch (type) {
      case 'login':
        message = `Ваш код для входа в WorkTime Tracker: ${code}`;
        break;
      case 'registration':
        message = `Ваш код для регистрации в WorkTime Tracker: ${code}`;
        break;
      case 'password_reset':
        message = `Ваш код для сброса пароля WorkTime Tracker: ${code}`;
        break;
    }

    return this.sendSMS(phoneNumber, message);
  }

  // Отправка уведомления работнику
  static async sendWorkerNotification(
    phoneNumber: string,
    title: string,
    message: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const fullMessage = `WorkTime Tracker - ${title}: ${message}`;
    return this.sendSMS(phoneNumber, fullMessage);
  }

  // Отправка уведомления о нарушении администратору
  static async sendViolationAlert(
    phoneNumber: string,
    workerName: string,
    violationType: string,
    siteName: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const message = `Нарушение на объекте "${siteName}": работник ${workerName} - ${violationType}`;
    return this.sendSMS(phoneNumber, message);
  }

  // Отправка напоминания о смене
  static async sendShiftReminder(
    phoneNumber: string,
    siteName: string,
    shiftTime: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const message = `Напоминание: ваша смена на объекте "${siteName}" начинается в ${shiftTime}`;
    return this.sendSMS(phoneNumber, message);
  }

  // Отправка уведомления о назначении
  static async sendAssignmentNotification(
    phoneNumber: string,
    siteName: string,
    startDate?: Date
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    let message = `Вы назначены на объект "${siteName}"`;
    
    if (startDate) {
      const dateStr = startDate.toLocaleDateString('ru-RU');
      message += ` с ${dateStr}`;
    }

    return this.sendSMS(phoneNumber, message);
  }

  // Массовая отправка SMS
  static async sendBulkSMS(
    phoneNumbers: string[],
    message: string
  ): Promise<{
    success: boolean;
    sent: number;
    failed: number;
    results: Array<{ phoneNumber: string; success: boolean; messageId?: string; error?: string }>;
  }> {
    const results: Array<{ phoneNumber: string; success: boolean; messageId?: string; error?: string }> = [];
    let sent = 0;
    let failed = 0;

    for (const phoneNumber of phoneNumbers) {
      const result = await this.sendSMS(phoneNumber, message);
      
      results.push({
        phoneNumber,
        success: result.success,
        messageId: result.messageId,
        error: result.error
      });

      if (result.success) {
        sent++;
      } else {
        failed++;
      }

      // Небольшая задержка между сообщениями для предотвращения rate limiting
      if (this.isInitialized && phoneNumbers.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return {
      success: sent > 0,
      sent,
      failed,
      results
    };
  }

  // Проверка статуса сообщения (только для Twilio)
  static async checkMessageStatus(messageId: string): Promise<{
    status?: string;
    error?: string;
  }> {
    if (!this.isInitialized || !this.twilioClient) {
      return { status: 'delivered' }; // В демо режиме считаем доставленным
    }

    try {
      const message = await this.twilioClient.messages(messageId).fetch();
      return { status: message.status };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Получение статистики SMS за период
  static async getSMSStatistics(options: {
    startDate?: Date;
    endDate?: Date;
  } = {}): Promise<{
    totalSent: number;
    delivered: number;
    failed: number;
    undelivered: number;
  }> {
    if (!this.isInitialized || !this.twilioClient) {
      // В демо режиме возвращаем фиктивную статистику
      return {
        totalSent: 100,
        delivered: 95,
        failed: 3,
        undelivered: 2
      };
    }

    try {
      const { startDate, endDate } = options;
      
      const messagesParams: any = {};
      if (startDate) messagesParams.dateSentAfter = startDate;
      if (endDate) messagesParams.dateSentBefore = endDate;

      const messages = await this.twilioClient.messages.list(messagesParams);
      
      let totalSent = 0;
      let delivered = 0;
      let failed = 0;
      let undelivered = 0;

      messages.forEach(message => {
        totalSent++;
        switch (message.status) {
          case 'delivered':
            delivered++;
            break;
          case 'failed':
          case 'undelivered':
            failed++;
            break;
          default:
            undelivered++;
        }
      });

      return { totalSent, delivered, failed, undelivered };

    } catch (error) {
      return { totalSent: 0, delivered: 0, failed: 0, undelivered: 0 };
    }
  }

  // Валидация номера телефона
  static validatePhoneNumber(phoneNumber: string): boolean {
    // Базовая валидация номера телефона
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phoneNumber.replace(/[\s\-\(\)]/g, ''));
  }

  // Форматирование номера телефона для Twilio
  private static formatPhoneNumber(phoneNumber: string): string {
    // Удаляем все нецифровые символы кроме +
    let cleaned = phoneNumber.replace(/[^\d+]/g, '');
    
    // Если номер начинается с 8, заменяем на +7 (для российских номеров)
    if (cleaned.startsWith('8')) {
      cleaned = '+7' + cleaned.substring(1);
    }
    
    // Если номер не начинается с +, добавляем +7
    if (!cleaned.startsWith('+')) {
      cleaned = '+7' + cleaned;
    }

    return cleaned;
  }

  // Получение информации о сервисе
  static getServiceInfo(): {
    isInitialized: boolean;
    mode: 'production' | 'demo';
    provider: string;
  } {
    return {
      isInitialized: this.isInitialized,
      mode: this.isInitialized ? 'production' : 'demo',
      provider: 'Twilio'
    };
  }

  // Получение статуса сервиса SMS
  static getStatus(): {
    isOnline: boolean;
    mode: 'production' | 'demo';
    provider: string;
    configured: boolean;
    lastError?: string;
  } {
    return {
      isOnline: this.isInitialized,
      mode: this.isInitialized ? 'production' : 'demo',
      provider: 'Twilio',
      configured: this.isInitialized
    };
  }
}

// Инициализируем сервис при загрузке модуля
SMSService.initialize(); 

