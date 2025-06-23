# Simplified Security Setup Script for WorkTime Tracker
Write-Host "🔒 Настройка безопасности WorkTime Tracker..." -ForegroundColor Green

# Создание директорий
Write-Host "📁 Создание директорий..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "secrets"
New-Item -ItemType Directory -Force -Path "nginx/ssl"  
New-Item -ItemType Directory -Force -Path "fail2ban"
New-Item -ItemType Directory -Force -Path "server/logs"
New-Item -ItemType Directory -Force -Path "nginx/html"
New-Item -ItemType Directory -Force -Path "nginx/conf.d"

# Генерация секретов
Write-Host "🔑 Генерация секретов..." -ForegroundColor Yellow

function New-SecurePassword {
    param([int]$Length = 64)
    $chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    $password = ""
    for($i = 0; $i -lt $Length; $i++) {
        $password += $chars[(Get-Random -Maximum $chars.Length)]
    }
    return $password
}

$dbPassword = New-SecurePassword -Length 32
$jwtSecret = New-SecurePassword -Length 64
$encryptionKey = New-SecurePassword -Length 32

# Сохранение секретов
Write-Host "💾 Сохранение секретов..." -ForegroundColor Yellow
$dbPassword | Out-File -FilePath "secrets/db_password.txt" -NoNewline
$jwtSecret | Out-File -FilePath "secrets/jwt_secret.txt" -NoNewline
$encryptionKey | Out-File -FilePath "secrets/encryption_key.txt" -NoNewline

# Создание SSL сертификатов
Write-Host "🔐 Проверка OpenSSL..." -ForegroundColor Yellow
try {
    $null = Get-Command openssl -ErrorAction Stop
    Write-Host "✅ OpenSSL найден, создание сертификатов..." -ForegroundColor Green
    & openssl req -x509 -newkey rsa:4096 -keyout "nginx/ssl/key.pem" -out "nginx/ssl/cert.pem" -days 365 -nodes -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
} catch {
    Write-Host "⚠️ OpenSSL не найден. Создайте SSL сертификаты вручную" -ForegroundColor Red
}

# Создание конфигурации Fail2Ban
Write-Host "🛡️ Создание конфигурации Fail2Ban..." -ForegroundColor Yellow
$fail2banText = "[DEFAULT]`nbantime = 3600`nfindtime = 600`nmaxretry = 5`n`n[nginx-http-auth]`nenabled = true`nfilter = nginx-http-auth`nlogpath = /var/log/nginx/access.log`nmaxretry = 3`nbantime = 7200"
$fail2banText | Out-File -FilePath "fail2ban/jail.local" -Encoding UTF8

# Создание proxy_params
Write-Host "🌐 Создание proxy_params..." -ForegroundColor Yellow
$proxyText = "proxy_set_header Host `$host;`nproxy_set_header X-Real-IP `$remote_addr;`nproxy_set_header X-Forwarded-For `$proxy_add_x_forwarded_for;`nproxy_set_header X-Forwarded-Proto `$scheme;`nproxy_connect_timeout 30s;"
$proxyText | Out-File -FilePath "nginx/proxy_params" -Encoding UTF8

# Создание PostgreSQL конфигурации
Write-Host "🗄️ Создание PostgreSQL конфигурации..." -ForegroundColor Yellow
$postgresText = "# PostgreSQL Security Configuration`nlisten_addresses = '*'`nport = 5432`nmax_connections = 100`nssl = on`npassword_encryption = scram-sha-256`nlog_connections = on"
$postgresText | Out-File -FilePath "postgres-prod.conf" -Encoding UTF8

# Создание HTML страниц ошибок
Write-Host "📄 Создание страниц ошибок..." -ForegroundColor Yellow
$error403Html = "<!DOCTYPE html><html><head><title>Access Denied</title></head><body><h1>403 - Access Denied</h1><p>Your request has been blocked for security reasons.</p></body></html>"
$error429Html = "<!DOCTYPE html><html><head><title>Rate Limited</title></head><body><h1>429 - Too Many Requests</h1><p>Please slow down and try again later.</p></body></html>"

$error403Html | Out-File -FilePath "nginx/html/403.html" -Encoding UTF8
$error429Html | Out-File -FilePath "nginx/html/429.html" -Encoding UTF8

# Создание production.env
Write-Host "⚙️ Создание production.env..." -ForegroundColor Yellow
if (Test-Path "production.env.example") {
    $envContent = Get-Content "production.env.example" -Raw
    $envContent = $envContent -replace "your_very_strong_database_password_here_min_32_chars", $dbPassword
    $envContent = $envContent -replace "your_super_secret_jwt_key_minimum_256_bits_length_production_only", $jwtSecret
    $envContent = $envContent -replace "your_256_bit_encryption_key_for_sensitive_data", $encryptionKey
    $envContent = $envContent -replace "yourdomain\.com", "localhost"
    $envContent | Out-File -FilePath "production.env" -Encoding UTF8
    Write-Host "✅ production.env создан" -ForegroundColor Green
} else {
    Write-Host "⚠️ production.env.example не найден" -ForegroundColor Red
}

Write-Host "`n✅ Настройка безопасности завершена!" -ForegroundColor Green
Write-Host "`n📋 Созданы файлы:" -ForegroundColor Cyan
Write-Host "   • secrets/ - секретные ключи и пароли" -ForegroundColor White
Write-Host "   • nginx/ssl/ - SSL сертификаты" -ForegroundColor White
Write-Host "   • nginx/html/ - страницы ошибок" -ForegroundColor White
Write-Host "   • fail2ban/jail.local - конфигурация Fail2Ban" -ForegroundColor White
Write-Host "   • production.env - продакшн переменные" -ForegroundColor White

Write-Host "`n⚠️ Важно:" -ForegroundColor Yellow
Write-Host "   • Измените домен в nginx/nginx.prod.conf" -ForegroundColor Red
Write-Host "   • Обновите IP адреса для админа" -ForegroundColor Red  
Write-Host "   • Для продакшена получите реальные SSL сертификаты" -ForegroundColor Red

Write-Host "`n🚀 Для запуска в продакшене:" -ForegroundColor Green
Write-Host "   docker-compose -f docker-compose.prod.yml up -d" -ForegroundColor White 