import { Pool } from 'pg';
import { config } from 'dotenv';

// Загружаем переменные среды для тестов
config({ path: '.env.test' });

// Глобальная настройка переменных окружения для тестов
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres:password@localhost:5432/worktime_test';
process.env.JWT_SECRET = 'test_jwt_secret_for_testing_purposes_only';
process.env.JWT_EXPIRES_IN = '1h';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';

// Создаем pool для тестовой базы данных
let pool: Pool;

beforeAll(async () => {
  // Инициализируем подключение к тестовой базе данных
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  // Запускаем миграции для тестовой базы
  try {
    // Здесь можно добавить инициализацию тестовой схемы базы данных
    console.log('Test database connected');
  } catch (error) {
    console.error('Failed to setup test database:', error);
  }
});

afterAll(async () => {
  // Закрываем подключение к базе данных после всех тестов
  if (pool) {
    await pool.end();
  }
});

// Очистка базы данных перед каждым тестом
beforeEach(async () => {
  if (pool) {
    // Очищаем тестовые данные
    await pool.query('TRUNCATE TABLE users, construction_sites, work_shifts, user_site_assignments RESTART IDENTITY CASCADE');
  }
}); 