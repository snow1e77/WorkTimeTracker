import { query } from '../config/database';
import {
  AdminLimits,
  CreateAdminLimitsRequest,
  UpdateAdminLimitsRequest,
  QueryResult,
  AdminLimitsRow,
} from '../types';

export class AdminLimitsService {
  // Создание лимитов для админа
  static async createAdminLimits(
    data: CreateAdminLimitsRequest,
    createdBy: string
  ): Promise<AdminLimits> {
    const {
      adminId,
      companyName,
      maxUsers,
      maxSites,
      maxProjects,
      canExportExcel = true,
      canManageUsers = true,
      canManageSites = true,
      canViewReports = true,
      canChatWithWorkers = true,
      validFrom,
      validTo,
    } = data;

    const result = (await query(
      `INSERT INTO admin_limits (
        admin_id, company_name, max_users, max_sites, max_projects,
        can_export_excel, can_manage_users, can_manage_sites, 
        can_view_reports, can_chat_with_workers,
        valid_from, valid_to, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        adminId,
        companyName,
        maxUsers,
        maxSites,
        maxProjects,
        canExportExcel,
        canManageUsers,
        canManageSites,
        canViewReports,
        canChatWithWorkers,
        validFrom || new Date(),
        validTo,
        createdBy,
      ]
    )) as QueryResult<AdminLimitsRow>;

    // Обновляем запись пользователя
    await query(
      'UPDATE users SET admin_limit_id = $1, company_name = $2 WHERE id = $3',
      [result.rows[0].id, companyName, adminId]
    );

    return this.mapRowToAdminLimits(result.rows[0]);
  }

  // Получение лимитов админа
  static async getAdminLimits(adminId: string): Promise<AdminLimits | null> {
    const result = (await query(
      'SELECT * FROM admin_limits WHERE admin_id = $1 AND is_active = true',
      [adminId]
    )) as QueryResult<AdminLimitsRow>;

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToAdminLimits(result.rows[0]);
  }

  // Обновление лимитов админа
  static async updateAdminLimits(
    adminId: string,
    updates: UpdateAdminLimitsRequest,
    _updatedBy: string
  ): Promise<AdminLimits | null> {
    const existingLimits = await this.getAdminLimits(adminId);

    if (!existingLimits) {
      throw new Error('Admin limits not found');
    }

    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    // Построение динамического запроса UPDATE
    if (updates.companyName !== undefined) {
      updateFields.push(`company_name = $${paramIndex++}`);
      updateValues.push(updates.companyName);
    }
    if (updates.maxUsers !== undefined) {
      updateFields.push(`max_users = $${paramIndex++}`);
      updateValues.push(updates.maxUsers);
    }
    if (updates.maxSites !== undefined) {
      updateFields.push(`max_sites = $${paramIndex++}`);
      updateValues.push(updates.maxSites);
    }
    if (updates.maxProjects !== undefined) {
      updateFields.push(`max_projects = $${paramIndex++}`);
      updateValues.push(updates.maxProjects);
    }
    if (updates.canExportExcel !== undefined) {
      updateFields.push(`can_export_excel = $${paramIndex++}`);
      updateValues.push(updates.canExportExcel);
    }
    if (updates.canManageUsers !== undefined) {
      updateFields.push(`can_manage_users = $${paramIndex++}`);
      updateValues.push(updates.canManageUsers);
    }
    if (updates.canManageSites !== undefined) {
      updateFields.push(`can_manage_sites = $${paramIndex++}`);
      updateValues.push(updates.canManageSites);
    }
    if (updates.canViewReports !== undefined) {
      updateFields.push(`can_view_reports = $${paramIndex++}`);
      updateValues.push(updates.canViewReports);
    }
    if (updates.canChatWithWorkers !== undefined) {
      updateFields.push(`can_chat_with_workers = $${paramIndex++}`);
      updateValues.push(updates.canChatWithWorkers);
    }
    if (updates.validFrom !== undefined) {
      updateFields.push(`valid_from = $${paramIndex++}`);
      updateValues.push(updates.validFrom);
    }
    if (updates.validTo !== undefined) {
      updateFields.push(`valid_to = $${paramIndex++}`);
      updateValues.push(updates.validTo);
    }
    if (updates.isActive !== undefined) {
      updateFields.push(`is_active = $${paramIndex++}`);
      updateValues.push(updates.isActive);
    }

    if (updateFields.length === 0) {
      return existingLimits;
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    updateValues.push(adminId);

    const result = (await query(
      `UPDATE admin_limits 
       SET ${updateFields.join(', ')}
       WHERE admin_id = $${paramIndex}
       RETURNING *`,
      updateValues
    )) as QueryResult<AdminLimitsRow>;

    // Обновляем company_name в таблице users если изменилось
    if (updates.companyName !== undefined) {
      await query('UPDATE users SET company_name = $1 WHERE id = $2', [
        updates.companyName,
        adminId,
      ]);
    }

    return this.mapRowToAdminLimits(result.rows[0]);
  }

  // Получение всех админов с лимитами
  static async getAllAdminLimits(
    options: {
      page?: number;
      limit?: number;
      isActive?: boolean;
      companyName?: string;
    } = {}
  ): Promise<{
    adminLimits: (AdminLimits & { adminName: string; adminPhone: string })[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 20, isActive, companyName } = options;
    const offset = (page - 1) * limit;

    const whereConditions: string[] = ["u.role = 'admin'"];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (isActive !== undefined) {
      whereConditions.push(`al.is_active = $${paramIndex++}`);
      queryParams.push(isActive);
    }

    if (companyName) {
      whereConditions.push(`al.company_name ILIKE $${paramIndex++}`);
      queryParams.push(`%${companyName}%`);
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

    // Получение общего количества
    const countResult = (await query(
      `SELECT COUNT(*) as total
       FROM users u
       LEFT JOIN admin_limits al ON u.id = al.admin_id
       ${whereClause}`,
      queryParams
    )) as QueryResult<{ total: string }>;

    // Получение данных с пагинацией
    const dataResult = (await query(
      `SELECT 
         al.*,
         u.name as admin_name,
         u.phone_number as admin_phone
       FROM users u
       LEFT JOIN admin_limits al ON u.id = al.admin_id
       ${whereClause}
       ORDER BY u.name ASC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...queryParams, limit, offset]
    )) as QueryResult<
      AdminLimitsRow & { admin_name: string; admin_phone: string }
    >;

    const adminLimits = dataResult.rows.map((row) => ({
      ...this.mapRowToAdminLimits(row),
      adminName: row.admin_name,
      adminPhone: row.admin_phone,
    }));

    return {
      adminLimits,
      total: parseInt(countResult.rows[0].total),
      page,
      limit,
    };
  }

  // Проверка лимитов админа
  static async checkAdminLimits(adminId: string): Promise<{
    hasLimits: boolean;
    limits?: AdminLimits;
    currentUsage?: {
      users: number;
      sites: number;
      projects: number;
    };
    violations?: string[];
  }> {
    const limits = await this.getAdminLimits(adminId);

    if (!limits) {
      return { hasLimits: false };
    }

    // Проверка текущего использования
    const usageResult = (await query(
      `SELECT 
         (SELECT COUNT(*) FROM users WHERE company_id = $1) as users_count,
         (SELECT COUNT(*) FROM construction_sites WHERE company_id = $1) as sites_count,
         (SELECT COUNT(*) FROM projects WHERE company_id = $1) as projects_count`,
      [limits.companyName]
    )) as QueryResult<{
      users_count: string;
      sites_count: string;
      projects_count: string;
    }>;

    const currentUsage = {
      users: parseInt(usageResult.rows[0].users_count),
      sites: parseInt(usageResult.rows[0].sites_count),
      projects: parseInt(usageResult.rows[0].projects_count),
    };

    const violations: string[] = [];

    if (currentUsage.users > limits.maxUsers) {
      violations.push(
        `Превышен лимит пользователей: ${currentUsage.users}/${limits.maxUsers}`
      );
    }
    if (currentUsage.sites > limits.maxSites) {
      violations.push(
        `Превышен лимит объектов: ${currentUsage.sites}/${limits.maxSites}`
      );
    }
    if (currentUsage.projects > limits.maxProjects) {
      violations.push(
        `Превышен лимит проектов: ${currentUsage.projects}/${limits.maxProjects}`
      );
    }

    return {
      hasLimits: true,
      limits,
      currentUsage,
      violations: violations.length > 0 ? violations : undefined,
    };
  }

  // Удаление лимитов админа
  static async deleteAdminLimits(adminId: string): Promise<boolean> {
    const result = (await query(
      'UPDATE admin_limits SET is_active = false WHERE admin_id = $1',
      [adminId]
    )) as QueryResult;

    await query('UPDATE users SET admin_limit_id = NULL WHERE id = $1', [
      adminId,
    ]);

    return result.rowCount > 0;
  }

  // Вспомогательный метод для маппинга данных из БД
  private static mapRowToAdminLimits(row: AdminLimitsRow): AdminLimits {
    return {
      id: row.id,
      adminId: row.admin_id,
      companyName: row.company_name,
      maxUsers: row.max_users,
      maxSites: row.max_sites,
      maxProjects: row.max_projects,
      canExportExcel: row.can_export_excel,
      canManageUsers: row.can_manage_users,
      canManageSites: row.can_manage_sites,
      canViewReports: row.can_view_reports,
      canChatWithWorkers: row.can_chat_with_workers,
      validFrom: row.valid_from,
      validTo: row.valid_to,
      isActive: row.is_active,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
