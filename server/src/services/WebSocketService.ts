import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { User } from '../types';

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
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('No token provided'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
        
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
        console.error('WebSocket authentication error:', error);
        next(new Error('Authentication failed'));
      }
    });
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log(`📱 User ${socket.user?.name} (${socket.user?.id}) connected via WebSocket`);
      
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
      socket.on('sync_request', async (data) => {
        await this.handleSyncRequest(socket, data);
      });

      socket.on('shift_started', async (data) => {
        await this.handleShiftStarted(socket, data);
      });

      socket.on('shift_ended', async (data) => {
        await this.handleShiftEnded(socket, data);
      });

      socket.on('assignment_created', async (data) => {
        await this.handleAssignmentCreated(socket, data);
      });

      socket.on('disconnect', () => {
        console.log(`📱 User ${socket.user?.name} disconnected`);
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
  private async handleSyncRequest(socket: AuthenticatedSocket, data: any): Promise<void> {
    try {
      console.log(`🔄 Sync request from ${socket.user?.name}:`, data);
      
      // Здесь была бы логика синхронизации
      // Пока отправляем подтверждение
      socket.emit('sync_response', {
        success: true,
        timestamp: new Date(),
        message: 'Sync completed successfully'
      });
    } catch (error) {
      console.error('Sync request error:', error);
      socket.emit('sync_error', {
        error: 'Failed to process sync request'
      });
    }
  }

  // Обработка начала смены
  private async handleShiftStarted(socket: AuthenticatedSocket, data: any): Promise<void> {
    try {
      console.log(`▶️ Shift started by ${socket.user?.name}:`, data);
      
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
      console.error('Shift start error:', error);
      socket.emit('shift_start_error', {
        error: 'Failed to start shift'
      });
    }
  }

  // Обработка окончания смены
  private async handleShiftEnded(socket: AuthenticatedSocket, data: any): Promise<void> {
    try {
      console.log(`⏹️ Shift ended by ${socket.user?.name}:`, data);
      
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
      console.error('Shift end error:', error);
      socket.emit('shift_end_error', {
        error: 'Failed to end shift'
      });
    }
  }

  // Обработка создания назначения
  private async handleAssignmentCreated(socket: AuthenticatedSocket, data: any): Promise<void> {
    try {
      console.log(`📋 Assignment created by admin ${socket.user?.name}:`, data);
      
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
      console.error('Assignment creation error:', error);
      socket.emit('assignment_creation_error', {
        error: 'Failed to create assignment'
      });
    }
  }

  // Отправка уведомления конкретному пользователю
  public notifyUser(userId: string, event: string, data: any): void {
    this.io.to(`user_${userId}`).emit(event, {
      ...data,
      timestamp: new Date()
    });
  }

  // Отправка уведомления всем админам
  public notifyAdmins(event: string, data: any): void {
    this.io.to('admins').emit(event, {
      ...data,
      timestamp: new Date()
    });
  }

  // Широковещательное уведомление всем подключенным пользователям
  public broadcast(event: string, data: any): void {
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
      console.log(`🚪 User ${userId} forcibly disconnected`);
    }
  }
} 