import express from 'express';
import Joi from 'joi';
import { requireAdmin, validateJSON } from '../middleware/auth';
import { AssignmentService } from '../services/AssignmentService';
import { UserService } from '../services/UserService';
import { SiteService } from '../services/SiteService';

const router = express.Router();

// Схемы валидации
const createAssignmentSchema = Joi.object({
  userId: Joi.string().uuid().required(),
  siteId: Joi.string().uuid().required(),
  validFrom: Joi.date().optional(),
  validTo: Joi.date().optional(),
  notes: Joi.string().max(500).optional()
});

const updateAssignmentSchema = Joi.object({
  validFrom: Joi.date().optional().allow(null),
  validTo: Joi.date().optional().allow(null),
  notes: Joi.string().max(500).optional().allow(null),
  isActive: Joi.boolean().optional()
});

const getAssignmentsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  isActive: Joi.boolean().optional(),
  userId: Joi.string().uuid().optional(),
  siteId: Joi.string().uuid().optional(),
  assignedBy: Joi.string().uuid().optional()
});

// GET /api/assignments - Получение списка назначений
router.get('/', async (req, res) => {
  try {
    const { error, value } = getAssignmentsQuerySchema.validate(req.query);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0]?.message || 'Validation error'
      });
    }

    const { page, limit, isActive, userId, siteId, assignedBy } = value;
    
    // Обычные пользователи могут видеть только свои назначения
    const filters = req.user?.role === 'admin' 
      ? { page, limit, isActive, userId, siteId, assignedBy }
      : { page, limit, isActive, userId: req.user?.id, siteId, assignedBy };

    const result = await AssignmentService.getAllAssignments(filters);
    const totalPages = Math.ceil(result.total / limit);

    return res.json({
      success: true,
      message: 'Assignments retrieved successfully',
      data: result.assignments,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve assignments'
    });
  }
});

// GET /api/assignments/my - Получение назначений пользователя
router.get('/my', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const assignments = await AssignmentService.getUserAssignments(req.user.id);

    return res.json({
      success: true,
      message: 'User assignments retrieved successfully',
      data: assignments
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve user assignments'
    });
  }
});

// GET /api/assignments/stats - Получение статистики назначений (только для админов)
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const stats = await AssignmentService.getAssignmentStats();
    
    return res.json({
      success: true,
      message: 'Assignment statistics retrieved successfully',
      data: stats
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve assignment statistics'
    });
  }
});

// POST /api/assignments - Создание нового назначения (только для админов)
router.post('/', requireAdmin, validateJSON, async (req, res) => {
  try {
    const { error, value } = createAssignmentSchema.validate(req.body);
    
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

    const { userId, siteId, validFrom, validTo, notes } = value;

    // Проверяем существование пользователя
    const user = await UserService.getUserById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Проверяем существование объекта
    const site = await SiteService.getSiteById(siteId);
    if (!site) {
      return res.status(404).json({
        success: false,
        error: 'Site not found'
      });
    }

    // Проверяем, не существует ли уже активное назначение
    const existingAssignment = await AssignmentService.checkUserAssignment(userId, siteId);
    if (existingAssignment) {
      return res.status(400).json({
        success: false,
        error: 'User is already assigned to this site'
      });
    }

    const assignment = await AssignmentService.createAssignment({
      userId,
      siteId,
      assignedBy: req.user.id,
      validFrom,
      validTo,
      notes
    });

    return res.status(201).json({
      success: true,
      message: 'Assignment created successfully',
      data: assignment
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to create assignment'
    });
  }
});

// GET /api/assignments/:assignmentId - Получение информации о назначении
router.get('/:assignmentId', async (req, res) => {
  try {
    const { assignmentId } = req.params;
    
    if (!assignmentId) {
      return res.status(400).json({
        success: false,
        error: 'Assignment ID is required'
      });
    }

    const assignment = await AssignmentService.getAssignmentById(assignmentId);
    
    if (!assignment) {
      return res.status(404).json({
        success: false,
        error: 'Assignment not found'
      });
    }

    // Обычные пользователи могут видеть только свои назначения
    if (req.user?.role !== 'admin' && assignment.userId !== req.user?.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    return res.json({
      success: true,
      message: 'Assignment retrieved successfully',
      data: assignment
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve assignment'
    });
  }
});

// PUT /api/assignments/:assignmentId - Обновление назначения (только для админов)
router.put('/:assignmentId', requireAdmin, validateJSON, async (req, res) => {
  try {
    const { assignmentId } = req.params;
    
    if (!assignmentId) {
      return res.status(400).json({
        success: false,
        error: 'Assignment ID is required'
      });
    }

    const { error, value } = updateAssignmentSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0]?.message || 'Validation error'
      });
    }

    // Проверяем, что назначение существует
    const existingAssignment = await AssignmentService.getAssignmentById(assignmentId);
    if (!existingAssignment) {
      return res.status(404).json({
        success: false,
        error: 'Assignment not found'
      });
    }

    const updatedAssignment = await AssignmentService.updateAssignment(assignmentId, value);
    
    if (!updatedAssignment) {
      return res.status(400).json({
        success: false,
        error: 'Failed to update assignment'
      });
    }

    return res.json({
      success: true,
      message: 'Assignment updated successfully',
      data: updatedAssignment
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to update assignment'
    });
  }
});

// DELETE /api/assignments/:assignmentId - Удаление (деактивация) назначения (только для админов)
router.delete('/:assignmentId', requireAdmin, async (req, res) => {
  try {
    const { assignmentId } = req.params;
    
    if (!assignmentId) {
      return res.status(400).json({
        success: false,
        error: 'Assignment ID is required'
      });
    }

    // Проверяем, что назначение существует
    const existingAssignment = await AssignmentService.getAssignmentById(assignmentId);
    if (!existingAssignment) {
      return res.status(404).json({
        success: false,
        error: 'Assignment not found'
      });
    }

    const success = await AssignmentService.deactivateAssignment(assignmentId);
    
    if (!success) {
      return res.status(400).json({
        success: false,
        error: 'Failed to delete assignment'
      });
    }

    return res.json({
      success: true,
      message: 'Assignment deleted successfully'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to delete assignment'
    });
  }
});

// GET /api/assignments/site/:siteId - Получение назначений объекта
router.get('/site/:siteId', async (req, res) => {
  try {
    const { siteId } = req.params;
    
    if (!siteId) {
      return res.status(400).json({
        success: false,
        error: 'Site ID is required'
      });
    }

    // Проверяем, что объект существует
    const site = await SiteService.getSiteById(siteId);
    if (!site) {
      return res.status(404).json({
        success: false,
        error: 'Site not found'
      });
    }

    const assignments = await AssignmentService.getSiteAssignments(siteId);

    return res.json({
      success: true,
      message: 'Site assignments retrieved successfully',
      data: assignments
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve site assignments'
    });
  }
});

// GET /api/assignments/user/:userId - Получение назначений пользователя (только для админов)
router.get('/user/:userId', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    // Проверяем, что пользователь существует
    const user = await UserService.getUserById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const assignments = await AssignmentService.getUserAssignments(userId);

    return res.json({
      success: true,
      message: 'User assignments retrieved successfully',
      data: assignments
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve user assignments'
    });
  }
});

// POST /api/assignments/bulk - Массовое назначение пользователей на объект (только для админов)
router.post('/bulk', requireAdmin, validateJSON, async (req, res) => {
  try {
    const { userIds, siteId, validFrom, validTo, notes } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'User IDs array is required'
      });
    }

    if (!siteId) {
      return res.status(400).json({
        success: false,
        error: 'Site ID is required'
      });
    }

    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Проверяем существование объекта
    const site = await SiteService.getSiteById(siteId);
    if (!site) {
      return res.status(404).json({
        success: false,
        error: 'Site not found'
      });
    }

    const assignments = [];
    const errors = [];

    for (const userId of userIds) {
      try {
        // Проверяем существование пользователя
        const user = await UserService.getUserById(userId);
        if (!user) {
          errors.push(`User ${userId} not found`);
          continue;
        }

        // Проверяем, не существует ли уже активное назначение
        const existingAssignment = await AssignmentService.checkUserAssignment(userId, siteId);
        if (existingAssignment) {
          errors.push(`User ${user.name} is already assigned to this site`);
          continue;
        }

        const assignment = await AssignmentService.createAssignment({
          userId,
          siteId,
          assignedBy: req.user.id,
          validFrom,
          validTo,
          notes
        });

        assignments.push(assignment);
      } catch (error) {
        errors.push(`Failed to assign user ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return res.json({
      success: assignments.length > 0,
      message: `Successfully created ${assignments.length} assignments${errors.length > 0 ? ` with ${errors.length} errors` : ''}`,
      data: {
        assignments,
        errors
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to process bulk assignments'
    });
  }
});

export default router; 
