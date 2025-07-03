@echo off
echo Тестирование аутентификации в WorkTime Tracker
echo =============================================
echo.
echo Запускаем приложение для тестирования входа...
echo.
echo Проверьте в консоли Metro следующие сообщения:
echo - AuthService.login: Starting login process
echo - AuthService.login: Tokens and user saved successfully
echo - AuthContext login successful
echo - Navigating to Home screen after authentication
echo.
echo Если вход не происходит сразу, проверьте:
echo 1. Сохранились ли токены в AsyncStorage
echo 2. Обновилось ли состояние AuthContext
echo 3. Произошла ли навигация к Home экрану
echo.
echo Для отладки откройте React Native Debugger
echo или используйте console.log в Metro
echo.
pause 