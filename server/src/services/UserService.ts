import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database';
import { User, UserWithPassword, UserRow } from '../types';

export class UserService {
  // Создание нового пользователя (без пароля)
  static async createUser(userData: {
    phoneNumber: string;
    name: string;
    role?: 'worker' | 'admin';
    companyId?: string;
  }): Promise<User> {
    const { phoneNumber, name, role = 'worker', companyId } = userData;
    
    // Проверяем, не существует ли уже пользователь с таким номером
    const existingUser = await this.getUserByPhoneNumber(phoneNumber);
    if (existingUser) {
      throw new Error('User with this phone number already exists');
    }

    const userId = uuidv4();

    const result = await query(
      `INSERT INTO users (id, phone_number, name, role, company_id, is_verified, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, phone_number, name, role, company_id, is_verified, is_active, created_at, updated_at`,
      [userId, phoneNumber, name, role, companyId || null, true, true]
    );

    return this.mapRowToUser(result.rows[0]);
  }

  // Получение пользователя по номеру телефона
  static async getUserByPhoneNumber(phoneNumber: string): Promise<User | null> {
    const result = await query(
      'SELECT id, phone_number, name, role, company_id, is_verified, is_active, created_at, updated_at FROM users WHERE phone_number = $1',
      [phoneNumber]
    );

    return result.rows.length > 0 ? this.mapRowToUser(result.rows[0]) : null;
  }

  // Получение пользователя с паролем для аутентификации
  static async getUserWithPasswordByPhoneNumber(phoneNumber: string): Promise<UserWithPassword | null> {
    const result = await query(
      'SELECT * FROM users WHERE phone_number = $1',
      [phoneNumber]
    );

    return result.rows.length > 0 ? this.mapRowToUserWithPassword(result.rows[0]) : null;
  }

  // Получение пользователя по ID
  static async getUserById(userId: string): Promise<User | null> {
    const result = await query(
      'SELECT id, phone_number, name, role, company_id, is_verified, is_active, created_at, updated_at FROM users WHERE id = $1',
      [userId]
    );

    return result.rows.length > 0 ? this.mapRowToUser(result.rows[0]) : null;
  }

  // Получение всех пользователей с пагинацией
  static async getAllUsers(options: {
    page?: number;
    limit?: number;
    role?: 'worker' | 'admin';
    isActive?: boolean;
    search?: string;
  } = {}): Promise<{ users: User[]; total: number }> {
    const { page = 1, limit = 20, role, isActive, search } = options;
    const offset = (page - 1) * limit;

    let whereConditions: string[] = [];
    let queryParams: any[] = [];
    let paramIndex = 1;

    if (role) {
      whereConditions.push(`role = $${paramIndex++}`);
      queryParams.push(role);
    }

    if (isActive !== undefined) {
      whereConditions.push(`is_active = $${paramIndex++}`);
      queryParams.push(isActive);
    }

    if (search) {
      whereConditions.push(`(name ILIKE $${paramIndex++} OR phone_number ILIKE $${paramIndex++})`);
      queryParams.push(`%${search}%`, `%${search}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Получаем общее количество
    const countResult = await query(
      `SELECT COUNT(*) FROM users ${whereClause}`,
      queryParams
    );
    const total = parseInt(countResult.rows[0].count);

    // Получаем пользователей с пагинацией
    const usersResult = await query(
      `SELECT id, phone_number, name, role, company_id, is_verified, is_active, created_at, updated_at 
       FROM users ${whereClause} 
       ORDER BY created_at DESC 
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...queryParams, limit, offset]
    );

    const users = usersResult.rows.map(this.mapRowToUser);

    return { users, total };
  }

  // Обновление пользователя
  static async updateUser(userId: string, updates: {
    name?: string;
    role?: 'worker' | 'admin';
    isActive?: boolean;
    isVerified?: boolean;
    companyId?: string;
  }): Promise<User | null> {
    const updateFields: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`);
      queryParams.push(updates.name);
    }

    if (updates.role !== undefined) {
      updateFields.push(`role = $${paramIndex++}`);
      queryParams.push(updates.role);
    }

    if (updates.isActive !== undefined) {
      updateFields.push(`is_active = $${paramIndex++}`);
      queryParams.push(updates.isActive);
    }

    if (updates.isVerified !== undefined) {
      updateFields.push(`is_verified = $${paramIndex++}`);
      queryParams.push(updates.isVerified);
    }

    if (updates.companyId !== undefined) {
      updateFields.push(`company_id = $${paramIndex++}`);
      queryParams.push(updates.companyId);
    }

    if (updateFields.length === 0) {
      return this.getUserById(userId);
    }

    queryParams.push(userId);

    const result = await query(
      `UPDATE users SET ${updateFields.join(', ')} 
       WHERE id = $${paramIndex} 
       RETURNING id, phone_number, name, role, company_id, is_verified, is_active, created_at, updated_at`,
      queryParams
    );

    return result.rows.length > 0 ? this.mapRowToUser(result.rows[0]) : null;
  }

  // Удаление пользователя
  static async deleteUser(userId: string): Promise<boolean> {
    const result = await query('DELETE FROM users WHERE id = $1', [userId]);
    return result.rowCount > 0;
  }

  // Проверка пароля
  static async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  // Обновление пароля
  static async updatePassword(userId: string, newPassword: string): Promise<boolean> {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    const result = await query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [passwordHash, userId]
    );
    return result.rowCount > 0;
  }

  // Получение статистики пользователей
  static async getUserStats(): Promise<{
    total: number;
    active: number;
    workers: number;
    admins: number;
    verified: number;
  }> {
    const result = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active,
        COUNT(CASE WHEN role = 'worker' THEN 1 END) as workers,
        COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins,
        COUNT(CASE WHEN is_verified = true THEN 1 END) as verified
      FROM users
    `);

    const stats = result.rows[0];
    return {
      total: parseInt(stats.total),
      active: parseInt(stats.active),
      workers: parseInt(stats.workers),
      admins: parseInt(stats.admins),
      verified: parseInt(stats.verified),
    };
  }

  // Маппинг строки БД в объект User
  private static mapRowToUser(row: UserRow): User {
    const user: User = {
      id: row.id,
      phoneNumber: row.phone_number,
      name: row.name,
      role: row.role as 'worker' | 'admin',
      isVerified: row.is_verified,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    if (row.company_id) {
      user.companyId = row.company_id;
    }

    return user;
  }

  // Маппинг строки БД в объект UserWithPassword
  private static mapRowToUserWithPassword(row: UserRow): UserWithPassword {
    return {
      ...this.mapRowToUser(row),
      passwordHash: undefined, // Пароли больше не используются
    };
  }
} 