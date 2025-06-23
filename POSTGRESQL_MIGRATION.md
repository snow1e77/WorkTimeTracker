# Миграция на PostgreSQL

Этот документ описывает полный переход WorkTime Tracker с SQLite на PostgreSQL.

## 🎯 Цели миграции

- **Масштабируемость**: PostgreSQL лучше подходит для многопользовательских приложений
- **Надёжность**: ACID-транзакции и лучшая целостность данных
- **Функциональность**: Расширенные возможности SQL и JSON поддержка
- **Производительность**: Лучшая производительность на больших объёмах данных
- **Синхронизация**: Централизованная база данных для синхронизации между устройствами

## 📋 Что изменилось

### Удалённые компоненты SQLite
- ❌ `expo-sqlite` из зависимостей
- ❌ `src/utils/sqliteMock.web.js` - mock для веб версии
- ❌ `src/services/LegacyDatabaseService.ts` - старый SQLite сервис
- ❌ Конфигурация SQLite в `metro.config.js`
- ❌ SQLite плагин из `app.json`

### Новые компоненты PostgreSQL
- ✅ PostgreSQL конфигурация в `server/src/config/database.ts`
- ✅ Миграции SQL в `server/src/database/migrations.sql`
- ✅ Docker Compose для разработки
- ✅ Продакшн конфигурация
- ✅ PowerShell скрипт для автоматической настройки

## 🛠️ Архитектура данных

### До миграции (SQLite)
```
Мобильное приложение
├── SQLite (локальная БД)
├── Периодическая синхронизация
└── API для обмена данными
```

### После миграции (PostgreSQL)
```
Мобильное приложение
├── AsyncStorage (кэш)
├── API клиент
└── WebSocket (real-time)
         ↓
    Node.js сервер
├── Express API
├── Socket.IO
└── PostgreSQL (центральная БД)
```

## 🚀 Инструкции по настройке

### Автоматическая настройка (рекомендуется)

```powershell
# Запуск с Docker (проще всего)
.\scripts\setup-postgresql.ps1 -UseDocker

# Или с существующим PostgreSQL
.\scripts\setup-postgresql.ps1 -Host localhost -Database worktime_tracker -User worktime_user
```

### Ручная настройка

#### 1. Установка PostgreSQL

**Windows:**
```powershell
# Через Chocolatey
choco install postgresql15

# Или скачайте с официального сайта
# https://www.postgresql.org/download/windows/
```

**Docker (альтернатива):**
```bash
docker-compose up -d postgres
```

#### 2. Создание базы данных

```sql
-- Подключитесь к PostgreSQL как суперпользователь
psql -U postgres

-- Создайте базу данных и пользователя
CREATE DATABASE worktime_tracker;
CREATE USER worktime_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE worktime_tracker TO worktime_user;
\q
```

#### 3. Настройка переменных окружения

```bash
# Скопируйте пример конфигурации
cp server/env.example server/.env

# Отредактируйте server/.env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=worktime_tracker
DB_USER=worktime_user
DB_PASSWORD=your_password
```

#### 4. Выполнение миграций

```bash
cd server
npm install
npm run build
npm run migrate
npm run seed  # Опционально: тестовые данные
```

## 🔧 Конфигурация для разработки

### Docker Compose

Файл `docker-compose.yml` включает:
- **PostgreSQL 15** - основная база данных
- **PgAdmin** - веб-интерфейс для управления БД
- **Node.js сервер** - API сервер

```bash
# Запуск всех сервисов
docker-compose up -d

# Доступ к сервисам:
# PostgreSQL: localhost:5432
# PgAdmin: http://localhost:5050 (admin@worktime.com / admin)
# API сервер: http://localhost:3001
```

### Локальная разработка

```bash
# Установка зависимостей
npm install
cd server && npm install && cd ..

# Запуск сервера
cd server && npm run dev

# Запуск приложения (в другом терминале)
npm start

# Запуск веб-версии
npm run web
```

## 🏗️ Схема базы данных

### Основные таблицы

1. **users** - пользователи системы
2. **construction_sites** - строительные площадки
3. **work_shifts** - рабочие смены
4. **user_site_assignments** - назначения пользователей
5. **violations** - нарушения рабочего времени
6. **chats** - система чатов
7. **chat_messages** - сообщения в чатах
8. **photo_reports** - фото-отчёты
9. **sync_metadata** - метаданные синхронизации

### Особенности PostgreSQL

- **UUID** - все ID используют UUID вместо автоинкрементных чисел
- **JSONB** - для хранения GPS координат и метаданных
- **Триггеры** - автоматическое обновление `updated_at` полей
- **Представления** - упрощённые запросы для отчётов
- **Индексы** - оптимизация производительности

## 🔄 Система синхронизации

### Мобильные устройства
- **Кэширование** - AsyncStorage для оффлайн работы
- **API синхронизация** - периодическая синхронизация с сервером
- **Конфликт-резолюция** - разрешение конфликтов по временным меткам

### Веб-версия
- **Реального времени** - WebSocket подключения
- **Прямые API запросы** - без локального кэширования
- **Отзывчивый UI** - мгновенные обновления

### Сервер
- **Центральная истина** - PostgreSQL как единый источник данных
- **WebSocket broadcast** - рассылка изменений всем клиентам
- **Валидация данных** - проверка целостности на уровне сервера

## 🚀 Развёртывание в продакшне

### Docker Production

```bash
# Используйте продакшн конфигурацию
docker-compose -f docker-compose.prod.yml up -d
```

### Облачные провайдеры

**AWS RDS:**
```env
DB_HOST=your-rds-endpoint.amazonaws.com
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=false
```

**Google Cloud SQL:**
```env
DB_HOST=/cloudsql/project:region:instance
DB_SSL=true
```

**Heroku Postgres:**
```env
DATABASE_URL=postgres://user:pass@host:port/dbname
```

## 📊 Мониторинг и оптимизация

### Рекомендуемые настройки PostgreSQL

```sql
-- Оптимизация для рабочих нагрузок
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';

-- Перезагрузите PostgreSQL после изменений
SELECT pg_reload_conf();
```

### Мониторинг производительности

```sql
-- Медленные запросы
SELECT query, mean_time, calls, total_time 
FROM pg_stat_statements 
ORDER BY total_time DESC 
LIMIT 10;

-- Использование индексов
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes 
ORDER BY idx_scan DESC;
```

## 🔧 Устранение неполадок

### Общие проблемы

1. **Подключение отклонено**
   ```
   Проверьте что PostgreSQL запущен:
   - Windows: services.msc → PostgreSQL
   - Docker: docker ps
   ```

2. **База данных не существует**
   ```sql
   CREATE DATABASE worktime_tracker;
   ```

3. **Отказано в доступе**
   ```sql
   GRANT ALL PRIVILEGES ON DATABASE worktime_tracker TO worktime_user;
   ```

4. **Ошибка миграции**
   ```bash
   cd server
   npm run build
   npm run migrate
   ```

### Логи и отладка

```bash
# Логи PostgreSQL
# Windows: C:\Program Files\PostgreSQL\15\data\log\
# Docker: docker logs worktime-postgres

# Логи приложения
tail -f server/logs/app.log

# Отладка подключения
cd server
node -e "require('./dist/config/database.js').testConnection()"
```

## 📚 Дополнительные ресурсы

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Node.js pg Driver](https://node-postgres.com/)
- [Docker PostgreSQL](https://hub.docker.com/_/postgres)
- [PgAdmin Documentation](https://www.pgadmin.org/docs/)

## ✅ Чеклист миграции

- [ ] PostgreSQL установлен и запущен
- [ ] База данных создана
- [ ] Переменные окружения настроены
- [ ] Миграции выполнены
- [ ] Подключение к БД работает
- [ ] Сервер запускается без ошибок
- [ ] Мобильное приложение подключается к API
- [ ] Веб-версия работает корректно
- [ ] Синхронизация данных функционирует
- [ ] Тесты проходят успешно

---

**Поздравляем!** 🎉 Вы успешно мигрировали на PostgreSQL! 