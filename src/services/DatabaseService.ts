import * as SQLite from 'expo-sqlite';
import { AuthUser, SMSVerification } from '../types';

// Types for SQL query results
interface UserRow {
  id: string;
  phoneNumber: string;
  name: string;
  role: string;
  companyId: string | null | undefined;
  isVerified: number;
  isActive: number;
  createdAt: string;
}

interface PasswordRow {
  passwordHash: string;
}

interface SMSVerificationRow {
  id: string;
  phoneNumber: string;
  code: string;
  type: string;
  isUsed: number;
  expiresAt: string;
  createdAt: string;
}

export class DatabaseService {
  private static instance: DatabaseService;
  private db: SQLite.SQLiteDatabase | null = null;
  private isInitialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  private constructor() {}

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  async initDatabase(): Promise<void> {
    // Если база уже инициализируется, ждем завершения
    if (this.initPromise) {
      return this.initPromise;
    }

    // Если база уже инициализирована, возвращаемся
    if (this.isInitialized && this.db) {
      return;
    }

    this.initPromise = this._performInit();
    return this.initPromise;
  }

  private async _performInit(): Promise<void> {
    try {
      console.log('🔄 Initializing database...');
      
      // Открываем базу данных
      this.db = await SQLite.openDatabaseAsync('worktime.db');
      console.log('✅ Database connection opened');

      // Проверим, что база данных действительно открыта
      if (!this.db) {
        throw new Error('Failed to open database connection');
      }

      // Создаём таблицы
      await this.createTables();
      console.log('✅ Tables created/verified');

      this.isInitialized = true;
      console.log('✅ Database initialized successfully');
    } catch (error) {
      console.error('❌ Database initialization error:', error);
      this.isInitialized = false;
      this.db = null;
      this.initPromise = null;
      throw error;
    } finally {
      this.initPromise = null;
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized || !this.db) {
      console.log('⚠️ Database not initialized, initializing now...');
      await this.initDatabase();
    }
    
    if (!this.db) {
      throw new Error('Database is not available');
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) {
      throw new Error('Database connection is not available');
    }

    try {
      console.log('🔄 Creating database tables...');
      
      // Users table - исправлено для expo-sqlite 15.x с разделением запросов
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          phoneNumber TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'worker',
          companyId TEXT,
          isVerified INTEGER NOT NULL DEFAULT 0,
          isActive INTEGER NOT NULL DEFAULT 1,
          createdAt TEXT NOT NULL
        )
      `);

      // Passwords table (separate for security)
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS user_passwords (
          userId TEXT PRIMARY KEY,
          passwordHash TEXT NOT NULL,
          FOREIGN KEY (userId) REFERENCES users (id)
        )
      `);

      // SMS verification table
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS sms_verifications (
          id TEXT PRIMARY KEY,
          phoneNumber TEXT NOT NULL,
          code TEXT NOT NULL,
          type TEXT NOT NULL,
          isUsed INTEGER NOT NULL DEFAULT 0,
          expiresAt TEXT NOT NULL,
          createdAt TEXT NOT NULL
        )
      `);

      // Construction sites table
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS construction_sites (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          address TEXT NOT NULL,
          latitude REAL NOT NULL,
          longitude REAL NOT NULL,
          radius REAL NOT NULL,
          companyId TEXT,
          isActive INTEGER NOT NULL DEFAULT 1,
          createdAt TEXT NOT NULL
        )
      `);

      // Work shifts table
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS work_shifts (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL,
          siteId TEXT NOT NULL,
          startTime TEXT NOT NULL,
          endTime TEXT,
          totalMinutes INTEGER,
          status TEXT NOT NULL DEFAULT 'active',
          startMethod TEXT NOT NULL,
          endMethod TEXT,
          adminConfirmed INTEGER NOT NULL DEFAULT 0,
          notes TEXT,
          createdAt TEXT NOT NULL,
          FOREIGN KEY (userId) REFERENCES users (id),
          FOREIGN KEY (siteId) REFERENCES construction_sites (id)
        )
      `);

      console.log('✅ Database tables created successfully');
    } catch (error) {
      console.error('❌ Table creation error:', error);
      throw error;
    }
  }

  // User management methods

  async createUser(user: AuthUser, passwordHash: string): Promise<void> {
    await this.ensureInitialized();

    if (!this.db) {
      throw new Error('Database is not initialized');
    }

    try {
      await this.db.runAsync(
        `INSERT INTO users (id, phoneNumber, name, role, companyId, isVerified, isActive, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          user.id,
          user.phoneNumber,
          user.name,
          user.role,
          user.companyId || null,
          user.isVerified ? 1 : 0,
          user.isActive ? 1 : 0,
          user.createdAt.toISOString()
        ]
      );

      await this.db.runAsync(
        `INSERT INTO user_passwords (userId, passwordHash) VALUES (?, ?)`,
        [user.id, passwordHash]
      );
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async getUserByPhone(phoneNumber: string): Promise<AuthUser | null> {
    await this.ensureInitialized();

    if (!this.db) {
      throw new Error('Database is not initialized');
    }

    try {
      const result = await this.db.getFirstAsync(
        `SELECT * FROM users WHERE phoneNumber = ?`,
        [phoneNumber]
      ) as UserRow | null;

      if (!result) return null;

      return {
        id: result.id,
        phoneNumber: result.phoneNumber,
        name: result.name,
        role: result.role as 'worker' | 'admin',
        companyId: result.companyId || undefined,
        isVerified: Boolean(result.isVerified),
        isActive: Boolean(result.isActive),
        createdAt: new Date(result.createdAt)
      };
    } catch (error) {
      console.error('Error getting user by phone:', error);
      throw error;
    }
  }

  async getUserById(id: string): Promise<AuthUser | null> {
    await this.ensureInitialized();

    if (!this.db) {
      throw new Error('Database is not initialized');
    }

    try {
      const result = await this.db.getFirstAsync(
        `SELECT * FROM users WHERE id = ?`,
        [id]
      ) as UserRow | null;

      if (!result) return null;

      return {
        id: result.id,
        phoneNumber: result.phoneNumber,
        name: result.name,
        role: result.role as 'worker' | 'admin',
        companyId: result.companyId || undefined,
        isVerified: Boolean(result.isVerified),
        isActive: Boolean(result.isActive),
        createdAt: new Date(result.createdAt)
      };
    } catch (error) {
      console.error('Error getting user by id:', error);
      throw error;
    }
  }

  async getUserPassword(userId: string): Promise<string | null> {
    await this.ensureInitialized();

    if (!this.db) {
      throw new Error('Database is not initialized');
    }

    try {
      const result = await this.db.getFirstAsync(
        `SELECT passwordHash FROM user_passwords WHERE userId = ?`,
        [userId]
      ) as PasswordRow | null;

      return result ? result.passwordHash : null;
    } catch (error) {
      console.error('Error getting user password:', error);
      throw error;
    }
  }

  async updateUserPassword(userId: string, passwordHash: string): Promise<void> {
    await this.ensureInitialized();

    if (!this.db) {
      throw new Error('Database is not initialized');
    }

    try {
      await this.db.runAsync(
        `UPDATE user_passwords SET passwordHash = ? WHERE userId = ?`,
        [passwordHash, userId]
      );
    } catch (error) {
      console.error('Error updating password:', error);
      throw error;
    }
  }

  // SMS verification methods

  async saveSMSVerification(verification: SMSVerification): Promise<void> {
    await this.ensureInitialized();

    if (!this.db) {
      throw new Error('Database is not initialized');
    }

    try {
      await this.db.runAsync(
        `INSERT INTO sms_verifications (id, phoneNumber, code, type, isUsed, expiresAt, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          verification.id,
          verification.phoneNumber,
          verification.code,
          verification.type,
          verification.isUsed ? 1 : 0,
          verification.expiresAt.toISOString(),
          verification.createdAt.toISOString()
        ]
      );
    } catch (error) {
      console.error('Error saving SMS verification:', error);
      throw error;
    }
  }

  async getSMSVerification(phoneNumber: string, type: 'registration' | 'login'): Promise<SMSVerification | null> {
    await this.ensureInitialized();

    if (!this.db) {
      throw new Error('Database is not initialized');
    }

    try {
      const result = await this.db.getFirstAsync(
        `SELECT * FROM sms_verifications 
         WHERE phoneNumber = ? AND type = ? AND isUsed = 0 AND expiresAt > datetime('now')
         ORDER BY createdAt DESC
         LIMIT 1`,
        [phoneNumber, type]
      ) as SMSVerificationRow | null;

      if (!result) return null;

      return {
        id: result.id,
        phoneNumber: result.phoneNumber,
        code: result.code,
        type: result.type as 'registration' | 'login',
        isUsed: Boolean(result.isUsed),
        expiresAt: new Date(result.expiresAt),
        createdAt: new Date(result.createdAt)
      };
    } catch (error) {
      console.error('Error getting SMS verification:', error);
      throw error;
    }
  }

  async markSMSVerificationAsUsed(verificationId: string): Promise<void> {
    await this.ensureInitialized();

    if (!this.db) {
      throw new Error('Database is not initialized');
    }

    try {
      await this.db.runAsync(
        `UPDATE sms_verifications SET isUsed = 1 WHERE id = ?`,
        [verificationId]
      );
    } catch (error) {
      console.error('Error marking SMS verification as used:', error);
      throw error;
    }
  }

  // Cleanup expired verification codes
  async cleanupExpiredVerifications(): Promise<void> {
    await this.ensureInitialized();

    if (!this.db) {
      throw new Error('Database is not initialized');
    }

    try {
      await this.db.runAsync(
        `DELETE FROM sms_verifications WHERE expiresAt < datetime('now')`
      );
    } catch (error) {
      console.error('Error cleaning up expired verifications:', error);
      throw error;
    }
  }

  // Construction sites management methods

  async getConstructionSites(): Promise<any[]> {
    await this.ensureInitialized();

    if (!this.db) {
      throw new Error('Database is not initialized');
    }

    try {
      const result = await this.db.getAllAsync(
        `SELECT * FROM construction_sites WHERE isActive = 1 ORDER BY name`
      );
      return result || [];
    } catch (error) {
      console.error('Error getting construction sites:', error);
      throw error;
    }
  }

  async deleteConstructionSite(siteId: string): Promise<void> {
    await this.ensureInitialized();

    if (!this.db) {
      throw new Error('Database is not initialized');
    }

    try {
      await this.db.runAsync(
        `DELETE FROM construction_sites WHERE id = ?`,
        [siteId]
      );
    } catch (error) {
      console.error('Error deleting construction site:', error);
      throw error;
    }
  }

  async updateSiteStatus(siteId: string, isActive: boolean): Promise<void> {
    await this.ensureInitialized();

    if (!this.db) {
      throw new Error('Database is not initialized');
    }

    try {
      await this.db.runAsync(
        `UPDATE construction_sites SET isActive = ? WHERE id = ?`,
        [isActive ? 1 : 0, siteId]
      );
    } catch (error) {
      console.error('Error updating site status:', error);
      throw error;
    }
  }

  // Work reports methods

  async getWorkReports(period: 'today' | 'week' | 'month'): Promise<any[]> {
    await this.ensureInitialized();

    if (!this.db) {
      throw new Error('Database is not initialized');
    }

    let startDate: Date;
    const now = new Date();

    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        const dayOfWeek = now.getDay();
        startDate = new Date(now.getTime() - (dayOfWeek * 24 * 60 * 60 * 1000));
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    try {
      const result = await this.db.getAllAsync(
        `SELECT 
           ws.userId,
           u.name as userName,
           ws.siteId,
           cs.name as siteName,
           SUM(ws.totalMinutes) as totalMinutes,
           COUNT(ws.id) as shiftsCount,
           DATE(ws.startTime) as date
         FROM work_shifts ws
         JOIN users u ON ws.userId = u.id
         JOIN construction_sites cs ON ws.siteId = cs.id
         WHERE ws.startTime >= ?
         GROUP BY ws.userId, ws.siteId, DATE(ws.startTime)
         ORDER BY ws.startTime DESC`,
        [startDate.toISOString()]
      );

      return (result as any[]).map(row => ({
        userId: row.userId,
        userName: row.userName,
        siteId: row.siteId,
        siteName: row.siteName,
        totalHours: Math.floor((row.totalMinutes || 0) / 60),
        totalMinutes: (row.totalMinutes || 0) % 60,
        shiftsCount: row.shiftsCount,
        date: row.date,
        violations: 0 // TODO: Implement violations count
      }));
    } catch (error) {
      console.error('Error getting work reports:', error);
      throw error;
    }
  }

  // User management methods
  async getAllUsers(): Promise<AuthUser[]> {
    await this.ensureInitialized();

    if (!this.db) {
      throw new Error('Database is not initialized');
    }

    try {
      const result = await this.db.getAllAsync(
        `SELECT id, phoneNumber, name, role, companyId, isVerified, isActive, createdAt
         FROM users
         ORDER BY name ASC`
      );

      return (result as UserRow[]).map(row => ({
        id: row.id,
        phoneNumber: row.phoneNumber,
        name: row.name,
        role: row.role as 'worker' | 'admin',
        companyId: row.companyId || undefined,
        isVerified: Boolean(row.isVerified),
        isActive: Boolean(row.isActive),
        createdAt: new Date(row.createdAt)
      }));
    } catch (error) {
      console.error('Error getting all users:', error);
      throw error;
    }
  }

  async updateUserRole(userId: string, role: 'worker' | 'admin'): Promise<void> {
    await this.ensureInitialized();

    if (!this.db) {
      throw new Error('Database is not initialized');
    }

    try {
      await this.db.runAsync(
        `UPDATE users SET role = ? WHERE id = ?`,
        [role, userId]
      );
      console.log(`✅ User ${userId} role updated to ${role}`);
    } catch (error) {
      console.error('Error updating user role:', error);
      throw error;
    }
  }

  async updateUserStatus(userId: string, isActive: boolean): Promise<void> {
    await this.ensureInitialized();

    if (!this.db) {
      throw new Error('Database is not initialized');
    }

    try {
      await this.db.runAsync(
        `UPDATE users SET isActive = ? WHERE id = ?`,
        [isActive ? 1 : 0, userId]
      );
      console.log(`✅ User ${userId} status updated to ${isActive ? 'active' : 'inactive'}`);
    } catch (error) {
      console.error('Error updating user status:', error);
      throw error;
    }
  }

  async deleteUser(userId: string): Promise<void> {
    await this.ensureInitialized();

    if (!this.db) {
      throw new Error('Database is not initialized');
    }

    try {
      // Delete user password first (foreign key constraint)
      await this.db.runAsync(`DELETE FROM user_passwords WHERE userId = ?`, [userId]);
      
      // Delete user
      await this.db.runAsync(`DELETE FROM users WHERE id = ?`, [userId]);
      
      console.log(`✅ User ${userId} deleted successfully`);
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }
} 