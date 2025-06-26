# WorkTime Tracker

Мобильное приложение для отслеживания рабочего времени с GPS-привязкой к строительным площадкам и системой синхронизации в реальном времени.

## 🚀 Основные возможности

- **GPS-трекинг рабочего времени** - автоматическое отслеживание времени входа/выхода на строительные площадки
- **Управление пользователями** - система ролей (админ/рабочий) с различными правами доступа
- **Веб-панель администратора** - полноценный веб-интерфейс для управления пользователями и площадками
- **Система чатов** - коммуникация между прорабами и рабочими с заданиями и фото-отчетами
- **Синхронизация в реальном времени** - WebSocket-соединения для мгновенного обмена данными
- **Система уведомлений** - Push-уведомления для мобильных устройств
- **Отчеты и аналитика** - подробные отчеты по времени работы и нарушениям
- **Мультиплатформенность** - iOS, Android и веб-версия

## 🛠 Технологический стек

### Frontend (React Native + Expo)
- **React Native 0.79.3** - кроссплатформенная разработка
- **Expo 53** - инструменты для разработки и сборки
- **React Navigation** - навигация между экранами
- **React Native Paper** - Material Design компоненты
- **React Native Maps** - интеграция с картами
- **Expo Location** - GPS-трекинг
- **Expo Notifications** - Push-уведомления
- **Socket.IO Client** - WebSocket-соединения

### Backend (Node.js + Express)
- **Node.js + Express** - серверная часть
- **PostgreSQL** - основная база данных
- **Socket.IO** - WebSocket-сервер для реального времени
- **JWT** - аутентификация и авторизация
- **Twilio** - SMS-верификация
- **Helmet** - безопасность
- **Winston** - логирование
- **Expo Server SDK** - Push-уведомления

### База данных
- **PostgreSQL 15** - основная база данных с полной ACID-совместимостью
- **Миграции SQL** - управление схемой базы данных
- **Индексы** - оптимизация производительности
- **Триггеры** - автоматическое обновление временных меток

## 📋 Требования

- Node.js 18+
- PostgreSQL 15+
- Expo CLI
- Android Studio (для Android разработки)
- Xcode (для iOS разработки, только macOS)

## 🚀 Быстрый старт

### 🪟 Windows - автоматический запуск
```powershell
# Запустите батник для автоматической настройки
quick-start.bat

# Или для уже настроенного проекта
start-project.bat
```

### 🍎 macOS - автоматический запуск  
```bash
# Сделайте скрипт исполняемым
chmod +x quick-start-mac.sh

# Запустите автоматическую настройку
./quick-start-mac.sh

# Для остановки проекта
./stop-project-mac.sh
```

### ⚙️ Ручная установка (любая ОС)

#### Установка зависимостей

```bash
# Основные зависимости
npm install

# Зависимости сервера
cd server
npm install
cd ..
```

### Настройка PostgreSQL

1. **Установите PostgreSQL 15+**
2. **Создайте базу данных:**
   ```sql
   CREATE DATABASE worktime_tracker;
   CREATE USER worktime_user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE worktime_tracker TO worktime_user;
   ```

3. **Настройте переменные окружения:**
   ```bash
   # Скопируйте файл примера
   cp server/env.example server/.env
   
   # Отредактируйте server/.env с вашими настройками PostgreSQL
   ```

### Запуск через Docker (рекомендуется для разработки)

```bash
# Запустить PostgreSQL, PgAdmin и сервер
docker-compose up -d

# База данных будет доступна на localhost:5432
# PgAdmin будет доступен на http://localhost:5050 (admin@worktime.com / admin)
# Сервер будет доступен на http://localhost:3001
```

### Миграция базы данных

```bash
cd server
npm run migrate
npm run seed  # Опционально: тестовые данные
```

### Запуск приложения

```bash
# Запуск мобильного приложения
npm start

# Запуск веб-версии
npm run web

# Запуск сервера (если не используете Docker)
npm run server:dev
```

## 🗄️ База данных

Приложение использует PostgreSQL для надежного хранения данных с полной поддержкой ACID-транзакций:

### Основные таблицы:
- `users` - пользователи и их роли
- `construction_sites` - строительные площадки
- `work_shifts` - рабочие смены
- `user_site_assignments` - назначения пользователей на площадки
- `violations` - нарушения рабочего времени
- `chats` - система чатов
- `chat_messages` - сообщения в чатах
- `photo_reports` - фото-отчеты
- `sync_metadata` - метаданные синхронизации

### Функции PostgreSQL:
- Автоматические триггеры для обновления timestamp полей
- Функция расчета рабочих часов
- Представления для упрощения запросов
- Индексы для оптимизации производительности

## 🌐 API Endpoints

### Аутентификация
- `POST /api/auth/register` - Регистрация пользователя
- `POST /api/auth/login` - Вход в систему
- `POST /api/auth/verify-phone` - Верификация телефона
- `POST /api/auth/refresh` - Обновление JWT токена

### Пользователи
- `GET /api/users` - Получить всех пользователей (админ)
- `PUT /api/users/:id/role` - Изменить роль пользователя (админ)
- `PUT /api/users/:id/status` - Изменить статус пользователя (админ)

### Площадки
- `GET /api/sites` - Получить площадки
- `POST /api/sites` - Создать площадку (админ)
- `PUT /api/sites/:id` - Обновить площадку (админ)
- `DELETE /api/sites/:id` - Удалить площадку (админ)

### Рабочие смены
- `POST /api/shifts/start` - Начать смену
- `POST /api/shifts/end` - Закончить смену
- `GET /api/shifts/active` - Активные смены
- `GET /api/shifts/history` - История смен

### Назначения
- `GET /api/assignments` - Получить назначения
- `POST /api/assignments` - Создать назначение (админ)
- `PUT /api/assignments/:id` - Обновить назначение (админ)
- `DELETE /api/assignments/:id` - Удалить назначение (админ)

### Чаты и сообщения
- `GET /api/chats` - Получить чаты
- `POST /api/chats/messages` - Отправить сообщение
- `GET /api/chats/:id/messages` - Получить сообщения чата

### Синхронизация
- `POST /api/sync/push` - Загрузить изменения
- `POST /api/sync/pull` - Получить изменения
- `GET /api/sync/status` - Статус синхронизации

## 🔄 Система синхронизации

Приложение использует гибридную архитектуру синхронизации:

### Мобильные устройства
- **Локальное хранение**: AsyncStorage для кэширования и офлайн-работы
- **API синхронизация**: Периодическая синхронизация с сервером
- **Конфликт-резолюция**: Автоматическое разрешение конфликтов по временным меткам

### Веб-версия
- **Прямое API**: Прямые запросы к PostgreSQL через REST API
- **WebSocket**: Мгновенные обновления в реальном времени
- **Кэширование**: Локальное кэширование для повышения производительности

### Сервер
- **PostgreSQL**: Единый источник истины
- **WebSocket**: Broadcast изменений всем подключенным клиентам
- **Middleware**: Валидация и логирование всех операций

## 🔧 Конфигурация

### Переменные окружения сервера (.env)

```env
# База данных PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=worktime_tracker
DB_USER=postgres
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d

# Twilio SMS
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=your_phone

# Порт сервера
PORT=3001
```

## 📱 Сборка для продакшна

### Android
```bash
npm run build:android
```

### iOS
```bash
npm run build:ios
```

### Web
```bash
npm run build:web
```

### Сервер
```bash
npm run server:build
npm run server:start
```

## 🐳 Docker развертывание

Для продакшна используйте:

```bash
# Продакшн конфигурация
docker-compose -f docker-compose.prod.yml up -d
```

## 🔒 Безопасность

- JWT токены для аутентификации
- Хэширование паролей с bcrypt
- Валидация всех входных данных
- Rate limiting для API
- CORS настройки
- Helmet для заголовков безопасности
- SSL/TLS поддержка в продакшне

## 📊 Мониторинг

- Winston логирование
- Metrics endpoints
- Health check endpoints
- Error tracking
- Performance monitoring

## 🤝 Вклад в проект

1. Форкните репозиторий
2. Создайте ветку для новой функции
3. Внесите изменения
4. Добавьте тесты
5. Отправьте Pull Request

## 📄 Лицензия

MIT License - см. файл LICENSE

## 📞 Поддержка

Для вопросов и поддержки обращайтесь к команде разработки.

---

**WorkTime Tracker** - надежное решение для отслеживания рабочего времени с современными технологиями и PostgreSQL. 