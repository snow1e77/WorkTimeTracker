import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { User } from '../types';

type SocketMiddleware = (socket: AuthenticatedSocket, next: (err?: Error) => void) => void;

interface SyncRequestData {
  lastSyncTimestamp?: string;
  entityTypes?: string[];
}

interface ShiftData {
  shiftId: string;
  siteId: string;
  siteName: string;
  location: {
    latitude: number;
    longitude: number;
  };
  duration?: number;
}

interface AssignmentData {
  assignmentId: string;
  userId: string;
  siteId: string;
  siteName: string;
  validFrom?: string;
  validTo?: string;
  notes?: string;
}

interface AuthenticatedSocket extends Socket {
  user?: User;
}

export class WebSocketService {
  private io: SocketIOServer;
  private connectedUsers = new Map<string, AuthenticatedSocket>();

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.CORS_ORIGINS?.split(',') || [
          'http://localhost:19006',
          'http://localhost:3000',
          'http://localhost:8081'
        ],
        credentials: true
      }
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware(): void {
    // Аутентификация через WebSocket
    this.io.use(async (socket: AuthenticatedSocket, next: (err?: Error) => void) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('No token provided'));
        }

        if (!process.env.JWT_SECRET) {
          throw new Error('JWT_SECRET environment variable is required');
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
        
        // В реальном приложении здесь была бы проверка пользователя в БД
        socket.user = {
          id: decoded.id,
          phoneNumber: decoded.phoneNumber,
          name: decoded.name,
          role: decoded.role,
          isActive: true,
          isVerified: true,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        next();
      } catch (error) {
        next(new Error('Authentication failed'));
      }
    });
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      if (socket.user) {
        this.connectedUsers.set(socket.user.id, socket);
      }

      // Присоединяемся к комнате пользователя для персонализированных уведомлений
      if (socket.user) {
        socket.join(`user_${socket.user.id}`);
        
        // Если админ, присоединяемся к админ комнате
        if (socket.user.role === 'admin') {
          socket.join('admins');
        }
      }

      // Обработчики событий синхронизации
      socket.on('sync_request', async (data: SyncRequestData) => {
        await this.handleSyncRequest(socket, data);
      });

      socket.on('shift_started', async (data: ShiftData) => {
        await this.handleShiftStarted(socket, data);
      });

      socket.on('shift_ended', async (data: ShiftData) => {
        await this.handleShiftEnded(socket, data);
      });

      socket.on('assignment_created', async (data: AssignmentData) => {
        await this.handleAssignmentCreated(socket, data);
      });

      socket.on('disconnect', () => {
        if (socket.user) {
          this.connectedUsers.delete(socket.user.id);
        }
      });

      // Отправляем приветственное сообщение
      socket.emit('connected', {
        message: 'Connected to WorkTime sync server',
        timestamp: new Date(),
        user: socket.user
      });
    });
  }

  // Обработка запроса синхронизации
  private async handleSyncRequest(socket: AuthenticatedSocket, data: SyncRequestData): Promise<void> {
    try {
      // Здесь была бы логика синхронизации
      // Пока отправляем подтверждение
      socket.emit('sync_response', {
        success: true,
        timestamp: new Date(),
        message: 'Sync completed successfully'
      });
    } catch (error) {
      socket.emit('sync_error', {
        error: 'Failed to process sync request'
      });
    }
  }

  // Обработка начала смены
  private async handleShiftStarted(socket: AuthenticatedSocket, data: ShiftData): Promise<void> {
    try {
      // Уведомляем всех админов о начале смены
      this.io.to('admins').emit('user_shift_started', {
        userId: socket.user?.id,
        userName: socket.user?.name,
        siteId: data.siteId,
        siteName: data.siteName,
        timestamp: new Date(),
        location: data.location
      });

      // Подтверждение пользователю
      socket.emit('shift_start_confirmed', {
        success: true,
        shiftId: data.shiftId,
        timestamp: new Date()
      });
    } catch (error) {
      socket.emit('shift_start_error', {
        error: 'Failed to start shift'
      });
    }
  }

  // Обработка окончания смены
  private async handleShiftEnded(socket: AuthenticatedSocket, data: ShiftData): Promise<void> {
    try {
      // Уведомляем админов об окончании смены
      this.io.to('admins').emit('user_shift_ended', {
        userId: socket.user?.id,
        userName: socket.user?.name,
        shiftId: data.shiftId,
        duration: data.duration,
        timestamp: new Date(),
        location: data.location
      });

      socket.emit('shift_end_confirmed', {
        success: true,
        shiftId: data.shiftId,
        timestamp: new Date()
      });
    } catch (error) {
      socket.emit('shift_end_error', {
        error: 'Failed to end shift'
      });
    }
  }

  // Обработка создания назначения
  private async handleAssignmentCreated(socket: AuthenticatedSocket, data: AssignmentData): Promise<void> {
    try {
      // Уведомляем конкретного пользователя о новом назначении
      if (data.userId) {
        this.io.to(`user_${data.userId}`).emit('new_assignment', {
          assignmentId: data.assignmentId,
          siteId: data.siteId,
          siteName: data.siteName,
          assignedBy: socket.user?.name,
          timestamp: new Date(),
          validFrom: data.validFrom,
          validTo: data.validTo,
          notes: data.notes
        });
      }

      // Подтверждение админу
      socket.emit('assignment_created_confirmed', {
        success: true,
        assignmentId: data.assignmentId,
        timestamp: new Date()
      });
    } catch (error) {
      socket.emit('assignment_creation_error', {
        error: 'Failed to create assignment'
      });
    }
  }

  // Отправка уведомления конкретному пользователю
  public notifyUser(userId: string, event: string, data: Record<string, unknown>): void {
    this.io.to(`user_${userId}`).emit(event, {
      ...data,
      timestamp: new Date()
    });
  }

  // Отправка уведомления всем админам
  public notifyAdmins(event: string, data: Record<string, unknown>): void {
    this.io.to('admins').emit(event, {
      ...data,
      timestamp: new Date()
    });
  }

  // Широковещательное уведомление всем подключенным пользователям
  public broadcast(event: string, data: Record<string, unknown>): void {
    this.io.emit(event, {
      ...data,
      timestamp: new Date()
    });
  }

  // Получить количество подключенных пользователей
  public getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  // Получить список подключенных пользователей
  public getConnectedUsers(): Array<{ id: string; name: string; role: string }> {
    return Array.from(this.connectedUsers.values()).map(socket => ({
      id: socket.user!.id,
      name: socket.user!.name,
      role: socket.user!.role
    }));
  }

  // Проверить, подключен ли пользователь
  public isUserConnected(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  // Принудительно отключить пользователя
  public disconnectUser(userId: string): void {
    const socket = this.connectedUsers.get(userId);
    if (socket) {
      socket.disconnect(true);
      this.connectedUsers.delete(userId);
      }
  }
} 

