import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { SyncService } from '../services/SyncService';
import Joi from 'joi';

const router = express.Router();

router.use(authenticateToken);

// Валидационная схема для синхронизации
const syncSchema = Joi.object({
  lastSyncTimestamp: Joi.date().optional(),
  deviceId: Joi.string().required(),
  data: Joi.object({
    shifts: Joi.array().items(Joi.object()).optional(),
    assignments: Joi.array().items(Joi.object()).optional(),
    users: Joi.array().items(Joi.object()).optional(),
    sites: Joi.array().items(Joi.object()).optional()
  }).optional()
});

// Получение данных для синхронизации
router.get('/', async (req, res) => {
  try {
    const { lastSyncTimestamp } = req.query;
    const userId = req.user!.id;

    const syncData = await SyncService.getSyncData(userId, {
      ...(lastSyncTimestamp && { lastSyncTimestamp: new Date(lastSyncTimestamp as string) })
    });

    res.json({
      success: true,
      data: syncData,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Sync get error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get sync data'
    });
  }
});

// Отправка данных для синхронизации
router.post('/', async (req, res) => {
  try {
    const { error, value } = syncSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid sync data',
        details: error.details.map(d => d.message)
      });
    }

    const { lastSyncTimestamp, deviceId, data } = value;
    const userId = req.user!.id;

    const result = await SyncService.processSync(userId, {
      lastSyncTimestamp,
      deviceId,
      data
    });

    res.json({
      success: true,
      data: result,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Sync post error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process sync data'
    });
  }
});

// Получение статуса синхронизации
router.get('/status', async (req, res) => {
  try {
    const userId = req.user!.id;
    const status = await SyncService.getSyncStatus(userId);

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    console.error('Sync status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get sync status'
    });
  }
});

// Принудительная полная синхронизация
router.post('/full', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { deviceId } = req.body;

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        error: 'Device ID is required'
      });
    }

    const result = await SyncService.fullSync(userId, deviceId);

    res.json({
      success: true,
      data: result,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Full sync error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform full sync'
    });
  }
});

// Синхронизация изменений от веб админ-панели
router.post('/web-changes', async (req, res) => {
  try {
    const { user } = req;
    
    // Проверяем права администратора
    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Admin role required.'
      });
    }

    const { assignments, sites, users } = req.body;
    
    const result = await SyncService.processWebAdminChanges({
      assignments,
      sites, 
      users
    });

    res.json({
      success: result.success,
      message: result.message,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Web changes sync error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process web admin changes'
    });
  }
});

// Получить активные устройства пользователя
router.get('/devices/:userId', async (req, res) => {
  try {
    const { user } = req;
    const { userId } = req.params;
    
    // Проверяем права доступа
    if (!user || (user.role !== 'admin' && user.id !== userId)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const devices = await SyncService.getActiveDevicesForUser(userId);

    res.json({
      success: true,
      data: devices,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Get devices error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user devices'
    });
  }
});

// Инициализация таблиц синхронизации (только для разработки)
router.post('/init-tables', async (req, res) => {
  try {
    const { user } = req;
    
    // Проверяем права администратора
    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Admin role required.'
      });
    }

    await SyncService.initializeSyncTables();

    res.json({
      success: true,
      message: 'Sync tables initialized successfully'
    });

  } catch (error) {
    console.error('Init tables error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize sync tables'
    });
  }
});

// Получить историю синхронизации для всех пользователей (админ)
router.get('/history', async (req, res) => {
  try {
    const { user } = req;
    
    // Проверяем права администратора
    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Admin role required.'
      });
    }

    // В реальном приложении тут был бы запрос к базе данных
    // Для демонстрации возвращаем заглушку
    const history = [
      {
        userId: 'worker-1',
        userName: 'John Worker',
        deviceId: 'device_123',
        syncType: 'incremental',
        success: true,
        timestamp: new Date(Date.now() - 5 * 60 * 1000)
      },
      {
        userId: 'worker-2', 
        userName: 'Jane Worker',
        deviceId: 'device_456',
        syncType: 'full',
        success: true,
        timestamp: new Date(Date.now() - 15 * 60 * 1000)
      }
    ];

    res.json({
      success: true,
      data: history,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Sync history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get sync history'
    });
  }
});

// Обработка операций смен из очереди
router.post('/shift', async (req, res) => {
  try {
    const { operation, entityId, data, deviceId } = req.body;
    const userId = req.user!.id;

    console.log(`Processing shift operation: ${operation} for ${entityId} from device ${deviceId}`);

    let result;
    switch (operation) {
      case 'create':
        result = await SyncService.createShiftFromSync(userId, data);
        break;
      case 'update':
        result = await SyncService.updateShiftFromSync(entityId, data);
        break;
      case 'delete':
        result = await SyncService.deleteShiftFromSync(entityId);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid operation type'
        });
    }

    res.json({
      success: true,
      result,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Shift sync operation error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process shift operation'
    });
  }
});

// Обработка операций назначений из очереди
router.post('/assignment', async (req, res) => {
  try {
    const { operation, entityId, data, deviceId } = req.body;
    const userId = req.user!.id;

    console.log(`Processing assignment operation: ${operation} for ${entityId} from device ${deviceId}`);

    let result;
    switch (operation) {
      case 'create':
        result = await SyncService.createAssignmentFromSync(userId, data);
        break;
      case 'update':
        result = await SyncService.updateAssignmentFromSync(entityId, data);
        break;
      case 'delete':
        result = await SyncService.deleteAssignmentFromSync(entityId);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid operation type'
        });
    }

    res.json({
      success: true,
      result,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Assignment sync operation error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process assignment operation'
    });
  }
});

// Получение конфликтов синхронизации
router.get('/conflicts/:userId', async (req, res) => {
  try {
    const { user } = req;
    const { userId } = req.params;
    
    // Проверяем права доступа
    if (!user || (user.role !== 'admin' && user.id !== userId)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const conflicts = await SyncService.getSyncConflicts(userId);

    res.json({
      success: true,
      data: conflicts,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Get conflicts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get sync conflicts'
    });
  }
});

// Разрешение конфликта синхронизации
router.post('/resolve-conflict', async (req, res) => {
  try {
    const { conflictId, resolution, data } = req.body;
    const userId = req.user!.id;

    if (!conflictId || !resolution) {
      return res.status(400).json({
        success: false,
        error: 'Conflict ID and resolution are required'
      });
    }

    const result = await SyncService.resolveConflict(conflictId, {
      resolution,
      data,
      resolvedBy: userId
    });

    res.json({
      success: true,
      data: result,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Resolve conflict error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resolve conflict'
    });
  }
});

// Получение метрик синхронизации (для админов)
router.get('/metrics', async (req, res) => {
  try {
    const { user } = req;
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Admin role required.'
      });
    }

    const metrics = await SyncService.getSyncMetrics();

    res.json({
      success: true,
      data: metrics,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Get sync metrics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get sync metrics'
    });
  }
});

// Принудительная синхронизация для всех устройств
router.post('/force-all', async (req, res) => {
  try {
    const { user } = req;
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Admin role required.'
      });
    }

    const result = await SyncService.forceGlobalSync();

    res.json({
      success: true,
      message: `Forced sync initiated for ${result.devicesNotified} devices`,
      data: result,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Force global sync error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to force global sync'
    });
  }
});

export default router; 