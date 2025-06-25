@echo off
chcp 65001 >nul

echo ========================================
echo   Work Time Tracker - Остановка
echo ========================================

:: Переходим в папку проекта
cd /d "%~dp0"

echo.
echo [1/3] Останавливаем Docker контейнеры...
docker-compose down
if errorlevel 1 (
    echo ❌ Ошибка остановки Docker контейнеров
) else (
    echo ✅ Docker контейнеры остановлены
)

echo.
echo [2/3] Завершаем процессы Node.js и Expo...
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM "Metro Bundler.exe" >nul 2>&1
echo ✅ Процессы завершены

echo.
echo [3/3] Очищаем порты...
:: Освобождаем порты, которые могли остаться занятыми
netsh interface portproxy delete v4tov4 listenport=3001 >nul 2>&1
netsh interface portproxy delete v4tov4 listenport=5433 >nul 2>&1
netsh interface portproxy delete v4tov4 listenport=5050 >nul 2>&1
netsh interface portproxy delete v4tov4 listenport=19000 >nul 2>&1
netsh interface portproxy delete v4tov4 listenport=19001 >nul 2>&1
netsh interface portproxy delete v4tov4 listenport=19002 >nul 2>&1
echo ✅ Порты очищены

echo.
echo ========================================
echo   ✅ Проект полностью остановлен!
echo ========================================
echo.
echo 💡 Для повторного запуска используйте: start-project.bat
echo.
pause 