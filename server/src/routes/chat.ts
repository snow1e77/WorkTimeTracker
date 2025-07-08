import express from 'express';
import Joi from 'joi';
import { ChatService } from '../services/ChatService';
import { validateJSON } from '../middleware/auth';
import {
  SendMessageRequest,
  AssignTaskRequest,
  ValidatePhotoRequest,
} from '../types';

const router = express.Router();

// All chat routes require authentication
// router.use(authenticateToken);

// Validation schemas
const sendMessageSchema = Joi.object({
  chatId: Joi.string().uuid().required(),
  messageType: Joi.string().valid('text', 'photo', 'task').required(),
  content: Joi.string().required(),
  photoUri: Joi.string().optional(),
  latitude: Joi.number().optional(),
  longitude: Joi.number().optional(),
});

const assignTaskSchema = Joi.object({
  chatId: Joi.string().uuid().required(),
  taskDescription: Joi.string().min(5).max(500).required(),
});

const validatePhotoSchema = Joi.object({
  reportId: Joi.string().uuid().required(),
  notes: Joi.string().optional(),
});

// GET /api/chat/my-chat - Get chat for worker (between worker and their foreman)
router.get('/my-chat', async (req, res) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;

    if (userRole !== 'worker') {
      return res.status(403).json({
        success: false,
        error: 'Only workers can access this endpoint',
      });
    }

    // Find the worker's foreman - for now, we'll assume the first admin is the foreman
    // In production, you might want to have a specific assignment table
    const foremanQuery = `
      SELECT id FROM users WHERE role = 'admin' AND is_active = true LIMIT 1
    `;

    const { pool } = await import('../config/database');
    const foremanResult = await pool.query(foremanQuery);

    if (foremanResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No active foreman found',
      });
    }

    const foremanId = foremanResult.rows[0].id;
    const result = await ChatService.getOrCreateChat(userId, foremanId);

    if (result.success) {
      return res.json({
        success: true,
        data: result.data,
      });
    } else {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to get chat',
    });
  }
});

// GET /api/chat/foreman-chats - Get all chats for foreman (admin panel)
router.get('/foreman-chats', async (req, res) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;

    if (userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only admins can access this endpoint',
      });
    }

    const result = await ChatService.getChatsForForeman(userId);

    if (result.success) {
      return res.json({
        success: true,
        data: result.data,
      });
    } else {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to get chats',
    });
  }
});

// GET /api/chat/:chatId/messages - Get messages for a specific chat
router.get('/:chatId/messages', async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    // Verify user has access to this chat
    const { pool } = await import('../config/database');
    const accessQuery = `
      SELECT id FROM chats WHERE id = $1 AND (worker_id = $2 OR foreman_id = $2)
    `;

    const accessResult = await pool.query(accessQuery, [chatId, userId]);

    if (accessResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this chat',
      });
    }

    const result = await ChatService.getChatMessages(chatId, limit, offset);

    if (result.success) {
      // Mark messages as read
      await ChatService.markMessagesAsRead(chatId, userId);

      return res.json({
        success: true,
        data: result.data,
      });
    } else {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to get messages',
    });
  }
});

// POST /api/chat/send-message - Send a message
router.post('/send-message', validateJSON, async (req, res) => {
  try {
    const { error, value } = sendMessageSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0]?.message || 'Validation error',
      });
    }

    const messageData: SendMessageRequest = value;
    const userId = req.user!.id;

    // Verify user has access to this chat
    const { pool } = await import('../config/database');
    const accessQuery = `
      SELECT id FROM chats WHERE id = $1 AND (worker_id = $2 OR foreman_id = $2)
    `;

    const accessResult = await pool.query(accessQuery, [
      messageData.chatId,
      userId,
    ]);

    if (accessResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this chat',
      });
    }

    const result = await ChatService.sendMessage(
      messageData.chatId,
      userId,
      messageData.messageType,
      messageData.content,
      messageData.photoUri,
      messageData.latitude,
      messageData.longitude
    );

    if (result.success) {
      // If it's a photo message, save photo report
      if (
        messageData.messageType === 'photo' &&
        result.data &&
        messageData.photoUri &&
        messageData.latitude &&
        messageData.longitude
      ) {
        await ChatService.savePhotoReport(
          messageData.chatId,
          result.data.id,
          userId,
          messageData.photoUri,
          messageData.latitude,
          messageData.longitude
        );
      }

      return res.json({
        success: true,
        data: result.data,
      });
    } else {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to send message',
    });
  }
});

// POST /api/chat/assign-task - Assign daily task (admin only)
router.post('/assign-task', validateJSON, async (req, res) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;

    if (userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only admins can assign tasks',
      });
    }

    const { error, value } = assignTaskSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0]?.message || 'Validation error',
      });
    }

    const taskData: AssignTaskRequest = value;

    // Verify user has access to this chat
    const { pool } = await import('../config/database');
    const accessQuery = `
      SELECT worker_id FROM chats WHERE id = $1 AND foreman_id = $2
    `;

    const accessResult = await pool.query(accessQuery, [
      taskData.chatId,
      userId,
    ]);

    if (accessResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this chat',
      });
    }

    const workerId = accessResult.rows[0].worker_id;

    const result = await ChatService.assignDailyTask(
      taskData.chatId,
      userId,
      workerId,
      taskData.taskDescription
    );

    if (result.success) {
      // Send task message to chat
      await ChatService.sendMessage(
        taskData.chatId,
        userId,
        'task',
        `📋 Daily Task: ${taskData.taskDescription}`
      );

      return res.json({
        success: true,
        data: result.data,
      });
    } else {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to assign task',
    });
  }
});

// GET /api/chat/:chatId/todays-task - Get today's task for a chat
router.get('/:chatId/todays-task', async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user!.id;

    // Verify user has access to this chat
    const { pool } = await import('../config/database');
    const accessQuery = `
      SELECT id FROM chats WHERE id = $1 AND (worker_id = $2 OR foreman_id = $2)
    `;

    const accessResult = await pool.query(accessQuery, [chatId, userId]);

    if (accessResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this chat',
      });
    }

    const result = await ChatService.getTodaysTask(chatId);

    if (result.success) {
      return res.json({
        success: true,
        data: result.data,
      });
    } else {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Failed to get today's task",
    });
  }
});

// POST /api/chat/validate-photo - Validate photo report (admin only)
router.post('/validate-photo', validateJSON, async (req, res) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;

    if (userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only admins can validate photos',
      });
    }

    const { error, value } = validatePhotoSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0]?.message || 'Validation error',
      });
    }

    const validationData: ValidatePhotoRequest = value;

    const result = await ChatService.validatePhotoReport(
      validationData.reportId,
      userId,
      validationData.notes
    );

    if (result.success) {
      return res.json({
        success: true,
        message: 'Photo validated successfully',
      });
    } else {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to validate photo',
    });
  }
});

export default router;
