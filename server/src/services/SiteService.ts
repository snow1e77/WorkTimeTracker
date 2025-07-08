import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database';
import { ConstructionSite, SiteRow } from '../types';

export class SiteService {
  // Создание нового строительного объекта
  static async createSite(siteData: {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    radius: number;
    companyId?: string;
    createdBy: string;
  }): Promise<ConstructionSite> {
    const { name, address, latitude, longitude, radius, companyId, createdBy } =
      siteData;

    const siteId = uuidv4();

    const result = await query(
      `INSERT INTO construction_sites (id, name, address, latitude, longitude, radius, company_id, created_by, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        siteId,
        name,
        address,
        latitude,
        longitude,
        radius,
        companyId || null,
        createdBy,
        true,
      ]
    );

    return this.mapRowToSite(result.rows[0]);
  }

  // Получение всех строительных объектов с пагинацией
  static async getAllSites(
    options: {
      page?: number;
      limit?: number;
      isActive?: boolean;
      search?: string;
      createdBy?: string;
    } = {}
  ): Promise<{ sites: ConstructionSite[]; total: number }> {
    const { page = 1, limit = 20, isActive, search, createdBy } = options;
    const offset = (page - 1) * limit;

    const whereConditions: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (isActive !== undefined) {
      whereConditions.push(`is_active = $${paramIndex++}`);
      queryParams.push(isActive);
    }

    if (createdBy) {
      whereConditions.push(`created_by = $${paramIndex++}`);
      queryParams.push(createdBy);
    }

    if (search) {
      whereConditions.push(
        `(name ILIKE $${paramIndex++} OR address ILIKE $${paramIndex++})`
      );
      queryParams.push(`%${search}%`, `%${search}%`);
      paramIndex++;
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

    // Получаем общее количество
    const countResult = await query(
      `SELECT COUNT(*) FROM construction_sites ${whereClause}`,
      queryParams
    );
    const total = parseInt(countResult.rows[0].count);

    // Получаем строительные объекты с пагинацией
    const sitesResult = await query(
      `SELECT * FROM construction_sites ${whereClause} 
       ORDER BY created_at DESC 
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...queryParams, limit, offset]
    );

    const sites = sitesResult.rows.map(this.mapRowToSite);

    return { sites, total };
  }

  // Получение строительного объекта по ID
  static async getSiteById(siteId: string): Promise<ConstructionSite | null> {
    const result = await query(
      'SELECT * FROM construction_sites WHERE id = $1',
      [siteId]
    );

    return result.rows.length > 0 ? this.mapRowToSite(result.rows[0]) : null;
  }

  // Обновление строительного объекта
  static async updateSite(
    siteId: string,
    updates: {
      name?: string;
      address?: string;
      latitude?: number;
      longitude?: number;
      radius?: number;
      companyId?: string;
      isActive?: boolean;
    }
  ): Promise<ConstructionSite | null> {
    const updateFields: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`);
      queryParams.push(updates.name);
    }

    if (updates.address !== undefined) {
      updateFields.push(`address = $${paramIndex++}`);
      queryParams.push(updates.address);
    }

    if (updates.latitude !== undefined) {
      updateFields.push(`latitude = $${paramIndex++}`);
      queryParams.push(updates.latitude);
    }

    if (updates.longitude !== undefined) {
      updateFields.push(`longitude = $${paramIndex++}`);
      queryParams.push(updates.longitude);
    }

    if (updates.radius !== undefined) {
      updateFields.push(`radius = $${paramIndex++}`);
      queryParams.push(updates.radius);
    }

    if (updates.companyId !== undefined) {
      updateFields.push(`company_id = $${paramIndex++}`);
      queryParams.push(updates.companyId);
    }

    if (updates.isActive !== undefined) {
      updateFields.push(`is_active = $${paramIndex++}`);
      queryParams.push(updates.isActive);
    }

    if (updateFields.length === 0) {
      return this.getSiteById(siteId);
    }

    queryParams.push(siteId);

    const result = await query(
      `UPDATE construction_sites SET ${updateFields.join(', ')} 
       WHERE id = $${paramIndex} 
       RETURNING *`,
      queryParams
    );

    return result.rows.length > 0 ? this.mapRowToSite(result.rows[0]) : null;
  }

  // Удаление строительного объекта
  static async deleteSite(siteId: string): Promise<boolean> {
    const result = await query('DELETE FROM construction_sites WHERE id = $1', [
      siteId,
    ]);
    return result.rowCount > 0;
  }

  // Получение строительных объектов пользователя
  static async getUserSites(userId: string): Promise<ConstructionSite[]> {
    const result = await query(
      `SELECT cs.* FROM construction_sites cs
       JOIN user_site_assignments usa ON cs.id = usa.site_id
       WHERE usa.user_id = $1 AND usa.is_active = true AND cs.is_active = true
       AND (usa.valid_from IS NULL OR usa.valid_from <= NOW())
       AND (usa.valid_to IS NULL OR usa.valid_to >= NOW())
       ORDER BY cs.name`,
      [userId]
    );

    return result.rows.map(this.mapRowToSite);
  }

  // Проверка, находится ли точка в радиусе строительного объекта
  static async checkLocationInSite(
    siteId: string,
    latitude: number,
    longitude: number
  ): Promise<{
    inRadius: boolean;
    distance: number;
    site: ConstructionSite | null;
  }> {
    const site = await this.getSiteById(siteId);

    if (!site) {
      return { inRadius: false, distance: 0, site: null };
    }

    const distance = this.calculateDistance(
      latitude,
      longitude,
      site.latitude,
      site.longitude
    );

    return {
      inRadius: distance <= site.radius,
      distance: Math.round(distance),
      site,
    };
  }

  // Получение статистики строительных объектов
  static async getSiteStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    averageRadius: number;
  }> {
    const result = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active,
        COUNT(CASE WHEN is_active = false THEN 1 END) as inactive,
        COALESCE(AVG(radius), 0) as average_radius
      FROM construction_sites
    `);

    const stats = result.rows[0];
    return {
      total: parseInt(stats.total),
      active: parseInt(stats.active),
      inactive: parseInt(stats.inactive),
      averageRadius: Math.round(parseFloat(stats.average_radius)),
    };
  }

  // Расчет расстояния между двумя точками (формула Haversine)
  private static calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371000; // Радиус Земли в метрах
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private static toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  // Маппинг строки БД в объект ConstructionSite
  private static mapRowToSite(row: SiteRow): ConstructionSite {
    const site: ConstructionSite = {
      id: row.id,
      name: row.name,
      address: row.address,
      latitude: row.latitude,
      longitude: row.longitude,
      radius: row.radius,
      isActive: row.is_active,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    if (row.company_id) {
      site.companyId = row.company_id;
    }

    return site;
  }
}
