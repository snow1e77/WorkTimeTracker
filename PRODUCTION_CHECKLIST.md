# 🚀 Чек-лист подготовки WorkTime Tracker к продакшену

## ✅ Выполнено

### 1. Основная инфраструктура
- [x] Docker Compose конфигурация создана (`docker-compose.prod.yml`)
- [x] Nginx конфигурация настроена (`nginx/nginx.conf`)
- [x] Dockerfile для сервера готов
- [x] Скрипт автоматического развертывания (`scripts/deploy-production.ps1`)
- [x] Файл продакшен переменных создан (`production.env`)
- [x] Серверные зависимости установлены
- [x] Папка для SSL сертификатов создана

### 2. Документация
- [x] Подробное руководство по развертыванию (`PRODUCTION_DEPLOYMENT.md`)
- [x] API документация (`API_ENDPOINTS.md`)
- [x] Документация по синхронизации (`SYNC_SYSTEM.md`)

## ⚠️ Требует внимания

### 3. Критические настройки безопасности

#### 3.1 Переменные окружения
**Файл: `production.env`**
```env
# ОБЯЗАТЕЛЬНО замените эти значения:
DB_PASSWORD=CHANGE_THIS_STRONG_DATABASE_PASSWORD_123!
REDIS_PASSWORD=CHANGE_THIS_REDIS_PASSWORD_456!
JWT_ACCESS_SECRET=CHANGE_THIS_TO_STRONG_ACCESS_SECRET_256_BITS_MINIMUM
JWT_REFRESH_SECRET=CHANGE_THIS_TO_STRONG_REFRESH_SECRET_256_BITS_MINIMUM
CORS_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
```

#### 3.2 Серверные переменные
**Файл: `server/.env`**
```env
# ОБЯЗАТЕЛЬНО замените эти значения:
DATABASE_URL=postgresql://worktime_user:STRONG_PASSWORD@postgres:5432/worktime_production
JWT_ACCESS_SECRET=STRONG_JWT_SECRET_256_BITS
JWT_REFRESH_SECRET=STRONG_JWT_REFRESH_SECRET_256_BITS
CORS_ORIGINS=https://yourdomain.com
```

### 4. SSL сертификаты
- [ ] **Для тестирования**: Создать самоподписанный сертификат
- [ ] **Для продакшена**: Получить SSL сертификат от Let's Encrypt или другого CA

**Команды для самоподписанного сертификата:**
```powershell
# Установите OpenSSL, затем:
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout nginx\ssl\key.pem -out nginx\ssl\cert.pem
```

**Для Let's Encrypt:**
```powershell
# Установите certbot, затем:
certbot certonly --standalone -d yourdomain.com
# Скопируйте сертификаты в nginx/ssl/
```

### 5. Сборка приложения
- [ ] Исправить проблемы с Metro bundler для веб-сборки
- [ ] Собрать веб-приложение: `npm run build:web`
- [ ] Собрать Android APK: `npm run build:android`

### 6. База данных
- [ ] Настроить PostgreSQL для продакшена
- [ ] Выполнить миграции: `cd server && npm run migrate:prod`
- [ ] Создать резервную копию структуры БД

### 7. Тестирование
- [ ] Запустить локальное тестирование: `.\scripts\deploy-production.ps1 -SkipSSL`
- [ ] Проверить все API endpoints
- [ ] Тестировать мобильное приложение с продакшен сервером

### 8. Мониторинг и логирование
- [ ] Настроить систему мониторинга
- [ ] Настроить автоматическое резервное копирование
- [ ] Проверить ротацию логов

### 9. Доменные настройки
- [ ] Купить и настроить домен
- [ ] Настроить DNS записи
- [ ] Обновить CORS_ORIGINS на реальный домен

### 10. Финальные проверки
- [ ] Проверить все переменные окружения
- [ ] Проверить SSL сертификаты
- [ ] Проверить файрвол и сетевые настройки
- [ ] Создать документацию по поддержке

## 🚀 Команды для развертывания

### Быстрое развертывание (тестирование)
```powershell
# Запуск от имени администратора
.\scripts\deploy-production.ps1 -SkipSSL
```

### Развертывание с доменом
```powershell
# Замените yourdomain.com на ваш домен
.\scripts\deploy-production.ps1 -Domain "yourdomain.com"
```

### Ручное развертывание
```powershell
# 1. Сборка веб-приложения
npm run build:web

# 2. Сборка серверной части
cd server
npm run build
cd ..

# 3. Запуск Docker контейнеров
docker-compose -f docker-compose.prod.yml --env-file production.env up -d --build

# 4. Проверка статуса
docker-compose -f docker-compose.prod.yml ps
```

## 🔧 Полезные команды

### Управление контейнерами
```powershell
# Просмотр логов
docker-compose -f docker-compose.prod.yml logs -f worktime-server

# Перезапуск сервиса
docker-compose -f docker-compose.prod.yml restart worktime-server

# Остановка всех сервисов
docker-compose -f docker-compose.prod.yml down

# Обновление образов
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d --build
```

### Резервное копирование
```powershell
# Резервное копирование базы данных
docker exec worktime_postgres_1 pg_dump -U worktime_user -d worktime_production > backup.sql

# Восстановление базы данных
docker exec -i worktime_postgres_1 psql -U worktime_user -d worktime_production < backup.sql
```

## 🎯 Приоритеты

1. **Высокий приоритет**: Настройка переменных окружения и SSL
2. **Средний приоритет**: Сборка приложения и тестирование
3. **Низкий приоритет**: Мониторинг и автоматизация

## 📞 Поддержка

После развертывания проверьте:
- Health Check: `https://yourdomain.com/health`
- API Info: `https://yourdomain.com/api/info`
- Веб-приложение: `https://yourdomain.com`

## 🔄 Обновления

Для обновления приложения:
1. Обновите код из Git
2. Пересоберите образы: `docker-compose -f docker-compose.prod.yml up -d --build`
3. Проверьте логи: `docker-compose -f docker-compose.prod.yml logs -f` 