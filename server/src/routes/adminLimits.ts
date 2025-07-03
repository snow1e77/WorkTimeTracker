import express, { Request, Response } from 'express';
import { AdminLimitsService } from '../services/AdminLimitsService';
import { ExcelExportService } from '../services/ExcelExportService';
import { authenticateToken } from '../middleware/auth';
import { ExcelExportRequest, User } from '../types';

// Расширяем интерфейс Request для TypeScript
interface AuthenticatedRequest extends Request {
  user?: User;
}

const router = express.Router();

// Применяем middleware аутентификации ко всем маршрутам
router.use(authenticateToken);

// Создание лимитов для админа (только для супер-админа)
router.post('/create', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const currentUser = req.user;
    
    if (!currentUser) {
      return res.status(401).json({ 
        success: false, 
        message: 'Пользователь не аутентифицирован' 
      });
    }
    
    // Проверяем права (только супер-админ может создавать лимиты)
    if (currentUser.role !== 'superadmin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Недостаточно прав для создания лимитов админов' 
      });
    }

    const adminLimits = await AdminLimitsService.createAdminLimits(req.body, currentUser.id);
    
    res.json({
      success: true,
      data: adminLimits,
      message: 'Лимиты админа успешно созданы'
    });
    return;
  } catch (error) {
    console.error('Ошибка создания лимитов админа:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Ошибка создания лимитов'
    });
  }
});

// Получение лимитов админа
router.get('/admin/:adminId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { adminId } = req.params;
    const currentUser = req.user;
    
    if (!adminId) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID админа обязателен' 
      });
    }
    
    if (!currentUser) {
      return res.status(401).json({ 
        success: false, 
        message: 'Пользователь не аутентифицирован' 
      });
    }
    
    // Админ может видеть только свои лимиты, супер-админ - любые
    if (currentUser.role !== 'superadmin' && currentUser.id !== adminId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Недостаточно прав для просмотра лимитов' 
      });
    }

    const adminLimits = await AdminLimitsService.getAdminLimits(adminId);
    
    if (!adminLimits) {
      return res.status(404).json({
        success: false,
        message: 'Лимиты для данного админа не найдены'
      });
    }
    
    res.json({
      success: true,
      data: adminLimits
    });
    return;
  } catch (error) {
    console.error('Ошибка получения лимитов админа:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка получения лимитов'
    });
  }
});

// Обновление лимитов админа
router.patch('/admin/:adminId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { adminId } = req.params;
    const currentUser = req.user;
    
    if (!adminId) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID админа обязателен' 
      });
    }
    
    if (!currentUser) {
      return res.status(401).json({ 
        success: false, 
        message: 'Пользователь не аутентифицирован' 
      });
    }
    
    // Только супер-админ может обновлять лимиты
    if (currentUser.role !== 'superadmin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Недостаточно прав для изменения лимитов' 
      });
    }

    const updatedLimits = await AdminLimitsService.updateAdminLimits(
      adminId, 
      req.body, 
      currentUser.id
    );
    
    res.json({
      success: true,
      data: updatedLimits,
      message: 'Лимиты админа успешно обновлены'
    });
    return;
  } catch (error) {
    console.error('Ошибка обновления лимитов админа:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Ошибка обновления лимитов'
    });
  }
});

// Получение всех админов с лимитами
router.get('/all', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const currentUser = req.user;
    
    if (!currentUser) {
      return res.status(401).json({ 
        success: false, 
        message: 'Пользователь не аутентифицирован' 
      });
    }
    
    // Только супер-админ может видеть всех админов
    if (currentUser.role !== 'superadmin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Недостаточно прав для просмотра всех админов' 
      });
    }

    const options = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
      companyName: req.query.companyName as string
    };

    const result = await AdminLimitsService.getAllAdminLimits(options);
    
    res.json({
      success: true,
      data: result.adminLimits,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: Math.ceil(result.total / result.limit)
      }
    });
    return;
  } catch (error) {
    console.error('Ошибка получения списка админов:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка получения списка админов'
    });
  }
});

// Проверка лимитов админа
router.get('/check/:adminId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { adminId } = req.params;
    const currentUser = req.user;
    
    if (!adminId) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID админа обязателен' 
      });
    }
    
    if (!currentUser) {
      return res.status(401).json({ 
        success: false, 
        message: 'Пользователь не аутентифицирован' 
      });
    }
    
    // Админ может проверять только свои лимиты, супер-админ - любые
    if (currentUser.role !== 'superadmin' && currentUser.id !== adminId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Недостаточно прав для проверки лимитов' 
      });
    }

    const limitsCheck = await AdminLimitsService.checkAdminLimits(adminId);
    
    res.json({
      success: true,
      data: limitsCheck
    });
    return;
  } catch (error) {
    console.error('Ошибка проверки лимитов админа:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка проверки лимитов'
    });
  }
});

// Удаление лимитов админа
router.delete('/admin/:adminId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { adminId } = req.params;
    const currentUser = req.user;
    
    if (!adminId) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID админа обязателен' 
      });
    }
    
    if (!currentUser) {
      return res.status(401).json({ 
        success: false, 
        message: 'Пользователь не аутентифицирован' 
      });
    }
    
    // Только супер-админ может удалять лимиты
    if (currentUser.role !== 'superadmin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Недостаточно прав для удаления лимитов' 
      });
    }

    const deleted = await AdminLimitsService.deleteAdminLimits(adminId);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Лимиты для данного админа не найдены'
      });
    }
    
    res.json({
      success: true,
      message: 'Лимиты админа успешно удалены'
    });
    return;
  } catch (error) {
    console.error('Ошибка удаления лимитов админа:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка удаления лимитов'
    });
  }
});

// Экспорт данных в Excel
router.post('/export', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const currentUser = req.user;
    
    if (!currentUser) {
      return res.status(401).json({ 
        success: false, 
        message: 'Пользователь не аутентифицирован' 
      });
    }
    
    // Проверяем лимиты админа на экспорт
    if (currentUser.role === 'admin') {
      const limitsCheck = await AdminLimitsService.checkAdminLimits(currentUser.id);
      
      if (limitsCheck.hasLimits && limitsCheck.limits && !limitsCheck.limits.canExportExcel) {
        return res.status(403).json({ 
          success: false, 
          message: 'У вас нет прав на экспорт данных в Excel' 
        });
      }
    }

    const exportRequest: ExcelExportRequest = {
      type: req.body.type || 'detailed',
      startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
      endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
      userId: req.body.userId,
      siteId: req.body.siteId,
      format: req.body.format || 'xlsx',
      includeCharts: req.body.includeCharts || false,
      includeSummary: req.body.includeSummary || true
    };

    const exportResult = await ExcelExportService.exportToExcel(exportRequest, currentUser.name);
    
    if (!exportResult.success) {
      return res.status(500).json({
        success: false,
        message: exportResult.error || 'Ошибка экспорта данных'
      });
    }

    res.setHeader('Content-Type', exportRequest.format === 'csv' ? 'text/csv' : 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${exportResult.filename}"`);
    
    res.json({
      success: true,
      data: exportResult.data,
      filename: exportResult.filename,
      message: 'Данные успешно экспортированы'
    });
    return;
  } catch (error) {
    console.error('Ошибка экспорта данных:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка экспорта данных'
    });
  }
});

export default router; 