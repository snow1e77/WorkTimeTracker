import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../config/database';

const seedDatabase = async (): Promise<void> => {
  const client = await pool.connect();
  
  try {
    // Очистка существующих данных (в обратном порядке зависимостей)
    await client.query('TRUNCATE TABLE work_shifts CASCADE');
    await client.query('TRUNCATE TABLE user_site_assignments CASCADE');
    await client.query('TRUNCATE TABLE violations CASCADE');

    await client.query('TRUNCATE TABLE refresh_tokens CASCADE');
    await client.query('TRUNCATE TABLE sync_metadata CASCADE');
    await client.query('TRUNCATE TABLE construction_sites CASCADE');
    await client.query('TRUNCATE TABLE users CASCADE');
    
    // Создание тестовых пользователей
    const adminId = uuidv4();
    const worker1Id = uuidv4();
    const worker2Id = uuidv4();
    
    const adminPasswordHash = await bcrypt.hash('admin123', 10);
    const workerPasswordHash = await bcrypt.hash('worker123', 10);
    
    // Вставка администратора
    await client.query(`
      INSERT INTO users (id, phone_number, name, role, is_verified, is_active, password_hash)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [adminId, '+1234567890', 'Администратор Иванов', 'admin', true, true, adminPasswordHash]);
    
    // Вставка рабочих
    await client.query(`
      INSERT INTO users (id, phone_number, name, role, is_verified, is_active, password_hash)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [worker1Id, '+1234567891', 'Рабочий Петров', 'worker', true, true, workerPasswordHash]);
    
    await client.query(`
      INSERT INTO users (id, phone_number, name, role, is_verified, is_active, password_hash)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [worker2Id, '+1234567892', 'Рабочий Сидоров', 'worker', true, true, workerPasswordHash]);
    
    // Создание строительных объектов
    const site1Id = uuidv4();
    const site2Id = uuidv4();
    const site3Id = uuidv4();
    
    await client.query(`
      INSERT INTO construction_sites (id, name, address, latitude, longitude, radius, is_active, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [site1Id, 'Строительный объект Альфа', 'ул. Строительная, 10, Москва', 55.7558, 37.6176, 100, true, adminId]);
    
    await client.query(`
      INSERT INTO construction_sites (id, name, address, latitude, longitude, radius, is_active, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [site2Id, 'Строительный объект Бета', 'пр. Промышленный, 25, Москва', 55.7387, 37.6032, 150, true, adminId]);
    
    await client.query(`
      INSERT INTO construction_sites (id, name, address, latitude, longitude, radius, is_active, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [site3Id, 'Строительный объект Гамма', 'ул. Индустриальная, 5, СПб', 59.9311, 30.3609, 75, false, adminId]);
    
    // Создание назначений
    await client.query(`
      INSERT INTO user_site_assignments (id, user_id, site_id, assigned_by, is_active, notes)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [uuidv4(), worker1Id, site1Id, adminId, true, 'Основной рабочий на объекте Альфа']);
    
    await client.query(`
      INSERT INTO user_site_assignments (id, user_id, site_id, assigned_by, is_active, notes)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [uuidv4(), worker2Id, site2Id, adminId, true, 'Основной рабочий на объекте Бета']);
    
    // Создание рабочих смен
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const shift1Id = uuidv4();
    const shift2Id = uuidv4();
    
    // Завершенная смена
    await client.query(`
      INSERT INTO work_shifts (id, user_id, site_id, start_time, end_time, is_active, start_location, end_location)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      shift1Id,
      worker1Id,
      site1Id,
      new Date(yesterday.getTime() + 8 * 60 * 60 * 1000), // 8:00 вчера
      new Date(yesterday.getTime() + 17 * 60 * 60 * 1000), // 17:00 вчера
      false,
      JSON.stringify({ latitude: 55.7558, longitude: 37.6176 }),
      JSON.stringify({ latitude: 55.7558, longitude: 37.6176 })
    ]);
    
    // Активная смена
    await client.query(`
      INSERT INTO work_shifts (id, user_id, site_id, start_time, is_active, start_location)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      shift2Id,
      worker2Id,
      site2Id,
      new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 часа назад
      true,
      JSON.stringify({ latitude: 55.7387, longitude: 37.6032 })
    ]);
    
    // Создание нарушений
    await client.query(`
      INSERT INTO violations (id, user_id, site_id, shift_id, type, description, severity)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      uuidv4(),
      worker1Id,
      site1Id,
      shift1Id,
      'late_start',
      'Опоздание на работу на 15 минут',
      'low'
    ]);
    
    // SMS верификации больше не используются
    
    console.log('');
    console.log('✅ База данных успешно заполнена тестовыми данными!');
    console.log('');
    console.log('👥 Созданные пользователи:');
    console.log('   📋 Администратор: +1234567890 (пароль: admin123)');
    console.log('   👷 Рабочий 1: +1234567891 (пароль: worker123)');
    console.log('   👷 Рабочий 2: +1234567892 (пароль: worker123)');
    console.log('');
    console.log('🏗️ Созданные строительные объекты:');
    console.log('   • Строительный объект Альфа (Москва)');
    console.log('   • Строительный объект Бета (Москва)');
    console.log('   • Строительный объект Гамма (СПб) - неактивный');
    console.log('');
    console.log('📊 Созданы назначения и тестовые смены');
    console.log('💡 Теперь можете создать тестового рабочего: npm run create-test-worker');
    
    } catch (error) {
    console.error('❌ Ошибка заполнения базы данных:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Запуск заполнения, если файл выполняется напрямую
if (require.main === module) {
  seedDatabase()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      process.exit(1);
    });
}

export default seedDatabase; 
