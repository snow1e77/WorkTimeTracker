import { v4 as uuidv4 } from 'uuid';
import { pool } from '../config/database';

const createTestWorker = async (): Promise<void> => {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Создание тестового аккаунта рабочего...');

    // Номер телефона для тестового рабочего
    const testPhoneNumber = '+79999999999';
    const testWorkerName = 'Тестовый Рабочий';

    // Получаем ID администратора для поля added_by
    const adminResult = await client.query(
      'SELECT id FROM users WHERE role = $1 LIMIT 1',
      ['admin']
    );

    if (adminResult.rows.length === 0) {
      throw new Error('Администратор не найден в системе. Сначала запустите seed скрипт.');
    }

    const adminId = adminResult.rows[0].id;

    // Проверяем, существует ли уже пользователь
    const existingUser = await client.query(
      'SELECT id FROM users WHERE phone_number = $1',
      [testPhoneNumber]
    );

    if (existingUser.rows.length > 0) {
      console.log('❌ Пользователь с номером', testPhoneNumber, 'уже существует в основной таблице users');
      return;
    }

    // Проверяем предварительную регистрацию
    const existingPreReg = await client.query(
      'SELECT id FROM pre_registered_users WHERE phone_number = $1',
      [testPhoneNumber]
    );

    if (existingPreReg.rows.length > 0) {
      console.log('❌ Пользователь с номером', testPhoneNumber, 'уже существует в предварительной регистрации');
      return;
    }

    // Создаем предварительную регистрацию
    const preRegId = uuidv4();
    await client.query(
      `INSERT INTO pre_registered_users (id, phone_number, name, role, added_by, is_activated)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [preRegId, testPhoneNumber, testWorkerName, 'worker', adminId, false]
    );

    // Добавляем SMS код для входа (в dev режиме используется код 123456)
    const smsVerificationId = uuidv4();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // действителен 24 часа

    await client.query(
      `INSERT INTO sms_verifications (id, phone_number, code, type, is_used, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [smsVerificationId, testPhoneNumber, '123456', 'login', false, expiresAt]
    );

    console.log('✅ Тестовый аккаунт рабочего успешно создан!');
    console.log('');
    console.log('📱 Данные для входа:');
    console.log('   Номер телефона:', testPhoneNumber);
    console.log('   SMS код:', '123456');
    console.log('   Роль: worker');
    console.log('');
    console.log('🚀 Инструкция:');
    console.log('   1. Запустите мобильное приложение');
    console.log('   2. Введите номер телефона:', testPhoneNumber);
    console.log('   3. Введите код подтверждения: 123456');
    console.log('   4. Приложение предложит создать профиль');
    console.log('   5. Введите имя (например "Тестовый Рабочий") и завершите регистрацию');
    console.log('');
    console.log('💡 В режиме разработки всегда используется код 123456');

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