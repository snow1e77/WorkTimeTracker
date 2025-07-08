import { Pool, PoolConfig } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const dbConfig: PoolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5433'),
  database: process.env.DB_NAME || 'worktime_tracker',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 20, // максимальное количество клиентов в пуле
  idleTimeoutMillis: 30000, // время до закрытия неактивного соединения
  connectionTimeoutMillis: 2000, // время ожидания подключения
};

export const pool = new Pool(dbConfig);

// Обработка ошибок подключения
pool.on('error', (_err) => {
  process.exit(-1);
});

// Тестирование подключения
export const testConnection = async (): Promise<boolean> => {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    return true;
  } catch (error) {
    return false;
  }
};

// Выполнение запроса с обработкой ошибок
export const query = async (
  text: string,
  params?: unknown[]
): Promise<unknown> => {
  const res = await pool.query(text, params);
  return res;
};

// Транзакция
export const transaction = async (
  callback: (client: unknown) => Promise<unknown>
): Promise<unknown> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export default pool;
