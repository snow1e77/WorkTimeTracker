import express from 'express';
import { requireAdmin } from '../middleware/auth';
import { ReportService } from '../services/ReportService';
import Joi from 'joi';

const router = express.Router();

// Валидационные схемы
const workReportSchema = Joi.object({
  startDate: Joi.date().required(),
  endDate: Joi.date().required().min(Joi.ref('startDate')),
  userId: Joi.string().uuid().optional(),
  siteId: Joi.string().uuid().optional(),
  groupBy: Joi.string().valid('user', 'site', 'day', 'week', 'month').default('user')
});

const violationReportSchema = Joi.object({
  startDate: Joi.date().required(),
  endDate: Joi.date().required().min(Joi.ref('startDate')),
  userId: Joi.string().uuid().optional(),
  siteId: Joi.string().uuid().optional(),
  severity: Joi.string().valid('low', 'medium', 'high').optional(),
  type: Joi.string().valid('late_start', 'early_end', 'location_violation', 'no_checkout', 'other').optional()
});

// Получение рабочих отчетов
router.get('/work', async (req, res) => {
  try {
    const { error, value } = workReportSchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        details: error.details.map(d => d.message)
      });
    }

    const { startDate, endDate, userId, siteId, groupBy } = value;

    // Проверяем права доступа
    if (req.user!.role !== 'admin' && userId && userId !== req.user!.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const report = await ReportService.generateWorkReport({
      startDate,
      endDate,
      userId: req.user!.role === 'admin' ? userId : req.user!.id,
      siteId,
      groupBy
    });

    res.json({
      success: true,
      data: report
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to generate work report'
    });
  }
});

// Получение отчета по нарушениям (только для админов)
router.get('/violations', requireAdmin, async (req, res) => {
  try {
    const { error, value } = violationReportSchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        details: error.details.map(d => d.message)
      });
    }

    const report = await ReportService.generateViolationReport(value);

    res.json({
      success: true,
      data: report
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to generate violation report'
    });
  }
});

// Получение общей статистики (только для админов)
router.get('/statistics', requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const stats = await ReportService.getGeneralStatistics({
      ...(startDate && { startDate: new Date(startDate as string) }),
      ...(endDate && { endDate: new Date(endDate as string) })
    });

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get statistics'
    });
  }
});

// Экспорт отчетов в CSV (только для админов)
router.get('/export/:type', requireAdmin, async (req, res) => {
  try {
    const { type } = req.params;
    const { startDate, endDate, userId, siteId } = req.query;

    if (!type || !['work', 'violations'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid report type'
      });
    }

    const csvData = await ReportService.exportReport(type as 'work' | 'violations', {
      startDate: startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: endDate ? new Date(endDate as string) : new Date(),
      userId: userId as string,
      siteId: siteId as string
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${type}_report_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csvData);

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to export report'
    });
  }
});

export default router; 
