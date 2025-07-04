#!/bin/bash

# Установка кодировки UTF-8
export LC_ALL=en_US.UTF-8

echo "========================================"
echo "  Work Time Tracker - Быстрый запуск macOS (ИСПРАВЛЕННАЯ ВЕРСИЯ)"
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
echo "[1/8] Проверяем наличие Docker..."
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
echo "[2/8] Проверяем наличие Node.js..."
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
echo "[3/8] Проверяем наличие Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose не найден! Убедитесь что Docker Desktop установлен корректно."
    exit 1
fi
echo "✅ Docker Compose найден"

echo ""
echo "[4/8] Устанавливаем права на выполнение скриптов..."
chmod +x *.sh 2>/dev/null || true
chmod +x scripts/*.sh 2>/dev/null || true
echo "✅ Права на выполнение установлены"

echo ""
echo "[5/8] Проверяем наличие зависимостей..."
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
echo "[6/8] Создаем необходимые папки и файлы..."

# Создаем папки если не существуют
mkdir -p server/logs
mkdir -p server/uploads
mkdir -p secrets
echo "📁 Созданы необходимые папки"

if [ ! -f "server/.env" ]; then
    echo "📝 Создаем .env файл..."
    cat > server/.env << 'EOF'
# Database Configuration (Docker)
DB_HOST=localhost
DB_PORT=5433
DB_NAME=worktime_tracker
DB_USER=postgres
DB_PASSWORD=postgres

# JWT Configuration
JWT_SECRET=development_jwt_secret_key_change_in_production_32_chars_minimum_macOS_fix
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

# API
API_BASE_URL=http://localhost:3001
EOF
    echo "✅ Файл .env создан с правильными настройками для macOS"
fi

echo ""
echo "[7/8] Запускаем Docker контейнеры..."
echo "🐳 Остановка старых контейнеров..."

# Полная очистка контейнеров
docker-compose down --volumes --remove-orphans 2>/dev/null || true

# Ждем завершения остановки
sleep 3

echo "🐳 Запуск PostgreSQL и других сервисов..."

# Устанавливаем переменные для Docker
export DOCKER_BUILDKIT=0
export COMPOSE_DOCKER_CLI_BUILD=0

docker-compose up -d

if [ $? -ne 0 ]; then
    echo "❌ Ошибка запуска Docker контейнеров"
    echo "Убедитесь что Docker Desktop запущен"
    echo "Попробуйте вручную: docker-compose up -d"
    exit 1
fi

echo "✅ Docker контейнеры запущены"

echo ""
echo "⏱️  Ждем полного запуска PostgreSQL (30 секунд)..."
sleep 30

echo ""
echo "📊 Проверяем состояние контейнеров..."
docker-compose ps

# Проверяем что PostgreSQL действительно готов
echo ""
echo "🔍 Проверяем готовность PostgreSQL..."
max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
    if docker exec worktime-postgres pg_isready -h localhost -p 5432 -U postgres &>/dev/null; then
        echo "✅ PostgreSQL готов к работе"
        break
    fi
    ((attempt++))
    echo "⏳ Ожидание PostgreSQL... попытка $attempt/$max_attempts"
    sleep 2
done

if [ $attempt -eq $max_attempts ]; then
    echo "❌ PostgreSQL не запустился за отведенное время"
    echo "Логи PostgreSQL:"
    docker-compose logs postgres
    exit 1
fi

echo ""
echo "[8/8] Выполняем миграции базы данных..."
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
    echo "Логи сервера:"
    docker-compose logs server
    echo ""
    echo "Логи PostgreSQL:"
    docker-compose logs postgres
    cd ..
    exit 1
else
    echo "✅ Миграции выполнены успешно"
    
    # Заполняем тестовыми данными
    echo "📊 Добавляем тестовые данные..."
    npm run seed || echo "⚠️  Тестовые данные не добавлены (возможно уже существуют)"
    
    # Создаем тестового пользователя
    echo "👤 Создаем тестового пользователя..."
    npm run create-test-worker || echo "⚠️  Тестовый пользователь не создан (возможно уже существует)"
fi

cd ..

echo ""
echo "🔍 Финальная проверка сервисов..."

# Проверяем API
echo -n "Проверяем API Сервер... "
sleep 5
if curl -s --max-time 10 "http://localhost:3001/api/health" >/dev/null 2>&1; then
    echo "✅ работает"
else
    echo "❌ недоступен"
    echo "Логи сервера:"
    docker-compose logs --tail=20 server
fi

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
echo "👤 Данные тестового пользователя:"
echo "• Номер телефона: +79999999999"
echo "• Роль: worker"
echo "• Вход: только по номеру телефона"
echo ""
echo "🛑 Для остановки всех сервисов используйте:"
echo "./stop-project-mac.sh"
echo ""
echo "🔧 Дополнительные команды:"
echo "• Проверка статуса: ./check-services-mac.sh"
echo "• Создание тестового работника: ./create-test-worker.sh"
echo "• Исправление прав: ./fix-permissions-mac.sh"
echo ""
echo "💡 Если возникли проблемы:"
echo "• Проверьте логи: docker-compose logs"
echo "• Перезапуск: docker-compose restart"
echo "• Полный сброс: docker-compose down --volumes && ./quick-start-mac-fixed.sh"
echo ""

read -p "Нажмите Enter для продолжения или Ctrl+C для выхода..." 