import { v4 as uuidv4 } from 'uuid';
import { pool } from '../config/database';

const createTestWorker = async (): Promise<void> => {
  console.log('🔧 Создание тестового аккаунта рабочего...');
  
  // Проверяем подключение к базе данных
  try {
    console.log('📡 Проверяем подключение к базе данных...');
    const testClient = await pool.connect();
    await testClient.query('SELECT NOW()');
    testClient.release();
    console.log('✅ Подключение к базе данных установлено');
  } catch (dbError) {
    console.error('❌ Ошибка подключения к базе данных:', dbError);
    console.log('💡 Убедитесь что Docker контейнеры запущены: docker-compose up -d');
    throw new Error('Нет подключения к базе данных');
  }
  
  const client = await pool.connect();
  
  try {
    // Номер телефона для тестового рабочего
    const testPhoneNumber = '+79999999999';
    const testWorkerName = 'Тестовый Рабочий';

    // Проверяем, существует ли уже пользователь в основной таблице
    const existingUser = await client.query(
      'SELECT id FROM users WHERE phone_number = $1',
      [testPhoneNumber]
    );

    if (existingUser.rows.length > 0) {
      console.log('✅ Пользователь с номером', testPhoneNumber, 'уже существует в системе');
      return;
    }

    // Создаем пользователя сразу в основной таблице users
    const userId = uuidv4();
    await client.query(
      `INSERT INTO users (id, phone_number, name, role, is_verified, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, testPhoneNumber, testWorkerName, 'worker', true, true]
    );

    console.log('✅ Тестовый аккаунт рабочего успешно создан!');
    console.log('');
    console.log('📱 Данные для входа:');
    console.log('   Номер телефона:', testPhoneNumber);
    console.log('   Роль: worker');
    console.log('');
    console.log('🚀 Инструкция для входа:');
    console.log('   1. Запустите мобильное приложение');
    console.log('   2. Введите номер телефона:', testPhoneNumber);
    console.log('   3. Нажмите "Войти" - вход произойдет автоматически');
    console.log('   4. Готово! Можете сразу пользоваться приложением');
    console.log('');
    console.log('💡 Вход только по номеру телефона');

  } catch (error) {
    console.error('❌ Ошибка при создании тестового аккаунта:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Запуск создания тестового пользователя
if (require.main === module) {
  createTestWorker()
    .then(() => {
      console.log('🎉 Готово!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Ошибка:', error.message);
      process.exit(1);
    });
}

export default createTestWorker; 