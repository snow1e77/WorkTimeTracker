# Тестовый аккаунт рабочего - macOS (ИСПРАВЛЕННАЯ ВЕРСИЯ)

## 🚀 Быстрый старт (РЕКОМЕНДУЕТСЯ)

### 1. Запустите исправленный скрипт проекта
```bash
./quick-start-mac-fixed.sh
```

### 2. Создайте тестовый аккаунт (если не создался автоматически)
```bash
./create-test-worker-fixed.sh
```

### 3. Войдите в мобильное приложение
- **Номер телефона**: `+79999999999`
- **Вход**: Только номер телефона

## 📱 Тестовые данные

| Параметр | Значение |
|----------|----------|
| Номер телефона | `+79999999999` |
| Вход | Только номер телефона |
| Роль | worker (рабочий) |

## 🔧 Исправления проблем в оригинальных скриптах

### Основные проблемы которые исправлены:
1. **Недостаточное ожидание запуска PostgreSQL** - увеличено время ожидания
2. **Отсутствие проверки готовности БД** - добавлена проверка `pg_isready`
3. **Проблемы с правами доступа** - автоматическая установка `chmod +x`
4. **Неполная очистка контейнеров** - добавлен `--volumes --remove-orphans`
5. **Отсутствие диагностики ошибок** - добавлены подробные логи
6. **Проблемы с миграциями** - принудительное создание БД если нужно

## 🛠️ Альтернативные команды

### Если исправленные скрипты не запускаются:
```bash
# 1. Установите права на выполнение
chmod +x *.sh
chmod +x *-fixed.sh

# 2. Запустите исправленную версию
./quick-start-mac-fixed.sh
```

### Полная очистка и перезапуск:
```bash
# Остановите все
./stop-project-mac.sh

# Очистите контейнеры полностью
docker-compose down --volumes --remove-orphans

# Запустите исправленную версию
./quick-start-mac-fixed.sh
```

### Создание тестового пользователя отдельно:
```bash
./create-test-worker-fixed.sh
```

### Через npm (если скрипты не работают):
```bash
cd server
npm run create-test-worker
```

## 🔍 Диагностика проблем

### 1. Проверка состояния сервисов
```bash
./check-services-mac.sh
```

### 2. Проверка логов
```bash
# Все логи
docker-compose logs

# Только сервер
docker-compose logs server

# Только PostgreSQL
docker-compose logs postgres
```

### 3. Проверка подключения к БД
```bash
# Проверка готовности PostgreSQL
docker exec worktime-postgres pg_isready -h localhost -p 5432 -U postgres

# Проверка таблиц
docker exec worktime-postgres psql -h localhost -p 5432 -U postgres -d worktime_tracker -c "\dt"
```

### 4. Проверка пользователей в БД
```bash
docker exec worktime-postgres psql -h localhost -p 5432 -U postgres -d worktime_tracker -c "SELECT phone_number, name, role FROM users;"
```

## 🚨 Типичные ошибки и решения

### Ошибка: "User not found"
**Причина**: Пользователь не создался в БД или проблемы с миграциями
**Решение**:
```bash
# Проверьте что пользователь существует
docker exec worktime-postgres psql -h localhost -p 5432 -U postgres -d worktime_tracker -c "SELECT * FROM users WHERE phone_number = '+79999999999';"

# Если пользователя нет - пересоздайте
./create-test-worker-fixed.sh
```

### Ошибка: "Database connection failed"
**Причина**: PostgreSQL не запущен или недоступен
**Решение**:
```bash
# Проверьте контейнеры
docker-compose ps

# Перезапустите PostgreSQL
docker-compose restart postgres

# Полный перезапуск
./quick-start-mac-fixed.sh
```

### Ошибка: "Permission denied"
**Причина**: Отсутствуют права на выполнение скриптов
**Решение**:
```bash
chmod +x *.sh
chmod +x *-fixed.sh
./fix-permissions-mac.sh
```

### Ошибка: "Migration failed"
**Причина**: Проблемы с созданием таблиц
**Решение**:
```bash
cd server
npm run build
npm run migrate
```

## 💡 Дополнительные советы

### Проверка API
```bash
# Проверка здоровья API
curl http://localhost:3001/api/health

# Проверка статуса
curl http://localhost:3001/api/status
```

### Очистка всего (если ничего не помогает)
```bash
# Остановите все
./stop-project-mac.sh

# Удалите все контейнеры и данные
docker-compose down --volumes --remove-orphans
docker system prune -f

# Удалите node_modules
rm -rf node_modules server/node_modules

# Запустите заново
./quick-start-mac-fixed.sh
```

### Мониторинг в реальном времени
```bash
# Логи в реальном времени
docker-compose logs -f

# Только сервер
docker-compose logs -f server

# Состояние контейнеров
watch docker-compose ps
```

## 📋 Что тестировать

После успешного входа в приложение проверьте:

- ✅ Отметка времени прихода/ухода
- ✅ Геолокация на рабочем месте  
- ✅ Чат с прорабом
- ✅ Просмотр назначенных заданий
- ✅ Создание фото отчетов
- ✅ Синхронизация данных

## 🎯 Основные отличия исправленной версии

1. **Больше времени на запуск PostgreSQL** (30 сек вместо 20)
2. **Проверка готовности БД** перед миграциями
3. **Автоматическая установка прав** на скрипты
4. **Полная очистка контейнеров** перед запуском
5. **Подробная диагностика ошибок** с логами
6. **Принудительное создание БД** если нужно
7. **Проверка существования пользователя** после создания
8. **Дополнительные команды для отладки**

## 🔄 Если проблемы продолжаются

1. Проверьте системные требования:
   - macOS 10.15+ 
   - Docker Desktop 4.0+
   - Node.js 16+
   - 8GB RAM

2. Освободите порты:
   - 3001 (API сервер)
   - 5433 (PostgreSQL)
   - 5050 (PgAdmin)

3. Увеличьте ресурсы Docker:
   - Memory: 4GB+
   - CPU: 2 cores+
   - Disk: 10GB+

4. Обратитесь к разработчикам с логами:
   ```bash
   docker-compose logs > debug.log
   ``` 