# WorkTime Tracker

Мобильное приложение для отслеживания рабочего времени с GPS-привязкой к строительным площадкам.

## 🚀 Основные возможности

- **GPS-трекинг рабочего времени** - автоматическое отслеживание времени входа/выхода на строительные площадки
- **Управление пользователями** - система ролей (админ/рабочий) с различными правами доступа
- **Веб-панель администратора** - полноценный веб-интерфейс для управления пользователями и площадками
- **Система чатов** - коммуникация между прорабами и рабочими с заданиями и фото-отчетами
- **Синхронизация в реальном времени** - WebSocket-соединения для мгновенного обмена данными
- **Отчеты и аналитика** - подробные отчеты по времени работы и нарушениям
- **Мультиплатформенность** - iOS, Android и веб-версия

## 🛠 Технологический стек

### Frontend
- **React Native 0.79** + **Expo 53** - мобильные приложения
- **React** - веб-интерфейс администратора
- **Socket.IO Client** - синхронизация в реальном времени

### Backend
- **Node.js + Express** - REST API сервер
- **PostgreSQL 15** - основная база данных
- **Socket.IO** - WebSocket-сервер
- **JWT** - аутентификация

## 📋 Требования

- Node.js 18+
- PostgreSQL 15+
- Docker & Docker Compose (рекомендуется)

## 🚀 Установка и запуск

### 1. Клонирование репозитория
```bash
git clone <repository-url>
cd WorkTimeTracker
```

### 2. Настройка переменных окружения
```bash
# Скопируйте и настройте конфигурацию
cp server/env.example server/.env
```

### 3. Настройка базы данных
Отредактируйте `server/.env`:
```env
# База данных PostgreSQL
DB_HOST=your_db_host
DB_PORT=5432
DB_NAME=worktime_tracker
DB_USER=worktime_user
DB_PASSWORD=your_secure_password

# JWT (обязательно измените!)
JWT_SECRET=your_super_secure_jwt_secret_minimum_32_characters
JWT_EXPIRES_IN=7d

# Окружение
NODE_ENV=production
PORT=3001
```

### 4. Развертывание через Docker (рекомендуется)
```bash
# Продакшн развертывание
docker-compose -f docker-compose.prod.yml up -d
```

### 5. Миграция базы данных
```bash
cd server
npm run migrate
```

## 📱 Сборка приложений

### Мобильное приложение
```bash
# Android
npm run build:android

# iOS
npm run build:ios
```

### Веб-приложение
```bash
npm run build:web
```

## 🗄️ База данных

### Основные таблицы:
- `users` - пользователи и их роли
- `construction_sites` - строительные площадки
- `work_shifts` - рабочие смены
- `user_site_assignments` - назначения пользователей на площадки
- `violations` - нарушения рабочего времени
- `chats` и `chat_messages` - система чатов
- `photo_reports` - фото-отчеты

## 🌐 API

### Основные эндпоинты:
- `/api/auth/*` - аутентификация
- `/api/users/*` - управление пользователями
- `/api/sites/*` - управление площадками
- `/api/shifts/*` - рабочие смены
- `/api/assignments/*` - назначения
- `/api/chats/*` - система чатов
- `/api/sync/*` - синхронизация данных

## 🔒 Безопасность

- JWT токены для аутентификации
- Валидация всех входных данных
- Rate limiting для API
- CORS настройки
- Helmet для заголовков безопасности
- SSL/TLS поддержка

## 📊 Мониторинг

- Winston логирование
- Health check: `/api/health`
- Error tracking
- Performance monitoring

## 📄 Лицензия

MIT License

---

**WorkTime Tracker** - надежное решение для отслеживания рабочего времени. 