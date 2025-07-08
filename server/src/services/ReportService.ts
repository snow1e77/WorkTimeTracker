import { query } from '../config/database';
import { WorkReport, ViolationsSummary } from '../types';

export class ReportService {
  // Псевдоним для совместимости с роутами
  static async generateWorkReport(
    options: {
      startDate?: Date;
      endDate?: Date;
      userId?: string;
      siteId?: string;
      groupBy?: 'user' | 'site' | 'date';
    } = {}
  ): Promise<WorkReport[]> {
    return this.getWorkReports(options);
  }

  // Получение рабочих отчетов
  static async getWorkReports(
    options: {
      startDate?: Date;
      endDate?: Date;
      userId?: string;
      siteId?: string;
      groupBy?: 'user' | 'site' | 'date';
    } = {}
  ): Promise<WorkReport[]> {
    const { startDate, endDate, userId, siteId, groupBy = 'user' } = options;

    const whereConditions: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (startDate) {
      whereConditions.push(`ws.start_time >= $${paramIndex++}`);
      queryParams.push(startDate);
    }

    if (endDate) {
      whereConditions.push(`ws.start_time <= $${paramIndex++}`);
      queryParams.push(endDate);
    }

    if (userId) {
      whereConditions.push(`ws.user_id = $${paramIndex++}`);
      queryParams.push(userId);
    }

    if (siteId) {
      whereConditions.push(`ws.site_id = $${paramIndex++}`);
      queryParams.push(siteId);
    }

    // Добавляем условие для завершенных смен
    whereConditions.push('ws.end_time IS NOT NULL');

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

    let groupByClause = '';
    let selectFields = '';

    switch (groupBy) {
      case 'user':
        selectFields = `
          u.id as user_id,
          u.name as user_name,
          u.phone_number as user_phone,
          NULL as site_id,
          NULL as site_name,
          NULL as date
        `;
        groupByClause = 'GROUP BY u.id, u.name, u.phone_number';
        break;
      case 'site':
        selectFields = `
          NULL as user_id,
          NULL as user_name,
          NULL as user_phone,
          cs.id as site_id,
          cs.name as site_name,
          NULL as date
        `;
        groupByClause = 'GROUP BY cs.id, cs.name';
        break;
      case 'date':
        selectFields = `
          NULL as user_id,
          NULL as user_name,
          NULL as user_phone,
          NULL as site_id,
          NULL as site_name,
          DATE(ws.start_time) as date
        `;
        groupByClause = 'GROUP BY DATE(ws.start_time)';
        break;
    }

    const result = await query(
      `SELECT 
         ${selectFields},
         COUNT(ws.id) as shifts_count,
         COALESCE(SUM(ws.total_hours), 0) as total_hours,
         COUNT(v.id) as violations_count
       FROM work_shifts ws
       JOIN users u ON ws.user_id = u.id
       JOIN construction_sites cs ON ws.site_id = cs.id
       LEFT JOIN violations v ON v.user_id = ws.user_id AND v.site_id = ws.site_id
       ${whereClause}
       ${groupByClause}
       ORDER BY total_hours DESC`,
      queryParams
    );

    return result.rows.map((row: any) => ({
      userId: row.user_id,
      userName: row.user_name,
      userPhone: row.user_phone,
      siteId: row.site_id,
      siteName: row.site_name,
      date: row.date,
      shiftsCount: parseInt(row.shifts_count),
      totalHours: parseFloat(row.total_hours),
      violationsCount: parseInt(row.violations_count),
    }));
  }

  // Получение отчета по нарушениям
  static async getViolationsReport(
    options: {
      startDate?: Date;
      endDate?: Date;
      userId?: string;
      siteId?: string;
      severity?: 'low' | 'medium' | 'high';
      type?: string;
      resolved?: boolean;
    } = {}
  ): Promise<ViolationsSummary> {
    const { startDate, endDate, userId, siteId, severity, type, resolved } =
      options;

    const whereConditions: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (startDate) {
      whereConditions.push(`v.created_at >= $${paramIndex++}`);
      queryParams.push(startDate);
    }

    if (endDate) {
      whereConditions.push(`v.created_at <= $${paramIndex++}`);
      queryParams.push(endDate);
    }

    if (userId) {
      whereConditions.push(`v.user_id = $${paramIndex++}`);
      queryParams.push(userId);
    }

    if (siteId) {
      whereConditions.push(`v.site_id = $${paramIndex++}`);
      queryParams.push(siteId);
    }

    if (severity) {
      whereConditions.push(`v.severity = $${paramIndex++}`);
      queryParams.push(severity);
    }

    if (type) {
      whereConditions.push(`v.type = $${paramIndex++}`);
      queryParams.push(type);
    }

    if (resolved !== undefined) {
      whereConditions.push(`(v.resolved_at IS ${resolved ? 'NOT' : ''} NULL)`);
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

    // Получаем общую статистику
    const summaryResult = await query(
      `SELECT 
         COUNT(*) as total,
         COUNT(CASE WHEN resolved_at IS NOT NULL THEN 1 END) as resolved,
         COUNT(CASE WHEN resolved_at IS NULL THEN 1 END) as unresolved
       FROM violations v ${whereClause}`,
      queryParams
    );

    // Получаем статистику по типам
    const typeResult = await query(
      `SELECT type, COUNT(*) as count
       FROM violations v ${whereClause}
       GROUP BY type`,
      queryParams
    );

    // Получаем статистику по степени важности
    const severityResult = await query(
      `SELECT 
         COUNT(CASE WHEN severity = 'low' THEN 1 END) as low,
         COUNT(CASE WHEN severity = 'medium' THEN 1 END) as medium,
         COUNT(CASE WHEN severity = 'high' THEN 1 END) as high
       FROM violations v ${whereClause}`,
      queryParams
    );

    const summary = summaryResult.rows[0];
    const severityStats = severityResult.rows[0];

    const byType: { [key: string]: number } = {};
    typeResult.rows.forEach((row: any) => {
      byType[row.type] = parseInt(row.count);
    });

    return {
      total: parseInt(summary.total),
      resolved: parseInt(summary.resolved),
      unresolved: parseInt(summary.unresolved),
      byType,
      bySeverity: {
        low: parseInt(severityStats.low) || 0,
        medium: parseInt(severityStats.medium) || 0,
        high: parseInt(severityStats.high) || 0,
      },
    };
  }

  // Псевдоним для совместимости с роутами
  static async generateViolationReport(
    options: {
      startDate?: Date;
      endDate?: Date;
      userId?: string;
      siteId?: string;
      severity?: 'low' | 'medium' | 'high';
      type?: string;
      resolved?: boolean;
    } = {}
  ): Promise<ViolationsSummary> {
    return this.getViolationsReport(options);
  }

  // Псевдоним для совместимости с роутами
  static async getGeneralStatistics(
    options: {
      startDate?: Date;
      endDate?: Date;
    } = {}
  ) {
    return this.getSystemStatistics(options);
  }

  // Псевдоним для совместимости с роутами
  static async exportReport(
    type: 'work' | 'violations',
    options: any = {}
  ): Promise<string> {
    return this.exportToCSV(type, options);
  }

  // Получение общей статистики системы
  static async getSystemStatistics(
    options: {
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<{
    users: {
      total: number;
      active: number;
      workers: number;
      admins: number;
    };
    sites: {
      total: number;
      active: number;
    };
    shifts: {
      total: number;
      active: number;
      completed: number;
      totalHours: number;
    };
    violations: {
      total: number;
      resolved: number;
      unresolved: number;
    };
  }> {
    const { startDate, endDate } = options;

    let dateFilter = '';
    const dateParams: any[] = [];
    let paramIndex = 1;

    if (startDate) {
      dateFilter += ` AND created_at >= $${paramIndex++}`;
      dateParams.push(startDate);
    }

    if (endDate) {
      dateFilter += ` AND created_at <= $${paramIndex++}`;
      dateParams.push(endDate);
    }

    // Статистика пользователей
    const usersResult = await query(
      "SELECT COUNT(*) as total, COUNT(CASE WHEN is_active THEN 1 END) as active, COUNT(CASE WHEN role = 'worker' THEN 1 END) as workers, COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins FROM users",
      []
    );

    // Статистика объектов
    const sitesResult = await query(
      'SELECT COUNT(*) as total, COUNT(CASE WHEN is_active THEN 1 END) as active FROM construction_sites',
      []
    );

    // Статистика смен
    const shiftsResult = await query(
      `SELECT 
         COUNT(*) as total, 
         COUNT(CASE WHEN is_active THEN 1 END) as active,
         COUNT(CASE WHEN end_time IS NOT NULL THEN 1 END) as completed,
         COALESCE(SUM(total_hours), 0) as total_hours
       FROM work_shifts 
       WHERE 1=1 ${dateFilter}`,
      dateParams
    );

    // Статистика нарушений
    const violationsResult = await query(
      `SELECT 
         COUNT(*) as total,
         COUNT(CASE WHEN resolved_at IS NOT NULL THEN 1 END) as resolved,
         COUNT(CASE WHEN resolved_at IS NULL THEN 1 END) as unresolved
       FROM violations 
       WHERE 1=1 ${dateFilter}`,
      dateParams
    );

    const users = usersResult.rows[0];
    const sites = sitesResult.rows[0];
    const shifts = shiftsResult.rows[0];
    const violations = violationsResult.rows[0];

    return {
      users: {
        total: parseInt(users.total),
        active: parseInt(users.active),
        workers: parseInt(users.workers),
        admins: parseInt(users.admins),
      },
      sites: {
        total: parseInt(sites.total),
        active: parseInt(sites.active),
      },
      shifts: {
        total: parseInt(shifts.total),
        active: parseInt(shifts.active),
        completed: parseInt(shifts.completed),
        totalHours: parseFloat(shifts.total_hours),
      },
      violations: {
        total: parseInt(violations.total),
        resolved: parseInt(violations.resolved),
        unresolved: parseInt(violations.unresolved),
      },
    };
  }

  // Экспорт отчетов в CSV формат
  static async exportToCSV(
    type: 'work' | 'violations' | 'statistics',
    options: any = {}
  ): Promise<string> {
    let data: any[] = [];
    let headers: string[] = [];

    switch (type) {
      case 'work':
        data = await this.getWorkReports(options);
        headers = [
          'User Name',
          'Site Name',
          'Shifts Count',
          'Total Hours',
          'Violations Count',
        ];
        break;
      case 'violations': {
        const violationsData = await this.getViolationsReport(options);
        data = [violationsData];
        headers = [
          'Total',
          'Resolved',
          'Unresolved',
          'Low Severity',
          'Medium Severity',
          'High Severity',
        ];
        break;
      }
      case 'statistics': {
        const statsData = await this.getSystemStatistics(options);
        data = [statsData];
        headers = [
          'Total Users',
          'Active Users',
          'Total Sites',
          'Active Sites',
          'Total Shifts',
          'Completed Shifts',
        ];
        break;
      }
    }

    // Создаем CSV строку
    const csvRows = [headers.join(',')];

    data.forEach((row: any) => {
      let csvRow: string[] = [];

      switch (type) {
        case 'work':
          csvRow = [
            row.userName || '',
            row.siteName || '',
            row.shiftsCount.toString(),
            row.totalHours.toString(),
            row.violationsCount.toString(),
          ];
          break;
        case 'violations':
          csvRow = [
            row.total.toString(),
            row.resolved.toString(),
            row.unresolved.toString(),
            row.bySeverity.low.toString(),
            row.bySeverity.medium.toString(),
            row.bySeverity.high.toString(),
          ];
          break;
        case 'statistics':
          csvRow = [
            row.users.total.toString(),
            row.users.active.toString(),
            row.sites.total.toString(),
            row.sites.active.toString(),
            row.shifts.total.toString(),
            row.shifts.completed.toString(),
          ];
          break;
      }

      csvRows.push(csvRow.join(','));
    });

    return csvRows.join('\n');
  }

  // Получение детального отчета по пользователю
  static async getUserDetailedReport(
    userId: string,
    options: {
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<{
    user: any;
    workSummary: any;
    violations: any[];
    shifts: any[];
    assignments: any[];
  }> {
    const { startDate, endDate } = options;

    // Получаем информацию о пользователе
    const userResult = await query(
      'SELECT id, name, phone_number, role, is_active, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }

    const user = userResult.rows[0];

    // Получаем рабочую статистику
    const workReports = await this.getWorkReports({
      userId,
      startDate,
      endDate,
    });
    const workSummary =
      workReports.length > 0
        ? workReports[0]
        : {
            shiftsCount: 0,
            totalHours: 0,
            violationsCount: 0,
          };

    // Получаем нарушения
    const violationsResult = await query(
      `SELECT v.*, cs.name as site_name, u_resolved.name as resolved_by_name
       FROM violations v
       LEFT JOIN construction_sites cs ON v.site_id = cs.id
       LEFT JOIN users u_resolved ON v.resolved_by = u_resolved.id
       WHERE v.user_id = $1
       ${startDate ? 'AND v.created_at >= $2' : ''}
       ${endDate ? `AND v.created_at <= $${startDate ? '3' : '2'}` : ''}
       ORDER BY v.created_at DESC`,
      [userId, ...(startDate ? [startDate] : []), ...(endDate ? [endDate] : [])]
    );

    // Получаем смены
    const shiftsResult = await query(
      `SELECT ws.*, cs.name as site_name
       FROM work_shifts ws
       LEFT JOIN construction_sites cs ON ws.site_id = cs.id
       WHERE ws.user_id = $1
       ${startDate ? 'AND ws.start_time >= $2' : ''}
       ${endDate ? `AND ws.start_time <= $${startDate ? '3' : '2'}` : ''}
       ORDER BY ws.start_time DESC`,
      [userId, ...(startDate ? [startDate] : []), ...(endDate ? [endDate] : [])]
    );

    // Получаем назначения
    const assignmentsResult = await query(
      `SELECT usa.*, cs.name as site_name, cs.address as site_address
       FROM user_site_assignments usa
       JOIN construction_sites cs ON usa.site_id = cs.id
       WHERE usa.user_id = $1 AND usa.is_active = true
       ORDER BY usa.assigned_at DESC`,
      [userId]
    );

    return {
      user,
      workSummary,
      violations: violationsResult.rows,
      shifts: shiftsResult.rows,
      assignments: assignmentsResult.rows,
    };
  }
}
