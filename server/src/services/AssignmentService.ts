import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database';
import { UserSiteAssignment, AssignmentRow } from '../types';

export class AssignmentService {
  // Создание нового назначения
  static async createAssignment(assignmentData: {
    userId: string;
    siteId: string;
    assignedBy: string;
    validFrom?: Date;
    validTo?: Date;
    notes?: string;
  }): Promise<UserSiteAssignment> {
    const { userId, siteId, assignedBy, validFrom, validTo, notes } = assignmentData;
    
    const assignmentId = uuidv4();

    const result = await query(
      `INSERT INTO user_site_assignments (id, user_id, site_id, assigned_by, is_active, valid_from, valid_to, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [assignmentId, userId, siteId, assignedBy, true, validFrom || null, validTo || null, notes || null]
    );

    return this.mapRowToAssignment(result.rows[0]);
  }

  // Получение всех назначений с пагинацией
  static async getAllAssignments(options: {
    page?: number;
    limit?: number;
    isActive?: boolean;
    userId?: string;
    siteId?: string;
    assignedBy?: string;
  } = {}): Promise<{ assignments: UserSiteAssignment[]; total: number }> {
    const { page = 1, limit = 20, isActive, userId, siteId, assignedBy } = options;
    const offset = (page - 1) * limit;

    let whereConditions: string[] = [];
    let queryParams: any[] = [];
    let paramIndex = 1;

    if (isActive !== undefined) {
      whereConditions.push(`usa.is_active = $${paramIndex++}`);
      queryParams.push(isActive);
    }

    if (userId) {
      whereConditions.push(`usa.user_id = $${paramIndex++}`);
      queryParams.push(userId);
    }

    if (siteId) {
      whereConditions.push(`usa.site_id = $${paramIndex++}`);
      queryParams.push(siteId);
    }

    if (assignedBy) {
      whereConditions.push(`usa.assigned_by = $${paramIndex++}`);
      queryParams.push(assignedBy);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Получаем общее количество
    const countResult = await query(
      `SELECT COUNT(*) FROM user_site_assignments usa ${whereClause}`,
      queryParams
    );
    const total = parseInt(countResult.rows[0].count);

    // Получаем назначения с информацией о пользователях и объектах
    const assignmentsResult = await query(
      `SELECT usa.*, 
              u.name as user_name, u.phone_number as user_phone,
              cs.name as site_name, cs.address as site_address,
              ab.name as assigned_by_name
       FROM user_site_assignments usa
       JOIN users u ON usa.user_id = u.id
       JOIN construction_sites cs ON usa.site_id = cs.id
       JOIN users ab ON usa.assigned_by = ab.id
       ${whereClause}
       ORDER BY usa.assigned_at DESC 
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...queryParams, limit, offset]
    );

    const assignments = assignmentsResult.rows.map((row: any) => ({
      ...this.mapRowToAssignment(row),
      userName: row.user_name,
      userPhone: row.user_phone,
      siteName: row.site_name,
      siteAddress: row.site_address,
      assignedByName: row.assigned_by_name
    }));

    return { assignments, total };
  }

  // Получение назначения по ID
  static async getAssignmentById(assignmentId: string): Promise<UserSiteAssignment | null> {
    const result = await query(
      'SELECT * FROM user_site_assignments WHERE id = $1',
      [assignmentId]
    );

    return result.rows.length > 0 ? this.mapRowToAssignment(result.rows[0]) : null;
  }

  // Получение активных назначений пользователя
  static async getUserAssignments(userId: string): Promise<UserSiteAssignment[]> {
    const result = await query(
      `SELECT usa.*, 
              cs.name as site_name, cs.address as site_address, cs.latitude, cs.longitude, cs.radius
       FROM user_site_assignments usa
       JOIN construction_sites cs ON usa.site_id = cs.id
       WHERE usa.user_id = $1 AND usa.is_active = true AND cs.is_active = true
       AND (usa.valid_from IS NULL OR usa.valid_from <= NOW())
       AND (usa.valid_to IS NULL OR usa.valid_to >= NOW())
       ORDER BY usa.assigned_at DESC`,
      [userId]
    );

    return result.rows.map((row: any) => ({
      ...this.mapRowToAssignment(row),
      siteName: row.site_name,
      siteAddress: row.site_address,
      siteLocation: {
        latitude: row.latitude,
        longitude: row.longitude,
        radius: row.radius
      }
    }));
  }

  // Получение назначений объекта
  static async getSiteAssignments(siteId: string): Promise<UserSiteAssignment[]> {
    const result = await query(
      `SELECT usa.*, 
              u.name as user_name, u.phone_number as user_phone
       FROM user_site_assignments usa
       JOIN users u ON usa.user_id = u.id
       WHERE usa.site_id = $1 AND usa.is_active = true
       AND (usa.valid_from IS NULL OR usa.valid_from <= NOW())
       AND (usa.valid_to IS NULL OR usa.valid_to >= NOW())
       ORDER BY u.name`,
      [siteId]
    );

    return result.rows.map((row: any) => ({
      ...this.mapRowToAssignment(row),
      userName: row.user_name,
      userPhone: row.user_phone
    }));
  }

  // Обновление назначения
  static async updateAssignment(assignmentId: string, updates: {
    validFrom?: Date;
    validTo?: Date;
    notes?: string;
    isActive?: boolean;
  }): Promise<UserSiteAssignment | null> {
    const updateFields: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (updates.validFrom !== undefined) {
      updateFields.push(`valid_from = $${paramIndex++}`);
      queryParams.push(updates.validFrom);
    }

    if (updates.validTo !== undefined) {
      updateFields.push(`valid_to = $${paramIndex++}`);
      queryParams.push(updates.validTo);
    }

    if (updates.notes !== undefined) {
      updateFields.push(`notes = $${paramIndex++}`);
      queryParams.push(updates.notes);
    }

    if (updates.isActive !== undefined) {
      updateFields.push(`is_active = $${paramIndex++}`);
      queryParams.push(updates.isActive);
    }

    if (updateFields.length === 0) {
      return this.getAssignmentById(assignmentId);
    }

    queryParams.push(assignmentId);

    const result = await query(
      `UPDATE user_site_assignments SET ${updateFields.join(', ')} 
       WHERE id = $${paramIndex} 
       RETURNING *`,
      queryParams
    );

    return result.rows.length > 0 ? this.mapRowToAssignment(result.rows[0]) : null;
  }

  // Удаление назначения
  static async deleteAssignment(assignmentId: string): Promise<boolean> {
    const result = await query('DELETE FROM user_site_assignments WHERE id = $1', [assignmentId]);
    return result.rowCount > 0;
  }

  // Деактивация назначения (мягкое удаление)
  static async deactivateAssignment(assignmentId: string): Promise<boolean> {
    const result = await query(
      'UPDATE user_site_assignments SET is_active = false WHERE id = $1',
      [assignmentId]
    );
    return result.rowCount > 0;
  }

  // Проверка существования назначения пользователя на объект
  static async checkUserAssignment(userId: string, siteId: string): Promise<boolean> {
    const result = await query(
      `SELECT id FROM user_site_assignments 
       WHERE user_id = $1 AND site_id = $2 AND is_active = true
       AND (valid_from IS NULL OR valid_from <= NOW())
       AND (valid_to IS NULL OR valid_to >= NOW())`,
      [userId, siteId]
    );

    return result.rows.length > 0;
  }

  // Получение статистики назначений
  static async getAssignmentStats(): Promise<{
    total: number;
    active: number;
    expired: number;
    usersWithAssignments: number;
    sitesWithAssignments: number;
  }> {
    const result = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active,
        COUNT(CASE WHEN is_active = true AND valid_to < NOW() THEN 1 END) as expired,
        COUNT(DISTINCT user_id) as users_with_assignments,
        COUNT(DISTINCT site_id) as sites_with_assignments
      FROM user_site_assignments
    `);

    const stats = result.rows[0];
    return {
      total: parseInt(stats.total),
      active: parseInt(stats.active),
      expired: parseInt(stats.expired),
      usersWithAssignments: parseInt(stats.users_with_assignments),
      sitesWithAssignments: parseInt(stats.sites_with_assignments),
    };
  }

  // Маппинг строки БД в объект UserSiteAssignment
  private static mapRowToAssignment(row: AssignmentRow): UserSiteAssignment {
    return {
      id: row.id,
      userId: row.user_id,
      siteId: row.site_id,
      assignedBy: row.assigned_by,
      isActive: row.is_active,
      assignedAt: row.assigned_at,
      validFrom: row.valid_from || undefined,
      validTo: row.valid_to || undefined,
      notes: row.notes || undefined,
    };
  }
} 