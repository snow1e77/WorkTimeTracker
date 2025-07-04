#!/bin/bash

# Скрипт для создания тестового аккаунта рабочего (ИСПРАВЛЕННАЯ ВЕРСИЯ для macOS)
# Используется для тестирования приложения

echo "🔧 Создание тестового аккаунта рабочего (ИСПРАВЛЕННАЯ ВЕРСИЯ)..."

# Переходим в папку проекта
cd "$(dirname "$0")"

# Проверяем что мы в правильной директории
if [ ! -f "package.json" ]; then
    echo "❌ Ошибка: файл package.json не найден в корневой папке проекта"
    echo "💡 Убедитесь, что запускаете скрипт из корневой папки проекта"
    exit 1
fi

# Переходим в папку сервера
if [ ! -d "server" ]; then
    echo "❌ Ошибка: папка server не найдена"
    exit 1
fi

cd server

# Проверяем что мы в правильной директории
if [ ! -f "package.json" ]; then
    echo "❌ Ошибка: файл package.json не найден в папке server"
    echo "💡 Убедитесь, что запускаете скрипт из корневой папки проекта"
    exit 1
fi

# Проверяем наличие .env файла
if [ ! -f ".env" ]; then
    echo "❌ Ошибка: файл .env не найден в папке server"
    echo "💡 Сначала запустите ./quick-start-mac-fixed.sh для создания .env файла"
    exit 1
fi

# Проверяем что Docker контейнеры запущены
echo "🔍 Проверяем состояние Docker контейнеров..."
if ! docker-compose ps | grep -q "worktime-postgres"; then
    echo "❌ Контейнер PostgreSQL не запущен"
    echo "💡 Запустите сначала: ./quick-start-mac-fixed.sh"
    exit 1
fi

# Проверяем что PostgreSQL готов
echo "🔍 Проверяем готовность PostgreSQL..."
max_attempts=10
attempt=0
while [ $attempt -lt $max_attempts ]; do
    if docker exec worktime-postgres pg_isready -h localhost -p 5432 -U postgres &>/dev/null; then
        echo "✅ PostgreSQL готов к работе"
        break
    fi
    ((attempt++))
    echo "⏳ Ожидание PostgreSQL... попытка $attempt/$max_attempts"
    sleep 3
done

if [ $attempt -eq $max_attempts ]; then
    echo "❌ PostgreSQL не готов"
    echo "💡 Попробуйте перезапустить: docker-compose restart postgres"
    exit 1
fi

# Проверяем что зависимости установлены
if [ ! -d "node_modules" ]; then
    echo "📦 Установка зависимостей сервера..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Ошибка установки зависимостей"
        exit 1
    fi
fi

# Проверяем что сервер собран
if [ ! -d "dist" ]; then
    echo "🔨 Сборка сервера..."
    npm run build
    if [ $? -ne 0 ]; then
        echo "❌ Ошибка сборки сервера"
        exit 1
    fi
fi

# Проверяем что миграции выполнены
echo "🗄️  Проверяем выполнение миграций..."
npm run migrate
if [ $? -ne 0 ]; then
    echo "❌ Ошибка миграций. Выполняем принудительно..."
    echo "💡 Пытаемся создать базу данных и таблицы..."
    
    # Создаем базу данных если не существует
    docker exec worktime-postgres psql -h localhost -p 5432 -U postgres -c "CREATE DATABASE worktime_tracker;" 2>/dev/null || true
    
    # Повторяем миграции
    npm run migrate
    if [ $? -ne 0 ]; then
        echo "❌ Критическая ошибка миграций"
        echo "Логи PostgreSQL:"
        docker-compose logs --tail=10 postgres
        exit 1
    fi
fi

echo "⚡ Запускаем создание тестового аккаунта..."

# Запускаем создание тестового пользователя с дополнительной диагностикой
echo "📊 Проверяем подключение к базе данных перед созданием пользователя..."

# Проверяем что можем подключиться к БД
if ! docker exec worktime-postgres psql -h localhost -p 5432 -U postgres -d worktime_tracker -c "SELECT 1;" &>/dev/null; then
    echo "❌ Не удается подключиться к базе данных worktime_tracker"
    echo "💡 Попробуйте выполнить полный перезапуск:"
    echo "   ./stop-project-mac.sh"
    echo "   ./quick-start-mac-fixed.sh"
    exit 1
fi

# Проверяем что таблица users существует
if ! docker exec worktime-postgres psql -h localhost -p 5432 -U postgres -d worktime_tracker -c "SELECT COUNT(*) FROM users;" &>/dev/null; then
    echo "❌ Таблица users не существует"
    echo "💡 Выполняем миграции принудительно..."
    npm run migrate
    if [ $? -ne 0 ]; then
        echo "❌ Не удалось создать таблицы"
        exit 1
    fi
fi

# Запускаем создание тестового пользователя
npm run create-test-worker

# Проверяем результат
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Тестовый аккаунт успешно создан!"
    echo ""
    
    # Дополнительная проверка - проверяем что пользователь действительно создан
    user_exists=$(docker exec worktime-postgres psql -h localhost -p 5432 -U postgres -d worktime_tracker -t -c "SELECT COUNT(*) FROM users WHERE phone_number = '+79999999999';" 2>/dev/null | tr -d '[:space:]')
    
    if [ "$user_exists" = "1" ]; then
        echo "✅ Пользователь подтвержден в базе данных"
    else
        echo "⚠️  Пользователь не найден в базе данных (возможно ошибка создания)"
    fi
    
    echo ""
    echo "📱 Данные для входа:"
    echo "   Номер телефона: +79999999999"
    echo "   Роль: worker"
    echo ""
    echo "🚀 Инструкция для входа:"
    echo "   1. Запустите мобильное приложение: npm start"
    echo "   2. Введите номер телефона: +79999999999"
    echo "   3. Нажмите 'Войти' - вход произойдет автоматически"
    echo "   4. Готово! Можете сразу пользоваться приложением"
    echo ""
    echo "🌐 Для веб-версии:"
    echo "   1. Запустите веб-приложение: npm run web"
    echo "   2. Используйте те же данные для входа"
    echo ""
    echo "💡 Вход только по номеру телефона (без пароля)"
    echo ""
    echo "🔍 Дополнительная диагностика:"
    echo "   • Проверка API: curl http://localhost:3001/api/health"
    echo "   • Проверка сервисов: ./check-services-mac.sh"
    echo ""
    echo "🎉 Готово!"
else
    echo "❌ Ошибка при создании тестового аккаунта"
    echo ""
    echo "🔍 Диагностика:"
    echo ""
    
    # Показываем логи для диагностики
    echo "--- Логи сервера ---"
    docker-compose logs --tail=10 server 2>/dev/null || echo "Логи сервера недоступны"
    
    echo ""
    echo "--- Логи PostgreSQL ---"
    docker-compose logs --tail=5 postgres 2>/dev/null || echo "Логи PostgreSQL недоступны"
    
    echo ""
    echo "💡 Возможные причины:"
    echo "   - База данных не запущена (docker-compose up -d)"
    echo "   - Миграции не выполнены (npm run migrate)"
    echo "   - Неправильные настройки в .env файле"
    echo "   - Проблемы с сетью или Docker"
    echo ""
    echo "🔧 Попробуйте следующие действия:"
    echo "   1. Полный перезапуск: ./stop-project-mac.sh && ./quick-start-mac-fixed.sh"
    echo "   2. Очистка контейнеров: docker-compose down --volumes"
    echo "   3. Проверка логов: docker-compose logs"
    echo "   4. Проверка состояния: ./check-services-mac.sh"
    exit 1
fi

# Возвращаемся в корневую папку
cd .. 