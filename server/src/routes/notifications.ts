import { Router } from 'express';
import { serverNotificationService } from '../services/NotificationService';
import { Request, Response } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

// Сохранение push токена пользователя
router.post('/register-token', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { pushToken } = req.body;
    const userId = req.user?.id;

    if (!pushToken || !userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Push token and user ID are required' 
      });
    }

    // Валидация токена
    if (!serverNotificationService.validatePushToken(pushToken)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid push token format' 
      });
    }

    // Сохраняем токен в базе данных
    const { pool } = await import('../config/database');
    
    // Сначала проверяем, есть ли уже такой токен у пользователя
    const existingTokenQuery = `
      SELECT id FROM user_push_tokens 
      WHERE user_id = $1 AND push_token = $2
    `;
    const existingResult = await pool.query(existingTokenQuery, [userId, pushToken]);
    
    if (existingResult.rows.length === 0) {
      // Добавляем новый токен
      const insertQuery = `
        INSERT INTO user_push_tokens (user_id, push_token, is_active, created_at, updated_at)
        VALUES ($1, $2, true, NOW(), NOW())
        ON CONFLICT (user_id, push_token) 
        DO UPDATE SET is_active = true, updated_at = NOW()
      `;
      await pool.query(insertQuery, [userId, pushToken]);
    } else {
      // Обновляем существующий токен
      const updateQuery = `
        UPDATE user_push_tokens 
        SET is_active = true, updated_at = NOW() 
        WHERE user_id = $1 AND push_token = $2
      `;
      await pool.query(updateQuery, [userId, pushToken]);
    }

    return res.json({ 
      success: true, 
      message: 'Push token registered successfully' 
    });
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Отправка тестового уведомления (только для админов)
router.post('/send-test', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { pushToken, title, body } = req.body;

    if (!pushToken) {
      return res.status(400).json({ 
        success: false, 
        message: 'Push token is required' 
      });
    }

    const success = await serverNotificationService.sendNotificationToUser(pushToken, {
      title: title || 'Test Notification',
      body: body || 'This is a test notification from WorkTime Tracker',
      data: { test: true },
    });

    if (success) {
      return res.json({ 
        success: true, 
        message: 'Test notification sent successfully' 
      });
    } else {
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to send test notification' 
      });
    }
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Отправка уведомления о нарушении (только для админов)
router.post('/violation-alert', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { adminTokens, violationType, workerName, siteName, severity } = req.body;

    if (!adminTokens || !Array.isArray(adminTokens) || adminTokens.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Admin push tokens are required' 
      });
    }

    await serverNotificationService.notifyAdminsAboutViolation(
      adminTokens,
      violationType,
      workerName,
      siteName,
      severity || 'medium'
    );

    return res.json({ 
      success: true, 
      message: 'Violation alert sent to administrators' 
    });
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Отправка уведомления о назначении (только для админов)
router.post('/assignment-notification', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { workerToken, siteName, assignmentType, details } = req.body;

    if (!workerToken || !siteName || !assignmentType) {
      return res.status(400).json({ 
        success: false, 
        message: 'Worker token, site name, and assignment type are required' 
      });
    }

    await serverNotificationService.notifyWorkerAboutAssignment(
      workerToken,
      siteName,
      assignmentType,
      details
    );

    return res.json({ 
      success: true, 
      message: 'Assignment notification sent successfully' 
    });
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Отправка напоминания о смене (только для админов)
router.post('/shift-reminder', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { workerToken, siteName, shiftType, minutesUntilShift } = req.body;

    if (!workerToken || !siteName || !shiftType) {
      return res.status(400).json({ 
        success: false, 
        message: 'Worker token, site name, and shift type are required' 
      });
    }

    await serverNotificationService.sendShiftReminder(
      workerToken,
      siteName,
      shiftType,
      minutesUntilShift || 0
    );

    return res.json({ 
      success: true, 
      message: 'Shift reminder sent successfully' 
    });
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Отправка уведомления о сверхурочной работе (только для админов)
router.post('/overtime-alert', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { workerToken, hours, siteName } = req.body;

    if (!workerToken || !hours || !siteName) {
      return res.status(400).json({ 
        success: false, 
        message: 'Worker token, hours, and site name are required' 
      });
    }

    await serverNotificationService.notifyOvertime(
      workerToken,
      hours,
      siteName
    );

    return res.json({ 
      success: true, 
      message: 'Overtime notification sent successfully' 
    });
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Массовая отправка уведомлений (только для админов)
router.post('/broadcast', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { workerTokens, title, message, data } = req.body;

    if (!workerTokens || !Array.isArray(workerTokens) || workerTokens.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Worker tokens array is required' 
      });
    }

    if (!title || !message) {
      return res.status(400).json({ 
        success: false, 
        message: 'Title and message are required' 
      });
    }

    const result = await serverNotificationService.sendBroadcastNotification(
      workerTokens,
      title,
      message,
      data
    );

    return res.json({ 
      success: true, 
      message: `Broadcast sent to ${result.success} devices, ${result.failed} failed`,
      data: result
    });
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Получение статуса доставки уведомлений (только для админов)
router.post('/delivery-receipts', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { receiptIds } = req.body;

    if (!receiptIds || !Array.isArray(receiptIds) || receiptIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Receipt IDs array is required' 
      });
    }

    const receipts = await serverNotificationService.getDeliveryReceipts(receiptIds);

    return res.json({ 
      success: true, 
      message: 'Delivery receipts retrieved successfully',
      data: receipts
    });
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Валидация push токена
router.post('/validate-token', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { pushToken } = req.body;

    if (!pushToken) {
      return res.status(400).json({ 
        success: false, 
        message: 'Push token is required' 
      });
    }

    const isValid = serverNotificationService.validatePushToken(pushToken);

    return res.json({ 
      success: true, 
      message: 'Token validation completed',
      data: { 
        isValid,
        token: pushToken
      }
    });
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Очистка недействительных токенов (только для админов)
router.post('/cleanup-tokens', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { tokens } = req.body;

    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Tokens array is required' 
      });
    }

    const validTokens = await serverNotificationService.cleanupInvalidTokens(tokens);

    return res.json({ 
      success: true, 
      message: 'Token cleanup completed',
      data: { 
        totalTokens: tokens.length,
        validTokens: validTokens.length,
        removedTokens: tokens.length - validTokens.length,
        validTokensList: validTokens
      }
    });
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Удаление push токена пользователя
router.delete('/token', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { pushToken } = req.body;
    const userId = req.user?.id;

    if (!pushToken || !userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Push token is required' 
      });
    }

    // Удаляем токен из базы данных
    const { pool } = await import('../config/database');
    const deleteQuery = `
      UPDATE user_push_tokens 
      SET is_active = false, updated_at = NOW()
      WHERE user_id = $1 AND push_token = $2
    `;
    await pool.query(deleteQuery, [userId, pushToken]);

    return res.json({ 
      success: true, 
      message: 'Push token removed successfully' 
    });
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Получение настроек уведомлений пользователя
router.get('/preferences', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    // Получаем настройки из базы данных
    const { pool } = await import('../config/database');
    const preferencesQuery = `
      SELECT * FROM user_notification_preferences 
      WHERE user_id = $1
    `;
    const result = await pool.query(preferencesQuery, [userId]);
    
    let preferences;
    if (result.rows.length > 0) {
      preferences = result.rows[0];
    } else {
      // Создаем настройки по умолчанию
      const defaultPreferencesQuery = `
        INSERT INTO user_notification_preferences 
        (user_id, is_enabled, sound, vibration, shift_reminders, break_reminders, gps_events, violations, created_at, updated_at)
        VALUES ($1, true, true, true, true, true, false, true, NOW(), NOW())
        RETURNING *
      `;
      const defaultResult = await pool.query(defaultPreferencesQuery, [userId]);
      preferences = defaultResult.rows[0];
    }

    return res.json({ 
      success: true, 
      message: 'Notification preferences retrieved successfully',
      data: preferences
    });
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Обновление настроек уведомлений пользователя
router.put('/preferences', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { isEnabled, sound, vibration, shiftReminders, breakReminders, gpsEvents, violations } = req.body;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    // Обновляем настройки в базе данных
    const { pool } = await import('../config/database');
    const updateQuery = `
      INSERT INTO user_notification_preferences 
      (user_id, is_enabled, sound, vibration, shift_reminders, break_reminders, gps_events, violations, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        is_enabled = COALESCE($2, user_notification_preferences.is_enabled),
        sound = COALESCE($3, user_notification_preferences.sound),
        vibration = COALESCE($4, user_notification_preferences.vibration),
        shift_reminders = COALESCE($5, user_notification_preferences.shift_reminders),
        break_reminders = COALESCE($6, user_notification_preferences.break_reminders),
        gps_events = COALESCE($7, user_notification_preferences.gps_events),
        violations = COALESCE($8, user_notification_preferences.violations),
        updated_at = NOW()
      RETURNING *
    `;
    
    const result = await pool.query(updateQuery, [
      userId, isEnabled, sound, vibration, shiftReminders, breakReminders, gpsEvents, violations
    ]);

    const updatedPreferences = result.rows[0];

    return res.json({ 
      success: true, 
      message: 'Notification preferences updated successfully',
      data: updatedPreferences
    });
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

export default router; 
