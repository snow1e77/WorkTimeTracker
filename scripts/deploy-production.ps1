# Production Deployment Script for WorkTime Tracker
# Запускать с правами администратора

param(
    [Parameter(Mandatory=$false)]
    [string]$Domain = "yourdomain.com",
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipSSL
)

Write-Host "🚀 Starting Production Deployment for WorkTime Tracker" -ForegroundColor Green

# Проверка наличия Docker
if (!(Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Error "Docker не установлен. Установите Docker Desktop и попробуйте снова."
    exit 1
}

if (!(Get-Command docker-compose -ErrorAction SilentlyContinue)) {
    Write-Error "Docker Compose не установлен. Установите Docker Compose и попробуйте снова."
    exit 1
}

# Переходим в корневую директорию проекта
$ScriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptPath
Set-Location $ProjectRoot

Write-Host "📁 Работаем в директории: $ProjectRoot" -ForegroundColor Yellow

# Проверяем наличие .env файла
$EnvFile = ".env.production"
if (!(Test-Path $EnvFile)) {
    Write-Host "⚠️ Файл $EnvFile не найден. Создаем шаблон..." -ForegroundColor Yellow
    
    @"
# Production Environment Variables
# ВНИМАНИЕ: Замените все значения на реальные производственные данные!

# Database Configuration
DB_NAME=worktime_production
DB_USER=worktime_user
DB_PASSWORD=CHANGE_THIS_STRONG_PASSWORD
REDIS_PASSWORD=CHANGE_THIS_REDIS_PASSWORD

# JWT Secrets (ОБЯЗАТЕЛЬНО ЗАМЕНИТЕ!)
JWT_ACCESS_SECRET=CHANGE_THIS_TO_STRONG_SECRET_256_BITS_MINIMUM
JWT_REFRESH_SECRET=CHANGE_THIS_TO_STRONG_REFRESH_SECRET_256_BITS_MINIMUM

# Twilio Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# CORS Origins
CORS_ORIGINS=https://$Domain,https://app.$Domain
"@ | Out-File -FilePath $EnvFile -Encoding UTF8
    
    Write-Host "❗ ВАЖНО: Отредактируйте файл $EnvFile перед продолжением!" -ForegroundColor Red
    Write-Host "Нажмите любую клавишу после редактирования файла..." -ForegroundColor Yellow
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

# Сборка веб-версии
Write-Host "🏗️ Собираем веб-версию приложения..." -ForegroundColor Blue
try {
    if (Test-Path "build") {
        Remove-Item -Recurse -Force "build"
    }
    
    npm run web
    
    if (!(Test-Path "build")) {
        Write-Error "Сборка веб-версии не удалась. Проверьте логи выше."
        exit 1
    }
    
    Write-Host "✅ Веб-версия собрана успешно" -ForegroundColor Green
} catch {
    Write-Error "Ошибка при сборке веб-версии: $_"
    exit 1
}

# Создаем SSL сертификаты (самоподписанные для тестирования)
if (!$SkipSSL) {
    Write-Host "🔐 Настраиваем SSL сертификаты..." -ForegroundColor Blue
    
    if (!(Test-Path "nginx/ssl")) {
        New-Item -ItemType Directory -Path "nginx/ssl" -Force
    }
    
    # Генерируем самоподписанный сертификат для тестирования
    # В продакшене используйте реальные сертификаты от Let's Encrypt или другого CA
    $CertPath = "nginx/ssl"
    
    if (!(Test-Path "$CertPath/cert.pem")) {
        Write-Host "⚠️ Генерируем самоподписанный SSL сертификат для тестирования..." -ForegroundColor Yellow
        Write-Host "В продакшене замените на реальный сертификат!" -ForegroundColor Red
        
        # Создаем конфигурацию для OpenSSL
        @"
[req]
distinguished_name = req_distinguished_name
x509_extensions = v3_req
prompt = no

[req_distinguished_name]
C = US
ST = State
L = City
O = Organization
CN = $Domain

[v3_req]
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = $Domain
DNS.2 = *.$Domain
"@ | Out-File -FilePath "ssl_config.cnf" -Encoding UTF8

        # Генерируем приватный ключ и сертификат
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout "$CertPath/key.pem" -out "$CertPath/cert.pem" -config ssl_config.cnf
        Remove-Item "ssl_config.cnf" -Force
        
        Write-Host "✅ SSL сертификат создан" -ForegroundColor Green
    }
}

# Останавливаем существующие контейнеры
Write-Host "🛑 Останавливаем существующие контейнеры..." -ForegroundColor Blue
docker-compose -f docker-compose.prod.yml --env-file .env.production down --remove-orphans

# Пересобираем и запускаем контейнеры
Write-Host "🚀 Запускаем production контейнеры..." -ForegroundColor Blue
docker-compose -f docker-compose.prod.yml --env-file .env.production up --build -d

# Ждем запуска сервисов
Write-Host "⏳ Ждем запуска сервисов..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Проверяем статус
Write-Host "🔍 Проверяем статус сервисов..." -ForegroundColor Blue
$HealthCheck = try {
    Invoke-RestMethod -Uri "http://localhost:3001/health" -TimeoutSec 10
} catch {
    Write-Warning "Не удалось подключиться к API серверу. Проверьте логи: docker-compose -f docker-compose.prod.yml logs"
    $null
}

if ($HealthCheck -and $HealthCheck.status -eq "ok") {
    Write-Host "✅ API сервер работает корректно" -ForegroundColor Green
    Write-Host "✅ База данных: $($HealthCheck.database)" -ForegroundColor Green
} else {
    Write-Warning "❌ API сервер не отвечает или работает некорректно"
}

# Показываем итоговую информацию
Write-Host "`n🎉 Развертывание завершено!" -ForegroundColor Green
Write-Host "🌐 Веб-приложение: https://$Domain" -ForegroundColor Cyan
Write-Host "🔗 API: https://$Domain/api" -ForegroundColor Cyan
Write-Host "💚 Health Check: https://$Domain/health" -ForegroundColor Cyan

Write-Host "`n📋 Полезные команды:" -ForegroundColor Yellow
Write-Host "• Просмотр логов: docker-compose -f docker-compose.prod.yml logs -f" -ForegroundColor White
Write-Host "• Остановка: docker-compose -f docker-compose.prod.yml down" -ForegroundColor White
Write-Host "• Перезапуск: docker-compose -f docker-compose.prod.yml restart" -ForegroundColor White

Write-Host "`n⚠️ Важные напоминания:" -ForegroundColor Red
Write-Host "1. Замените самоподписанный SSL сертификат на реальный" -ForegroundColor White
Write-Host "2. Настройте резервное копирование базы данных" -ForegroundColor White
Write-Host "3. Настройте мониторинг системы" -ForegroundColor White
Write-Host "4. Обновите DNS записи для домена $Domain" -ForegroundColor White 