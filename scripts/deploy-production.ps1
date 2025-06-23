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
$EnvFile = "production.env"
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

# Проверяем наличие Node.js и npm
if (!(Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error "Node.js не установлен. Установите Node.js и попробуйте снова."
    exit 1
}

if (!(Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Error "npm не установлен. Установите npm и попробуйте снова."
    exit 1
}

# Устанавливаем зависимости
Write-Host "📦 Устанавливаем зависимости..." -ForegroundColor Blue
try {
    npm install
    Write-Host "✅ Зависимости установлены" -ForegroundColor Green
} catch {
    Write-Error "Ошибка при установке зависимостей: $_"
    exit 1
}

# Сборка веб-версии
Write-Host "🏗️ Собираем веб-версию приложения..." -ForegroundColor Blue
try {
    # Удаляем старую сборку
    if (Test-Path "dist") {
        Remove-Item -Recurse -Force "dist"
        Write-Host "🗑️ Старая сборка удалена" -ForegroundColor Yellow
    }
    
    # Запускаем сборку
    npm run build:web
    
    # Проверяем результат сборки
    if (!(Test-Path "dist")) {
        Write-Error "Сборка веб-версии не удалась. Директория 'dist' не создана. Проверьте логи выше."
        exit 1
    }
    
    if (!(Test-Path "dist/index.html")) {
        Write-Error "Сборка веб-версии не удалась. Файл index.html не найден в директории 'dist'."
        exit 1
    }
    
    Write-Host "✅ Веб-версия собрана успешно" -ForegroundColor Green
} catch {
    Write-Error "Ошибка при сборке веб-версии: $_"
    exit 1
}

# Сборка серверной части
Write-Host "🏗️ Собираем серверную часть..." -ForegroundColor Blue
try {
    Push-Location server
    
    # Устанавливаем зависимости сервера (включая dev для сборки)
    npm ci
    
    # Собираем TypeScript
    npm run build
    
    # Проверяем результат сборки
    if (!(Test-Path "dist/index.js")) {
        Write-Error "Сборка сервера не удалась. Файл dist/index.js не найден."
        Pop-Location
        exit 1
    }
    
    Pop-Location
    Write-Host "✅ Серверная часть собрана успешно" -ForegroundColor Green
} catch {
    Pop-Location
    Write-Error "Ошибка при сборке серверной части: $_"
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

# Проверяем наличие необходимых файлов
Write-Host "🔍 Проверяем конфигурационные файлы..." -ForegroundColor Blue

if (!(Test-Path "docker-compose.prod.yml")) {
    Write-Error "Файл docker-compose.prod.yml не найден!"
    exit 1
}

if (!(Test-Path "$EnvFile")) {
    Write-Error "Файл $EnvFile не найден!"
    exit 1
}

if (!(Test-Path "server/dist/index.js")) {
    Write-Warning "Серверная часть не собрана. Соберем сейчас..."
    Push-Location server
    npm run build
    Pop-Location
}

if (!(Test-Path "dist/index.html")) {
    Write-Warning "Веб-версия не собрана. Соберем сейчас..."
    npm run build:web
}

# Останавливаем существующие контейнеры
Write-Host "🛑 Останавливаем существующие контейнеры..." -ForegroundColor Blue
docker-compose -f docker-compose.prod.yml --env-file $EnvFile down --remove-orphans

# Пересобираем и запускаем контейнеры
Write-Host "🚀 Запускаем production контейнеры..." -ForegroundColor Blue
docker-compose -f docker-compose.prod.yml --env-file $EnvFile up --build -d

# Ждем запуска сервисов
Write-Host "⏳ Ждем запуска сервисов..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Проверяем статус контейнеров
Write-Host "🔍 Проверяем статус контейнеров..." -ForegroundColor Blue
$ContainerStatus = docker-compose -f docker-compose.prod.yml ps --format "table"
Write-Host $ContainerStatus -ForegroundColor Gray

# Проверяем работу API
Write-Host "🔍 Проверяем работу API сервера..." -ForegroundColor Blue
$ApiUrl = if ($SkipSSL) { "http://localhost/api/health" } else { "https://localhost/api/health" }

$HealthCheck = $null
for ($i = 1; $i -le 5; $i++) {
    try {
        Write-Host "Попытка $i из 5..." -ForegroundColor Yellow
        $HealthCheck = Invoke-RestMethod -Uri $ApiUrl -TimeoutSec 10 -SkipCertificateCheck
        if ($HealthCheck) { break }
    } catch {
        Write-Host "Попытка $i неудачна: $($_.Exception.Message)" -ForegroundColor Yellow
        if ($i -lt 5) { Start-Sleep -Seconds 10 }
    }
}

if ($HealthCheck -and $HealthCheck.status -eq "ok") {
    Write-Host "✅ API сервер работает корректно" -ForegroundColor Green
    if ($HealthCheck.database) {
        Write-Host "✅ База данных: $($HealthCheck.database)" -ForegroundColor Green
    }
} else {
    Write-Warning "❌ API сервер не отвечает или работает некорректно"
    Write-Host "📋 Проверьте логи: docker-compose -f docker-compose.prod.yml logs worktime-server-prod" -ForegroundColor Yellow
}

# Показываем итоговую информацию
Write-Host "`n🎉 Развертывание завершено!" -ForegroundColor Green

$Protocol = if ($SkipSSL) { "http" } else { "https" }
$HostName = if ($Domain -eq "yourdomain.com") { "localhost" } else { $Domain }

Write-Host "🌐 Веб-приложение: $Protocol`://$HostName" -ForegroundColor Cyan
Write-Host "🔗 API: $Protocol`://$HostName/api" -ForegroundColor Cyan
Write-Host "💚 Health Check: $Protocol`://$HostName/api/health" -ForegroundColor Cyan

Write-Host "`n📋 Полезные команды:" -ForegroundColor Yellow
Write-Host "• Просмотр логов: docker-compose -f docker-compose.prod.yml logs -f" -ForegroundColor White
Write-Host "• Остановка: docker-compose -f docker-compose.prod.yml down" -ForegroundColor White
Write-Host "• Перезапуск: docker-compose -f docker-compose.prod.yml restart" -ForegroundColor White

Write-Host "`n⚠️ Важные напоминания:" -ForegroundColor Red
Write-Host "1. Замените самоподписанный SSL сертификат на реальный" -ForegroundColor White
Write-Host "2. Настройте резервное копирование базы данных" -ForegroundColor White
Write-Host "3. Настройте мониторинг системы" -ForegroundColor White
Write-Host "4. Обновите DNS записи для домена $Domain" -ForegroundColor White 