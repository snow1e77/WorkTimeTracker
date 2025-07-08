import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database';
import { WorkShift, ShiftRow } from '../types';

export class ShiftService {
  // Начало рабочей смены
  static async startShift(shiftData: {
    userId: string;
    siteId: string;
    startLocation?: { latitude: number; longitude: number };
    notes?: string;
  }): Promise<WorkShift> {
    const { userId, siteId, startLocation, notes } = shiftData;

    const shiftId = uuidv4();
    const startTime = new Date();

    const result = await query(
      `INSERT INTO work_shifts (id, user_id, site_id, start_time, is_active, start_location, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        shiftId,
        userId,
        siteId,
        startTime,
        true,
        startLocation ? JSON.stringify(startLocation) : null,
        notes || null,
      ]
    );

    return this.mapRowToShift(result.rows[0]);
  }

  // Завершение рабочей смены
  static async endShift(
    shiftId: string,
    endData: {
      endLocation?: { latitude: number; longitude: number };
      notes?: string;
    }
  ): Promise<WorkShift | null> {
    const { endLocation, notes } = endData;
    const endTime = new Date();

    const result = await query(
      `UPDATE work_shifts 
       SET end_time = $1, is_active = false, end_location = $2, notes = COALESCE($3, notes)
       WHERE id = $4 AND is_active = true
       RETURNING *`,
      [
        endTime,
        endLocation ? JSON.stringify(endLocation) : null,
        notes,
        shiftId,
      ]
    );

    return result.rows.length > 0 ? this.mapRowToShift(result.rows[0]) : null;
  }

  // Получение всех смен с пагинацией
  static async getAllShifts(
    options: {
      page?: number;
      limit?: number;
      isActive?: boolean;
      userId?: string;
      siteId?: string;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<{ shifts: WorkShift[]; total: number }> {
    const {
      page = 1,
      limit = 20,
      isActive,
      userId,
      siteId,
      startDate,
      endDate,
    } = options;
    const offset = (page - 1) * limit;

    const whereConditions: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (isActive !== undefined) {
      whereConditions.push(`ws.is_active = $${paramIndex++}`);
      queryParams.push(isActive);
    }

    if (userId) {
      whereConditions.push(`ws.user_id = $${paramIndex++}`);
      queryParams.push(userId);
    }

    if (siteId) {
      whereConditions.push(`ws.site_id = $${paramIndex++}`);
      queryParams.push(siteId);
    }

    if (startDate) {
      whereConditions.push(`ws.start_time >= $${paramIndex++}`);
      queryParams.push(startDate);
    }

    if (endDate) {
      whereConditions.push(`ws.start_time <= $${paramIndex++}`);
      queryParams.push(endDate);
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

    // Получаем общее количество
    const countResult = await query(
      `SELECT COUNT(*) FROM work_shifts ws ${whereClause}`,
      queryParams
    );
    const total = parseInt(countResult.rows[0].count);

    // Получаем смены с информацией о пользователях и объектах
    const shiftsResult = await query(
      `SELECT ws.*, 
              u.name as user_name, u.phone_number as user_phone,
              cs.name as site_name, cs.address as site_address
       FROM work_shifts ws
       JOIN users u ON ws.user_id = u.id
       JOIN construction_sites cs ON ws.site_id = cs.id
       ${whereClause}
       ORDER BY ws.start_time DESC 
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...queryParams, limit, offset]
    );

    const shifts = shiftsResult.rows.map((row: any) => ({
      ...this.mapRowToShift(row),
      userName: row.user_name,
      userPhone: row.user_phone,
      siteName: row.site_name,
      siteAddress: row.site_address,
    }));

    return { shifts, total };
  }

  // Получение смены по ID
  static async getShiftById(shiftId: string): Promise<WorkShift | null> {
    const result = await query(
      `SELECT ws.*, 
              u.name as user_name, u.phone_number as user_phone,
              cs.name as site_name, cs.address as site_address
       FROM work_shifts ws
       JOIN users u ON ws.user_id = u.id
       JOIN construction_sites cs ON ws.site_id = cs.id
       WHERE ws.id = $1`,
      [shiftId]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      ...this.mapRowToShift(row),
      userName: row.user_name,
      userPhone: row.user_phone,
      siteName: row.site_name,
      siteAddress: row.site_address,
    };
  }

  // Получение активной смены пользователя
  static async getActiveShiftByUser(userId: string): Promise<WorkShift | null> {
    const result = await query(
      `SELECT ws.*, 
              cs.name as site_name, cs.address as site_address
       FROM work_shifts ws
       JOIN construction_sites cs ON ws.site_id = cs.id
       WHERE ws.user_id = $1 AND ws.is_active = true
       ORDER BY ws.start_time DESC
       LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      ...this.mapRowToShift(row),
      siteName: row.site_name,
      siteAddress: row.site_address,
    };
  }

  // Получение смен пользователя
  static async getUserShifts(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      isActive?: boolean;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<{ shifts: WorkShift[]; total: number }> {
    return this.getAllShifts({ ...options, userId });
  }

  // Получение смен объекта
  static async getSiteShifts(
    siteId: string,
    options: {
      page?: number;
      limit?: number;
      isActive?: boolean;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<{ shifts: WorkShift[]; total: number }> {
    return this.getAllShifts({ ...options, siteId });
  }

  // Обновление смены
  static async updateShift(
    shiftId: string,
    updates: {
      startTime?: Date;
      endTime?: Date;
      notes?: string;
      isActive?: boolean;
    }
  ): Promise<WorkShift | null> {
    const updateFields: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (updates.startTime !== undefined) {
      updateFields.push(`start_time = $${paramIndex++}`);
      queryParams.push(updates.startTime);
    }

    if (updates.endTime !== undefined) {
      updateFields.push(`end_time = $${paramIndex++}`);
      queryParams.push(updates.endTime);
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
      return this.getShiftById(shiftId);
    }

    queryParams.push(shiftId);

    const result = await query(
      `UPDATE work_shifts SET ${updateFields.join(', ')} 
       WHERE id = $${paramIndex} 
       RETURNING *`,
      queryParams
    );

    return result.rows.length > 0 ? this.mapRowToShift(result.rows[0]) : null;
  }

  // Удаление смены
  static async deleteShift(shiftId: string): Promise<boolean> {
    const result = await query('DELETE FROM work_shifts WHERE id = $1', [
      shiftId,
    ]);
    return result.rowCount > 0;
  }

  // Получение рабочих часов пользователя за период
  static async getUserWorkHours(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalHours: number;
    totalShifts: number;
    completedShifts: number;
    activeShifts: number;
    averageHoursPerShift: number;
  }> {
    const result = await query(
      `SELECT 
         COUNT(*) as total_shifts,
         COUNT(CASE WHEN end_time IS NOT NULL THEN 1 END) as completed_shifts,
         COUNT(CASE WHEN is_active = true THEN 1 END) as active_shifts,
         COALESCE(SUM(total_hours), 0) as total_hours
       FROM work_shifts 
       WHERE user_id = $1 AND start_time >= $2 AND start_time <= $3`,
      [userId, startDate, endDate]
    );

    const row = result.rows[0];
    const totalHours = parseFloat(row.total_hours) || 0;
    const totalShifts = parseInt(row.total_shifts) || 0;
    const completedShifts = parseInt(row.completed_shifts) || 0;
    const activeShifts = parseInt(row.active_shifts) || 0;

    return {
      totalHours,
      totalShifts,
      completedShifts,
      activeShifts,
      averageHoursPerShift:
        completedShifts > 0 ? totalHours / completedShifts : 0,
    };
  }

  // Получение статистики смен
  static async getShiftStats(
    options: {
      userId?: string;
      siteId?: string;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<{
    totalShifts: number;
    activeShifts: number;
    completedShifts: number;
    totalHours: number;
    uniqueWorkers: number;
    uniqueSites: number;
    averageShiftDuration: number;
  }> {
    const { userId, siteId, startDate, endDate } = options;

    const whereConditions: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (userId) {
      whereConditions.push(`user_id = $${paramIndex++}`);
      queryParams.push(userId);
    }

    if (siteId) {
      whereConditions.push(`site_id = $${paramIndex++}`);
      queryParams.push(siteId);
    }

    if (startDate) {
      whereConditions.push(`start_time >= $${paramIndex++}`);
      queryParams.push(startDate);
    }

    if (endDate) {
      whereConditions.push(`start_time <= $${paramIndex++}`);
      queryParams.push(endDate);
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

    const result = await query(
      `SELECT 
         COUNT(*) as total_shifts,
         COUNT(CASE WHEN is_active = true THEN 1 END) as active_shifts,
         COUNT(CASE WHEN end_time IS NOT NULL THEN 1 END) as completed_shifts,
         COALESCE(SUM(total_hours), 0) as total_hours,
         COUNT(DISTINCT user_id) as unique_workers,
         COUNT(DISTINCT site_id) as unique_sites,
         COALESCE(AVG(total_hours), 0) as average_shift_duration
       FROM work_shifts ${whereClause}`,
      queryParams
    );

    const row = result.rows[0];

    return {
      totalShifts: parseInt(row.total_shifts) || 0,
      activeShifts: parseInt(row.active_shifts) || 0,
      completedShifts: parseInt(row.completed_shifts) || 0,
      totalHours: parseFloat(row.total_hours) || 0,
      uniqueWorkers: parseInt(row.unique_workers) || 0,
      uniqueSites: parseInt(row.unique_sites) || 0,
      averageShiftDuration: parseFloat(row.average_shift_duration) || 0,
    };
  }

  // Приватный метод для маппинга строки БД в объект WorkShift
  private static mapRowToShift(row: ShiftRow): WorkShift {
    return {
      id: row.id,
      userId: row.user_id,
      siteId: row.site_id,
      startTime: new Date(row.start_time),
      endTime: row.end_time ? new Date(row.end_time) : undefined,
      totalHours: row.total_hours
        ? parseFloat(row.total_hours.toString())
        : undefined,
      isActive: row.is_active,
      startLocation: row.start_location
        ? JSON.parse(row.start_location)
        : undefined,
      endLocation: row.end_location ? JSON.parse(row.end_location) : undefined,
      notes: row.notes || undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
