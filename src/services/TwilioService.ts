import { APP_CONFIG } from '../config/appConfig';

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class TwilioService {
  private static instance: TwilioService;
  private config = APP_CONFIG.TWILIO_CONFIG;
  private baseUrl = 'https://api.twilio.com/2010-04-01';

  private constructor() {}

  static getInstance(): TwilioService {
    if (!TwilioService.instance) {
      TwilioService.instance = new TwilioService();
    }
    return TwilioService.instance;
  }

  /**
   * Создание базовой авторизации для Twilio API
   */
  private getAuthHeaders(): Record<string, string> {
    const credentials = `${this.config.ACCOUNT_SID}:${this.config.AUTH_TOKEN}`;
    const encodedCredentials = btoa(credentials);
    
    return {
      'Authorization': `Basic ${encodedCredentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    };
  }

  /**
   * Преобразование объекта в URL-encoded строку
   */
  private encodeFormData(data: Record<string, string>): string {
    return Object.keys(data)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`)
      .join('&');
  }

  /**
   * Отправка SMS через Twilio REST API
   */
  async sendSMS(
    to: string,
    message: string,
    from?: string
  ): Promise<SMSResult> {
    try {
      // Проверяем формат номера
      if (!this.isValidPhoneNumber(to)) {
        return {
          success: false,
          error: 'Invalid phone number format. Use international format (+1234567890)'
        };
      }

      // Предварительная проверка региона
      const preflightResult = await this.preflightCheck(to);
      if (!preflightResult.canSend) {
        return {
          success: false,
          error: preflightResult.warning || 'Region not supported'
        };
      }

      const fromNumber = from || this.config.FROM_NUMBER;
      const url = `${this.baseUrl}/Accounts/${this.config.ACCOUNT_SID}/Messages.json`;

      if (!fromNumber) {
        return {
          success: false,
          error: 'No FROM number configured in Twilio settings'
        };
      }

      const formData = this.encodeFormData({
        To: to,
        From: fromNumber,
        Body: message
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: formData
      });

      const responseData = await response.json();
      if (response.ok) {
        return {
          success: true,
          messageId: responseData.sid
        };
      } else {
        // Обработка ошибок Twilio
        const errorMessage = this.getTwilioErrorMessage(responseData.code, responseData.message);
        return {
          success: false,
          error: errorMessage
        };
      }

    } catch (error: any) {
      return {
        success: false,
        error: `Network error: ${error.message}`
      };
    }
  }

  /**
   * Отправка кода подтверждения
   */
  async sendVerificationCode(
    phoneNumber: string,
    code: string,
    type: 'login' | 'registration'
  ): Promise<SMSResult> {
    const messages = {
      login: `Your WorkTime Tracker login code: ${code}. Valid for 10 minutes.`,
      registration: `Your WorkTime Tracker verification code: ${code}. Valid for 10 minutes.`
    };

    return await this.sendSMS(phoneNumber, messages[type]);
  }

  /**
   * Проверка формата номера телефона
   */
  private isValidPhoneNumber(phoneNumber: string): boolean {
    // Базовая проверка на международный формат
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phoneNumber);
  }

  /**
   * Получение кода страны из номера телефона
   */
  private getCountryCodeFromPhone(phoneNumber: string): string {
    if (phoneNumber.startsWith('+1')) return 'US'; // США/Канада
    if (phoneNumber.startsWith('+7')) return 'RU'; // Россия/Казахстан
    if (phoneNumber.startsWith('+44')) return 'GB'; // Великобритания
    if (phoneNumber.startsWith('+49')) return 'DE'; // Германия
    if (phoneNumber.startsWith('+33')) return 'FR'; // Франция
    if (phoneNumber.startsWith('+46')) return 'SE'; // Швеция
    if (phoneNumber.startsWith('+47')) return 'NO'; // Норвегия
    if (phoneNumber.startsWith('+372')) return 'EE'; // Эстония
    if (phoneNumber.startsWith('+358')) return 'FI'; // Финляндия
    // Добавьте больше кодов по необходимости
    return 'UNKNOWN';
  }

  /**
   * Проверка поддержки региона
   */
  private isRegionSupported(phoneNumber: string): boolean {
    const countryCode = this.getCountryCodeFromPhone(phoneNumber);
    return this.config.SUPPORTED_REGIONS?.includes(countryCode) || false;
  }

  /**
   * Предварительная проверка перед отправкой SMS
   */
  private async preflightCheck(phoneNumber: string): Promise<{ canSend: boolean; warning?: string }> {
    const countryCode = this.getCountryCodeFromPhone(phoneNumber);
    const isSupported = this.isRegionSupported(phoneNumber);
    
    if (!isSupported) {
      return {
        canSend: false,
        warning: `Region ${countryCode} is not enabled in Twilio Geo Permissions. Please enable it in Twilio Console.`
      };
    }
    
    return { canSend: true };
  }

  /**
   * Получение понятного сообщения об ошибке Twilio
   */
  private getTwilioErrorMessage(code: number, message: string): string {
    switch (code) {
      case 21211:
        return 'Invalid phone number format';
      case 21614:
        return 'Invalid sender number. Check your Twilio phone number';
      case 21408:
        return 'SMS to this region is not enabled. Please enable geographic permissions for this country in Twilio Console → Messaging → Settings → Geo Permissions';
      case 30007:
        return 'Message delivery failed';
      case 20003:
        return 'Authentication failed. Check your Account SID and Auth Token';
      case 21606:
        return 'Phone number not verified. Add to verified numbers in Twilio Console';
      default:
        return `Twilio error (${code}): ${message}`;
    }
  }

  /**
   * Получение информации об аккаунте Twilio
   */
  async getAccountInfo(): Promise<any> {
    try {
      const url = `${this.baseUrl}/Accounts/${this.config.ACCOUNT_SID}.json`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        return {
          friendlyName: data.friendly_name,
          status: data.status,
          type: data.type
        };
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Получение списка доступных номеров
   */
  async getAvailableNumbers(): Promise<string[]> {
    try {
      const url = `${this.baseUrl}/Accounts/${this.config.ACCOUNT_SID}/IncomingPhoneNumbers.json`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        return data.incoming_phone_numbers.map((number: any) => number.phone_number);
      }
      return [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Проверка статуса сообщения
   */
  async getMessageStatus(messageId: string): Promise<string | null> {
    try {
      const url = `${this.baseUrl}/Accounts/${this.config.ACCOUNT_SID}/Messages/${messageId}.json`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        return data.status;
      }
      return null;
    } catch (error) {
      return null;
    }
  }
} 

