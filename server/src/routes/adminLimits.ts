import express, { Request, Response } from 'express';
import { AdminLimitsService } from '../services/AdminLimitsService';
import { ExcelExportService } from '../services/ExcelExportService';
import { authenticateToken } from '../middleware/auth';
import { ExcelExportRequest, User } from '../types';

// Extend Request interface for TypeScript
interface AuthenticatedRequest extends Request {
  user?: User;
}

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Create admin limits (superadmin only)
router.post('/create', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const currentUser = req.user;
    
    if (!currentUser) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not authenticated' 
      });
    }
    
    // Check permissions (only superadmin can create limits)
    if (currentUser.role !== 'superadmin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Insufficient permissions to create admin limits' 
      });
    }

    const adminLimits = await AdminLimitsService.createAdminLimits(req.body, currentUser.id);
    
    res.json({
      success: true,
      data: adminLimits,
      message: 'Admin limits created successfully'
    });
    return;
  } catch (error) {
    console.error('Error creating admin limits:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Error creating limits'
    });
  }
});

// Get admin limits
router.get('/admin/:adminId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { adminId } = req.params;
    const currentUser = req.user;
    
    if (!adminId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Admin ID is required' 
      });
    }
    
    if (!currentUser) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not authenticated' 
      });
    }
    
    // Admin can only view their own limits, superadmin can view any
    if (currentUser.role !== 'superadmin' && currentUser.id !== adminId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Insufficient permissions to view limits' 
      });
    }

    const adminLimits = await AdminLimitsService.getAdminLimits(adminId);
    
    if (!adminLimits) {
      return res.status(404).json({
        success: false,
        message: 'Limits not found for this admin'
      });
    }
    
    res.json({
      success: true,
      data: adminLimits
    });
    return;
  } catch (error) {
    console.error('Error getting admin limits:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving limits'
    });
  }
});

// Update admin limits
router.patch('/admin/:adminId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { adminId } = req.params;
    const currentUser = req.user;
    
    if (!adminId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Admin ID is required' 
      });
    }
    
    if (!currentUser) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not authenticated' 
      });
    }
    
    // Only superadmin can update limits
    if (currentUser.role !== 'superadmin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Insufficient permissions to modify limits' 
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
      message: 'Admin limits updated successfully'
    });
    return;
  } catch (error) {
    console.error('Error updating admin limits:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Error updating limits'
    });
  }
});

// Get all admins with limits
router.get('/all', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const currentUser = req.user;
    
    if (!currentUser) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not authenticated' 
      });
    }
    
    // Only superadmin can view all admins
    if (currentUser.role !== 'superadmin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Insufficient permissions to view all admins' 
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
    console.error('Error getting admin list:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving admin list'
    });
  }
});

// Check admin limits
router.get('/check/:adminId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { adminId } = req.params;
    const currentUser = req.user;
    
    if (!adminId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Admin ID is required' 
      });
    }
    
    if (!currentUser) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not authenticated' 
      });
    }
    
    // Admin can only check their own limits, superadmin can check any
    if (currentUser.role !== 'superadmin' && currentUser.id !== adminId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Insufficient permissions to check limits' 
      });
    }

    const limitsCheck = await AdminLimitsService.checkAdminLimits(adminId);
    
    res.json({
      success: true,
      data: limitsCheck
    });
    return;
  } catch (error) {
    console.error('Error checking admin limits:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking limits'
    });
  }
});

// Delete admin limits
router.delete('/admin/:adminId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { adminId } = req.params;
    const currentUser = req.user;
    
    if (!adminId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Admin ID is required' 
      });
    }
    
    if (!currentUser) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not authenticated' 
      });
    }
    
    // Only superadmin can delete limits
    if (currentUser.role !== 'superadmin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Insufficient permissions to delete limits' 
      });
    }

    const deleted = await AdminLimitsService.deleteAdminLimits(adminId);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Limits not found for this admin'
      });
    }
    
    res.json({
      success: true,
      message: 'Admin limits deleted successfully'
    });
    return;
  } catch (error) {
    console.error('Error deleting admin limits:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting limits'
    });
  }
});

// Export data to Excel
router.post('/export', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const currentUser = req.user;
    
    if (!currentUser) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not authenticated' 
      });
    }
    
    // Check admin limits for export
    if (currentUser.role === 'admin') {
      const limitsCheck = await AdminLimitsService.checkAdminLimits(currentUser.id);
      
      if (limitsCheck.hasLimits && limitsCheck.limits && !limitsCheck.limits.canExportExcel) {
        return res.status(403).json({ 
          success: false, 
          message: 'You do not have permission to export data to Excel' 
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
        message: exportResult.error || 'Error exporting data'
      });
    }

    res.setHeader('Content-Type', exportRequest.format === 'csv' ? 'text/csv' : 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${exportResult.filename}"`);
    
    res.json({
      success: true,
      data: exportResult.data,
      filename: exportResult.filename,
      message: 'Data exported successfully'
    });
    return;
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting data'
    });
  }
});

export default router; 