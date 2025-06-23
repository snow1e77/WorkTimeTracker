# SSL Configuration Script for WorkTime Tracker
# Скрипт настройки SSL сертификатов

param(
    [string]$Domain = "localhost",
    [switch]$Production = $false,
    [switch]$SelfSigned = $false,
    [switch]$LetsEncrypt = $false
)

Write-Host "🔐 Настройка SSL сертификатов для WorkTime Tracker" -ForegroundColor Green
Write-Host "Домен: $Domain" -ForegroundColor Cyan

# Создание необходимых директорий
$sslDir = "nginx/ssl"
$nginxDir = "nginx"

New-Item -ItemType Directory -Force -Path $sslDir | Out-Null
New-Item -ItemType Directory -Force -Path "$nginxDir/conf.d" | Out-Null

# Функция проверки OpenSSL
function Test-OpenSSL {
    try {
        $null = Get-Command openssl -ErrorAction Stop
        return $true
    }
    catch {
        return $false
    }
}

# Функция создания самоподписанного сертификата
function New-SelfSignedCertificate {
    param([string]$Domain)
    
    Write-Host "📝 Создание самоподписанного SSL сертификата..." -ForegroundColor Yellow
    
    if (-not (Test-OpenSSL)) {
        Write-Host "❌ OpenSSL не найден. Устанавливаем..." -ForegroundColor Red
        
        # Попытка установки OpenSSL через Chocolatey
        if (Get-Command choco -ErrorAction SilentlyContinue) {
            Write-Host "Installing OpenSSL via Chocolatey..." -ForegroundColor Yellow
            choco install openssl -y
        } else {
            Write-Host "❌ Не удалось найти OpenSSL или Chocolatey" -ForegroundColor Red
            Write-Host "Пожалуйста, установите OpenSSL вручную:" -ForegroundColor Yellow
            Write-Host "1. Скачайте с https://slproweb.com/products/Win32OpenSSL.html" -ForegroundColor White
            Write-Host "2. Или установите Chocolatey: choco install openssl" -ForegroundColor White
            return $false
        }
    }
    
    # Создание приватного ключа
    $keyPath = "$sslDir/key.pem"
    $certPath = "$sslDir/cert.pem"
    $csrPath = "$sslDir/cert.csr"
    $configPath = "$sslDir/openssl.conf"
    
    # Создание конфигурационного файла OpenSSL
    $opensslConfig = @"
[req]
default_bits = 4096
prompt = no
default_md = sha256
distinguished_name = dn
req_extensions = v3_req

[dn]
C=RU
ST=Moscow
L=Moscow
O=WorkTimeTracker
OU=IT Department
CN=$Domain

[v3_req]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
subjectAltName = @alt_names

[alt_names]
DNS.1 = $Domain
DNS.2 = www.$Domain
DNS.3 = localhost
DNS.4 = 127.0.0.1
IP.1 = 127.0.0.1
IP.2 = ::1
"@
    
    $opensslConfig | Out-File -FilePath $configPath -Encoding UTF8
    
    try {
        # Генерация приватного ключа и сертификата
        & openssl req -new -x509 -nodes -days 365 -keyout $keyPath -out $certPath -config $configPath
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Самоподписанный сертификат успешно создан" -ForegroundColor Green
            Write-Host "   Ключ: $keyPath" -ForegroundColor Cyan
            Write-Host "   Сертификат: $certPath" -ForegroundColor Cyan
            
            # Показ информации о сертификате
            Write-Host "`n📋 Информация о сертификате:" -ForegroundColor Cyan
            & openssl x509 -in $certPath -text -noout | Select-String "Subject:|Issuer:|Not Before:|Not After:|DNS:|IP Address:"
            
            return $true
        } else {
            Write-Host "❌ Ошибка при создании сертификата" -ForegroundColor Red
            return $false
        }
    }
    catch {
        Write-Host "❌ Ошибка: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Функция создания Let's Encrypt сертификата (заглушка)
function New-LetsEncryptCertificate {
    param([string]$Domain)
    
    Write-Host "🌐 Настройка Let's Encrypt сертификата..." -ForegroundColor Yellow
    Write-Host "⚠️ Эта функция требует настройки на сервере с публичным IP" -ForegroundColor Yellow
    
    # Создание временного самоподписанного сертификата
    Write-Host "📝 Создание временного сертификата до настройки Let's Encrypt..." -ForegroundColor Cyan
    New-SelfSignedCertificate -Domain $Domain
    
    # Инструкции для Let's Encrypt
    $letsEncryptInstructions = @"
Let's Encrypt Setup Instructions:

1. Install Certbot:
   Ubuntu/Debian: sudo apt install certbot python3-certbot-nginx
   CentOS/RHEL: sudo yum install certbot python3-certbot-nginx

2. Get certificate:
   sudo certbot --nginx -d $Domain -d www.$Domain

3. Setup auto-renewal:
   sudo crontab -e
   Add line: 0 12 * * * /usr/bin/certbot renew --quiet

4. Update Docker Compose:
   Add volume for Let's Encrypt certificates:
   - /etc/letsencrypt:/etc/letsencrypt:ro

5. Change paths in nginx.conf:
   ssl_certificate /etc/letsencrypt/live/$Domain/fullchain.pem;
   ssl_certificate_key /etc/letsencrypt/live/$Domain/privkey.pem;
"@
    
    Write-Host $letsEncryptInstructions -ForegroundColor Cyan
    
    # Сохранение инструкций в файл
    $letsEncryptInstructions | Out-File -FilePath "nginx/ssl/lets-encrypt-instructions.txt" -Encoding UTF8
    
    return $true
}

# Функция обновления Nginx конфигурации
function Update-NginxConfig {
    param([string]$Domain)
    
    Write-Host "⚙️ Обновление конфигурации Nginx..." -ForegroundColor Yellow
    
    # Обновление nginx.conf
    $nginxConfig = Get-Content "nginx/nginx.conf" -Raw
    $nginxConfig = $nginxConfig -replace "your-domain\.com", $Domain
    $nginxConfig | Out-File -FilePath "nginx/nginx.conf" -Encoding UTF8
    
    # Обновление nginx.prod.conf
    if (Test-Path "nginx/nginx.prod.conf") {
        $nginxProdConfig = Get-Content "nginx/nginx.prod.conf" -Raw
        $nginxProdConfig = $nginxProdConfig -replace "yourdomain\.com", $Domain
        $nginxProdConfig | Out-File -FilePath "nginx/nginx.prod.conf" -Encoding UTF8
    }
    
    Write-Host "✅ Nginx конфигурация обновлена для домена: $Domain" -ForegroundColor Green
}

# Функция создания Docker Compose override
function New-SSLDockerOverride {
    $dockerOverride = @"
version: '3.8'

services:
  nginx:
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    environment:
      - DOMAIN=$Domain
"@
    
    $dockerOverride | Out-File -FilePath "docker-compose.ssl.yml" -Encoding UTF8
    Write-Host "📦 Создан docker-compose.ssl.yml override файл" -ForegroundColor Green
}

# Функция проверки SSL конфигурации
function Test-SSLConfig {
    Write-Host "🔍 Проверка SSL конфигурации..." -ForegroundColor Yellow
    
    $keyPath = "$sslDir/key.pem"
    $certPath = "$sslDir/cert.pem"
    
    if (Test-Path $keyPath -and Test-Path $certPath) {
        Write-Host "✅ SSL файлы найдены" -ForegroundColor Green
        
        if (Test-OpenSSL) {
            # Проверка целостности ключа и сертификата
            try {
                $keyCheck = & openssl rsa -in $keyPath -check -noout 2>&1
                $certCheck = & openssl x509 -in $certPath -text -noout 2>&1
                
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "✅ SSL ключ и сертификат валидны" -ForegroundColor Green
                    
                    # Проверка соответствия ключа и сертификата
                    $keyMd5 = & openssl rsa -noout -modulus -in $keyPath | openssl md5
                    $certMd5 = & openssl x509 -noout -modulus -in $certPath | openssl md5
                    
                    if ($keyMd5 -eq $certMd5) {
                        Write-Host "✅ Ключ и сертификат соответствуют друг другу" -ForegroundColor Green
                    } else {
                        Write-Host "❌ Ключ и сертификат не соответствуют" -ForegroundColor Red
                    }
                } else {
                    Write-Host "❌ Ошибка валидации SSL файлов" -ForegroundColor Red
                }
            }
            catch {
                Write-Host "❌ Ошибка при проверке SSL: $($_.Exception.Message)" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "❌ SSL файлы не найдены" -ForegroundColor Red
    }
}

# Основная логика
Write-Host "`n🔧 Выберите тип SSL сертификата:" -ForegroundColor Cyan

if ($LetsEncrypt) {
    $success = New-LetsEncryptCertificate -Domain $Domain
} elseif ($SelfSigned -or -not $Production) {
    $success = New-SelfSignedCertificate -Domain $Domain
} else {
    # Интерактивный выбор
    Write-Host "1. Самоподписанный сертификат (для разработки)" -ForegroundColor White
    Write-Host "2. Let's Encrypt (для продакшн)" -ForegroundColor White
    
    $choice = Read-Host "Введите номер (1-2)"
    
    switch ($choice) {
        "1" { $success = New-SelfSignedCertificate -Domain $Domain }
        "2" { $success = New-LetsEncryptCertificate -Domain $Domain }
        default { 
            Write-Host "❌ Неверный выбор" -ForegroundColor Red
            exit 1
        }
    }
}

if ($success) {
    # Обновление конфигураций
    Update-NginxConfig -Domain $Domain
    New-SSLDockerOverride
    Test-SSLConfig
    
    Write-Host "`n✅ SSL сертификаты успешно настроены!" -ForegroundColor Green
    Write-Host "`n📋 Следующие шаги:" -ForegroundColor Cyan
    Write-Host "1. Запустите приложение: docker-compose -f docker-compose.yml -f docker-compose.ssl.yml up -d" -ForegroundColor White
    Write-Host "2. Откройте браузер: https://$Domain" -ForegroundColor White
    Write-Host "3. Для самоподписанного сертификата подтвердите исключение безопасности" -ForegroundColor White
    
    if ($Domain -eq "localhost") {
        Write-Host "`n💡 Совет: Добавьте домен в hosts файл для тестирования:" -ForegroundColor Yellow
        Write-Host "   C:\Windows\System32\drivers\etc\hosts" -ForegroundColor White
        Write-Host "   127.0.0.1 $Domain" -ForegroundColor White
    }
} else {
    Write-Host "`n❌ Не удалось настроить SSL сертификаты" -ForegroundColor Red
    exit 1
} 