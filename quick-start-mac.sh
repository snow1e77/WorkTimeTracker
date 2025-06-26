#!/bin/bash

# Установка кодировки UTF-8
export LC_ALL=en_US.UTF-8

echo "========================================"
echo "  Work Time Tracker - Быстрый запуск macOS"
echo "========================================"

# Переходим в папку проекта
cd "$(dirname "$0")"

echo ""
echo "[1/6] Проверяем наличие Docker..."
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не найден! Установите Docker Desktop и перезапустите скрипт."
    echo "Скачать: https://www.docker.com/products/docker-desktop/"
    exit 1
fi
echo "✅ Docker найден"

echo ""
echo "[2/6] Проверяем наличие Node.js..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js не найден! Установите Node.js и перезапустите скрипт."
    echo "Установка через Homebrew: brew install node@18"
    echo "Или скачать: https://nodejs.org/"
    exit 1
fi
echo "✅ Node.js найден"

echo ""
echo "[3/6] Проверяем наличие Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose не найден! Убедитесь что Docker Desktop установлен корректно."
    exit 1
fi
echo "✅ Docker Compose найден"

echo ""
echo "[4/6] Проверяем наличие зависимостей..."
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
echo "[5/6] Создаем файл окружения..."
if [ ! -f "server/.env" ]; then
    if [ -f "server/env.example" ]; then
        echo "📝 Копируем env.example в .env..."
        cp server/env.example server/.env
    else
        echo "📝 Создаем базовый .env файл..."
        cat > server/.env << EOF
# Database Configuration (Docker)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=worktime_tracker
DB_USER=postgres
DB_PASSWORD=postgres

# JWT Configuration
JWT_SECRET=super-secret-jwt-key-for-development-only-change-in-production
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# Server Configuration
PORT=3001
NODE_ENV=development

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS Origins
CORS_ORIGINS=http://localhost:19006,http://localhost:3000

# Logging
LOG_LEVEL=info
LOG_FILE=logs/app.log
EOF
    fi
fi

echo ""
echo "[6/6] Запускаем Docker контейнеры..."
echo "🐳 Запуск PostgreSQL и других сервисов..."

# Устанавливаем переменные для Docker
export DOCKER_BUILDKIT=0
export COMPOSE_DOCKER_CLI_BUILD=0

docker-compose up -d

if [ $? -ne 0 ]; then
    echo "❌ Ошибка запуска Docker контейнеров"
    echo "Убедитесь что Docker Desktop запущен"
    exit 1
fi

echo "✅ Docker контейнеры запущены"

echo ""
echo "⏱️  Ждем запуска PostgreSQL (10 секунд)..."
sleep 10

echo ""
echo "[7/7] Выполняем миграции базы данных..."
cd server
echo "🗄️  Создание таблиц и первоначальная настройка..."
npm run migrate

if [ $? -ne 0 ]; then
    echo "⚠️  Ошибка миграций. Попробуйте выполнить вручную:"
    echo "cd server && npm run migrate"
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
echo "• PgAdmin:        http://localhost:5050 (admin@worktime.com / admin)"
echo "• PostgreSQL:     localhost:5432 (postgres / postgres)"
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

read -p "Нажмите Enter для продолжения или Ctrl+C для выхода..." 