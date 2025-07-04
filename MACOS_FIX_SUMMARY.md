# 🍎 Исправления для macOS - Краткая сводка

## ⚡ Быстрое решение

```bash
# 1. Установите права
chmod +x *.sh

# 2. Запустите исправленную версию
./quick-start-mac-fixed.sh

# 3. Если нужно создать пользователя отдельно
./create-test-worker-fixed.sh
```

## 📝 Основные проблемы и исправления

| Проблема | Решение в исправленной версии |
|----------|-------------------------------|
| ❌ "User not found" | ✅ Дополнительные проверки БД и миграций |
| ❌ PostgreSQL не готов | ✅ Ожидание 30 сек + проверка `pg_isready` |
| ❌ Permission denied | ✅ Автоматический `chmod +x` для всех скриптов |
| ❌ Контейнеры конфликтуют | ✅ Полная очистка `--volumes --remove-orphans` |
| ❌ Нет диагностики | ✅ Подробные логи и проверки на каждом шаге |
| ❌ Миграции не работают | ✅ Принудительное создание БД если нужно |

## 🚀 Новые файлы для macOS

1. **`quick-start-mac-fixed.sh`** - Исправленный запуск проекта
2. **`create-test-worker-fixed.sh`** - Исправленное создание пользователя  
3. **`TEST_WORKER_MACOS_FIXED.md`** - Подробные инструкции с диагностикой

## 🔍 Диагностические команды

```bash
# Проверка состояния
./check-services-mac.sh

# Проверка логов
docker-compose logs

# Проверка пользователя в БД
docker exec worktime-postgres psql -h localhost -p 5432 -U postgres -d worktime_tracker -c "SELECT * FROM users WHERE phone_number = '+79999999999';"
```

## 💡 Если все еще не работает

```bash
# Полный сброс
./stop-project-mac.sh
docker-compose down --volumes --remove-orphans
docker system prune -f
rm -rf node_modules server/node_modules

# Запуск заново
./quick-start-mac-fixed.sh
```

## 📞 Тестовые данные

- **Телефон**: `+79999999999`
- **Роль**: worker
- **Вход**: только номер телефона (без пароля) 