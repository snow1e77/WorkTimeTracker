# Setup Security Script for WorkTime Tracker
# Этот скрипт настраивает все компоненты безопасности

Write-Host "🔒 Настройка безопасности WorkTime Tracker..." -ForegroundColor Green

# Создание директорий для секретов
Write-Host "📁 Создание директорий..." -ForegroundColor Yellow
$secretsDir = "secrets"
$nginxSslDir = "nginx/ssl"
$fail2banDir = "fail2ban"

New-Item -ItemType Directory -Force -Path $secretsDir
New-Item -ItemType Directory -Force -Path $nginxSslDir  
New-Item -ItemType Directory -Force -Path $fail2banDir
New-Item -ItemType Directory -Force -Path "server/logs"

# Генерация сильных секретов
Write-Host "🔑 Генерация секретов..." -ForegroundColor Yellow

function New-SecurePassword {
    param([int]$Length = 64)
    $chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?'
    $password = ""
    for($i = 0; $i -lt $Length; $i++) {
        $password += $chars[(Get-Random -Maximum $chars.Length)]
    }
    return $password
}

# Генерируем секреты
$dbPassword = New-SecurePassword -Length 32
$jwtSecret = New-SecurePassword -Length 64
$encryptionKey = New-SecurePassword -Length 32

# Сохраняем секреты в файлы
Write-Host "💾 Сохранение секретов..." -ForegroundColor Yellow
$dbPassword | Out-File -FilePath "$secretsDir/db_password.txt" -NoNewline
$jwtSecret | Out-File -FilePath "$secretsDir/jwt_secret.txt" -NoNewline
$encryptionKey | Out-File -FilePath "$secretsDir/encryption_key.txt" -NoNewline

# Создание SSL сертификатов (самоподписанные для разработки)
Write-Host "🔐 Создание SSL сертификатов..." -ForegroundColor Yellow

if (Get-Command openssl -ErrorAction SilentlyContinue) {
    # Создаем самоподписанный сертификат
    openssl req -x509 -newkey rsa:4096 -keyout "$nginxSslDir/key.pem" -out "$nginxSslDir/cert.pem" -days 365 -nodes -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
    Write-Host "✅ SSL сертификаты созданы" -ForegroundColor Green
} else {
    Write-Host "⚠️ OpenSSL не найден. Создайте SSL сертификаты вручную" -ForegroundColor Red
    Write-Host "Поместите cert.pem и key.pem в папку nginx/ssl/" -ForegroundColor Red
}

# Создание конфигурации Fail2Ban
Write-Host "🛡️ Настройка Fail2Ban..." -ForegroundColor Yellow

$fail2banConfig = @'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
logpath = /var/log/nginx/access.log
maxretry = 3
bantime = 7200

[nginx-limit-req]
enabled = true  
filter = nginx-limit-req
logpath = /var/log/nginx/error.log
maxretry = 5
bantime = 3600
'@

$fail2banConfig | Out-File -FilePath "$fail2banDir/jail.local" -Encoding UTF8

# Создание production.env из шаблона
Write-Host "⚙️ Создание production.env..." -ForegroundColor Yellow

if (Test-Path "production.env.example") {
    $envContent = Get-Content "production.env.example" | ForEach-Object {
        $_ -replace "your_very_strong_database_password_here_min_32_chars", $dbPassword `
           -replace "your_super_secret_jwt_key_minimum_256_bits_length_production_only", $jwtSecret `
           -replace "your_256_bit_encryption_key_for_sensitive_data", $encryptionKey `
           -replace "yourdomain.com", "localhost"
    }
    $envContent | Out-File -FilePath "production.env" -Encoding UTF8
    Write-Host "✅ production.env создан" -ForegroundColor Green
}

# Создание proxy_params для Nginx
Write-Host "🌐 Создание proxy_params..." -ForegroundColor Yellow
$proxyParams = @'
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Request-ID $request_id;
proxy_connect_timeout 30s;
proxy_send_timeout 30s;
proxy_read_timeout 30s;
proxy_buffer_size 4k;
proxy_buffers 8 4k;
proxy_busy_buffers_size 8k;
'@

New-Item -ItemType Directory -Force -Path "nginx/conf.d"
$proxyParams | Out-File -FilePath "nginx/proxy_params" -Encoding UTF8

# Создание PostgreSQL конфигурации для безопасности
Write-Host "🗄️ Создание PostgreSQL конфигурации..." -ForegroundColor Yellow
$postgresConfig = @'
# PostgreSQL Production Security Configuration
listen_addresses = '*'
port = 5432
max_connections = 100
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200

# Security settings
ssl = on
ssl_ciphers = 'HIGH:MEDIUM:+3DES:!aNULL'
ssl_prefer_server_ciphers = on
password_encryption = scram-sha-256
log_connections = on
log_disconnections = on
log_checkpoints = on
log_lock_waits = on
log_temp_files = 0
'@

$postgresConfig | Out-File -FilePath "postgres-prod.conf" -Encoding UTF8

# Создание HTML страниц ошибок
Write-Host "📄 Создание страниц ошибок..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "nginx/html"

$error403 = @'
<!DOCTYPE html>
<html>
<head>
    <title>Access Denied</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; margin-top: 100px; }
        .error { color: #d32f2f; font-size: 24px; }
    </style>
</head>
<body>
    <div class="error">403 - Access Denied</div>
    <p>Your request has been blocked for security reasons.</p>
</body>
</html>
'@

$error429 = @'
<!DOCTYPE html>
<html>
<head>
    <title>Rate Limited</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; margin-top: 100px; }
        .error { color: #ff9800; font-size: 24px; }
    </style>
</head>
<body>
    <div class="error">429 - Too Many Requests</div>
    <p>Please slow down and try again later.</p>
</body>
</html>
'@

$error403 | Out-File -FilePath "nginx/html/403.html" -Encoding UTF8
$error429 | Out-File -FilePath "nginx/html/429.html" -Encoding UTF8

# Установка правильных прав доступа (только для Unix-систем)
if ($IsLinux -or $IsMacOS) {
    Write-Host "🔒 Установка прав доступа..." -ForegroundColor Yellow
    chmod 600 secrets/*
    chmod 600 nginx/ssl/*
    chmod 755 scripts/*.ps1
}

Write-Host "`n✅ Настройка безопасности завершена!" -ForegroundColor Green
Write-Host "`n📋 Что сделано:" -ForegroundColor Cyan
Write-Host "   • Созданы сильные пароли и секреты" -ForegroundColor White
Write-Host "   • Настроены SSL сертификаты" -ForegroundColor White
Write-Host "   • Конфигурирован Fail2Ban" -ForegroundColor White
Write-Host "   • Создан production.env файл" -ForegroundColor White
Write-Host "   • Настроены конфигурации Nginx и PostgreSQL" -ForegroundColor White
Write-Host "   • Созданы страницы ошибок" -ForegroundColor White

Write-Host "`n⚠️ Важные напоминания:" -ForegroundColor Yellow
Write-Host "   • Измените домен в nginx/nginx.prod.conf" -ForegroundColor Red
Write-Host "   • Обновите IP адреса в production.env" -ForegroundColor Red  
Write-Host "   • Настройте реальные SSL сертификаты для продакшена" -ForegroundColor Red
Write-Host "   • Измените пароли в production.env перед деплоем" -ForegroundColor Red

Write-Host "`n🚀 Для запуска:" -ForegroundColor Green
Write-Host "   docker-compose -f docker-compose.prod.yml up -d" -ForegroundColor White 