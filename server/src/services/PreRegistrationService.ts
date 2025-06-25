import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database';
import { SMSService } from './SMSService';

export interface PreRegisteredUser {
  id: string;
  phoneNumber: string;
  name?: string;
  role: 'worker' | 'admin';
  companyId?: string;
  addedBy: string;
  isActivated: boolean;
  activatedAt?: Date;
  appDownloadSent: boolean;
  appDownloadSentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class PreRegistrationService {
  // Добавление нового пользователя для предварительной регистрации
  static async addPreRegisteredUser(userData: {
    phoneNumber: string;
    name?: string;
    role?: 'worker' | 'admin';
    companyId?: string;
    addedBy: string;
  }): Promise<PreRegisteredUser> {
    const { phoneNumber, name, role = 'worker', companyId, addedBy } = userData;
    
    // Check if user is not already pre-registered
    const existingUser = await this.getPreRegisteredUserByPhone(phoneNumber);
    if (existingUser) {
      throw new Error('User with this phone number is already added');
    }

    // Check if user doesn't exist in main users table
    const userExistsResult = await query(
      'SELECT id FROM users WHERE phone_number = $1',
      [phoneNumber]
    );
    
    if (userExistsResult.rows.length > 0) {
      throw new Error('User with this phone number is already registered');
    }

    const id = uuidv4();

    const result = await query(
      `INSERT INTO pre_registered_users (id, phone_number, name, role, company_id, added_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id, phoneNumber, name, role, companyId || null, addedBy]
    );

    const preRegisteredUser = this.mapRowToPreRegisteredUser(result.rows[0]);

    // Send SMS with app download link
    await this.sendAppDownloadLink(phoneNumber, name);

    return preRegisteredUser;
  }

  // Get pre-registered user by phone number
  static async getPreRegisteredUserByPhone(phoneNumber: string): Promise<PreRegisteredUser | null> {
    const result = await query(
      'SELECT * FROM pre_registered_users WHERE phone_number = $1',
      [phoneNumber]
    );

    return result.rows.length > 0 ? this.mapRowToPreRegisteredUser(result.rows[0]) : null;
  }

  // Get all pre-registered users
  static async getAllPreRegisteredUsers(options: {
    page?: number;
    limit?: number;
    isActivated?: boolean;
    search?: string;
  } = {}): Promise<{ users: PreRegisteredUser[]; total: number }> {
    const { page = 1, limit = 20, isActivated, search } = options;
    const offset = (page - 1) * limit;

    let whereConditions: string[] = [];
    let queryParams: any[] = [];
    let paramIndex = 1;

    if (isActivated !== undefined) {
      whereConditions.push(`is_activated = $${paramIndex++}`);
      queryParams.push(isActivated);
    }

    if (search) {
      whereConditions.push(`(name ILIKE $${paramIndex++} OR phone_number ILIKE $${paramIndex++})`);
      queryParams.push(`%${search}%`, `%${search}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM pre_registered_users ${whereClause}`,
      queryParams
    );
    const total = parseInt(countResult.rows[0].count);

    // Get users with pagination
    const usersResult = await query(
      `SELECT * FROM pre_registered_users ${whereClause} 
       ORDER BY created_at DESC 
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...queryParams, limit, offset]
    );

    const users = usersResult.rows.map(this.mapRowToPreRegisteredUser);

    return { users, total };
  }

  // Activate pre-registered user
  static async activatePreRegisteredUser(phoneNumber: string): Promise<PreRegisteredUser | null> {
    const result = await query(
      `UPDATE pre_registered_users 
       SET is_activated = true, activated_at = CURRENT_TIMESTAMP 
       WHERE phone_number = $1 AND is_activated = false
       RETURNING *`,
      [phoneNumber]
    );

    return result.rows.length > 0 ? this.mapRowToPreRegisteredUser(result.rows[0]) : null;
  }

  // Remove pre-registered user
  static async removePreRegisteredUser(id: string): Promise<boolean> {
    const result = await query('DELETE FROM pre_registered_users WHERE id = $1', [id]);
    return result.rowCount > 0;
  }

  // Send app download link
  static async sendAppDownloadLink(phoneNumber: string, name?: string): Promise<void> {
    try {
      const appStoreLink = process.env.APP_STORE_LINK || 'https://apps.apple.com/app/worktime-tracker';
      const playStoreLink = process.env.PLAY_STORE_LINK || 'https://play.google.com/store/apps/details?id=com.worktimetracker';
      
      let message = `Welcome to WorkTime Tracker!`;
      if (name) {
        message = `Welcome to WorkTime Tracker, ${name}!`;
      }
      
      message += `\n\nYou have been added to the time tracking system. Download the app:\n\n`;
      message += `📱 iOS: ${appStoreLink}\n`;
      message += `🤖 Android: ${playStoreLink}\n\n`;
      message += `After installation, sign in using this phone number.`;

      await SMSService.sendSMS(phoneNumber, message);

      // Update send status
      await query(
        `UPDATE pre_registered_users 
         SET app_download_sent = true, app_download_sent_at = CURRENT_TIMESTAMP 
         WHERE phone_number = $1`,
        [phoneNumber]
      );

    } catch (error) {
      throw error;
    }
  }

  // Resend app download link
  static async resendAppDownloadLink(phoneNumber: string): Promise<void> {
    const preRegisteredUser = await this.getPreRegisteredUserByPhone(phoneNumber);
    if (!preRegisteredUser) {
      throw new Error('User not found in pre-registration');
    }

    await this.sendAppDownloadLink(phoneNumber, preRegisteredUser.name);
  }

  // Check if user can login
  static async canUserLogin(phoneNumber: string): Promise<{
    canLogin: boolean;
    isPreRegistered: boolean;
    isActivated: boolean;
    needsContact?: boolean;
  }> {
    // Check if user exists in main users table
    const userResult = await query(
      'SELECT id FROM users WHERE phone_number = $1',
      [phoneNumber]
    );

    if (userResult.rows.length > 0) {
      return {
        canLogin: true,
        isPreRegistered: true,
        isActivated: true
      };
    }

    // Check if user exists in pre-registration
    const preRegisteredUser = await this.getPreRegisteredUserByPhone(phoneNumber);
    
    if (preRegisteredUser) {
      return {
        canLogin: true,
        isPreRegistered: true,
        isActivated: preRegisteredUser.isActivated
      };
    }

    // User not found - need to contact management
    return {
      canLogin: false,
      isPreRegistered: false,
      isActivated: false,
      needsContact: true
    };
  }

  private static mapRowToPreRegisteredUser(row: any): PreRegisteredUser {
    return {
      id: row.id,
      phoneNumber: row.phone_number,
      name: row.name,
      role: row.role,
      companyId: row.company_id,
      addedBy: row.added_by,
      isActivated: row.is_activated,
      activatedAt: row.activated_at ? new Date(row.activated_at) : undefined,
      appDownloadSent: row.app_download_sent,
      appDownloadSentAt: row.app_download_sent_at ? new Date(row.app_download_sent_at) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
} 
