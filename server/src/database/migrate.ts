import fs from 'fs';
import path from 'path';
import { pool, testConnection } from '../config/database';

const runMigrations = async (): Promise<void> => {
  try {
    console.log('🔄 Проверка подключения к базе данных...');
    const isConnected = await testConnection();
    
    if (!isConnected) {
      console.error('❌ Не удалось подключиться к базе данных');
      process.exit(1);
    }
    
    console.log('✅ Подключение к базе данных успешно');
    console.log('🔄 Выполнение миграций...');
    
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
            console.log(`⚠️  Пропущено (уже существует): ${statement.substring(0, 50)}...`);
            skipped++;
          } else {
            console.error(`❌ Ошибка в SQL: ${statement.substring(0, 50)}...`);
            console.error('Детали ошибки:', error.message);
            // Не прерываем выполнение, продолжаем с следующей командой
          }
        }
      }
      
      console.log(`✅ Миграции завершены: ${successful} выполнено, ${skipped} пропущено`);
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ Общая ошибка при выполнении миграций:', error);
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