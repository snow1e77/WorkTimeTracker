import AsyncStorage from '@react-native-async-storage/async-storage';
import { io, Socket } from 'socket.io-client';

export class WebSocketService {
  private static instance: WebSocketService;
  private socket: Socket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  private constructor() {}

  static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  // Подключение к WebSocket серверу
  async connect(): Promise<boolean> {
    try {
      const token = await AsyncStorage.getItem('authToken');
      
      if (!token) {
        return false;
      }

      const serverUrl = 'http://localhost:3001';
      
      this.socket = io(serverUrl, {
        auth: {
          token
        },
        transports: ['websocket', 'polling'],
        timeout: 10000,
        forceNew: true
      });

      this.setupEventHandlers();
      
      return new Promise((resolve) => {
        this.socket!.on('connect', () => {
          this.isConnected = true;
          this.reconnectAttempts = 0;
          resolve(true);
        });

        this.socket!.on('connect_error', (error) => {
          this.isConnected = false;
          resolve(false);
        });

        // Timeout для подключения
        setTimeout(() => {
          if (!this.isConnected) {
            resolve(false);
          }
        }, 10000);
      });
    } catch (error) {
      return false;
    }
  }

  // Настройка обработчиков событий
  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Системные события
    this.socket.on('connected', (data) => {
      });

    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;
      this.handleReconnect();
    });

    // Синхронизация
    this.socket.on('sync_response', (data) => {
      this.handleSyncResponse(data);
    });

    this.socket.on('sync_error', (data) => {
      });

    // Смены
    this.socket.on('shift_start_confirmed', (data) => {
      });

    this.socket.on('shift_end_confirmed', (data) => {
      });

    this.socket.on('shift_start_error', (data) => {
      });

    this.socket.on('shift_end_error', (data) => {
      });

    // Назначения
    this.socket.on('new_assignment', (data) => {
      this.handleNewAssignment(data);
    });

    this.socket.on('assignment_updated', (data) => {
      this.handleAssignmentUpdate(data);
    });

    this.socket.on('assignment_created_confirmed', (data) => {
      });

    // Профиль
    this.socket.on('profile_updated', (data) => {
      this.handleProfileUpdate(data);
    });

    // Объекты
    this.socket.on('site_updated', (data) => {
      this.handleSiteUpdate(data);
    });
  }

  // Обработка автоматического переподключения
  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    // Очищаем предыдущий таймаут если он есть
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect();
    }, delay);
  }

  // Отправка запроса синхронизации
  async requestSync(data: Record<string, unknown>): Promise<void> {
    if (!this.isConnected || !this.socket) {
      return;
    }

    this.socket.emit('sync_request', data);
  }

  // Уведомление о начале смены
  async notifyShiftStarted(data: {
    shiftId: string;
    siteId: string;
    siteName?: string;
    location?: { latitude: number; longitude: number };
  }): Promise<void> {
    if (!this.isConnected || !this.socket) {
      return;
    }

    this.socket.emit('shift_started', data);
  }

  // Уведомление об окончании смены
  async notifyShiftEnded(data: {
    shiftId: string;
    duration?: number;
    location?: { latitude: number; longitude: number };
  }): Promise<void> {
    if (!this.isConnected || !this.socket) {
      return;
    }

    this.socket.emit('shift_ended', data);
  }

  // Уведомление о создании назначения (для админов)
  async notifyAssignmentCreated(data: {
    assignmentId: string;
    userId: string;
    siteId: string;
    siteName?: string;
    validFrom?: Date;
    validTo?: Date;
    notes?: string;
  }): Promise<void> {
    if (!this.isConnected || !this.socket) {
      return;
    }

    this.socket.emit('assignment_created', data);
  }

  // Обработчики входящих событий
  private handleSyncResponse(data: Record<string, unknown>): void {
    // Здесь можно добавить логику обработки ответа синхронизации
    // Например, обновление локального состояния
    }

  private handleNewAssignment(data: Record<string, unknown>): void {
    // Уведомляем пользователя о новом назначении
    // Можно показать push-уведомление или обновить UI
    // Здесь можно добавить логику для показа уведомления
    // или обновления локальной базы данных
  }

  private handleAssignmentUpdate(data: Record<string, unknown>): void {
    // Обрабатываем обновление назначения
    }

  private handleProfileUpdate(data: Record<string, unknown>): void {
    // Обрабатываем обновление профиля пользователя
    }

  private handleSiteUpdate(data: Record<string, unknown>): void {
    // Обрабатываем обновление объекта
    }

  // Отключение от WebSocket
  disconnect(): void {
    // Очищаем таймаут переподключения
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Проверка статуса подключения
  isSocketConnected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  // Получение информации о подключении
  getConnectionInfo(): {
    connected: boolean;
    reconnectAttempts: number;
    socketId?: string;
  } {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      socketId: this.socket?.id
    };
  }

  // Подписка на конкретное событие
  on(event: string, callback: (data: Record<string, unknown>) => void): void {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  // Отписка от события
  off(event: string, callback?: (data: Record<string, unknown>) => void): void {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  // Отправка произвольного события
  emit(event: string, data: Record<string, unknown>): void {
    if (this.isConnected && this.socket) {
      this.socket.emit(event, data);
    } else {
      }
  }
} 

