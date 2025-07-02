#!/usr/bin/env pwsh

# PowerShell скрипт для создания тестового аккаунта рабочего
# Используется для тестирования приложения

Write-Host "🔧 Создание тестового аккаунта рабочего..." -ForegroundColor Cyan

# Переходим в папку сервера и запускаем создание
Set-Location -Path "server"

try {
    Write-Host "⚡ Запускаем создание тестового аккаунта..." -ForegroundColor Yellow
    npm run create-test-worker
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ Тестовый аккаунт успешно создан!" -ForegroundColor Green
        Write-Host "`n📱 Данные для входа:" -ForegroundColor White
        Write-Host "   Номер телефона: +79999999999" -ForegroundColor Yellow
        Write-Host "   Роль: worker" -ForegroundColor Yellow
        Write-Host "`n🚀 Инструкция для входа:" -ForegroundColor White
        Write-Host "   1. Запустите мобильное приложение" -ForegroundColor Gray
        Write-Host "   2. Введите номер телефона: +79999999999" -ForegroundColor Gray
        Write-Host "   3. Нажмите 'Войти' - вход произойдет автоматически" -ForegroundColor Gray
        Write-Host "   4. Готово! Можете сразу пользоваться приложением" -ForegroundColor Gray
        Write-Host "`n💡 Вход только по номеру телефона" -ForegroundColor Magenta
    } else {
        Write-Host "❌ Ошибка при создании тестового аккаунта" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Ошибка выполнения: $_" -ForegroundColor Red
    exit 1
} finally {
    # Возвращаемся в корневую папку
    Set-Location -Path ".."
}

Write-Host "`n🎉 Готово!" -ForegroundColor Green 