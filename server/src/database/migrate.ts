import fs from 'fs';
import path from 'path';
import { pool, testConnection } from '../config/database';

const runMigrations = async (): Promise<void> => {
  try {
    const isConnected = await testConnection();
    
    if (!isConnected) {
      process.exit(1);
    }
    
    // Читаем файл миграций
    const migrationsPath = path.join(__dirname, 'migrations.sql');
    const migrations = fs.readFileSync(migrationsPath, 'utf8');
    
    // Разделяем SQL команды (разделяем по точкам с запятой, но учитываем функции)
    const statements = migrations
      .split(/;\s*\n/)
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    const client = await pool.connect();
    
    try {
      let successful = 0;
      let skipped = 0;
      
      for (const statement of statements) {
        if (!statement) continue;
        
        try {
          await client.query(statement + (statement.endsWith(';') ? '' : ';'));
          successful++;
        } catch (error: any) {
          // Игнорируем ошибки дублирования
          if (error.code === '42710' || // триггер уже существует
              error.code === '42P07' || // таблица уже существует
              error.code === '42723' || // функция уже существует
              error.code === '42704' || // индекс уже существует
              error.code === '42P06' || // схема уже существует
              error.code === '42P16' || // роль уже существует
              error.code === '42P17' || // расширение уже существует
              error.message.includes('уже существует') ||
              error.message.includes('already exists')) {
            skipped++;
          } else {
            // Не прерываем выполнение, продолжаем с следующей командой
          }
        }
      }
      
      } finally {
      client.release();
    }
    
  } catch (error) {
    process.exit(1);
  } finally {
    await pool.end();
  }
};

// Запуск миграций, если файл выполняется напрямую
if (require.main === module) {
  runMigrations();
}

export default runMigrations; 

