import { API_CONFIG, getApiUrl } from '../config/api';
import { apiClient } from './ApiClient';
import logger from '../utils/logger';

export interface WebSocketMessage {
  type: string;
  data: Record<string, unknown>;
  timestamp: Date;
}

export class WebSocketService {
  private static instance: WebSocketService;
  private ws: WebSocket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private messageHandlers: Map<string, (data: Record<string, unknown>) => void> = new Map();
  private connectionPromise: Promise<boolean> | null = null;

  private constructor() {}

  static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  private getWebSocketUrl(): string {
    // Конвертируем HTTP URL в WebSocket URL
    const apiUrl = API_CONFIG.BASE_URL || getApiUrl('');
    const wsUrl = apiUrl
      .replace(/^https:\/\//, 'wss://') // HTTPS -> WSS
      .replace(/^http:\/\//, 'ws://')   // HTTP -> WS
      .replace('/api', '');
    return wsUrl;
  }

  async connect(): Promise<boolean> {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = this._connect();
    return this.connectionPromise;
  }

  private async _connect(): Promise<boolean> {
    try {
      const token = apiClient.getAccessToken();
      if (!token) {
        logger.warn('No auth token available for WebSocket connection', {}, 'websocket');
        this.connectionPromise = null;
        return false;
      }

      const serverUrl = this.getWebSocketUrl();
      logger.info('Connecting to WebSocket', { url: serverUrl }, 'websocket');
      
      this.ws = new WebSocket(`${serverUrl}?token=${token}`);

      return new Promise((resolve) => {
        if (!this.ws) {
          this.connectionPromise = null;
          resolve(false);
          return;
        }

        // Добавляем timeout для соединения
        const connectionTimeout = setTimeout(() => {
          logger.warn('WebSocket connection timeout', {}, 'websocket');
          if (this.ws) {
            this.ws.close();
          }
          this.connectionPromise = null;
          resolve(false);
        }, 10000); // 10 секунд timeout

        this.ws.onopen = () => {
          clearTimeout(connectionTimeout);
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.connectionPromise = null;
          logger.info('WebSocket connected successfully', {}, 'websocket');
          resolve(true);
        };

        this.ws.onerror = (error) => {
          clearTimeout(connectionTimeout);
          logger.error('WebSocket connection error', { error: error.toString() }, 'websocket');
          this.connectionPromise = null;
          resolve(false);
        };

        this.ws.onclose = () => {
          clearTimeout(connectionTimeout);
          this.isConnected = false;
          this.connectionPromise = null;
          logger.info('WebSocket connection closed', {}, 'websocket');
          this.handleReconnect();
        };

        this.ws.onmessage = (event) => {
          this.handleIncomingMessage(event);
        };
      });
    } catch (error) {
      logger.error('Failed to establish WebSocket connection', { error: error instanceof Error ? error.message : 'Unknown error' }, 'websocket');
      this.connectionPromise = null;
      return false;
    }
  }

  // Централизованная обработка входящих сообщений
  private handleIncomingMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data);
      const { type, data } = message;

      // Проверяем, есть ли специфический обработчик для этого типа сообщения
      const handler = this.messageHandlers.get(type);
      if (handler) {
        handler(data);
        return;
      }

      // Обрабатываем стандартные типы сообщений
      switch (type) {
        case 'sync_response':
          this.handleSyncResponse(data);
          break;
        case 'new_assignment':
          this.handleNewAssignment(data);
          break;
        case 'assignment_update':
          this.handleAssignmentUpdate(data);
          break;
        case 'profile_update':
          this.handleProfileUpdate(data);
          break;
        case 'site_update':
          this.handleSiteUpdate(data);
          break;
        case 'shift_event':
          this.handleShiftEvent(data);
          break;
        default:
          logger.warn('Unhandled WebSocket message type', { type, data }, 'websocket');
      }
    } catch (error) {
      logger.error('Failed to parse WebSocket message', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        rawData: event.data
      }, 'websocket');
    }
  }

  // Обработка автоматического переподключения
  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.warn('Max reconnection attempts reached', { attempts: this.reconnectAttempts }, 'websocket');
      return;
    }

    this.reconnectAttempts++;
    const delay = 1000 * Math.pow(2, this.reconnectAttempts - 1);
    
    logger.info('Attempting to reconnect WebSocket', { 
      attempt: this.reconnectAttempts,
      delay
    }, 'websocket');

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  // Отправка запроса синхронизации
  async requestSync(data: Record<string, unknown>): Promise<void> {
    if (!this.isConnected || !this.ws) {
      logger.warn('Cannot send sync request - WebSocket not connected', {}, 'websocket');
      return;
    }

    this.ws.send(JSON.stringify({ type: 'sync_request', data }));
  }

  // Уведомление о начале смены
  async notifyShiftStarted(data: {
    shiftId: string;
    siteId: string;
    siteName?: string;
    location?: { latitude: number; longitude: number };
  }): Promise<void> {
    if (!this.isConnected || !this.ws) {
      logger.warn('Cannot send shift started notification - WebSocket not connected', {}, 'websocket');
      return;
    }

    this.ws.send(JSON.stringify({ type: 'shift_started', data }));
  }

  // Уведомление об окончании смены
  async notifyShiftEnded(data: {
    shiftId: string;
    duration?: number;
    location?: { latitude: number; longitude: number };
  }): Promise<void> {
    if (!this.isConnected || !this.ws) {
      logger.warn('Cannot send shift ended notification - WebSocket not connected', {}, 'websocket');
      return;
    }

    this.ws.send(JSON.stringify({ type: 'shift_ended', data }));
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
    if (!this.isConnected || !this.ws) {
      logger.warn('Cannot send assignment created notification - WebSocket not connected', {}, 'websocket');
      return;
    }

    this.ws.send(JSON.stringify({ type: 'assignment_created', data }));
  }

  // Обработчики входящих событий
  private handleSyncResponse(data: Record<string, unknown>): void {
    logger.info('Received sync response', { dataKeys: Object.keys(data) }, 'websocket');
    // Здесь можно добавить логику обработки ответа синхронизации
  }

  private handleNewAssignment(data: Record<string, unknown>): void {
    logger.info('Received new assignment', { data }, 'websocket');
    // Уведомляем пользователя о новом назначении
  }

  private handleAssignmentUpdate(data: Record<string, unknown>): void {
    logger.info('Received assignment update', { data }, 'websocket');
    // Обрабатываем обновление назначения
  }

  private handleProfileUpdate(data: Record<string, unknown>): void {
    logger.info('Received profile update', { data }, 'websocket');
    // Обрабатываем обновление профиля пользователя
  }

  private handleSiteUpdate(data: Record<string, unknown>): void {
    logger.info('Received site update', { data }, 'websocket');
    // Обрабатываем обновление объекта
  }

  private handleShiftEvent(data: Record<string, unknown>): void {
    logger.info('Received shift event', { data }, 'websocket');
    // Обрабатываем события смены
  }

  // Отключение от WebSocket
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
      this.reconnectAttempts = 0;
      this.connectionPromise = null;
    }
  }

  // Проверка статуса подключения
  isSocketConnected(): boolean {
    return this.isConnected && this.ws?.readyState === WebSocket.OPEN;
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
      socketId: this.ws?.url
    };
  }

  // Подписка на конкретное событие
  on(event: string, callback: (data: Record<string, unknown>) => void): void {
    this.messageHandlers.set(event, callback);
  }

  // Отписка от события
  off(event: string): void {
    this.messageHandlers.delete(event);
  }

  // Отправка произвольного события
  emit(event: string, data: Record<string, unknown>): void {
    if (this.isConnected && this.ws) {
      this.ws.send(JSON.stringify({ type: event, data }));
    } else {
      logger.warn('Cannot emit event - WebSocket not connected', { event }, 'websocket');
    }
  }
} 

