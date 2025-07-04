#!/bin/bash

echo "========================================"
echo "  Work Time Tracker - Проверка сервисов"
echo "========================================"

cd "$(dirname "$0")"

# Проверяем наличие docker-compose.yml
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Файл docker-compose.yml не найден!"
    echo "Убедитесь что запускаете скрипт из корневой папки проекта"
    exit 1
fi

# Проверяем наличие Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не установлен!"
    echo "Установите Docker Desktop: https://www.docker.com/products/docker-desktop/"
    exit 1
fi

# Проверяем что Docker запущен
if ! docker info &> /dev/null; then
    echo "❌ Docker не запущен!"
    echo "Запустите Docker Desktop и повторите попытку"
    exit 1
fi

echo ""
echo "🔍 Проверяем состояние Docker контейнеров..."
docker_status=$(docker-compose ps --format table 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "$docker_status"
else
    echo "⚠️  Ошибка получения статуса контейнеров"
    docker-compose ps
fi
echo ""

echo "🌐 Проверяем доступность сервисов..."

# Функция для проверки HTTP сервиса
check_http_service() {
    local name="$1"
    local url="$2"
    local timeout="$3"
    
    echo -n "Проверяем $name ($url)... "
    if command -v curl &> /dev/null; then
        if curl -s --max-time "$timeout" "$url" >/dev/null 2>&1; then
            echo "✅ работает"
            return 0
        else
            echo "❌ недоступен"
            return 1
        fi
    else
        echo "⚠️  curl не найден"
        return 1
    fi
}

# Проверяем сервер приложения
check_http_service "API Сервер" "http://localhost:3001/api/health" 5

# Проверяем API endpoints
check_http_service "API Status" "http://localhost:3001/api/status" 3

# Проверяем PgAdmin
check_http_service "PgAdmin" "http://localhost:5050" 5

# Проверяем PostgreSQL
echo -n "Проверяем PostgreSQL (localhost:5433)... "
if docker exec worktime-postgres pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
    echo "✅ работает"
    
    # Дополнительная проверка подключения к БД
    echo -n "Проверяем подключение к БД worktime_tracker... "
    if docker exec worktime-postgres psql -h localhost -p 5432 -U postgres -d worktime_tracker -c "SELECT 1;" >/dev/null 2>&1; then
        echo "✅ подключение OK"
    else
        echo "⚠️  БД недоступна (возможно не созданы таблицы)"
    fi
else
    echo "❌ недоступен"
fi

echo ""
echo "📊 Проверяем состояние Node.js процессов..."

# Проверяем процессы на портах
for port in 3001 19006 3000 8081; do
    if command -v lsof &> /dev/null; then
        pid=$(lsof -ti:$port 2>/dev/null)
        if [ ! -z "$pid" ]; then
            process_name=$(ps -p $pid -o comm= 2>/dev/null)
            echo "✅ Порт $port занят процессом: $process_name (PID: $pid)"
        else
            echo "⚪ Порт $port свободен"
        fi
    else
        echo "⚠️  lsof не найден, не могу проверить порты"
        break
    fi
done

echo ""
echo "📂 Проверяем важные файлы и папки..."

# Проверяем наличие важных файлов
files_to_check=(
    "server/.env"
    "server/package.json"
    "package.json"
    "server/node_modules"
    "node_modules"
    "server/dist"
    "server/logs"
)

for file in "${files_to_check[@]}"; do
    if [ -e "$file" ]; then
        echo "✅ $file существует"
    else
        echo "❌ $file отсутствует"
    fi
done

echo ""
echo "📋 Последние 10 строк логов сервера:"
echo ""
echo "--- Логи сервера ---"
if docker-compose logs --tail=10 server 2>/dev/null; then
    echo "✅ Логи получены"
else
    echo "⚠️  Не удалось получить логи сервера"
fi

echo ""
echo "--- Логи PostgreSQL ---"
if docker-compose logs --tail=5 postgres 2>/dev/null; then
    echo "✅ Логи PostgreSQL получены"
else
    echo "⚠️  Не удалось получить логи PostgreSQL"
fi

echo ""
echo "📈 Статистика Docker:"
echo "Запущенные контейнеры: $(docker ps -q | wc -l)"
echo "Всего контейнеров: $(docker ps -aq | wc -l)"

if command -v docker &> /dev/null; then
    docker_version=$(docker --version | cut -d' ' -f3 | cut -d',' -f1)
    echo "Версия Docker: $docker_version"
fi

echo ""
echo "💡 Полезные команды:"
echo "• Полные логи: docker-compose logs -f"
echo "• Перезапуск: docker-compose restart"
echo "• Остановка: ./stop-project-mac.sh"
echo "• Запуск: ./quick-start-mac.sh"
echo ""
echo "Нажмите Enter для продолжения..."
read -r 