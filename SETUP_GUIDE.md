# 🚀 Полное руководство по запуску WorkTime Tracker

Этот документ содержит пошаговые инструкции для настройки и запуска всех компонентов системы WorkTime Tracker на Windows.

## 📋 Требования к системе

### Обязательные компоненты:
- **Node.js 18+** - [Скачать](https://nodejs.org/)
- **npm** или **yarn** - поставляется с Node.js
- **Git** - [Скачать](https://git-scm.com/)

### Для мобильной разработки:
- **Android Studio** - [Скачать](https://developer.android.com/studio)
- **Java JDK 11+** - автоматически с Android Studio

### Для базы данных (выберите один из вариантов):
- **PostgreSQL 15+** - [Скачать](https://www.postgresql.org/download/windows/)
- **Docker Desktop** - [Скачать](https://www.docker.com/products/docker-desktop/)

## 🔧 Быстрая настройка (Рекомендуется)

### Вариант 1: Использование Docker (Проще для начинающих)

1. **Клонируйте репозиторий:**
   ```powershell
   git clone <repository-url>
   cd WorkTimeTracker
   ```

2. **Установите зависимости:**
   ```powershell
   npm install
   cd server ; npm install ; cd ..
   ```

3. **Запустите PostgreSQL и сервер через Docker:**
   ```powershell
   docker-compose up -d
   ```
   
   Это запустит:
   - PostgreSQL на порту 5432
   - PgAdmin на http://localhost:5050 (admin@worktime.com / admin)
   - Сервер API на http://localhost:3001

4. **Выполните миграции базы данных:**
   ```powershell
   cd server
   npm run migrate
   npm run seed  # Опционально: тестовые данные
   cd ..
   ```

5. **Запустите мобильное приложение:**
   ```powershell
   npm start
   ```

### Вариант 2: Локальная установка PostgreSQL

1. **Установите PostgreSQL 15+**
2. **Запустите автоматическую настройку:**
   ```powershell
   ./scripts/setup-postgresql.ps1 -UseDocker:$false
   ```
3. **Следуйте инструкциям скрипта для создания базы данных**

## 📱 Запуск различных платформ

### Мобильное приложение (React Native)
```powershell
# Запуск в режиме разработки
npm start

# Для Android (требует Android Studio)
npm run android

# Для iOS (только на macOS)
npm run ios
```

### Веб-приложение
```powershell
# Запуск веб-версии
npm run web

# Сборка для продакшена
npm run build:web
```

### Сервер API
```powershell
# Режим разработки (с hot reload)
npm run server:dev

# Продакшен режим
npm run server:build
npm run server:start
```

## 🗄️ Настройка базы данных

### Подключение к PostgreSQL

**Docker (по умолчанию):**
- Host: `localhost`
- Port: `5432`
- Database: `worktime_tracker`
- User: `postgres`
- Password: `postgres`

**Локальная установка:**
- Настраивается через скрипт `setup-postgresql.ps1`
- Или вручную через файл `server/.env`

### Управление миграциями
```powershell
cd server

# Выполнить миграции
npm run migrate

# Заполнить тестовыми данными
npm run seed

# Миграции для продакшена
npm run migrate:prod
```

## ⚙️ Конфигурация

### Переменные окружения сервера

Создайте файл `server/.env` на основе `server/env.example`:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=worktime_tracker
DB_USER=postgres
DB_PASSWORD=postgres

# JWT Configuration
JWT_SECRET=ваш-секретный-ключ-минимум-256-бит
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# Server Configuration
PORT=3001
NODE_ENV=development

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Twilio Configuration (для SMS)
TWILIO_ACCOUNT_SID=ваш_twilio_account_sid
TWILIO_AUTH_TOKEN=ваш_twilio_auth_token
TWILIO_PHONE_NUMBER=ваш_twilio_номер

# CORS Origins
CORS_ORIGINS=http://localhost:19006,http://localhost:3000

# Logging
LOG_LEVEL=info
LOG_FILE=logs/app.log
```

### Конфигурация Expo

Файл `app.json` содержит настройки для мобильного приложения:
- Bundle ID: `com.snow1e77.WorkTimeTracker`
- Плагины: location, notifications, task-manager
- Поддержка iOS, Android и Web

## 🔧 Режимы запуска

### Разработка
```powershell
# Полный стек разработки
docker-compose up -d          # База данных
npm run server:dev           # API сервер
npm start                    # Мобильное приложение
```

### Тестирование
```powershell
# Сервер
cd server
npm test
npm run test:coverage

# Клиент (добавьте тесты по необходимости)
npm test
```

### Продакшен
```powershell
# Автоматическое развертывание
npm run deploy:prod

# Или вручную
npm run server:build
npm run build:web
docker-compose -f docker-compose.prod.yml up -d
```

## 📊 Мониторинг и управление

### PgAdmin (Управление базой данных)
- URL: http://localhost:5050
- Email: admin@worktime.com
- Password: admin

### API Endpoints
Сервер API доступен на http://localhost:3001

**Основные эндпоинты:**
- `GET /api/health` - Проверка работоспособности
- `POST /api/auth/login` - Авторизация
- `GET /api/users` - Управление пользователями
- `GET /api/sites` - Управление площадками
- `POST /api/shifts/start` - Начало смены
- `POST /api/shifts/end` - Окончание смены

### Логи
```powershell
# Логи сервера
cd server
Get-Content logs/app.log -Tail 50

# Логи Docker
docker-compose logs -f
```

## 🛡️ Безопасность

### Настройка для продакшена
```powershell
# Генерация секретных ключей
./scripts/generate-production-secrets.ps1

# Настройка безопасности
./scripts/setup-security.ps1

# Простая настройка безопасности
./scripts/setup-security-simple.ps1
```

### SSL/TLS (для продакшена)
- Настройте SSL сертификаты в папке `nginx/ssl/`
- Используйте `docker-compose.prod.yml` для продакшена
- Настройте домен и DNS записи

## 🚨 Устранение неполадок

### Проблемы с базой данных
```powershell
# Проверка подключения
cd server
node -e "require('./dist/config/database.js').testConnection()"

# Пересоздание базы данных
docker-compose down -v
docker-compose up -d postgres
cd server ; npm run migrate ; cd ..
```

### Проблемы с зависимостями
```powershell
# Очистка кэша npm
npm cache clean --force

# Переустановка зависимостей
Remove-Item -Recurse -Force node_modules, server/node_modules
npm install
cd server ; npm install ; cd ..
```

### Проблемы с портами
```powershell
# Проверка занятых портов
netstat -ano | findstr :3001
netstat -ano | findstr :5432

# Остановка процессов
Stop-Process -Id <PID> -Force
```

### Проблемы с Android
```powershell
# Очистка Expo кэша
npx expo start --clear

# Проверка Android SDK
npx react-native doctor

# Пересборка Android
cd android
./gradlew clean
cd ..
npx expo run:android
```

## 📁 Структура проекта

```
WorkTimeTracker/
├── src/                     # Исходный код React Native
│   ├── components/         # React компоненты
│   │   ├── screens/       # Экраны приложения
│   │   └── types/         # TypeScript типы
│   ├── server/            # Серверная часть
│   │   ├── src/          # Исходный код сервера
│   │   │   ├── routes/   # API маршруты
│   │   │   ├── services/ # Бизнес-логика
│   │   │   ├── database/ # Миграции и схема БД
│   │   │   └── middleware/# Express middleware
│   │   └── logs/         # Логи сервера
│   ├── android/           # Android проект
│   ├── scripts/           # PowerShell скрипты
│   ├── nginx/             # Nginx конфигурация
│   └── docker-compose.yml # Docker настройки
```

## 🔗 Полезные ссылки

- [React Native Documentation](https://reactnative.dev/)
- [Expo Documentation](https://docs.expo.dev/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Node.js Documentation](https://nodejs.org/docs/)
- [Docker Documentation](https://docs.docker.com/)

## 🆘 Поддержка

При возникновении проблем:

1. **Проверьте логи:**
   ```powershell
   # Логи сервера
   cd server ; Get-Content logs/app.log -Tail 20

   # Логи Docker
   docker-compose logs
   ```

2. **Проверьте статус сервисов:**
   ```powershell
   # Статус Docker контейнеров
   docker-compose ps
   
   # Проверка API
   curl http://localhost:3001/api/health
   ```

3. **Перезапустите сервисы:**
   ```powershell
   docker-compose restart
   ```

4. **Полная переустановка:**
   ```powershell
   docker-compose down -v
   Remove-Item -Recurse -Force node_modules, server/node_modules
   npm install ; cd server ; npm install ; cd ..
   docker-compose up -d
   cd server ; npm run migrate ; cd ..
   ```

---

**Готово! 🎉**

После выполнения всех шагов у вас будет полностью рабочая система WorkTime Tracker с:
- ✅ Мобильным приложением (Android/iOS/Web)
- ✅ API сервером с WebSocket поддержкой
- ✅ PostgreSQL базой данных
- ✅ Панелью администратора
- ✅ Системой уведомлений
- ✅ GPS трекингом и синхронизацией 