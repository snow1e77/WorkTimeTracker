#!/usr/bin/env pwsh

# Setup PostgreSQL for WorkTime Tracker
# Этот скрипт настраивает PostgreSQL базу данных для проекта

param(
    [string]$DbHost = "localhost",
    [string]$Port = "5432",
    [string]$Database = "worktime_tracker",
    [string]$User = "worktime_user",
    [SecureString]$Password,
    [switch]$UseDocker = $false,
    [switch]$Force = $false
)

Write-Host "🐘 Настройка PostgreSQL для WorkTime Tracker" -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Green

# Функция для проверки установки PostgreSQL
function Test-PostgreSQLInstalled {
    try {
        Get-Command psql -ErrorAction Stop | Out-Null
        return $true
    }
    catch {
        return $false
    }
}

# Функция для проверки установки Docker
function Test-DockerInstalled {
    try {
        Get-Command docker -ErrorAction Stop | Out-Null
        docker --version | Out-Null
        return $true
    }
    catch {
        return $false
    }
}

# Основная логика
if ($UseDocker) {
    Write-Host "🐳 Использование Docker для PostgreSQL..." -ForegroundColor Blue
    
    if (-not (Test-DockerInstalled)) {
        Write-Host "❌ Docker не установлен! Установите Docker Desktop." -ForegroundColor Red
        exit 1
    }
    
    # Проверяем, запущен ли контейнер
    $existingContainer = docker ps -a --filter "name=worktime-postgres" --format "{{.Names}}"
    
    if ($existingContainer -and -not $Force) {
        Write-Host "⚠️  Контейнер worktime-postgres уже существует." -ForegroundColor Yellow
        Write-Host "Используйте -Force для пересоздания контейнера." -ForegroundColor Yellow
        exit 1
    }
    
    if ($existingContainer -and $Force) {
        Write-Host "🗑️  Удаление существующего контейнера..." -ForegroundColor Yellow
        docker stop worktime-postgres 2>$null
        docker rm worktime-postgres 2>$null
    }
    
    Write-Host "🚀 Запуск PostgreSQL в Docker..." -ForegroundColor Blue
    docker-compose up -d postgres
    
    Start-Sleep -Seconds 10
    
    Write-Host "✅ PostgreSQL запущен в Docker!" -ForegroundColor Green
    Write-Host "📝 Параметры подключения:" -ForegroundColor Cyan
    Write-Host "   Host: localhost" -ForegroundColor White
    Write-Host "   Port: 5432" -ForegroundColor White
    Write-Host "   Database: worktime_tracker" -ForegroundColor White
    Write-Host "   User: postgres" -ForegroundColor White
    Write-Host "   Password: postgres" -ForegroundColor White
}
else {
    Write-Host "🔧 Настройка существующего PostgreSQL..." -ForegroundColor Blue
    
    if (-not (Test-PostgreSQLInstalled)) {
        Write-Host "❌ PostgreSQL не установлен!" -ForegroundColor Red
        Write-Host "Установите PostgreSQL 15+ или используйте флаг -UseDocker" -ForegroundColor Yellow
        exit 1
    }
    
    if (-not $Password) {
        $Password = Read-Host "Введите пароль для пользователя $User" -AsSecureString
    }
    
    $PlainPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Password))
    
    Write-Host "📋 Создание базы данных и пользователя..." -ForegroundColor Blue
    
    # SQL команды для создания БД и пользователя
    $createDbSql = @"
-- Создание пользователя (игнорируем ошибку если уже существует)
DO `$`$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$User') THEN
        CREATE ROLE $User LOGIN PASSWORD '$PlainPassword';
    END IF;
END
`$`$;

-- Создание базы данных (если не существует)
SELECT 'CREATE DATABASE $Database'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$Database')\gexec

-- Назначение прав
GRANT ALL PRIVILEGES ON DATABASE $Database TO $User;
GRANT CONNECT ON DATABASE $Database TO $User;
"@
    
    try {
        # Подключаемся к postgres DB для создания пользователя и БД
        $createDbSql | psql -h $DbHost -p $Port -U postgres -d postgres
        
        Write-Host "✅ База данных создана!" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ Ошибка создания базы данных: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}

# Создание .env файла
Write-Host "📝 Создание .env файла..." -ForegroundColor Blue

$envContent = @"
# Database Configuration
DB_HOST=$DbHost
DB_PORT=$Port
DB_NAME=$Database
DB_USER=$(if ($UseDocker) { 'postgres' } else { $User })
DB_PASSWORD=$(if ($UseDocker) { 'postgres' } else { $PlainPassword })

# JWT Configuration
JWT_SECRET=your-development-jwt-secret-key-change-in-production
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# App Store Links (опционально)
APP_STORE_URL=https://apps.apple.com/your-app
PLAY_STORE_URL=https://play.google.com/store/apps/your-app

# CORS Origins
CORS_ORIGINS=http://localhost:19006,http://localhost:3000

# Server Configuration
PORT=3001
NODE_ENV=development

# Logging
LOG_LEVEL=info
LOG_FILE=logs/app.log
"@

$envPath = "server/.env"

if (Test-Path $envPath -and -not $Force) {
    Write-Host "⚠️  Файл .env уже существует. Используйте -Force для перезаписи." -ForegroundColor Yellow
} else {
    $envContent | Out-File -FilePath $envPath -Encoding UTF8
    Write-Host "✅ Файл .env создан в server/.env" -ForegroundColor Green
}

# Выполнение миграций
Write-Host "🔄 Выполнение миграций базы данных..." -ForegroundColor Blue

try {
    Set-Location server
    npm run migrate
    Write-Host "✅ Миграции выполнены успешно!" -ForegroundColor Green
}
catch {
    Write-Host "❌ Ошибка выполнения миграций: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Попробуйте выполнить миграции вручную: cd server && npm run migrate" -ForegroundColor Yellow
}
finally {
    Set-Location ..
}

# Проверка подключения
Write-Host "🔍 Проверка подключения к базе данных..." -ForegroundColor Blue

try {
    Set-Location server
    node -e "
        const { testConnection } = require('./dist/config/database.js');
        testConnection().then(success => {
            if (success) {
                console.log('✅ Подключение к базе данных успешно!');
                process.exit(0);
            } else {
                console.log('❌ Не удалось подключиться к базе данных');
                process.exit(1);
            }
        }).catch(err => {
            console.log('❌ Ошибка подключения:', err.message);
            process.exit(1);
        });
    "
    Write-Host "✅ Подключение работает!" -ForegroundColor Green
}
catch {
    Write-Host "⚠️  Не удалось проверить подключение. Убедитесь что сервер собран (npm run build)" -ForegroundColor Yellow
}
finally {
    Set-Location ..
}

Write-Host ""
Write-Host "🎉 Настройка PostgreSQL завершена!" -ForegroundColor Green
Write-Host "==============================" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Следующие шаги:" -ForegroundColor Cyan
Write-Host "1. Установите зависимости: npm install" -ForegroundColor White
Write-Host "2. Установите зависимости сервера: cd server && npm install" -ForegroundColor White
Write-Host "3. Соберите сервер: cd server && npm run build" -ForegroundColor White
Write-Host "4. Запустите сервер: cd server && npm run dev" -ForegroundColor White
Write-Host "5. Запустите приложение: npm start" -ForegroundColor White
Write-Host ""

if ($UseDocker) {
    Write-Host "🐳 Docker Services:" -ForegroundColor Cyan
    Write-Host "   PostgreSQL: http://localhost:5432" -ForegroundColor White
    Write-Host "   PgAdmin: http://localhost:5050 (admin@worktime.com / admin)" -ForegroundColor White
}

Write-Host "📖 Дополнительные команды:" -ForegroundColor Cyan
Write-Host "   Заполнить тестовыми данными: cd server && npm run seed" -ForegroundColor White
Write-Host "   Запустить веб-версию: npm run web" -ForegroundColor White
Write-Host "   Остановить Docker: docker-compose down" -ForegroundColor White 