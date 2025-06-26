import dotenv from 'dotenv';

// Загружаем тестовые переменные окружения
dotenv.config({ path: '.env.test' });

// Устанавливаем переменные окружения для тестов
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_key_for_testing_very_long_and_secure';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'worktime_test';
process.env.DB_USER = 'postgres';
process.env.DB_PASSWORD = 'password';

// Увеличиваем таймаут для тестов базы данных
jest.setTimeout(30000);

// Мокируем winston logger
jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  http: jest.fn()
}));

// Мокируем SMS сервис
jest.mock('../src/services/SMSService', () => ({
  SMSService: {
    sendSMS: jest.fn().mockResolvedValue({ success: true })
  }
}));

// Глобальная очистка после каждого теста
afterEach(() => {
  jest.clearAllMocks();
}); 