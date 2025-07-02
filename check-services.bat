@echo off
chcp 65001 >nul

echo ========================================
echo   Work Time Tracker - Проверка сервисов
echo ========================================

cd /d "%~dp0"

echo.
echo 🔍 Проверяем состояние Docker контейнеров...
docker-compose ps
echo.

echo 🌐 Проверяем доступность сервисов...

:: Проверяем сервер приложения
echo [1/3] Проверяем сервер приложения (http://localhost:3001)...
curl -s http://localhost:3001/api/health >nul 2>&1
if errorlevel 1 (
    echo ❌ Сервер приложения недоступен
) else (
    echo ✅ Сервер приложения работает
)

:: Проверяем PgAdmin
echo [2/3] Проверяем PgAdmin (http://localhost:5050)...
curl -s http://localhost:5050 >nul 2>&1
if errorlevel 1 (
    echo ❌ PgAdmin недоступен
) else (
    echo ✅ PgAdmin работает
)

:: Проверяем PostgreSQL
echo [3/3] Проверяем PostgreSQL (localhost:5433)...
docker exec worktime-postgres pg_isready -h localhost -p 5432 >nul 2>&1
if errorlevel 1 (
    echo ❌ PostgreSQL недоступен
) else (
    echo ✅ PostgreSQL работает
)

echo.
echo 📊 Состояние логов последние 10 строк:
echo.
echo "--- Логи сервера ---"
docker-compose logs --tail=10 server

echo.
echo 💡 Для полных логов используйте: docker-compose logs -f
echo.
pause 