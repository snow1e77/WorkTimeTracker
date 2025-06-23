import express from 'express';
import Joi from 'joi';
import { authenticateToken, requireAdmin, requireOwnershipOrAdmin, validateJSON } from '../middleware/auth';
import { UserService } from '../services/UserService';

const router = express.Router();

// Схемы валидации
const updateUserSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  role: Joi.string().valid('worker', 'admin').optional(),
  isActive: Joi.boolean().optional(),
  isVerified: Joi.boolean().optional(),
  companyId: Joi.string().uuid().optional().allow(null)
});

const getUsersQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  role: Joi.string().valid('worker', 'admin').optional(),
  isActive: Joi.boolean().optional(),
  search: Joi.string().max(100).optional()
});

// Все маршруты требуют аутентификации
router.use(authenticateToken);

// GET /api/users - Получение списка пользователей (только для админов)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { error, value } = getUsersQuerySchema.validate(req.query);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0]?.message || 'Validation error'
      });
    }

    const { page, limit, role, isActive, search } = value;
    const result = await UserService.getAllUsers({ page, limit, role, isActive, search });

    const totalPages = Math.ceil(result.total / limit);

    return res.json({
      success: true,
      message: 'Users retrieved successfully',
      data: result.users,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve users'
    });
  }
});

// GET /api/users/stats - Получение статистики пользователей (только для админов)
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const stats = await UserService.getUserStats();
    
    return res.json({
      success: true,
      message: 'User statistics retrieved successfully',
      data: stats
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve user statistics'
    });
  }
});

// GET /api/users/:userId - Получение информации о пользователе
router.get('/:userId', requireOwnershipOrAdmin('userId'), async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    const user = await UserService.getUserById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    return res.json({
      success: true,
      message: 'User retrieved successfully',
      data: user
    });
  } catch (error) {
    console.error('Get user error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve user'
    });
  }
});

// PUT /api/users/:userId - Обновление пользователя (админ может обновить любого, пользователь только себя)
router.put('/:userId', requireOwnershipOrAdmin('userId'), validateJSON, async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    const { error, value } = updateUserSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0]?.message || 'Validation error'
      });
    }

    // Проверяем, что пользователь существует
    const existingUser = await UserService.getUserById(userId);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Обычные пользователи не могут менять роль и статус активности
    if (req.user?.role !== 'admin') {
      delete value.role;
      delete value.isActive;
      delete value.isVerified;
    }

    const updatedUser = await UserService.updateUser(userId, value);
    
    if (!updatedUser) {
      return res.status(400).json({
        success: false,
        error: 'Failed to update user'
      });
    }

    return res.json({
      success: true,
      message: 'User updated successfully',
      data: updatedUser
    });
  } catch (error) {
    console.error('Update user error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update user'
    });
  }
});

// DELETE /api/users/:userId - Удаление пользователя (только для админов)
router.delete('/:userId', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    // Проверяем, что пользователь существует
    const existingUser = await UserService.getUserById(userId);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Запрещаем удалять самого себя
    if (existingUser.id === req.user?.id) {
      return res.status(400).json({
        success: false,
        error: 'You cannot delete your own account'
      });
    }

    const success = await UserService.deleteUser(userId);
    
    if (!success) {
      return res.status(400).json({
        success: false,
        error: 'Failed to delete user'
      });
    }

    return res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete user'
    });
  }
});

// PUT /api/users/:userId/password - Изменение пароля пользователя
router.put('/:userId/password', requireOwnershipOrAdmin('userId'), validateJSON, async (req, res) => {
  try {
    const { userId } = req.params;
    const { newPassword } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 6 characters long'
      });
    }

    // Проверяем, что пользователь существует
    const existingUser = await UserService.getUserById(userId);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const success = await UserService.updatePassword(userId, newPassword);
    
    if (!success) {
      return res.status(400).json({
        success: false,
        error: 'Failed to update password'
      });
    }

    return res.json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('Update password error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update password'
    });
  }
});

// GET /api/users/:userId/assignments - Получение назначений пользователя
router.get('/:userId/assignments', requireOwnershipOrAdmin('userId'), async (req, res) => {
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

    const { AssignmentService } = await import('../services/AssignmentService');
    const assignments = await AssignmentService.getUserAssignments(userId);

    return res.json({
      success: true,
      message: 'User assignments retrieved successfully',
      data: {
        user: {
          id: user.id,
          name: user.name,
          phoneNumber: user.phoneNumber,
          role: user.role
        },
        assignments
      }
    });
  } catch (error) {
    console.error('Get user assignments error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve user assignments'
    });
  }
});

// GET /api/users/:userId/shifts - Получение смен пользователя
router.get('/:userId/shifts', requireOwnershipOrAdmin('userId'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20, isActive, startDate, endDate } = req.query;
    
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

    const { ShiftService } = await import('../services/ShiftService');
    const result = await ShiftService.getUserShifts(userId, {
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
      data: {
        user: {
          id: user.id,
          name: user.name,
          phoneNumber: user.phoneNumber,
          role: user.role
        },
        shifts: result.shifts,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: result.total,
          totalPages
        }
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

// GET /api/users/workers - Получение списка работников (только для админов)
router.get('/workers', requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, isActive, search } = req.query;
    
    const result = await UserService.getAllUsers({ 
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      role: 'worker',
      ...(isActive !== undefined && { isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined }),
      ...(search && { search: search as string })
    });

    const totalPages = Math.ceil(result.total / parseInt(limit as string));

    return res.json({
      success: true,
      message: 'Workers retrieved successfully',
      data: result.users,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: result.total,
        totalPages
      }
    });
  } catch (error) {
    console.error('Get workers error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve workers'
    });
  }
});

// POST /api/users/bulk-update - Массовое обновление пользователей (только для админов)
router.post('/bulk-update', requireAdmin, validateJSON, async (req, res) => {
  try {
    const { userIds, updates } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'User IDs array is required'
      });
    }

    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Updates object is required'
      });
    }

    const updateUserSchema = Joi.object({
      isActive: Joi.boolean().optional(),
      role: Joi.string().valid('worker', 'admin').optional()
    });

    const { error, value } = updateUserSchema.validate(updates);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0]?.message || 'Invalid updates'
      });
    }

    const results = [];
    const errors = [];

    for (const userId of userIds) {
      try {
        // Проверяем, что пользователь существует
        const user = await UserService.getUserById(userId);
        if (!user) {
          errors.push(`User ${userId} not found`);
          continue;
        }

        // Запрещаем изменять самого себя
        if (userId === req.user?.id) {
          errors.push(`Cannot modify your own account`);
          continue;
        }

        const updatedUser = await UserService.updateUser(userId, value);
        
        if (updatedUser) {
          results.push(updatedUser);
        } else {
          errors.push(`Failed to update user ${userId}`);
        }
      } catch (error) {
        errors.push(`Error updating user ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return res.json({
      success: results.length > 0,
      message: `Successfully updated ${results.length} users${errors.length > 0 ? ` with ${errors.length} errors` : ''}`,
      data: {
        updated: results,
        errors
      }
    });
  } catch (error) {
    console.error('Bulk update users error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process bulk update'
    });
  }
});

export default router; 