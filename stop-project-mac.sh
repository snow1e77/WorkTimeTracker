#!/bin/bash

echo "========================================"
echo "  Work Time Tracker - Остановка macOS"
echo "========================================"

# Переходим в папку проекта
cd "$(dirname "$0")"

echo ""
echo "🛑 Остановка Docker контейнеров..."
docker-compose down

if [ $? -eq 0 ]; then
    echo "✅ Все контейнеры остановлены"
else
    echo "⚠️  Некоторые контейнеры могли не остановиться"
fi

echo ""
echo "🧹 Остановка дополнительных процессов..."

# Останавливаем процессы Node.js на портах проекта
for port in 3001 19006 3000; do
    pid=$(lsof -ti:$port 2>/dev/null)
    if [ ! -z "$pid" ]; then
        echo "Остановка процесса на порту $port (PID: $pid)"
        kill -TERM $pid 2>/dev/null || kill -KILL $pid 2>/dev/null
    fi
done

echo ""
echo "✅ Проект полностью остановлен"
echo ""
echo "📋 Для повторного запуска используйте:"
echo "./quick-start-mac.sh" 