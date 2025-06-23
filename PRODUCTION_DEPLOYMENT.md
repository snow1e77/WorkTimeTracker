# WorkTime Tracker - Production Deployment Guide

## 🚀 Подготовка к продакшену

Это руководство поможет развернуть WorkTime Tracker в производственной среде с использованием Docker и Docker Compose.

## 📋 Требования

### Системные требования
- **Операционная система**: Windows 10/11, Linux, macOS
- **RAM**: Минимум 4GB, рекомендуется 8GB+
- **Дисковое пространство**: Минимум 10GB свободного места
- **Процессор**: 2+ ядра

### Программное обеспечение
- [Docker Desktop](https://www.docker.com/products/docker-desktop) (последняя версия)
- [Docker Compose](https://docs.docker.com/compose/install/) (включен в Docker Desktop)
- [Node.js](https://nodejs.org/) 18+ (для локальной разработки)
- [Git](https://git-scm.com/)

## ⚙️ Быстрое развертывание

### 1. Клонирование репозитория
```powershell
git clone <repository-url>
cd WorkTimeTracker
```

### 2. Автоматическое развертывание
Запустите PowerShell от имени администратора и выполните:

```powershell
# Установка с доменом по умолчанию
.\scripts\deploy-production.ps1

# Или с вашим доменом
.\scripts\deploy-production.ps1 -Domain "yourdomain.com"

# Пропуск настройки SSL (для локального тестирования)
.\scripts\deploy-production.ps1 -SkipSSL
```

## 🔧 Ручная настройка

### 1. Настройка переменных окружения

Создайте файл `.env.production` в корне проекта:

```env
# Database Configuration
DB_NAME=worktime_production
DB_USER=worktime_user
DB_PASSWORD=your_secure_database_password

# Redis Configuration
REDIS_PASSWORD=your_secure_redis_password

# JWT Secrets (ОБЯЗАТЕЛЬНО замените на уникальные!)
JWT_ACCESS_SECRET=your_super_secure_access_secret_256_bits_minimum
JWT_REFRESH_SECRET=your_super_secure_refresh_secret_256_bits_minimum

# Twilio Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# CORS Origins
CORS_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
```

### 2. Сборка веб-приложения

```powershell
# Установка зависимостей
npm install

# Сборка веб-версии
npm run build:web
```

### 3. SSL сертификаты

#### Для продакшена (рекомендуется Let's Encrypt):
```powershell
# Установите certbot
# Получите сертификат
certbot certonly --standalone -d yourdomain.com

# Скопируйте сертификаты
cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/cert.pem
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/key.pem
```

#### Для локального тестирования (самоподписанный):
```powershell
# Создание директории для SSL
mkdir nginx\ssl

# Генерация сертификата (требует OpenSSL)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout nginx\ssl\key.pem -out nginx\ssl\cert.pem
```

### 4. Запуск сервисов

```powershell
# Запуск всех сервисов
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d --build

# Проверка статуса
docker-compose -f docker-compose.prod.yml ps
```

## 📊 Мониторинг и управление

### Полезные команды

```powershell
# Просмотр логов
docker-compose -f docker-compose.prod.yml logs -f worktime-server

# Перезапуск сервиса
docker-compose -f docker-compose.prod.yml restart worktime-server

# Остановка всех сервисов
docker-compose -f docker-compose.prod.yml down

# Обновление сервиса
docker-compose -f docker-compose.prod.yml up -d --build worktime-server
```

### Эндпоинты для мониторинга

- **Health Check**: `https://yourdomain.com/health`
- **API Info**: `https://yourdomain.com/api/info`
- **Metrics**: `https://yourdomain.com/api/metrics` (если настроен)

### Логи

Логи сохраняются в следующих местах:
- Приложение: `server/logs/app-YYYY-MM-DD.log`
- Ошибки: `server/logs/error-YYYY-MM-DD.log`
- Nginx: Встроенные в контейнер
- База данных: Встроенные в контейнер

## 🔐 Безопасность

### Обязательные действия для продакшена:

1. **Смените все пароли по умолчанию**
2. **Используйте сильные JWT секреты** (256+ бит)
3. **Настройте SSL сертификаты** от доверенного CA
4. **Ограничьте доступ к базе данных**
5. **Настройте файрвол**
6. **Регулярно обновляйте Docker образы**

### Рекомендуемые настройки:

```env
# Пример сильных паролей
DB_PASSWORD=Kj8#mP2@vN9$xT5!qW7&eR4%uY1^iO6*
JWT_ACCESS_SECRET=aB3#dF6$gH9@jK2%mN5^pQ8&sT1!vW4*xZ7#aC0$eF3^
```

## 📱 Мобильное приложение

### Android APK
```powershell
# Сборка production APK
npm run build:android

# APK будет в папке android/app/build/outputs/apk/release/
```

### iOS приложение
```powershell
# Сборка iOS приложения (требует macOS)
npm run build:ios
```

## 🗄️ Резервное копирование

### Автоматическое резервное копирование базы данных

Создайте cron job или Task Scheduler задачу:

```powershell
# Пример скрипта резервного копирования
docker exec worktime_postgres_1 pg_dump -U $env:DB_USER -d $env:DB_NAME > "backup_$(Get-Date -Format 'yyyy-MM-dd_HH-mm-ss').sql"
```

### Резервное копирование файлов

```powershell
# Резервное копирование важных файлов
$BackupDir = "backup_$(Get-Date -Format 'yyyy-MM-dd')"
mkdir $BackupDir
cp -r server\logs $BackupDir\
cp -r server\uploads $BackupDir\
cp .env.production $BackupDir\
```

## 🚀 Масштабирование

### Горизонтальное масштабирование

Для увеличения нагрузки можно:

1. **Добавить Load Balancer** (например, HAProxy)
2. **Запустить несколько экземпляров API сервера**
3. **Использовать кластер PostgreSQL**
4. **Добавить Redis Cluster**

### Вертикальное масштабирование

Увеличьте ресурсы в `docker-compose.prod.yml`:

```yaml
worktime-server:
  deploy:
    resources:
      limits:
        memory: 2G
        cpus: '2.0'
      reservations:
        memory: 1G
        cpus: '1.0'
```

## 🔍 Диагностика проблем

### Частые проблемы

1. **Сервер не запускается**
   ```powershell
   docker-compose -f docker-compose.prod.yml logs worktime-server
   ```

2. **База данных не подключается**
   ```powershell
   docker-compose -f docker-compose.prod.yml logs postgres
   ```

3. **SSL ошибки**
   - Проверьте правильность путей к сертификатам
   - Убедитесь, что сертификаты не истекли

4. **CORS ошибки**
   - Проверьте CORS_ORIGINS в .env.production
   - Убедитесь, что домены указаны правильно

### Проверка здоровья системы

```powershell
# Проверка API
Invoke-RestMethod -Uri "https://yourdomain.com/health"

# Проверка базы данных
docker exec worktime_postgres_1 psql -U $env:DB_USER -d $env:DB_NAME -c "\dt"
```

## 📞 Поддержка

При возникновении проблем:

1. Проверьте логи всех сервисов
2. Убедитесь в правильности конфигурации
3. Проверьте доступность портов
4. Создайте issue в репозитории с подробным описанием проблемы

---

**Важно**: Этот документ содержит базовые инструкции. Для production среды рекомендуется привлечь специалиста по DevOps для дополнительной настройки безопасности и оптимизации производительности. 