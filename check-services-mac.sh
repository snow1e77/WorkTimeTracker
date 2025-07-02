#!/bin/bash

echo "========================================"
echo "  Work Time Tracker - Проверка сервисов"
echo "========================================"

cd "$(dirname "$0")"

echo ""
echo "🔍 Проверяем состояние Docker контейнеров..."
docker-compose ps
echo ""

echo "🌐 Проверяем доступность сервисов..."

# Проверяем сервер приложения
echo "[1/3] Проверяем сервер приложения (http://localhost:3001)..."
if curl -s http://localhost:3001/api/health >/dev/null 2>&1; then
    echo "✅ Сервер приложения работает"
else
    echo "❌ Сервер приложения недоступен"
fi

# Проверяем PgAdmin
echo "[2/3] Проверяем PgAdmin (http://localhost:5050)..."
if curl -s http://localhost:5050 >/dev/null 2>&1; then
    echo "✅ PgAdmin работает"
else
    echo "❌ PgAdmin недоступен"
fi

# Проверяем PostgreSQL
echo "[3/3] Проверяем PostgreSQL (localhost:5433)..."
if docker exec worktime-postgres pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
    echo "✅ PostgreSQL работает"
else
    echo "❌ PostgreSQL недоступен"
fi

echo ""
echo "📊 Последние 10 строк логов сервера:"
echo ""
echo "--- Логи сервера ---"
docker-compose logs --tail=10 server

echo ""
echo "💡 Для полных логов используйте: docker-compose logs -f"
echo ""
echo "Нажмите Enter для продолжения..."
read -r 