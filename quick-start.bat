@echo off
chcp 65001 >nul

echo ========================================
echo   Work Time Tracker - Быстрый запуск
echo ========================================

:: Переходим в папку проекта
cd /d "%~dp0"

:: Устанавливаем переменные окружения для Docker
set DOCKER_BUILDKIT=0
set COMPOSE_DOCKER_CLI_BUILD=0

echo.
echo 🐳 Запускаем Docker контейнеры...
docker-compose up -d

echo.
echo ⏳ Ожидание инициализации... (5 сек)
timeout /t 5 /nobreak >nul

echo.
echo 🚀 Запускаем Expo...
start "WorkTime Tracker - Expo" cmd /k "npm start"

echo.
echo ✅ Проект запущен!
echo.
echo 🌐 Сервисы:
echo   • Сервер: http://localhost:3001
echo   • PgAdmin: http://localhost:5050
echo   • PostgreSQL: localhost:5433
echo.
echo 📱 Expo запущен в отдельном окне
echo.
pause 