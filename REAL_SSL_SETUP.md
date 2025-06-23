# 🔐 Настройка реальных SSL сертификатов с Let's Encrypt

## 📋 Предварительные требования

### 1. Публичный домен
- Зарегистрированный домен (например, `yourdomain.com`)
- DNS записи указывают на ваш сервер
- Открытые порты 80 и 443

### 2. Система
- Windows 11 с PowerShell
- Docker Desktop установлен и запущен
- Интернет подключение

## 🚀 Быстрый старт

### Шаг 1: Сначала тестируем (Staging режим)

```powershell
# Перейдите в директорию проекта
cd WorkTimeTracker

# Запустите в staging режиме для тестирования
.\scripts\setup-real-ssl.ps1 -Domain "yourdomain.com" -Email "your@email.com" -Staging
```

### Шаг 2: Получение продакшн сертификата

```powershell
# После успешного тестирования запустите для продакшн
.\scripts\setup-real-ssl.ps1 -Domain "yourdomain.com" -Email "your@email.com" -Production
```

### Шаг 3: Запуск с SSL

```powershell
# Запустите приложение с реальными SSL сертификатами
docker-compose -f docker-compose.yml -f docker-compose.ssl-real.yml up -d
```

## 🔧 Подробная настройка

### 1. Подготовка DNS

Убедитесь, что ваш домен указывает на ваш сервер:

```powershell
# Проверка DNS записей
nslookup yourdomain.com
ping yourdomain.com
```

### 2. Настройка домена в конфигурации

Обновите файл `nginx/nginx.prod.conf` - замените `yourdomain.com` на ваш реальный домен:

```nginx
server_name yourdomain.com www.yourdomain.com;
```

### 3. Получение сертификата

Скрипт автоматически:
- Создает временный nginx для ACME challenge
- Получает сертификат от Let's Encrypt
- Копирует сертификаты в правильные места
- Создает DH параметры для повышенной безопасности
- Настраивает автоматическое обновление

### 4. Структура файлов после настройки

```
WorkTimeTracker/
├── certbot/
│   ├── conf/           # Конфигурация и сертификаты Let's Encrypt
│   ├── www/            # Webroot для ACME challenge
│   └── logs/           # Логи Certbot
├── nginx/
│   ├── ssl/
│   │   ├── cert.pem    # Симлинк на Let's Encrypt сертификат
│   │   ├── key.pem     # Симлинк на приватный ключ
│   │   └── dhparam.pem # DH параметры
│   ├── nginx.conf      # Обновленная конфигурация
│   └── nginx-certbot.conf # Временная конфигурация для получения сертификата
├── docker-compose.ssl-real.yml # Docker Compose для продакшн SSL
└── scripts/
    ├── setup-real-ssl.ps1 # Основной скрипт настройки
    └── renew-ssl.ps1      # Скрипт обновления сертификатов
```

## 🔄 Автоматическое обновление сертификатов

### Настройка планировщика задач Windows

1. Откройте "Планировщик заданий" (Task Scheduler)
2. Создайте новую задачу:
   - **Имя**: "SSL Certificate Renewal"
   - **Триггер**: Ежедневно в 2:00 AM
   - **Действие**: Запуск PowerShell скрипта

```powershell
# Путь к скрипту
C:\path\to\WorkTimeTracker\scripts\renew-ssl.ps1

# Рабочая директория
C:\path\to\WorkTimeTracker
```

### Ручное обновление

```powershell
# Обновление сертификатов
.\scripts\renew-ssl.ps1

# Или через основной скрипт
.\scripts\setup-real-ssl.ps1 -Domain "yourdomain.com" -UpdateOnly
```

## 🛡️ Безопасность и мониторинг

### Проверка SSL рейтинга

После настройки проверьте ваш SSL рейтинг:
- [SSL Labs Test](https://www.ssllabs.com/ssltest/)
- [Mozilla Observatory](https://observatory.mozilla.org/)

### Мониторинг сертификатов

```powershell
# Проверка срока действия сертификата
openssl x509 -in nginx/ssl/cert.pem -dates -noout

# Проверка через браузер
curl -I https://yourdomain.com
```

### Логи безопасности

```powershell
# Просмотр логов nginx
docker-compose logs nginx

# Просмотр логов Certbot
docker-compose logs certbot-renew

# Логи обновления сертификатов
Get-Content certbot/logs/letsencrypt.log -Tail 50
```

## 🔧 Настройка для разных сценариев

### Поддомены

```powershell
# Для поддомена
.\scripts\setup-real-ssl.ps1 -Domain "app.yourdomain.com" -Email "your@email.com"
```

### Wildcard сертификат (требует DNS validation)

```powershell
# Для wildcard сертификата (более сложная настройка)
docker run --rm -v "${PWD}/certbot/conf:/etc/letsencrypt" -v "${PWD}/certbot/logs:/var/log/letsencrypt" `
  certbot/certbot certonly --manual --preferred-challenges dns -d "*.yourdomain.com" -d "yourdomain.com"
```

### Несколько доменов

```powershell
# Для нескольких доменов
.\scripts\setup-real-ssl.ps1 -Domain "yourdomain.com,www.yourdomain.com,app.yourdomain.com"
```

## 🚨 Устранение проблем

### Ошибка "Domain validation failed"

1. **Проверьте DNS**: Убедитесь, что домен указывает на ваш сервер
2. **Проверьте брандмауэр**: Порт 80 должен быть открыт
3. **Проверьте nginx**: Временный nginx должен отвечать на порту 80

```powershell
# Проверка доступности домена
Test-NetConnection yourdomain.com -Port 80
Test-NetConnection yourdomain.com -Port 443
```

### Ошибка "Rate limit exceeded"

Let's Encrypt имеет лимиты:
- 50 сертификатов на домен в неделю
- 5 неудачных попыток в час

Решение: Используйте staging режим для тестирования.

### Ошибка "Certificate already exists"

```powershell
# Форсированное обновление
docker run --rm -v "${PWD}/certbot/conf:/etc/letsencrypt" -v "${PWD}/certbot/www:/var/www/certbot" `
  certbot/certbot certonly --webroot --webroot-path=/var/www/certbot --email your@email.com `
  --agree-tos --force-renewal -d yourdomain.com
```

### Проблемы с Docker

```powershell
# Перезапуск Docker Desktop
Restart-Service *docker*

# Очистка Docker кэша
docker system prune -a

# Проверка Docker
docker --version
docker-compose --version
```

## 📊 Мониторинг и алерты

### Webhook для уведомлений об обновлении

Создайте webhook в `scripts/ssl-notification.ps1`:

```powershell
param([string]$Status, [string]$Domain)

$webhookUrl = "YOUR_WEBHOOK_URL"
$message = @{
    text = "SSL Certificate $Status for $Domain"
    timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
}

Invoke-RestMethod -Uri $webhookUrl -Method Post -Body ($message | ConvertTo-Json) -ContentType "application/json"
```

### Интеграция с мониторингом

```powershell
# Экспорт метрик SSL
$certInfo = openssl x509 -in nginx/ssl/cert.pem -dates -noout
$expiryDate = ($certInfo | Select-String "notAfter").ToString()
Write-Host "Certificate expires: $expiryDate"
```

## 🔐 Дополнительные настройки безопасности

### HSTS Preload

После настройки SSL добавьте ваш домен в [HSTS Preload List](https://hstspreload.org/).

### Certificate Transparency Monitoring

Настройте мониторинг Certificate Transparency для отслеживания всех сертификатов вашего домена.

### Бэкап сертификатов

```powershell
# Создание бэкапа сертификатов
$backupDir = "ssl-backup-$(Get-Date -Format 'yyyy-MM-dd')"
New-Item -ItemType Directory -Path $backupDir
Copy-Item -Recurse certbot/conf $backupDir/
Copy-Item -Recurse nginx/ssl $backupDir/
```

## 📞 Поддержка

При возникновении проблем:

1. Проверьте логи: `docker-compose logs`
2. Проверьте статус домена: `nslookup yourdomain.com`
3. Проверьте Let's Encrypt статус: [https://letsencrypt.status.io/](https://letsencrypt.status.io/)
4. Используйте staging режим для отладки

---

**⚠️ Важно**: Всегда сначала тестируйте в staging режиме, чтобы не попасть под rate limits Let's Encrypt! 