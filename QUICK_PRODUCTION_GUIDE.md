# 🚀 Быстрое развертывание WorkTime Tracker в продакшене

## Минимальные требования

- Windows 10/11 с PowerShell
- Docker Desktop установлен и запущен
- Доступ к интернету для загрузки Docker образов

## 3 простых шага

### 1️⃣ Генерация безопасных секретов
```powershell
# Запустите PowerShell от имени администратора
cd WorkTimeTracker
.\scripts\generate-production-secrets.ps1
```

### 2️⃣ Создание SSL сертификатов (для тестирования)
```powershell
# Если у вас установлен OpenSSL
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout nginx\ssl\key.pem -out nginx\ssl\cert.pem

# Или пропустите SSL для локального тестирования
```

### 3️⃣ Запуск приложения
```powershell
# Для локального тестирования (без SSL)
.\scripts\deploy-production.ps1 -SkipSSL

# Или с доменом
.\scripts\deploy-production.ps1 -Domain "yourdomain.com"
```

## Проверка работы

После запуска проверьте:
- 🌐 Веб-приложение: http://localhost (или https://yourdomain.com)
- 💚 API Health: http://localhost/health
- 📊 Статус контейнеров: `docker-compose -f docker-compose.prod.yml ps`

## Что дальше?

1. **Для реального продакшена:**
   - Купите домен и настройте DNS
   - Получите SSL сертификат от Let's Encrypt
   - Обновите `production.env` с реальным доменом

2. **Для локального тестирования:**
   - Приложение готово к использованию
   - Протестируйте все функции
   - Создайте резервную копию базы данных

## Полезные команды

```powershell
# Просмотр логов
docker-compose -f docker-compose.prod.yml logs -f

# Остановка
docker-compose -f docker-compose.prod.yml down

# Перезапуск
docker-compose -f docker-compose.prod.yml restart

# Резервное копирование БД
docker exec worktime_postgres_1 pg_dump -U worktime_user -d worktime_production > backup.sql
```

## Возможные проблемы

- **Порты заняты**: Остановите другие веб-серверы на портах 80/443
- **Docker не запущен**: Убедитесь что Docker Desktop запущен
- **Нет прав**: Запустите PowerShell от имени администратора

## Дополнительная информация

- 📋 Полный чек-лист: `PRODUCTION_CHECKLIST.md`
- 📖 Подробная документация: `PRODUCTION_DEPLOYMENT.md`
- 🔧 API документация: `API_ENDPOINTS.md` 