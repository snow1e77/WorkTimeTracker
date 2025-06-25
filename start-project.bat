@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

echo ========================================
echo   Work Time Tracker - Полный запуск
echo ========================================

:: Переходим в папку проекта
cd /d "%~dp0"

:: Устанавливаем переменные окружения для Docker
set DOCKER_BUILDKIT=0
set COMPOSE_DOCKER_CLI_BUILD=0

echo.
echo [1/6] Проверяем наличие Docker...
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker не найден! Установите Docker Desktop и перезапустите скрипт.
    pause
    exit /b 1
)
echo ✅ Docker найден

echo.
echo [2/6] Проверяем наличие Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js не найден! Установите Node.js и перезапустите скрипт.
    pause
    exit /b 1
)
echo ✅ Node.js найден

echo.
echo [2.5/6] Проверяем наличие Docker Compose...
docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker Compose не найден! Убедитесь что Docker Desktop установлен корректно.
    pause
    exit /b 1
)
echo ✅ Docker Compose найден

echo.
echo [3/7] Проверяем наличие зависимостей...
if not exist "node_modules" (
    echo 📦 Устанавливаем зависимости основного проекта...
    call npm install
    if errorlevel 1 (
        echo ❌ Ошибка установки зависимостей основного проекта
        pause
        exit /b 1
    )
)

if not exist "server\node_modules" (
    echo 📦 Устанавливаем зависимости сервера...
    cd server
    call npm install
    cd ..
    if errorlevel 1 (
        echo ❌ Ошибка установки зависимостей сервера
        pause
        exit /b 1
    )
)
echo ✅ Зависимости проверены

echo.
echo [4/7] Останавливаем предыдущие контейнеры (если есть)...
docker-compose down >nul 2>&1

echo.
echo [5/7] Запускаем серверную часть через Docker...
echo 🐳 Запускаем Docker контейнеры...
docker-compose up -d
if errorlevel 1 (
    echo ❌ Ошибка запуска Docker контейнеров
    pause
    exit /b 1
)

echo ✅ Docker контейнеры запущены

:: Ждем несколько секунд для инициализации сервера
echo.
echo ⏳ Ждем инициализации сервера...
timeout /t 10 /nobreak >nul

echo.
echo [6/7] Проверяем состояние сервисов...
docker-compose ps

echo.
echo [7/7] Запускаем клиентское приложение...

:: Создаем новое окно для Expo
echo 🚀 Запускаем Expo в новом окне...
start "WorkTime Tracker - Expo" cmd /k "echo Запуск Expo... ; npm start"

echo.
echo ========================================
echo   ✅ Проект успешно запущен!
echo ========================================
echo.
echo 🌐 Доступные сервисы:
echo   • Сервер приложения: http://localhost:3001
echo   • PgAdmin (БД): http://localhost:5050
echo     Логин: admin@worktime.com ^| Пароль: admin
echo   • PostgreSQL: localhost:5433
echo     Пользователь: postgres ^| Пароль: postgres
echo.
echo 📱 Клиентское приложение:
echo   • Expo Metro запущен в отдельном окне
echo   • Используйте QR код для тестирования на устройстве
echo   • Или нажмите 'w' в Expo для веб-версии
echo.
echo 🛠️ Полезные команды:
echo   • Логи сервера: docker-compose logs -f server
echo   • Логи всех сервисов: docker-compose logs -f
echo   • Остановить Docker: docker-compose down
echo   • Пересобрать сервер: docker-compose up -d --build server
echo.
echo 💡 Для остановки всего проекта запустите: stop-project.bat
echo.
pause 