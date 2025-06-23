# 🍎 Полное руководство по запуску WorkTime Tracker на macOS

Этот документ содержит пошаговые инструкции для настройки и запуска всех компонентов системы WorkTime Tracker на macOS.

## 📋 Требования к системе

### Обязательные компоненты:
- **Node.js 18+** - [Установить через Homebrew](#установка-homebrew) или [Скачать](https://nodejs.org/)
- **npm** или **yarn** - поставляется с Node.js
- **Git** - предустановлен в macOS или `brew install git`
- **Xcode Command Line Tools** - `xcode-select --install`

### Для мобильной разработки:
- **Xcode 14+** - [Mac App Store](https://apps.apple.com/us/app/xcode/id497799835)
- **iOS Simulator** - входит в состав Xcode
- **Android Studio** - [Скачать](https://developer.android.com/studio) (опционально для Android)

### Для базы данных (выберите один из вариантов):
- **PostgreSQL 15+** - `brew install postgresql@15`
- **Docker Desktop** - [Скачать](https://www.docker.com/products/docker-desktop/) или `brew install --cask docker`

## 🍺 Установка Homebrew

Если у вас еще не установлен Homebrew:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

## 🔧 Быстрая настройка (Рекомендуется)

### Вариант 1: Использование Docker (Проще)

1. **Установите Docker и зависимости:**
   ```bash
   brew install --cask docker
   brew install node@18 git
   ```

2. **Клонируйте репозиторий:**
   ```bash
   git clone <repository-url>
   cd WorkTimeTracker
   ```

3. **Установите зависимости:**
   ```bash
   npm install
   cd server && npm install && cd ..
   ```

4. **Запустите Docker Desktop** (из Applications)

5. **Запустите PostgreSQL и сервер через Docker:**
   ```bash
   docker-compose up -d
   ```
   
   Это запустит:
   - PostgreSQL на порту 5432
   - PgAdmin на http://localhost:5050 (admin@worktime.com / admin)
   - Сервер API на http://localhost:3001

6. **Выполните миграции базы данных:**
   ```bash
   cd server
   npm run migrate
   npm run seed  # Опционально: тестовые данные
   cd ..
   ```

7. **Запустите мобильное приложение:**
   ```bash
   npm start
   ```

### Вариант 2: Локальная установка PostgreSQL

1. **Установите PostgreSQL и зависимости:**
   ```bash
   brew install postgresql@15 node@18
   brew services start postgresql@15
   ```

2. **Создайте базу данных и пользователя:**
   ```bash
   # Подключитесь к PostgreSQL
   psql postgres
   
   # В консоли PostgreSQL выполните:
   CREATE DATABASE worktime_tracker;
   CREATE USER worktime_user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE worktime_tracker TO worktime_user;
   \q
   ```

3. **Настройте переменные окружения:**
   ```bash
   cp server/env.example server/.env
   # Отредактируйте server/.env с вашими настройками
   ```

## 📱 Запуск различных платформ

### Мобильное приложение (React Native)
```bash
# Запуск в режиме разработки
npm start

# Для iOS (требует Xcode)
npm run ios

# Для Android (требует Android Studio)
npm run android
```

### Веб-приложение
```bash
# Запуск веб-версии
npm run web

# Сборка для продакшена
npm run build:web
```

### Сервер API
```bash
# Режим разработки (с hot reload)
npm run server:dev

# Продакшен режим
npm run server:build
npm run server:start
```

## 🍎 Особенности разработки для iOS

### Настройка Xcode

1. **Установите Xcode из Mac App Store**
2. **Запустите Xcode и примите соглашения:**
   ```bash
   sudo xcodebuild -license accept
   ```

3. **Установите iOS Simulator:**
   ```bash
   xcrun simctl list devices
   ```

4. **Настройте подписи в Xcode:**
   - Откройте `WorkTimeTracker/ios/WorkTimeTracker.xcworkspace`
   - Выберите ваш Apple Developer Account
   - Настройте Bundle Identifier

### Запуск на iOS

```bash
# Запуск в симуляторе
npx expo run:ios

# Запуск на устройстве (требует Apple Developer Account)
npx expo run:ios --device
```

## 🗄️ Настройка базы данных

### Подключение к PostgreSQL

**Docker (по умолчанию):**
- Host: `localhost`
- Port: `5432`
- Database: `worktime_tracker`
- User: `postgres`
- Password: `postgres`

**Локальная установка Homebrew:**
- Host: `localhost`
- Port: `5433` (PostgreSQL@15 через Homebrew)
- Database: `worktime_tracker`
- User: `worktime_user`
- Password: `your_password`

### Управление PostgreSQL через Homebrew

```bash
# Запуск PostgreSQL
brew services start postgresql@15

# Остановка PostgreSQL
brew services stop postgresql@15

# Перезапуск PostgreSQL
brew services restart postgresql@15

# Статус сервиса
brew services list | grep postgresql
```

### Управление миграциями
```bash
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

### Настройка путей для macOS

```bash
# Добавьте в ~/.zshrc или ~/.bash_profile
export PATH="/opt/homebrew/bin:$PATH"
export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"

# Перезагрузите профиль
source ~/.zshrc  # или source ~/.bash_profile
```

## 🔧 Режимы запуска

### Разработка
```bash
# Полный стек разработки
docker-compose up -d          # База данных
npm run server:dev &          # API сервер в фоне
npm start                     # Мобильное приложение
```

### Тестирование
```bash
# Сервер
cd server
npm test
npm run test:coverage

# Клиент
npm test
```

### Продакшен
```bash
# Автоматическое развертывание (если есть скрипт)
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
```bash
# Логи сервера
cd server
tail -f logs/app.log

# Логи Docker
docker-compose logs -f

# Системные логи macOS
log show --predicate 'process == "node"' --info --last 1h
```

## 🛡️ Безопасность

### Настройки macOS для разработки

```bash
# Разрешить выполнение неподписанных приложений (для разработки)
sudo spctl --master-disable

# Настройка файрвола (опционально)
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate on
```

### Keychain для хранения сертификатов iOS

```bash
# Проверка сертификатов разработчика
security find-identity -v -p codesigning

# Доступ к связке ключей
open /Applications/Utilities/Keychain\ Access.app
```

## 🚨 Устранение неполадок

### Проблемы с базой данных
```bash
# Проверка подключения
cd server
node -e "require('./dist/config/database.js').testConnection()"

# Пересоздание базы данных
docker-compose down -v
docker-compose up -d postgres
cd server && npm run migrate && cd ..
```

### Проблемы с зависимостями
```bash
# Очистка кэша npm
npm cache clean --force

# Переустановка зависимостей
rm -rf node_modules server/node_modules
npm install
cd server && npm install && cd ..
```

### Проблемы с портами
```bash
# Проверка занятых портов
lsof -i :3001
lsof -i :5432

# Остановка процессов
kill -9 $(lsof -t -i:3001)
kill -9 $(lsof -t -i:5432)
```

### Проблемы с iOS
```bash
# Очистка Xcode кэша
rm -rf ~/Library/Developer/Xcode/DerivedData/*

# Очистка Expo кэша
npx expo start --clear

# Пересборка iOS проекта
cd ios
pod install --repo-update
cd ..
npx expo run:ios
```

### Проблемы с Android на macOS
```bash
# Установка Android SDK через Homebrew
brew install --cask android-studio

# Настройка переменных окружения для Android
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
export PATH=$PATH:$ANDROID_HOME/platform-tools

# Проверка Android SDK
npx react-native doctor
```

### Проблемы с Docker на M1/M2 Mac
```bash
# Использование платформы x86_64 для совместимости
docker-compose up -d --platform linux/amd64

# Или добавьте в docker-compose.yml:
# platform: linux/amd64
```

## 🍎 macOS-специфичные команды

### Управление службами
```bash
# Просмотр запущенных служб
brew services list

# Автозапуск PostgreSQL
brew services start postgresql@15

# Остановка всех служб Homebrew
brew services stop --all
```

### Работа с файлами
```bash
# Открыть папку в Finder
open .

# Открыть файл в редакторе по умолчанию
open server/.env

# Показать скрытые файлы в Finder
defaults write com.apple.finder AppleShowAllFiles YES
killall Finder
```

### Мониторинг системы
```bash
# Мониторинг процессов
top -o cpu

# Информация о системе
system_profiler SPSoftwareDataType

# Использование диска
df -h
```

## 📁 Структура проекта для macOS

```
WorkTimeTracker/
├── src/                     # Исходный код React Native
│   ├── components/         # React компоненты
│   ├── screens/           # Экраны приложения
│   ├── services/          # API сервисы
│   └── types/             # TypeScript типы
├── server/                # Серверная часть
│   ├── src/              # Исходный код сервера
│   │   ├── routes/       # API маршруты
│   │   ├── services/     # Бизнес-логика
│   │   ├── database/     # Миграции и схема БД
│   │   └── middleware/   # Express middleware
│   └── logs/             # Логи сервера
├── ios/                  # iOS проект (Xcode)
│   ├── WorkTimeTracker.xcworkspace
│   └── Podfile
├── android/              # Android проект
├── nginx/                # Nginx конфигурация
└── docker-compose.yml    # Docker настройки
```

## 🔗 Полезные ссылки для macOS

- [Homebrew Documentation](https://docs.brew.sh/)
- [Xcode Documentation](https://developer.apple.com/documentation/xcode)
- [React Native iOS Guide](https://reactnative.dev/docs/running-on-device)
- [Expo iOS Development](https://docs.expo.dev/workflow/ios-simulator/)
- [macOS Terminal Guide](https://support.apple.com/guide/terminal/welcome/mac)

## 🆘 Поддержка

При возникновении проблем на macOS:

1. **Проверьте логи:**
   ```bash
   # Логи сервера
   cd server && tail -f logs/app.log

   # Логи Docker
   docker-compose logs

   # Системные логи
   log show --style syslog --last 1h
   ```

2. **Проверьте статус сервисов:**
   ```bash
   # Статус Docker контейнеров
   docker-compose ps
   
   # Статус Homebrew сервисов
   brew services list
   
   # Проверка API
   curl http://localhost:3001/api/health
   ```

3. **Перезапустите сервисы:**
   ```bash
   docker-compose restart
   brew services restart postgresql@15
   ```

4. **Полная переустановка:**
   ```bash
   docker-compose down -v
   rm -rf node_modules server/node_modules
   npm install && cd server && npm install && cd ..
   docker-compose up -d
   cd server && npm run migrate && cd ..
   ```

5. **Проблемы с разрешениями:**
   ```bash
   # Исправление разрешений для npm
   sudo chown -R $(whoami) $(npm config get prefix)/{lib/node_modules,bin,share}
   
   # Исправление разрешений для Homebrew
   sudo chown -R $(whoami) /opt/homebrew/*
   ```

---

## 🎯 Быстрый старт для macOS

**Самый простой способ запустить всё за 5 минут:**

```bash
# 1. Установка зависимостей
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
brew install --cask docker
brew install node@18 git

# 2. Клонирование и настройка
git clone <repository-url>
cd WorkTimeTracker
npm install && cd server && npm install && cd ..

# 3. Запуск через Docker
open -a Docker  # Запустить Docker Desktop
docker-compose up -d

# 4. Настройка базы данных
cd server && npm run migrate && npm run seed && cd ..

# 5. Запуск приложения
npm start
```

**Готово! 🎉**

После выполнения всех шагов у вас будет полностью рабочая система WorkTime Tracker с:
- ✅ Мобильным приложением (iOS/Android/Web)
- ✅ API сервером с WebSocket поддержкой
- ✅ PostgreSQL базой данных
- ✅ Панелью администратора
- ✅ Системой уведомлений
- ✅ GPS трекингом и синхронизацией
- ✅ Полной поддержкой iOS разработки через Xcode 