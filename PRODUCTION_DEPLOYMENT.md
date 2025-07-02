# 🚀 Руководство по развертыванию WorkTime Tracker в продакшене

## ✅ Подготовлено для продакшена

Ваш проект успешно подготовлен к развертыванию в продакшене! Все основные компоненты настроены и протестированы.

## 🔧 Что уже настроено

### 1. Docker-контейнеры
- ✅ **PostgreSQL 15** - база данных с автоинициализацией
- ✅ **Node.js сервер** - API сервер с безопасностью production-уровня
- ✅ **Nginx** - reverse proxy с SSL/HTTPS поддержкой
- ✅ **React приложение** - собранное и оптимизированное веб-приложение

### 2. Безопасность
- ✅ SSL/TLS сертификаты (самоподписанные для тестирования)
- ✅ HTTPS редирект
- ✅ Security headers (HSTS, CSP, X-Frame-Options)
- ✅ JWT аутентификация
- ✅ Безопасные пароли и секреты
- ✅ Non-root пользователи в контейнерах

### 3. Мониторинг и логирование
- ✅ Health checks для всех сервисов
- ✅ Structured logging с Winston
- ✅ Docker health checks
- ✅ Restart policies

## 🚀 Быстрый запуск

### Локальное тестирование
```powershell
# 1. Генерация секретов (опционально, уже готово)
.\scripts\generate-production-secrets.ps1 -Domain "yourdomain.com"

# 2. Сборка и запуск
docker-compose -f docker-compose.minimal.yml up -d

# 3. Проверка статуса
docker ps
curl http://localhost:3001/health

# 4. Открыть приложение
start https://localhost
```

### Остановка
```powershell
docker-compose -f docker-compose.minimal.yml down
```

## 🌐 Развертывание на сервере

### 1. Подготовка сервера
```bash
# Установка Docker и Docker Compose
sudo apt update
sudo apt install docker.io docker-compose
sudo systemctl enable docker
sudo systemctl start docker

# Клонирование проекта
git clone <your-repo>
cd WorkTimeTracker
```

### 2. Конфигурация для продакшена
```bash
# Обновите домен и секреты
./scripts/generate-production-secrets.ps1 -Domain "yourdomain.com"

# Установите реальные SSL сертификаты
# Замените nginx/ssl/cert.pem и nginx/ssl/key.pem
```

### 3. Запуск
```bash
docker-compose -f docker-compose.minimal.yml up -d
```

## 🔐 Безопасность

### Обязательные действия перед продакшеном:

1. **SSL сертификаты**
   - Замените самоподписанные сертификаты на реальные (Let's Encrypt)
   - Обновите nginx/ssl/cert.pem и nginx/ssl/key.pem

2. **Домен и DNS**
   - Обновите домен в docker-compose.minimal.yml
   - Настройте DNS записи на ваш сервер

3. **Секреты**
   - Сгенерируйте новые надежные пароли
   - Настройте ссылки на магазины приложений
   - Замените JWT секреты

4. **Фаервол**
   - Откройте порты 80 (HTTP) и 443 (HTTPS)
   - Закройте прямой доступ к 3001 и 5432

## 📊 Мониторинг

### Health Checks
- **API**: `https://yourdomain.com/api/health`
- **Database**: Автоматически проверяется в health check

### Логи
```bash
# Логи всех сервисов
docker-compose -f docker-compose.minimal.yml logs

# Логи конкретного сервиса
docker logs worktime-server
docker logs worktime-nginx
docker logs worktime-postgres
```

### Метрики
- API response times в логах
- Database connection status
- Container health status

## 🔄 Обновления

### Обновление приложения
```bash
# 1. Сборка новой версии
git pull
npm run build:web
npm run server:build

# 2. Пересборка контейнеров
docker-compose -f docker-compose.minimal.yml build
docker-compose -f docker-compose.minimal.yml up -d
```

### Бэкапы базы данных
```bash
# Создание бэкапа
docker exec worktime-postgres pg_dump -U worktime_user worktime_tracker_prod > backup.sql

# Восстановление
docker exec -i worktime-postgres psql -U worktime_user worktime_tracker_prod < backup.sql
```

## 📈 Масштабирование

Для высоких нагрузок рассмотрите:
- Load balancer (несколько серверов)
- Redis для сессий и кэширования
- CDN для статических файлов
- Separate database server
- Container orchestration (Kubernetes)

## 🆘 Устранение неполадок

### Частые проблемы:

1. **Сервер не запускается**
   ```bash
   docker logs worktime-server
   # Проверьте переменные окружения и соединение с БД
   ```

2. **База данных недоступна**
   ```bash
   docker logs worktime-postgres
   # Проверьте volumes и права доступа
   ```

3. **SSL ошибки**
   - Убедитесь что сертификаты в nginx/ssl/
   - Проверьте права доступа к сертификатам

4. **502 Bad Gateway**
   - Проверьте что сервер API запущен
   - Проверьте nginx upstream конфигурацию

## 📞 Поддержка

- Логи сервера: `docker logs worktime-server`
- Логи nginx: `docker logs worktime-nginx` 
- Логи базы данных: `docker logs worktime-postgres`
- Health check: `curl https://yourdomain.com/api/health`

---

## 🎉 Поздравляем!

Ваше приложение WorkTime Tracker готово к продакшену! 

**Доступ к приложению**: https://localhost (локально) или https://yourdomain.com (в продакшене)

**API**: https://yourdomain.com/api/

**Health Check**: https://yourdomain.com/api/health 