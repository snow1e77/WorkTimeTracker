#!/bin/bash

echo "========================================"
echo "  Work Time Tracker - Остановка macOS"
echo "========================================"

# Переходим в папку проекта
cd "$(dirname "$0")"

# Проверяем наличие docker-compose.yml
if [ ! -f "docker-compose.yml" ]; then
    echo "⚠️  Файл docker-compose.yml не найден в текущей папке"
    echo "Убедитесь что запускаете скрипт из корневой папки проекта"
fi

echo ""
echo "🛑 Остановка Docker контейнеров..."
if command -v docker-compose &> /dev/null; then
    docker-compose down
    
    if [ $? -eq 0 ]; then
        echo "✅ Docker контейнеры остановлены"
    else
        echo "⚠️  Некоторые контейнеры могли не остановиться"
    fi
    
    # Дополнительная очистка
    echo "🧹 Очистка неиспользуемых Docker ресурсов..."
    docker system prune -f 2>/dev/null || true
else
    echo "⚠️  Docker Compose не найден"
fi

echo ""
echo "🧹 Остановка дополнительных процессов..."

# Останавливаем процессы Node.js на портах проекта
for port in 3001 19006 3000 8081; do
    if command -v lsof &> /dev/null; then
        pid=$(lsof -ti:$port 2>/dev/null)
        if [ ! -z "$pid" ]; then
            echo "Остановка процесса на порту $port (PID: $pid)"
            kill -TERM $pid 2>/dev/null
            sleep 2
            # Если процесс все еще работает, принудительно завершаем его
            if kill -0 $pid 2>/dev/null; then
                echo "Принудительная остановка процесса $pid"
                kill -KILL $pid 2>/dev/null
            fi
        fi
    else
        echo "⚠️  lsof не найден, пропускаем проверку портов"
        break
    fi
done

# Останавливаем Metro bundler (React Native)
metro_pid=$(ps aux | grep 'metro' | grep -v grep | awk '{print $2}' 2>/dev/null)
if [ ! -z "$metro_pid" ]; then
    echo "Остановка Metro bundler (PID: $metro_pid)"
    kill -TERM $metro_pid 2>/dev/null || true
fi

# Останавливаем Expo процессы
expo_pid=$(ps aux | grep 'expo' | grep -v grep | awk '{print $2}' 2>/dev/null)
if [ ! -z "$expo_pid" ]; then
    echo "Остановка Expo процессов (PID: $expo_pid)"
    kill -TERM $expo_pid 2>/dev/null || true
fi

echo ""
echo "✅ Проект полностью остановлен"
echo ""
echo "📋 Для повторного запуска используйте:"
echo "./quick-start-mac.sh"
echo ""
echo "🔍 Для проверки состояния используйте:"
echo "./check-services-mac.sh" 