# WorkTime Tracker Server API

Серверная часть приложения для отслеживания рабочего времени на строительных объектах.

## Возможности

- 📱 JWT аутентификация по номеру телефона
- 👥 Управление пользователями и ролями
- 🏗️ Управление строительными объектами
- 📍 Геолокационный контроль (геофенсинг)
- ⏰ Отслеживание рабочих смен
- 📊 Генерация отчетов
- 🔄 Синхронизация данных
- 🚨 Система нарушений

## Установка и запуск

### Требования

- Node.js >= 18.0.0
- PostgreSQL >= 13
- npm или yarn

### Установка зависимостей

```bash
npm install
```

### Настройка окружения

Создайте файл `.env` на основе `env.example`:

```bash
cp env.example .env
```

Настройте переменные окружения:

```env
# Сервер
PORT=3001
NODE_ENV=development

# База данных
DATABASE_URL=postgresql://username:password@localhost:5432/worktime_tracker

# JWT
JWT_SECRET=your_super_secret_jwt_key
JWT_REFRESH_SECRET=your_super_secret_refresh_key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Authentication (Simple phone number login)

# CORS
CORS_ORIGINS=http://localhost:19006,http://localhost:3000,http://localhost:8081

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Создание базы данных

```bash
# Выполните миграции
npm run db:migrate

# Заполните тестовыми данными (опционально)
npm run db:seed
```

### Запуск

```bash
# Разработка
npm run dev

# Сборка
npm run build

# Продакшн
npm run start:prod
```

## API Endpoints

### Аутентификация (`/api/auth`)


- `POST /login` - Вход по номеру телефона
- `POST /register` - Регистрация нового пользователя
- `POST /refresh` - Обновление токена
- `POST /logout` - Выход из системы

### Пользователи (`/api/users`)

- `GET /` - Список пользователей (админ)
- `GET /:id` - Информация о пользователе
- `POST /` - Создание пользователя (админ)
- `PUT /:id` - Обновление пользователя (админ)
- `DELETE /:id` - Удаление пользователя (админ)
- `GET /stats` - Статистика пользователей (админ)

### Объекты (`/api/sites`)

- `GET /` - Список объектов
- `GET /:id` - Информация об объекте
- `POST /` - Создание объекта (админ)
- `PUT /:id` - Обновление объекта (админ)
- `DELETE /:id` - Удаление объекта (админ)
- `POST /:id/check-location` - Проверка нахождения в зоне объекта

### Назначения (`/api/assignments`)

- `GET /` - Список назначений
- `GET /:id` - Информация о назначении
- `POST /` - Создание назначения (админ)
- `PUT /:id` - Обновление назначения (админ)
- `DELETE /:id` - Удаление назначения (админ)
- `GET /user/:userId` - Назначения пользователя
- `GET /site/:siteId` - Назначения объекта

### Смены (`/api/shifts`)

- `GET /` - Список смен
- `GET /:id` - Информация о смене
- `POST /start` - Начало смены
- `POST /:id/end` - Завершение смены
- `GET /my` - Мои смены
- `GET /active` - Активная смена пользователя
- `GET /stats` - Статистика смен

### Отчеты (`/api/reports`)

- `GET /work` - Рабочие отчеты
- `GET /violations` - Отчеты по нарушениям (админ)
- `GET /statistics` - Общая статистика (админ)
- `GET /export/:type` - Экспорт отчетов в CSV (админ)

### Синхронизация (`/api/sync`)

- `GET /` - Получение данных для синхронизации
- `POST /` - Отправка данных для синхронизации
- `GET /status` - Статус синхронизации
- `POST /full` - Полная синхронизация

## Структура проекта

```
src/
├── config/
│   └── database.ts          # Конфигурация БД
├── database/
│   ├── migrate.ts           # Скрипт миграций
│   ├── migrations.sql       # SQL миграции
│   └── seed.ts             # Тестовые данные
├── middleware/
│   └── auth.ts             # Middleware аутентификации
├── routes/
│   ├── auth.ts             # Роуты аутентификации
│   ├── users.ts            # Роуты пользователей
│   ├── sites.ts            # Роуты объектов
│   ├── assignments.ts      # Роуты назначений
│   ├── shifts.ts           # Роуты смен
│   ├── reports.ts          # Роуты отчетов
│   └── sync.ts             # Роуты синхронизации
├── services/
│   ├── AuthService.ts      # Сервис аутентификации
│   ├── UserService.ts      # Сервис пользователей
│   ├── SiteService.ts      # Сервис объектов
│   ├── AssignmentService.ts # Сервис назначений
│   ├── ShiftService.ts     # Сервис смен
│   ├── ReportService.ts    # Сервис отчетов
│   ├── SyncService.ts      # Сервис синхронизации

├── types/
│   └── index.ts            # TypeScript типы
└── index.ts                # Главный файл сервера
```

## Безопасность

- JWT токены для аутентификации
- Rate limiting для защиты от атак
- Валидация всех входящих данных
- Защита от SQL-инъекций
- CORS настройки
- Шифрование паролей

## Мониторинг

- Health check endpoint: `GET /health`
- Информация о сервере: `GET /api/info`
- Логирование всех запросов
- Обработка ошибок

## Лицензия

MIT 