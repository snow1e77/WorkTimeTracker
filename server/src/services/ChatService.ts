import { pool } from '../config/database';
import { Chat, ChatMessage, DailyTask, PhotoReport } from '../types';
import logger from '../utils/logger';

export class ChatService {
  // Get or create chat between worker and foreman
  static async getOrCreateChat(workerId: string, foremanId: string): Promise<{ success: boolean; data?: Chat; error?: string }> {
    try {
      // First try to find existing chat
      const existingChatQuery = `
        SELECT c.*, 
               w.name as worker_name,
               f.name as foreman_name,
               (SELECT COUNT(*) FROM chat_messages cm WHERE cm.chat_id = c.id AND cm.is_read = false AND cm.sender_id != $2) as unread_count
        FROM chats c
        JOIN users w ON c.worker_id = w.id
        JOIN users f ON c.foreman_id = f.id
        WHERE c.worker_id = $1 AND c.foreman_id = $2
      `;
      
      const existingResult = await pool.query(existingChatQuery, [workerId, foremanId]);
      
      if (existingResult.rows.length > 0) {
        const row = existingResult.rows[0];
        return {
          success: true,
          data: {
            id: row.id,
            workerId: row.worker_id,
            workerName: row.worker_name,
            foremanId: row.foreman_id,
            foremanName: row.foreman_name,
            unreadCount: parseInt(row.unread_count),
            isActive: row.is_active,
            createdAt: row.created_at
          }
        };
      }
      
      // Create new chat if doesn't exist
      const createChatQuery = `
        INSERT INTO chats (worker_id, foreman_id) 
        VALUES ($1, $2) 
        RETURNING id, created_at
      `;
      
      const createResult = await pool.query(createChatQuery, [workerId, foremanId]);
      const newChat = createResult.rows[0];
      
      // Get worker and foreman names
      const namesQuery = `
        SELECT w.name as worker_name, f.name as foreman_name
        FROM users w, users f
        WHERE w.id = $1 AND f.id = $2
      `;
      
      const namesResult = await pool.query(namesQuery, [workerId, foremanId]);
      const names = namesResult.rows[0];
      
      return {
        success: true,
        data: {
          id: newChat.id,
          workerId,
          workerName: names.worker_name,
          foremanId,
          foremanName: names.foreman_name,
          unreadCount: 0,
          isActive: true,
          createdAt: newChat.created_at
        }
      };
      
    } catch (error) {
      logger.error('Error in getOrCreateChat', {
        error: error instanceof Error ? error.message : 'Unknown error',
        workerId,
        foremanId
      });
      return {
        success: false,
        error: 'Failed to get or create chat'
      };
    }
  }

  // Get chats for foreman (admin panel)
  static async getChatsForForeman(foremanId: string): Promise<{ success: boolean; data?: Chat[]; error?: string }> {
    try {
      const query = `
        SELECT c.*, 
               w.name as worker_name,
               f.name as foreman_name,
               (SELECT COUNT(*) FROM chat_messages cm WHERE cm.chat_id = c.id AND cm.is_read = false AND cm.sender_id = c.worker_id) as unread_count,
               (SELECT content FROM chat_messages cm WHERE cm.chat_id = c.id ORDER BY cm.created_at DESC LIMIT 1) as last_message_content,
               (SELECT created_at FROM chat_messages cm WHERE cm.chat_id = c.id ORDER BY cm.created_at DESC LIMIT 1) as last_message_time,
               (SELECT MAX(created_at) FROM photo_reports pr WHERE pr.chat_id = c.id) as last_photo_time,
               (SELECT task_description FROM daily_tasks dt WHERE dt.chat_id = c.id AND dt.assigned_date = CURRENT_DATE) as current_task
        FROM chats c
        JOIN users w ON c.worker_id = w.id
        JOIN users f ON c.foreman_id = f.id
        WHERE c.foreman_id = $1 AND c.is_active = true
        ORDER BY c.updated_at DESC
      `;
      
      const result = await pool.query(query, [foremanId]);
      
      const chats: Chat[] = result.rows.map(row => ({
        id: row.id,
        workerId: row.worker_id,
        workerName: row.worker_name,
        foremanId: row.foreman_id,
        foremanName: row.foreman_name,
        unreadCount: parseInt(row.unread_count),
        currentTask: row.current_task,
        lastPhotoTime: row.last_photo_time,
        isActive: row.is_active,
        createdAt: row.created_at,
        lastMessage: row.last_message_content ? {
          id: '',
          chatId: row.id,
          senderId: '',
          senderName: '',
          senderRole: 'worker',
          messageType: 'text',
          content: row.last_message_content,
          timestamp: row.last_message_time,
          isRead: false
        } : undefined
      }));
      
      return {
        success: true,
        data: chats
      };
      
    } catch (error) {
      return {
        success: false,
        error: 'Failed to get chats'
      };
    }
  }

  // Send message
  static async sendMessage(chatId: string, senderId: string, messageType: 'text' | 'photo' | 'task', content: string, photoUri?: string, latitude?: number, longitude?: number): Promise<{ success: boolean; data?: ChatMessage; error?: string }> {
    try {
      const query = `
        INSERT INTO chat_messages (chat_id, sender_id, message_type, content, photo_uri, latitude, longitude) 
        VALUES ($1, $2, $3, $4, $5, $6, $7) 
        RETURNING id, created_at
      `;
      
      const result = await pool.query(query, [chatId, senderId, messageType, content, photoUri, latitude, longitude]);
      const newMessage = result.rows[0];
      
      // Get sender info
      const senderQuery = `
        SELECT name, role FROM users WHERE id = $1
      `;
      
      const senderResult = await pool.query(senderQuery, [senderId]);
      const sender = senderResult.rows[0];
      
      // Update chat updated_at
      await pool.query('UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [chatId]);
      
      return {
        success: true,
        data: {
          id: newMessage.id,
          chatId,
          senderId,
          senderName: sender.name,
          senderRole: sender.role,
          messageType,
          content,
          photoUri,
          latitude,
          longitude,
          timestamp: newMessage.created_at,
          isRead: false
        }
      };
      
    } catch (error) {
      return {
        success: false,
        error: 'Failed to send message'
      };
    }
  }

  // Get messages for chat
  static async getChatMessages(chatId: string, limit: number = 50, offset: number = 0): Promise<{ success: boolean; data?: ChatMessage[]; error?: string }> {
    try {
      const query = `
        SELECT cm.*, u.name as sender_name, u.role as sender_role
        FROM chat_messages cm
        JOIN users u ON cm.sender_id = u.id
        WHERE cm.chat_id = $1
        ORDER BY cm.created_at DESC
        LIMIT $2 OFFSET $3
      `;
      
      const result = await pool.query(query, [chatId, limit, offset]);
      
      const messages: ChatMessage[] = result.rows.map(row => ({
        id: row.id,
        chatId: row.chat_id,
        senderId: row.sender_id,
        senderName: row.sender_name,
        senderRole: row.sender_role,
        messageType: row.message_type,
        content: row.content,
        photoUri: row.photo_uri,
        latitude: row.latitude,
        longitude: row.longitude,
        timestamp: row.created_at,
        isRead: row.is_read,
        isPinned: row.is_pinned
      }));
      
      return {
        success: true,
        data: messages.reverse() // Return in chronological order
      };
      
    } catch (error) {
      return {
        success: false,
        error: 'Failed to get messages'
      };
    }
  }

  // Mark messages as read
  static async markMessagesAsRead(chatId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const query = `
        UPDATE chat_messages 
        SET is_read = true, read_at = CURRENT_TIMESTAMP 
        WHERE chat_id = $1 AND sender_id != $2 AND is_read = false
      `;
      
      await pool.query(query, [chatId, userId]);
      
      return { success: true };
      
    } catch (error) {
      return {
        success: false,
        error: 'Failed to mark messages as read'
      };
    }
  }

  // Assign daily task
  static async assignDailyTask(chatId: string, assignedBy: string, assignedTo: string, taskDescription: string): Promise<{ success: boolean; data?: DailyTask; error?: string }> {
    try {
      // First, check if task already exists for today
      const existingQuery = `
        SELECT id FROM daily_tasks 
        WHERE chat_id = $1 AND assigned_date = CURRENT_DATE
      `;
      
      const existingResult = await pool.query(existingQuery, [chatId]);
      
      if (existingResult.rows.length > 0) {
        // Update existing task
        const updateQuery = `
          UPDATE daily_tasks 
          SET task_description = $1, assigned_by = $2, is_completed = false, completed_at = null
          WHERE chat_id = $3 AND assigned_date = CURRENT_DATE
          RETURNING *
        `;
        
        const result = await pool.query(updateQuery, [taskDescription, assignedBy, chatId]);
        const task = result.rows[0];
        
        return {
          success: true,
          data: {
            id: task.id,
            chatId: task.chat_id,
            assignedBy: task.assigned_by,
            assignedTo: task.assigned_to,
            taskDescription: task.task_description,
            assignedDate: task.assigned_date,
            isCompleted: task.is_completed,
            completedAt: task.completed_at
          }
        };
      } else {
        // Create new task
        const insertQuery = `
          INSERT INTO daily_tasks (chat_id, assigned_by, assigned_to, task_description, assigned_date) 
          VALUES ($1, $2, $3, $4, CURRENT_DATE) 
          RETURNING *
        `;
        
        const result = await pool.query(insertQuery, [chatId, assignedBy, assignedTo, taskDescription]);
        const task = result.rows[0];
        
        return {
          success: true,
          data: {
            id: task.id,
            chatId: task.chat_id,
            assignedBy: task.assigned_by,
            assignedTo: task.assigned_to,
            taskDescription: task.task_description,
            assignedDate: task.assigned_date,
            isCompleted: task.is_completed,
            completedAt: task.completed_at
          }
        };
      }
      
    } catch (error) {
      return {
        success: false,
        error: 'Failed to assign daily task'
      };
    }
  }

  // Get today's task
  static async getTodaysTask(chatId: string): Promise<{ success: boolean; data?: DailyTask; error?: string }> {
    try {
      const query = `
        SELECT * FROM daily_tasks 
        WHERE chat_id = $1 AND assigned_date = CURRENT_DATE
      `;
      
      const result = await pool.query(query, [chatId]);
      
      if (result.rows.length === 0) {
        return { success: true, data: undefined };
      }
      
      const task = result.rows[0];
      
      return {
        success: true,
        data: {
          id: task.id,
          chatId: task.chat_id,
          assignedBy: task.assigned_by,
          assignedTo: task.assigned_to,
          taskDescription: task.task_description,
          assignedDate: task.assigned_date,
          isCompleted: task.is_completed,
          completedAt: task.completed_at
        }
      };
      
    } catch (error) {
      return {
        success: false,
        error: 'Failed to get today\'s task'
      };
    }
  }

  // Save photo report
  static async savePhotoReport(chatId: string, messageId: string, userId: string, photoUri: string, latitude: number, longitude: number): Promise<{ success: boolean; data?: PhotoReport; error?: string }> {
    try {
      const query = `
        INSERT INTO photo_reports (chat_id, message_id, user_id, photo_uri, latitude, longitude) 
        VALUES ($1, $2, $3, $4, $5, $6) 
        RETURNING *
      `;
      
      const result = await pool.query(query, [chatId, messageId, userId, photoUri, latitude, longitude]);
      const report = result.rows[0];
      
      return {
        success: true,
        data: {
          id: report.id,
          chatId: report.chat_id,
          messageId: report.message_id,
          userId: report.user_id,
          photoUri: report.photo_uri,
          latitude: report.latitude,
          longitude: report.longitude,
          timestamp: report.created_at,
          isValidated: report.is_validated,
          validatedBy: report.validated_by,
          validatedAt: report.validated_at,
          notes: report.notes
        }
      };
      
    } catch (error) {
      return {
        success: false,
        error: 'Failed to save photo report'
      };
    }
  }

  // Validate photo report
  static async validatePhotoReport(reportId: string, validatedBy: string, notes?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const query = `
        UPDATE photo_reports 
        SET is_validated = true, validated_by = $1, validated_at = CURRENT_TIMESTAMP, notes = $2 
        WHERE id = $3
      `;
      
      await pool.query(query, [validatedBy, notes, reportId]);
      
      return { success: true };
      
    } catch (error) {
      return {
        success: false,
        error: 'Failed to validate photo report'
      };
    }
  }
} 
