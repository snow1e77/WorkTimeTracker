# Реальные SSL сертификаты для WorkTime Tracker
# Автоматическая настройка Let's Encrypt с Certbot

param(
    [Parameter(Mandatory=$true)]
    [string]$Domain,
    [string]$Email = "",
    [switch]$Staging = $false,
    [switch]$Production = $false,
    [switch]$UpdateOnly = $false,
    [switch]$InstallCertbot = $false
)

Write-Host "🔐 Настройка реальных SSL сертификатов для WorkTime Tracker" -ForegroundColor Green
Write-Host "Домен: $Domain" -ForegroundColor Cyan
Write-Host "Режим: $(if ($Staging) { 'Staging' } elseif ($Production) { 'Production' } else { 'Test' })" -ForegroundColor Cyan

# Проверка домена
if ($Domain -eq "localhost" -or $Domain -like "*.local") {
    Write-Host "❌ Для реальных SSL сертификатов нужен публичный домен!" -ForegroundColor Red
    Write-Host "Пример: yourdomain.com или app.yourdomain.com" -ForegroundColor Yellow
    exit 1
}

# Проверка email для Let's Encrypt
if (-not $Email) {
    $Email = Read-Host "Введите email для Let's Encrypt уведомлений"
    if (-not $Email) {
        Write-Host "❌ Email обязателен для Let's Encrypt" -ForegroundColor Red
        exit 1
    }
}

# Директории
$nginxDir = "nginx"
$sslDir = "$nginxDir/ssl"
$certbotDir = "certbot"

# Создание директорий
New-Item -ItemType Directory -Force -Path $sslDir | Out-Null
New-Item -ItemType Directory -Force -Path $certbotDir | Out-Null
New-Item -ItemType Directory -Force -Path "$certbotDir/conf" | Out-Null
New-Item -ItemType Directory -Force -Path "$certbotDir/www" | Out-Null

# Функция установки Certbot через Docker
function Install-CertbotDocker {
    Write-Host "📦 Настройка Certbot через Docker..." -ForegroundColor Yellow
    
    # Создание docker-compose файла для Certbot
    $certbotCompose = @"
version: '3.8'

services:
  certbot:
    image: certbot/certbot:latest
    container_name: worktime-certbot
    volumes:
      - ./certbot/conf:/etc/letsencrypt:rw
      - ./certbot/www:/var/www/certbot:rw
      - ./certbot/logs:/var/log/letsencrypt:rw
    command: certonly --webroot --webroot-path=/var/www/certbot --email $Email --agree-tos --no-eff-email $(if ($Staging) { '--staging' } else { '' }) -d $Domain
    
  nginx-certbot:
    image: nginx:alpine
    container_name: worktime-nginx-certbot
    ports:
      - "80:80"
    volumes:
      - ./certbot/www:/var/www/certbot:ro
      - ./nginx/nginx-certbot.conf:/etc/nginx/nginx.conf:ro
    restart: unless-stopped
"@

    $certbotCompose | Out-File -FilePath "docker-compose.certbot.yml" -Encoding UTF8
    
    # Создание временной nginx конфигурации для ACME challenge
    $nginxCertbotConfig = @"
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    server {
        listen 80;
        server_name $Domain;
        
        # ACME challenge для Let's Encrypt
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }
        
        # Редирект остальных запросов на HTTPS (после получения сертификата)
        location / {
            return 301 https://`$server_name`$request_uri;
        }
    }
}
"@

    $nginxCertbotConfig | Out-File -FilePath "$nginxDir/nginx-certbot.conf" -Encoding UTF8
    
    Write-Host "✅ Certbot Docker настроен" -ForegroundColor Green
}

# Функция получения сертификата
function Get-LetsEncryptCertificate {
    Write-Host "🌐 Получение Let's Encrypt сертификата..." -ForegroundColor Yellow
    
    # Запуск временного nginx для ACME challenge
    Write-Host "🔄 Запуск временного nginx для проверки домена..." -ForegroundColor Cyan
    docker-compose -f docker-compose.certbot.yml up -d nginx-certbot
    
    Start-Sleep -Seconds 5
    
    # Получение сертификата
    Write-Host "📜 Запуск Certbot для получения сертификата..." -ForegroundColor Cyan
    $certbotCommand = "certonly --webroot --webroot-path=/var/www/certbot --email $Email --agree-tos --no-eff-email"
    
    if ($Staging) {
        $certbotCommand += " --staging"
    }
    
    $certbotCommand += " -d $Domain"
    
    docker run --rm -v "${PWD}/certbot/conf:/etc/letsencrypt" -v "${PWD}/certbot/www:/var/www/certbot" -v "${PWD}/certbot/logs:/var/log/letsencrypt" certbot/certbot $certbotCommand
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Сертификат успешно получен!" -ForegroundColor Green
        
        # Копирование сертификатов в nginx/ssl
        $certPath = "certbot/conf/live/$Domain"
        if (Test-Path $certPath) {
            Copy-Item "$certPath/fullchain.pem" "$sslDir/cert.pem" -Force
            Copy-Item "$certPath/privkey.pem" "$sslDir/key.pem" -Force
            Write-Host "📋 Сертификаты скопированы в $sslDir" -ForegroundColor Green
        }
        
        # Остановка временного nginx
        docker-compose -f docker-compose.certbot.yml down
        
        return $true
    } else {
        Write-Host "❌ Ошибка при получении сертификата" -ForegroundColor Red
        docker-compose -f docker-compose.certbot.yml logs certbot
        docker-compose -f docker-compose.certbot.yml down
        return $false
    }
}

# Функция создания DH параметров
function New-DHParams {
    if (-not (Test-Path "$sslDir/dhparam.pem")) {
        Write-Host "🔐 Создание DH параметров (это может занять несколько минут)..." -ForegroundColor Yellow
        docker run --rm -v "${PWD}/${sslDir}:/ssl" alpine/openssl dhparam -out /ssl/dhparam.pem 2048
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ DH параметры созданы" -ForegroundColor Green
        } else {
            Write-Host "❌ Ошибка создания DH параметров" -ForegroundColor Red
        }
    } else {
        Write-Host "✅ DH параметры уже существуют" -ForegroundColor Green
    }
}

# Функция обновления nginx конфигурации для SSL
function Update-NginxSSLConfig {
    Write-Host "⚙️ Обновление nginx конфигурации для SSL..." -ForegroundColor Yellow
    
    # Обновление основной конфигурации
    $nginxConfig = Get-Content "$nginxDir/nginx.conf" -Raw
    $nginxConfig = $nginxConfig -replace "server_name localhost;", "server_name $Domain;"
    $nginxConfig = $nginxConfig -replace "server_name _;", "server_name $Domain;"
    $nginxConfig | Out-File -FilePath "$nginxDir/nginx.conf" -Encoding UTF8
    
    Write-Host "✅ Nginx конфигурация обновлена для домена: $Domain" -ForegroundColor Green
}

# Функция создания обновленного docker-compose
function Update-DockerComposeSSL {
    Write-Host "📦 Обновление docker-compose для SSL..." -ForegroundColor Yellow
    
    $dockerSSLOverride = @"
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    container_name: worktime-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl.conf:/etc/nginx/conf.d/ssl.conf:ro
      - ./src:/usr/share/nginx/html:ro
      - ./certbot/www:/var/www/certbot:ro
    networks:
      - worktime-network
    restart: unless-stopped
    depends_on:
      - server

  # Сервис для автоматического обновления сертификатов
  certbot-renew:
    image: certbot/certbot:latest
    container_name: worktime-certbot-renew
    volumes:
      - ./certbot/conf:/etc/letsencrypt:rw
      - ./certbot/www:/var/www/certbot:rw
      - ./certbot/logs:/var/log/letsencrypt:rw
    command: sh -c "trap exit TERM; while :; do certbot renew --webroot --webroot-path=/var/www/certbot; sleep 12h & wait \$$!; done;"
    restart: unless-stopped

networks:
  worktime-network:
    driver: bridge
"@

    $dockerSSLOverride | Out-File -FilePath "docker-compose.ssl-real.yml" -Encoding UTF8
    Write-Host "✅ Создан docker-compose.ssl-real.yml" -ForegroundColor Green
}

# Функция создания скрипта обновления сертификатов
function New-RenewalScript {
    $renewalScript = @"
# Скрипт автоматического обновления SSL сертификатов
# Запускайте этот скрипт каждые 12 часов через планировщик задач

Write-Host "🔄 Проверка и обновление SSL сертификатов..." -ForegroundColor Yellow

# Попытка обновления сертификата
docker-compose -f docker-compose.ssl-real.yml exec certbot-renew certbot renew --webroot --webroot-path=/var/www/certbot

if (`$LASTEXITCODE -eq 0) {
    Write-Host "✅ Сертификаты проверены/обновлены" -ForegroundColor Green
    
    # Копирование обновленных сертификатов
    `$certPath = "certbot/conf/live/$Domain"
    if (Test-Path `$certPath) {
        Copy-Item "`$certPath/fullchain.pem" "nginx/ssl/cert.pem" -Force
        Copy-Item "`$certPath/privkey.pem" "nginx/ssl/key.pem" -Force
        
        # Перезагрузка nginx
        docker-compose -f docker-compose.ssl-real.yml restart nginx
        Write-Host "🔄 Nginx перезапущен с новыми сертификатами" -ForegroundColor Green
    fi
} else {
    Write-Host "❌ Ошибка при обновлении сертификатов" -ForegroundColor Red
}
"@

    $renewalScript | Out-File -FilePath "scripts/renew-ssl.ps1" -Encoding UTF8
    Write-Host "✅ Создан скрипт обновления scripts/renew-ssl.ps1" -ForegroundColor Green
}

# Основная логика
try {
    # Проверка Docker
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        Write-Host "❌ Docker не найден. Установите Docker Desktop" -ForegroundColor Red
        exit 1
    }

    if ($UpdateOnly) {
        Write-Host "🔄 Режим обновления сертификатов..." -ForegroundColor Cyan
        
        if (Test-Path "certbot/conf/live/$Domain") {
            # Обновление существующего сертификата
            docker run --rm -v "${PWD}/certbot/conf:/etc/letsencrypt" -v "${PWD}/certbot/www:/var/www/certbot" certbot/certbot renew --webroot --webroot-path=/var/www/certbot
            
            if ($LASTEXITCODE -eq 0) {
                # Копирование обновленных сертификатов
                Copy-Item "certbot/conf/live/$Domain/fullchain.pem" "$sslDir/cert.pem" -Force
                Copy-Item "certbot/conf/live/$Domain/privkey.pem" "$sslDir/key.pem" -Force
                Write-Host "✅ Сертификаты обновлены" -ForegroundColor Green
            }
        } else {
            Write-Host "❌ Сертификаты для домена $Domain не найдены" -ForegroundColor Red
        }
    } else {
        # Полная настройка SSL
        Install-CertbotDocker
        
        if (Get-LetsEncryptCertificate) {
            New-DHParams
            Update-NginxSSLConfig
            Update-DockerComposeSSL
            New-RenewalScript
            
            Write-Host "`n🎉 Реальные SSL сертификаты успешно настроены!" -ForegroundColor Green
            Write-Host "`n📋 Следующие шаги:" -ForegroundColor Cyan
            Write-Host "1. Запустите приложение с SSL:" -ForegroundColor White
            Write-Host "   docker-compose -f docker-compose.yml -f docker-compose.ssl-real.yml up -d" -ForegroundColor Gray
            Write-Host "`n2. Откройте https://$Domain в браузере" -ForegroundColor White
            Write-Host "`n3. Настройте автоматическое обновление сертификатов:" -ForegroundColor White
            Write-Host "   Добавьте в планировщик задач Windows запуск scripts/renew-ssl.ps1" -ForegroundColor Gray
            
            if ($Staging) {
                Write-Host "`n⚠️ Вы использовали staging режим. Для продакшн запустите:" -ForegroundColor Yellow
                Write-Host ".\scripts\setup-real-ssl.ps1 -Domain $Domain -Email $Email -Production" -ForegroundColor Gray
            }
        }
    }
    
} catch {
    Write-Host "❌ Ошибка: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} 