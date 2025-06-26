# 🍎 Быстрый запуск WorkTime Tracker на macOS

## 🚀 Автоматический запуск (Рекомендуется)

Самый простой способ запустить проект на macOS:

```bash
# 1. Перейдите в папку проекта
cd WorkTimeTracker

# 2. Запустите автоматическую настройку
./quick-start-mac.sh
```

Скрипт автоматически:
- ✅ Проверит установку Docker и Node.js
- ✅ Установит зависимости
- ✅ Запустит PostgreSQL в Docker
- ✅ Выполнит миграции базы данных
- ✅ Настроит все необходимые файлы

## 📋 Предварительные требования

### Обязательно установите:

1. **Docker Desktop** для macOS:
   ```bash
   # Через Homebrew (рекомендуется)
   brew install --cask docker
   
   # Или скачайте с https://www.docker.com/products/docker-desktop/
   ```

2. **Node.js 18+**:
   ```bash
   # Через Homebrew
   brew install node@18
   
   # Или скачайте с https://nodejs.org/
   ```

3. **Git** (обычно уже установлен):
   ```bash
   # Если нужно установить
   brew install git
   ```

### Опционально (для мобильной разработки):

4. **Xcode** (для iOS разработки):
   - Установите из Mac App Store
   - Выполните: `xcode-select --install`

5. **Homebrew** (если еще не установлен):
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```

## 🔧 Ручная настройка (Альтернатива)

Если автоматический скрипт не сработал:

### 1. Установка PostgreSQL локально

```bash
# Установка PostgreSQL через Homebrew
brew install postgresql@15
brew services start postgresql@15

# Настройка базы данных
./scripts/setup-postgresql-mac.sh --use-docker
```

### 2. Установка зависимостей

```bash
# Основные зависимости
npm install

# Зависимости сервера
cd server && npm install && cd ..
```

### 3. Настройка окружения

```bash
# Копирование файла конфигурации
cp server/env.example server/.env

# Редактирование настроек (опционально)
nano server/.env
```

### 4. Запуск проекта

```bash
# Запуск базы данных
docker-compose up -d postgres

# Миграции
cd server && npm run migrate && npm run seed && cd ..

# Запуск мобильного приложения
npm start
```

## 🛑 Остановка проекта

```bash
# Автоматическая остановка
./stop-project-mac.sh

# Или вручную
docker-compose down
```

## 📱 Запуск различных версий

```bash
# Мобильное приложение (iOS/Android/Web)
npm start

# Только веб-версия
npm run web

# Только iOS (требует Xcode)
npm run ios

# Только сервер API
npm run server:dev
```

## 🌐 Доступные адреса после запуска

- **Мобильное приложение**: Metro Bundler откроется автоматически
- **Веб-версия**: http://localhost:19006
- **API Сервер**: http://localhost:3001
- **PgAdmin**: http://localhost:5050 (admin@worktime.com / admin)
- **PostgreSQL**: localhost:5432 (postgres / postgres)

## 🚨 Решение проблем

### Docker не запускается
```bash
# Проверка статуса Docker
docker --version
docker ps

# Перезапуск Docker Desktop
open -a Docker
```

### Порты заняты
```bash
# Проверка занятых портов
lsof -i :3001
lsof -i :5432

# Остановка процессов
./stop-project-mac.sh
```

### Ошибки с правами доступа
```bash
# Исправление прав для npm
sudo chown -R $(whoami) $(npm config get prefix)/{lib/node_modules,bin,share}

# Исправление прав для Homebrew
sudo chown -R $(whoami) /opt/homebrew/*
```

### Ошибки зависимостей
```bash
# Очистка кэша
npm cache clean --force

# Переустановка зависимостей
rm -rf node_modules server/node_modules
npm install && cd server && npm install && cd ..
```

## 💡 Полезные команды для macOS

```bash
# Просмотр логов
cd server && tail -f logs/app.log

# Проверка статуса сервисов Homebrew
brew services list

# Мониторинг процессов
top -o cpu

# Открыть папку в Finder
open .

# Показать скрытые файлы
defaults write com.apple.finder AppleShowAllFiles YES && killall Finder
```

## 📚 Дополнительная документация

- [Полное руководство для macOS](SETUP_GUIDE_MAC.md)
- [Разработка для iOS](SETUP_GUIDE_MAC.md#особенности-разработки-для-ios)
- [Устранение неполадок](SETUP_GUIDE_MAC.md#устранение-неполадок)

---

**Готово! 🎉** После выполнения `./quick-start-mac.sh` у вас будет полностью рабочая система WorkTime Tracker на macOS. 