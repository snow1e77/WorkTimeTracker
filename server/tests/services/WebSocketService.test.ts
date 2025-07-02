import { WebSocketService } from '../../src/services/WebSocketService';
import { Server as SocketIOServer, BroadcastOperator, DefaultEventsMap } from 'socket.io';
import { createServer, Server as HTTPServer } from 'http';
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Мокируем зависимости
jest.mock('../../src/utils/logger');

describe('WebSocketService', () => {
  let webSocketService: WebSocketService;
  let httpServer: HTTPServer;
  let io: SocketIOServer;

  beforeEach(() => {
    httpServer = createServer();
    webSocketService = new WebSocketService(httpServer);
    // Получаем доступ к io через приватное поле
    io = (webSocketService as any).io;
  });

  afterEach(() => {
    if (io) {
      io.close();
    }
    if (httpServer) {
      httpServer.close();
    }
  });

  describe('constructor', () => {
    it('должен инициализироваться корректно', () => {
      expect(webSocketService).toBeInstanceOf(WebSocketService);
    });
  });

  describe('notifyUser', () => {
    it('должен отправлять уведомление пользователю', () => {
      const mockEmit = jest.fn();
      const mockBroadcastOperator = {
        emit: mockEmit
      } as unknown as BroadcastOperator<DefaultEventsMap, any>;
      
      const mockTo = jest.fn().mockReturnValue(mockBroadcastOperator);
      io.to = mockTo as any;

      const userId = 'user-123';
      const event = 'notification';
      const data = { message: 'Hello' };

      webSocketService.notifyUser(userId, event, data);

      expect(mockTo).toHaveBeenCalledWith(`user_${userId}`);
      expect(mockEmit).toHaveBeenCalledWith(event, expect.objectContaining({
        message: 'Hello',
        timestamp: expect.any(Date)
      }));
    });
  });

  describe('notifyAdmins', () => {
    it('должен отправлять уведомление админам', () => {
      const mockEmit = jest.fn();
      const mockBroadcastOperator = {
        emit: mockEmit
      } as unknown as BroadcastOperator<DefaultEventsMap, any>;
      
      const mockTo = jest.fn().mockReturnValue(mockBroadcastOperator);
      io.to = mockTo as any;

      const event = 'admin-notification';
      const data = { message: 'Admin message' };

      webSocketService.notifyAdmins(event, data);

      expect(mockTo).toHaveBeenCalledWith('admins');
      expect(mockEmit).toHaveBeenCalledWith(event, expect.objectContaining({
        message: 'Admin message',
        timestamp: expect.any(Date)
      }));
    });
  });

  describe('getConnectedUsers', () => {
    it('должен возвращать список подключенных пользователей', () => {
      // Эмулируем подключенных пользователей
      const mockSocket1 = { user: { id: 'user1', name: 'User 1', role: 'worker' } };
      const mockSocket2 = { user: { id: 'user2', name: 'User 2', role: 'admin' } };
      
      (webSocketService as any).connectedUsers.set('user1', mockSocket1);
      (webSocketService as any).connectedUsers.set('user2', mockSocket2);

      const users = webSocketService.getConnectedUsers();
      
      expect(users).toEqual([
        { id: 'user1', name: 'User 1', role: 'worker' },
        { id: 'user2', name: 'User 2', role: 'admin' }
      ]);
    });

    it('должен возвращать пустой массив если нет подключенных пользователей', () => {
      const users = webSocketService.getConnectedUsers();
      expect(users).toEqual([]);
    });
  });

  describe('isUserConnected', () => {
    it('должен определять подключен ли пользователь', () => {
      const mockSocket = { user: { id: 'user1', name: 'User 1', role: 'worker' } };
      (webSocketService as any).connectedUsers.set('user1', mockSocket);

      expect(webSocketService.isUserConnected('user1')).toBe(true);
      expect(webSocketService.isUserConnected('user2')).toBe(false);
    });
  });

  describe('getConnectedUsersCount', () => {
    it('должен считать количество подключенных пользователей', () => {
      const mockSocket1 = { user: { id: 'user1', name: 'User 1', role: 'worker' } };
      const mockSocket2 = { user: { id: 'user2', name: 'User 2', role: 'admin' } };
      
      (webSocketService as any).connectedUsers.set('user1', mockSocket1);
      (webSocketService as any).connectedUsers.set('user2', mockSocket2);

      expect(webSocketService.getConnectedUsersCount()).toBe(2);
    });

    it('должен возвращать 0 если нет подключенных пользователей', () => {
      expect(webSocketService.getConnectedUsersCount()).toBe(0);
    });
  });

  describe('события сокетов', () => {
    it('должен обрабатывать подключение сокета', (done) => {
      const mockSocket = {
        id: 'socket1',
        user: { id: 'user1', name: 'User 1', role: 'worker' },
        join: jest.fn(),
        on: jest.fn(),
        emit: jest.fn()
      };

      // Эмулируем событие подключения
      const mockOn = jest.fn().mockReturnValue(io);
      io.on = mockOn as any;
      
      // Инициализируем обработчики событий вручную
      (webSocketService as any).setupEventHandlers();
      
      // Проверяем, что io.on был вызван
      expect(mockOn).toHaveBeenCalledWith('connection', expect.any(Function));
      done();
    });
  });

  describe('broadcast', () => {
    it('должен отправлять широковещательное сообщение', () => {
      const mockEmit = jest.fn().mockReturnValue(true);
      io.emit = mockEmit as any;

      const event = 'global-announcement';
      const data = { message: 'Global message' };

      webSocketService.broadcast(event, data);

      expect(mockEmit).toHaveBeenCalledWith(event, expect.objectContaining({
        message: 'Global message',
        timestamp: expect.any(Date)
      }));
    });
  });

  describe('disconnectUser', () => {
    it('должен принудительно отключать пользователя', () => {
      const mockSocket = {
        user: { id: 'user1', name: 'User 1', role: 'worker' },
        disconnect: jest.fn()
      };
      
      (webSocketService as any).connectedUsers.set('user1', mockSocket);

      webSocketService.disconnectUser('user1');

      expect(mockSocket.disconnect).toHaveBeenCalledWith(true);
      expect((webSocketService as any).connectedUsers.has('user1')).toBe(false);
    });

    it('должен корректно обрабатывать отключение несуществующего пользователя', () => {
      expect(() => {
        webSocketService.disconnectUser('nonexistent-user');
      }).not.toThrow();
    });
  });

  describe('обработка ошибок', () => {
    it('должен обрабатывать ошибки при отправке уведомлений', () => {
      const mockEmit = jest.fn().mockImplementation(() => {
        throw new Error('Socket error');
      });
      const mockBroadcastOperator = {
        emit: mockEmit
      } as unknown as BroadcastOperator<DefaultEventsMap, any>;
      
      const mockTo = jest.fn().mockReturnValue(mockBroadcastOperator);
      io.to = mockTo as any;

      // Должен не падать при ошибке
      expect(() => {
        webSocketService.notifyUser('user1', 'test-event', {});
      }).not.toThrow();
    });

    it('должен обрабатывать некорректные данные', () => {
      const mockEmit = jest.fn();
      const mockBroadcastOperator = {
        emit: mockEmit
      } as unknown as BroadcastOperator<DefaultEventsMap, any>;
      
      const mockTo = jest.fn().mockReturnValue(mockBroadcastOperator);
      io.to = mockTo as any;

      // Должен обрабатывать null/undefined
      expect(() => {
        webSocketService.notifyUser(null as any, 'event', {});
        webSocketService.notifyAdmins('event', {});
      }).not.toThrow();
    });
  });

  describe('интеграционные тесты', () => {
    it('должен правильно обрабатывать последовательность событий', () => {
      // Подключение пользователя
      const mockSocket = { user: { id: 'user1', name: 'User 1', role: 'worker' } };
      (webSocketService as any).connectedUsers.set('user1', mockSocket);
      
      // Проверяем что пользователь подключен
      expect(webSocketService.isUserConnected('user1')).toBe(true);
      expect(webSocketService.getConnectedUsersCount()).toBe(1);
      
      // Отправляем уведомление пользователю
      const mockEmit = jest.fn();
      const mockBroadcastOperator = {
        emit: mockEmit
      } as unknown as BroadcastOperator<DefaultEventsMap, any>;
      
      const mockTo = jest.fn().mockReturnValue(mockBroadcastOperator);
      io.to = mockTo as any;
      
      webSocketService.notifyUser('user1', 'message', { text: 'Hello' });
      
      expect(mockTo).toHaveBeenCalledWith('user_user1');
      
      // Отключение пользователя
      (webSocketService as any).connectedUsers.delete('user1');
      
      expect(webSocketService.isUserConnected('user1')).toBe(false);
      expect(webSocketService.getConnectedUsersCount()).toBe(0);
    });
  });
}); 