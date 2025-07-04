#!/bin/bash

# Установка кодировки UTF-8
export LC_ALL=en_US.UTF-8

echo "========================================"
echo "  Work Time Tracker - Быстрый запуск macOS"
echo "========================================"

# Переходим в папку проекта
cd "$(dirname "$0")"

# Проверяем наличие docker-compose.yml
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Файл docker-compose.yml не найден!"
    echo "Убедитесь, что запускаете скрипт из корневой папки проекта"
    exit 1
fi

echo ""
echo "[1/7] Проверяем наличие Docker..."
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не найден! Установите Docker Desktop и перезапустите скрипт."
    echo "Скачать: https://www.docker.com/products/docker-desktop/"
    exit 1
fi

# Проверяем, что Docker запущен
if ! docker info &> /dev/null; then
    echo "❌ Docker не запущен! Запустите Docker Desktop и повторите попытку."
    exit 1
fi
echo "✅ Docker найден и запущен"

echo ""
echo "[2/7] Проверяем наличие Node.js..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js не найден! Установите Node.js и перезапустите скрипт."
    echo "Установка через Homebrew: brew install node@18"
    echo "Или скачать: https://nodejs.org/"
    exit 1
fi

# Проверяем версию Node.js
node_version=$(node -v | sed 's/v//' | cut -d'.' -f1)
if [ "$node_version" -lt 16 ]; then
    echo "⚠️  Node.js версии $node_version обнаружен. Рекомендуется версия 16 или выше"
fi
echo "✅ Node.js найден (версия: $(node -v))"

echo ""
echo "[3/7] Проверяем наличие Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose не найден! Убедитесь что Docker Desktop установлен корректно."
    exit 1
fi
echo "✅ Docker Compose найден"

echo ""
echo "[4/7] Проверяем наличие зависимостей..."
if [ ! -d "node_modules" ]; then
    echo "📦 Устанавливаем зависимости основного проекта..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Ошибка установки зависимостей основного проекта"
        exit 1
    fi
fi

if [ ! -d "server/node_modules" ]; then
    echo "📦 Устанавливаем зависимости сервера..."
    cd server && npm install && cd ..
    if [ $? -ne 0 ]; then
        echo "❌ Ошибка установки зависимостей сервера"
        exit 1
    fi
fi

echo "✅ Зависимости установлены"

echo ""
echo "[5/7] Создаем необходимые папки и файлы..."

# Создаем папку для логов если не существует
if [ ! -d "server/logs" ]; then
    mkdir -p server/logs
    echo "📁 Создана папка server/logs"
fi

if [ ! -f "server/.env" ]; then
    if [ -f "server/env.example" ]; then
        echo "📝 Создаем .env файл из env.example..."
        cp server/env.example server/.env
        
        # Исправляем настройки для Docker на macOS
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS version of sed
            sed -i '' 's/^DB_HOST=.*/DB_HOST=localhost/' server/.env
            sed -i '' 's/^DB_PORT=.*/DB_PORT=5433/' server/.env
            sed -i '' 's/^DB_NAME=.*/DB_NAME=worktime_tracker/' server/.env
            sed -i '' 's/^DB_USER=.*/DB_USER=postgres/' server/.env
            sed -i '' 's/^DB_PASSWORD=.*/DB_PASSWORD=postgres/' server/.env
            sed -i '' 's/your_super_secret_jwt_key_here_minimum_32_characters_please_change_this/development_jwt_secret_key_change_in_production_32_chars_minimum/' server/.env
            sed -i '' 's/^LOG_LEVEL=.*/LOG_LEVEL=debug/' server/.env
            sed -i '' 's/^NODE_ENV=.*/NODE_ENV=development/' server/.env
        fi
    else
        echo "📝 Создаем базовый .env файл..."
        cat > server/.env << EOF
# Database Configuration (Docker)
DB_HOST=localhost
DB_PORT=5433
DB_NAME=worktime_tracker
DB_USER=postgres
DB_PASSWORD=postgres

# JWT Configuration
JWT_SECRET=development_jwt_secret_key_change_in_production_32_chars_minimum
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# Server Configuration
PORT=3001
NODE_ENV=development

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS Origins
CORS_ORIGINS=http://localhost:19006,http://localhost:3000,http://localhost:8081

# Logging
LOG_LEVEL=debug
LOG_FILE=logs/app.log

# Security
HELMET_CSP_ENABLED=false
TRUST_PROXY=false
EOF
    fi
    echo "✅ Файл .env создан с правильными настройками для Docker"
fi

echo ""
echo "[6/7] Запускаем Docker контейнеры..."
echo "🐳 Запуск PostgreSQL и других сервисов..."

# Устанавливаем переменные для Docker
export DOCKER_BUILDKIT=0
export COMPOSE_DOCKER_CLI_BUILD=0

# Останавливаем существующие контейнеры
docker-compose down 2>/dev/null || true

docker-compose up -d

if [ $? -ne 0 ]; then
    echo "❌ Ошибка запуска Docker контейнеров"
    echo "Убедитесь что Docker Desktop запущен"
    echo "Попробуйте вручную: docker-compose up -d"
    exit 1
fi

echo "✅ Docker контейнеры запущены"

echo ""
echo "⏱️  Ждем запуска PostgreSQL (20 секунд)..."
sleep 20

echo ""
echo "📊 Проверяем состояние контейнеров..."
docker-compose ps

echo ""
echo "[7/7] Выполняем миграции базы данных..."
cd server

echo "🔨 Сборка сервера..."
npm run build
if [ $? -ne 0 ]; then
    echo "⚠️  Ошибка сборки сервера. Попробуйте выполнить вручную:"
    echo "cd server && npm run build"
    cd ..
    exit 1
fi

echo "🗄️  Создание таблиц и первоначальная настройка..."
npm run migrate

if [ $? -ne 0 ]; then
    echo "⚠️  Ошибка миграций. Проверьте подключение к БД"
    echo "Попробуйте выполнить вручную:"
    echo "cd server && npm run migrate"
    echo ""
    echo "Или проверьте состояние PostgreSQL:"
    echo "docker-compose logs postgres"
    cd ..
    exit 1
else
    echo "✅ Миграции выполнены успешно"
    
    # Опционально заполняем тестовыми данными
    echo "📊 Добавляем тестовые данные..."
    npm run seed 2>/dev/null || echo "⚠️  Тестовые данные не добавлены (возможно уже существуют)"
fi

cd ..

echo ""
echo "🎉 Настройка завершена успешно!"
echo "================================="
echo ""
echo "📋 Доступные сервисы:"
echo "• API Сервер:     http://localhost:3001"
echo "• API Health:     http://localhost:3001/api/health"
echo "• PgAdmin:        http://localhost:5050 (admin@worktime.com / admin)"
echo "• PostgreSQL:     localhost:5433 (postgres / postgres)"
echo ""
echo "🚀 Для запуска мобильного приложения выполните:"
echo "npm start"
echo ""
echo "🌐 Для запуска веб-версии выполните:"
echo "npm run web"
echo ""
echo "🛑 Для остановки всех сервисов используйте:"
echo "./stop-project-mac.sh"
echo ""
echo "🔧 Для создания тестового работника:"
echo "./create-test-worker.sh"
echo ""

read -p "Нажмите Enter для продолжения или Ctrl+C для выхода..." 