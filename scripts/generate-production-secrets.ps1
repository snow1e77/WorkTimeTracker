# Генератор безопасных секретов для продакшена
# Запускать: .\scripts\generate-production-secrets.ps1

param(
    [Parameter(Mandatory=$false)]
    [string]$Domain = "yourdomain.com"
)

Write-Host "🔐 Генерация безопасных секретов для продакшена" -ForegroundColor Green

# Функция для генерации случайной строки
function New-RandomString {
    param([int]$Length = 32)
    $chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*"
    $random = 1..$Length | ForEach-Object { Get-Random -Maximum $chars.Length }
    return -join ($random | ForEach-Object { $chars[$_] })
}

# Генерируем секреты
$dbPassword = New-RandomString -Length 24
$redisPassword = New-RandomString -Length 24
$jwtAccessSecret = New-RandomString -Length 64
$jwtRefreshSecret = New-RandomString -Length 64
$sessionSecret = New-RandomString -Length 32

Write-Host "✅ Секреты сгенерированы" -ForegroundColor Green

# Обновляем production.env
$productionEnv = @"
# Production Environment Variables для Docker Compose
# Сгенерировано: $(Get-Date)

# Database Configuration
DB_NAME=worktime_production
DB_USER=worktime_user
DB_PASSWORD=$dbPassword

# Redis Configuration
REDIS_PASSWORD=$redisPassword

# JWT Secrets
JWT_ACCESS_SECRET=$jwtAccessSecret
JWT_REFRESH_SECRET=$jwtRefreshSecret

# Twilio Configuration (замените на ваши данные)
TWILIO_ACCOUNT_SID=AC1ca01ae7f52d19196a0f443a7003c534
TWILIO_AUTH_TOKEN=f1d2b4e0817ab3895d09577798810078
TWILIO_PHONE_NUMBER=+19496666705

# CORS Origins
CORS_ORIGINS=https://$Domain,https://app.$Domain
"@

$productionEnv | Out-File -FilePath "production.env" -Encoding UTF8

# Обновляем server/.env
$serverEnv = @"
# Server Production Environment
# Сгенерировано: $(Get-Date)

NODE_ENV=production
PORT=3001

# Database Configuration
DATABASE_URL=postgresql://worktime_user:$dbPassword@postgres:5432/worktime_production
DB_HOST=postgres
DB_PORT=5432
DB_NAME=worktime_production
DB_USER=worktime_user
DB_PASSWORD=$dbPassword
DB_SSL=false

# Redis Configuration
REDIS_URL=redis://:$redisPassword@redis:6379
REDIS_PASSWORD=$redisPassword

# JWT Configuration
JWT_ACCESS_SECRET=$jwtAccessSecret
JWT_REFRESH_SECRET=$jwtRefreshSecret
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# Twilio Configuration
TWILIO_ACCOUNT_SID=AC1ca01ae7f52d19196a0f443a7003c534
TWILIO_AUTH_TOKEN=f1d2b4e0817ab3895d09577798810078
TWILIO_PHONE_NUMBER=+19496666705

# CORS Origins
CORS_ORIGINS=https://$Domain

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=warn
LOG_DIR=./logs

# Security
BCRYPT_ROUNDS=12
SESSION_SECRET=$sessionSecret

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads
"@

$serverEnv | Out-File -FilePath "server\.env" -Encoding UTF8

Write-Host "`n🎉 Файлы конфигурации обновлены!" -ForegroundColor Green
Write-Host "📁 Обновлены файлы:" -ForegroundColor Yellow
Write-Host "  • production.env" -ForegroundColor White
Write-Host "  • server\.env" -ForegroundColor White

Write-Host "`n🔐 Сгенерированные секреты:" -ForegroundColor Yellow
Write-Host "  • DB Password: $($dbPassword.Substring(0,8))..." -ForegroundColor White
Write-Host "  • Redis Password: $($redisPassword.Substring(0,8))..." -ForegroundColor White
Write-Host "  • JWT Access Secret: $($jwtAccessSecret.Substring(0,12))..." -ForegroundColor White
Write-Host "  • JWT Refresh Secret: $($jwtRefreshSecret.Substring(0,12))..." -ForegroundColor White

Write-Host "`n⚠️ ВАЖНО:" -ForegroundColor Red
Write-Host "1. Сохраните эти секреты в безопасном месте" -ForegroundColor White
Write-Host "2. НЕ делитесь ими ни с кем" -ForegroundColor White
Write-Host "3. НЕ загружайте файлы .env в Git" -ForegroundColor White
Write-Host "4. Обновите Twilio настройки на реальные данные" -ForegroundColor White
Write-Host "5. Замените домен $Domain на ваш реальный домен" -ForegroundColor White

Write-Host "`n🚀 Следующие шаги:" -ForegroundColor Cyan
Write-Host "1. Обновите домен: .\scripts\generate-production-secrets.ps1 -Domain 'yourdomain.com'" -ForegroundColor White
Write-Host "2. Создайте SSL сертификаты" -ForegroundColor White
Write-Host "3. Запустите: .\scripts\deploy-production.ps1" -ForegroundColor White 