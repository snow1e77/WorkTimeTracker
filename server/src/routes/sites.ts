import express from 'express';
import Joi from 'joi';
import { authenticateToken, requireAdmin, validateJSON } from '../middleware/auth';
import { SiteService } from '../services/SiteService';

const router = express.Router();

// Схемы валидации
const createSiteSchema = Joi.object({
  name: Joi.string().min(2).max(255).required(),
  address: Joi.string().min(5).max(500).required(),
  latitude: Joi.number().min(-90).max(90).required(),
  longitude: Joi.number().min(-180).max(180).required(),
  radius: Joi.number().integer().min(10).max(1000).default(50),
  companyId: Joi.string().uuid().optional()
});

const updateSiteSchema = Joi.object({
  name: Joi.string().min(2).max(255).optional(),
  address: Joi.string().min(5).max(500).optional(),
  latitude: Joi.number().min(-90).max(90).optional(),
  longitude: Joi.number().min(-180).max(180).optional(),
  radius: Joi.number().integer().min(10).max(1000).optional(),
  companyId: Joi.string().uuid().optional().allow(null),
  isActive: Joi.boolean().optional()
});

const getSitesQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  isActive: Joi.boolean().optional(),
  search: Joi.string().max(100).optional(),
  userSites: Joi.boolean().default(false) // Если true, возвращает только объекты пользователя
});

const checkLocationSchema = Joi.object({
  latitude: Joi.number().min(-90).max(90).required(),
  longitude: Joi.number().min(-180).max(180).required()
});

// Все маршруты требуют аутентификации
router.use(authenticateToken);

// GET /api/sites - Получение списка строительных объектов
router.get('/', async (req, res) => {
  try {
    const { error, value } = getSitesQuerySchema.validate(req.query);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0]?.message || 'Validation error'
      });
    }

    const { page, limit, isActive, search, userSites } = value;
    let result;

    if (userSites && req.user) {
      // Возвращаем только объекты назначенные пользователю
      const sites = await SiteService.getUserSites(req.user.id);
      result = { sites, total: sites.length };
    } else {
      // Обычные пользователи видят только активные объекты
      const filters = req.user?.role === 'admin' ? { page, limit, isActive, search } : { page, limit, isActive: true, search };
      result = await SiteService.getAllSites(filters);
    }

    const totalPages = Math.ceil(result.total / limit);

    return res.json({
      success: true,
      message: 'Sites retrieved successfully',
      data: result.sites,
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
      error: 'Failed to retrieve sites'
    });
  }
});

// GET /api/sites/my - Получение строительных объектов пользователя
router.get('/my', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const sites = await SiteService.getUserSites(req.user.id);

    return res.json({
      success: true,
      message: 'User sites retrieved successfully',
      data: sites
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve user sites'
    });
  }
});

// GET /api/sites/stats - Получение статистики строительных объектов (только для админов)
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const stats = await SiteService.getSiteStats();
    
    return res.json({
      success: true,
      message: 'Site statistics retrieved successfully',
      data: stats
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve site statistics'
    });
  }
});

// POST /api/sites - Создание нового строительного объекта (только для админов)
router.post('/', requireAdmin, validateJSON, async (req, res) => {
  try {
    const { error, value } = createSiteSchema.validate(req.body);
    
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

    const site = await SiteService.createSite({
      ...value,
      createdBy: req.user.id
    });

    return res.status(201).json({
      success: true,
      message: 'Site created successfully',
      data: site
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to create site'
    });
  }
});

// GET /api/sites/:siteId - Получение информации о строительном объекте
router.get('/:siteId', async (req, res) => {
  try {
    const { siteId } = req.params;
    
    if (!siteId) {
      return res.status(400).json({
        success: false,
        error: 'Site ID is required'
      });
    }

    const site = await SiteService.getSiteById(siteId);
    
    if (!site) {
      return res.status(404).json({
        success: false,
        error: 'Site not found'
      });
    }

    // Обычные пользователи могут видеть только активные объекты
    if (req.user?.role !== 'admin' && !site.isActive) {
      return res.status(404).json({
        success: false,
        error: 'Site not found'
      });
    }

    return res.json({
      success: true,
      message: 'Site retrieved successfully',
      data: site
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve site'
    });
  }
});

// PUT /api/sites/:siteId - Обновление строительного объекта (только для админов)
router.put('/:siteId', requireAdmin, validateJSON, async (req, res) => {
  try {
    const { siteId } = req.params;
    
    if (!siteId) {
      return res.status(400).json({
        success: false,
        error: 'Site ID is required'
      });
    }

    const { error, value } = updateSiteSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0]?.message || 'Validation error'
      });
    }

    // Проверяем, что объект существует
    const existingSite = await SiteService.getSiteById(siteId);
    if (!existingSite) {
      return res.status(404).json({
        success: false,
        error: 'Site not found'
      });
    }

    const updatedSite = await SiteService.updateSite(siteId, value);
    
    if (!updatedSite) {
      return res.status(400).json({
        success: false,
        error: 'Failed to update site'
      });
    }

    return res.json({
      success: true,
      message: 'Site updated successfully',
      data: updatedSite
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to update site'
    });
  }
});

// DELETE /api/sites/:siteId - Удаление строительного объекта (только для админов)
router.delete('/:siteId', requireAdmin, async (req, res) => {
  try {
    const { siteId } = req.params;
    
    if (!siteId) {
      return res.status(400).json({
        success: false,
        error: 'Site ID is required'
      });
    }

    // Проверяем, что объект существует
    const existingSite = await SiteService.getSiteById(siteId);
    if (!existingSite) {
      return res.status(404).json({
        success: false,
        error: 'Site not found'
      });
    }

    const success = await SiteService.deleteSite(siteId);
    
    if (!success) {
      return res.status(400).json({
        success: false,
        error: 'Failed to delete site'
      });
    }

    return res.json({
      success: true,
      message: 'Site deleted successfully'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to delete site'
    });
  }
});

// POST /api/sites/:siteId/check-location - Проверка нахождения в радиусе объекта
router.post('/:siteId/check-location', validateJSON, async (req, res) => {
  try {
    const { siteId } = req.params;
    const { error, value } = checkLocationSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0]?.message || 'Validation error'
      });
    }

    if (!siteId) {
      return res.status(400).json({
        success: false,
        error: 'Site ID is required'
      });
    }

    const { latitude, longitude } = value;

    // Проверяем, что объект существует
    const site = await SiteService.getSiteById(siteId);
    if (!site) {
      return res.status(404).json({
        success: false,
        error: 'Site not found'
      });
    }

    // Обычные пользователи могут проверять только активные объекты
    if (req.user?.role !== 'admin' && !site.isActive) {
      return res.status(404).json({
        success: false,
        error: 'Site not found'
      });
    }

    const locationCheck = await SiteService.checkLocationInSite(siteId, latitude, longitude);

    return res.json({
      success: true,
      message: 'Location check completed',
      data: {
        site: {
          id: site.id,
          name: site.name,
          radius: site.radius
        },
        location: {
          latitude,
          longitude
        },
        inRadius: locationCheck.inRadius,
        distance: Math.round(locationCheck.distance),
        distanceText: locationCheck.inRadius 
          ? 'You are within the site radius'
          : `You are ${Math.round(locationCheck.distance)}m away from the site (${site.radius}m radius required)`
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to check location'
    });
  }
});

// GET /api/sites/:siteId/assignments - Получение назначений для объекта (только для админов)
router.get('/:siteId/assignments', requireAdmin, async (req, res) => {
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

    const { AssignmentService } = await import('../services/AssignmentService');
    const assignments = await AssignmentService.getSiteAssignments(siteId);

    return res.json({
      success: true,
      message: 'Site assignments retrieved successfully',
      data: {
        site: {
          id: site.id,
          name: site.name,
          address: site.address,
          isActive: site.isActive
        },
        assignments
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve site assignments'
    });
  }
});

// GET /api/sites/:siteId/shifts - Получение смен для объекта (только для админов)
router.get('/:siteId/shifts', requireAdmin, async (req, res) => {
  try {
    const { siteId } = req.params;
    const { page = 1, limit = 20, isActive, startDate, endDate } = req.query;
    
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

    const { ShiftService } = await import('../services/ShiftService');
    const result = await ShiftService.getSiteShifts(siteId, {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      ...(isActive !== undefined && { isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined }),
      ...(startDate && { startDate: new Date(startDate as string) }),
      ...(endDate && { endDate: new Date(endDate as string) })
    });

    const totalPages = Math.ceil(result.total / parseInt(limit as string));

    return res.json({
      success: true,
      message: 'Site shifts retrieved successfully',
      data: {
        site: {
          id: site.id,
          name: site.name,
          address: site.address,
          isActive: site.isActive
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
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve site shifts'
    });
  }
});

export default router; 
