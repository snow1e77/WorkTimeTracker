import express from 'express';
import Joi from 'joi';
import { authenticateToken, requireAdmin, validateJSON } from '../middleware/auth';
import { ShiftService } from '../services/ShiftService';
import { AssignmentService } from '../services/AssignmentService';
import { SiteService } from '../services/SiteService';
import { UserService } from '../services/UserService';

const router = express.Router();

// Схемы валидации
const startShiftSchema = Joi.object({
  siteId: Joi.string().uuid().required(),
  location: Joi.object({
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required()
  }).optional(),
  notes: Joi.string().max(500).optional()
});

const endShiftSchema = Joi.object({
  location: Joi.object({
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required()
  }).optional(),
  notes: Joi.string().max(500).optional()
});

const updateShiftSchema = Joi.object({
  startTime: Joi.date().optional(),
  endTime: Joi.date().optional(),
  notes: Joi.string().max(500).optional().allow(null),
  isActive: Joi.boolean().optional()
});

const getShiftsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  isActive: Joi.boolean().optional(),
  userId: Joi.string().uuid().optional(),
  siteId: Joi.string().uuid().optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional()
});

// Все маршруты требуют аутентификации
router.use(authenticateToken);

// GET /api/shifts - Получение списка смен
router.get('/', async (req, res) => {
  try {
    const { error, value } = getShiftsQuerySchema.validate(req.query);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0]?.message || 'Validation error'
      });
    }

    const { page, limit, isActive, userId, siteId, startDate, endDate } = value;
    
    // Обычные пользователи могут видеть только свои смены
    const filters = req.user?.role === 'admin' 
      ? { page, limit, isActive, userId, siteId, startDate, endDate }
      : { page, limit, isActive, userId: req.user?.id, siteId, startDate, endDate };

    const result = await ShiftService.getAllShifts(filters);
    const totalPages = Math.ceil(result.total / limit);

    return res.json({
      success: true,
      message: 'Shifts retrieved successfully',
      data: result.shifts,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages
      }
    });
  } catch (error) {
    console.error('Get shifts error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve shifts'
    });
  }
});

// GET /api/shifts/my - Получение смен пользователя
router.get('/my', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const { page = 1, limit = 20, isActive, startDate, endDate } = req.query;
    const result = await ShiftService.getUserShifts(req.user.id, {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      ...(isActive !== undefined && { isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined }),
      ...(startDate && { startDate: new Date(startDate as string) }),
      ...(endDate && { endDate: new Date(endDate as string) })
    });

    const totalPages = Math.ceil(result.total / parseInt(limit as string));

    return res.json({
      success: true,
      message: 'User shifts retrieved successfully',
      data: result.shifts,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: result.total,
        totalPages
      }
    });
  } catch (error) {
    console.error('Get user shifts error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve user shifts'
    });
  }
});

// GET /api/shifts/active - Получение активной смены пользователя
router.get('/active', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const activeShift = await ShiftService.getActiveShiftByUser(req.user.id);

    return res.json({
      success: true,
      message: activeShift ? 'Active shift found' : 'No active shift',
      data: activeShift
    });
  } catch (error) {
    console.error('Get active shift error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve active shift'
    });
  }
});

// GET /api/shifts/stats - Получение статистики смен (только для админов)
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const { userId, siteId, startDate, endDate } = req.query;
    
    const stats = await ShiftService.getShiftStats({
      ...(userId && { userId: userId as string }),
      ...(siteId && { siteId: siteId as string }),
      ...(startDate && { startDate: new Date(startDate as string) }),
      ...(endDate && { endDate: new Date(endDate as string) })
    });
    
    return res.json({
      success: true,
      message: 'Shift statistics retrieved successfully',
      data: stats
    });
  } catch (error) {
    console.error('Get shift stats error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve shift statistics'
    });
  }
});

// POST /api/shifts/start - Начало рабочей смены
router.post('/start', validateJSON, async (req, res) => {
  try {
    const { error, value } = startShiftSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0]?.message || 'Validation error'
      });
    }

    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const { siteId, location, notes } = value;

    // Проверяем, что у пользователя есть назначение на данный объект
    const hasAssignment = await AssignmentService.checkUserAssignment(req.user.id, siteId);
    if (!hasAssignment) {
      return res.status(403).json({
        success: false,
        error: 'You are not assigned to this construction site'
      });
    }

    // Проверяем, что у пользователя нет активной смены
    const activeShift = await ShiftService.getActiveShiftByUser(req.user.id);
    if (activeShift) {
      return res.status(400).json({
        success: false,
        error: 'You already have an active shift. Please end it first.'
      });
    }

    // Проверяем существование объекта
    const site = await SiteService.getSiteById(siteId);
    if (!site) {
      return res.status(404).json({
        success: false,
        error: 'Construction site not found'
      });
    }

    // Если указана локация, проверяем, что пользователь находится в радиусе объекта
    if (location) {
      const locationCheck = await SiteService.checkLocationInSite(siteId, location.latitude, location.longitude);
      if (!locationCheck.inRadius) {
        return res.status(400).json({
          success: false,
          error: `You are ${Math.round(locationCheck.distance)}m away from the construction site. You must be within ${site.radius}m to start a shift.`,
          data: {
            distance: locationCheck.distance,
            requiredRadius: site.radius
          }
        });
      }
    }

    const shift = await ShiftService.startShift({
      userId: req.user.id,
      siteId,
      startLocation: location,
      notes
    });

    return res.status(201).json({
      success: true,
      message: 'Shift started successfully',
      data: shift
    });
  } catch (error) {
    console.error('Start shift error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to start shift'
    });
  }
});

// POST /api/shifts/:shiftId/end - Завершение рабочей смены
router.post('/:shiftId/end', validateJSON, async (req, res) => {
  try {
    const { shiftId } = req.params;
    
    if (!shiftId) {
      return res.status(400).json({
        success: false,
        error: 'Shift ID is required'
      });
    }
    
    const { error, value } = endShiftSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0]?.message || 'Validation error'
      });
    }

    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const { location, notes } = value;

    // Проверяем существование смены
    const existingShift = await ShiftService.getShiftById(shiftId);
    if (!existingShift) {
      return res.status(404).json({
        success: false,
        error: 'Shift not found'
      });
    }

    // Проверяем, что смена принадлежит пользователю
    if (existingShift.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'You can only end your own shifts'
      });
    }

    // Проверяем, что смена активна
    if (!existingShift.isActive || existingShift.endTime) {
      return res.status(400).json({
        success: false,
        error: 'Shift is already ended'
      });
    }

    // Если указана локация, проверяем, что пользователь находится в радиусе объекта
    if (location) {
      const locationCheck = await SiteService.checkLocationInSite(existingShift.siteId, location.latitude, location.longitude);
      const site = await SiteService.getSiteById(existingShift.siteId);
      
      if (!locationCheck.inRadius && site) {
        return res.status(400).json({
          success: false,
          error: `You are ${Math.round(locationCheck.distance)}m away from the construction site. You must be within ${site.radius}m to end a shift.`,
          data: {
            distance: locationCheck.distance,
            requiredRadius: site.radius
          }
        });
      }
    }

    const shift = await ShiftService.endShift(shiftId as string, {
      endLocation: location,
      notes
    });

    return res.json({
      success: true,
      message: 'Shift ended successfully',
      data: shift
    });
  } catch (error) {
    console.error('End shift error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to end shift'
    });
  }
});

// GET /api/shifts/:shiftId - Получение информации о смене
router.get('/:shiftId', async (req, res) => {
  try {
    const { shiftId } = req.params;
    
    if (!shiftId) {
      return res.status(400).json({
        success: false,
        error: 'Shift ID is required'
      });
    }

    const shift = await ShiftService.getShiftById(shiftId);
    
    if (!shift) {
      return res.status(404).json({
        success: false,
        error: 'Shift not found'
      });
    }

    // Обычные пользователи могут видеть только свои смены
    if (req.user?.role !== 'admin' && shift.userId !== req.user?.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    return res.json({
      success: true,
      message: 'Shift retrieved successfully',
      data: shift
    });
  } catch (error) {
    console.error('Get shift error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve shift'
    });
  }
});

// PUT /api/shifts/:shiftId - Обновление смены (только для админов)
router.put('/:shiftId', requireAdmin, validateJSON, async (req, res) => {
  try {
    const { shiftId } = req.params;
    
    if (!shiftId) {
      return res.status(400).json({
        success: false,
        error: 'Shift ID is required'
      });
    }

    const { error, value } = updateShiftSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0]?.message || 'Validation error'
      });
    }

    // Проверяем, что смена существует
    const existingShift = await ShiftService.getShiftById(shiftId);
    if (!existingShift) {
      return res.status(404).json({
        success: false,
        error: 'Shift not found'
      });
    }

    const updatedShift = await ShiftService.updateShift(shiftId, value);
    
    if (!updatedShift) {
      return res.status(400).json({
        success: false,
        error: 'Failed to update shift'
      });
    }

    return res.json({
      success: true,
      message: 'Shift updated successfully',
      data: updatedShift
    });
  } catch (error) {
    console.error('Update shift error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update shift'
    });
  }
});

// DELETE /api/shifts/:shiftId - Удаление смены (только для админов)
router.delete('/:shiftId', requireAdmin, async (req, res) => {
  try {
    const { shiftId } = req.params;
    
    if (!shiftId) {
      return res.status(400).json({
        success: false,
        error: 'Shift ID is required'
      });
    }

    // Проверяем, что смена существует
    const existingShift = await ShiftService.getShiftById(shiftId);
    if (!existingShift) {
      return res.status(404).json({
        success: false,
        error: 'Shift not found'
      });
    }

    const success = await ShiftService.deleteShift(shiftId);
    
    if (!success) {
      return res.status(400).json({
        success: false,
        error: 'Failed to delete shift'
      });
    }

    return res.json({
      success: true,
      message: 'Shift deleted successfully'
    });
  } catch (error) {
    console.error('Delete shift error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete shift'
    });
  }
});

// GET /api/shifts/user/:userId/hours - Получение рабочих часов пользователя за период
router.get('/user/:userId/hours', async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    if (!startDate || !endDate || typeof startDate !== 'string' || typeof endDate !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Start date and end date are required and must be valid date strings'
      });
    }

    // Обычные пользователи могут получать только свои данные
    if (req.user?.role !== 'admin' && req.user?.id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Проверяем существование пользователя
    const user = await UserService.getUserById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const workHours = await ShiftService.getUserWorkHours(
      userId,
      new Date(startDate as string),
      new Date(endDate as string)
    );

    return res.json({
      success: true,
      message: 'Work hours retrieved successfully',
      data: {
        user: {
          id: user.id,
          name: user.name,
          phoneNumber: user.phoneNumber
        },
        period: {
          startDate,
          endDate
        },
        ...workHours
      }
    });
  } catch (error) {
    console.error('Get work hours error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve work hours'
    });
  }
});

export default router; 