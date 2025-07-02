#!/usr/bin/env pwsh

Write-Host "🔧 Создание тестового аккаунта рабочего..." -ForegroundColor Yellow

# Переходим в директорию сервера
Push-Location "$PSScriptRoot\..\server"

try {
    # Проверяем что база данных запущена
    Write-Host "📊 Проверяем подключение к базе данных..." -ForegroundColor Cyan
    
    # Запускаем скрипт создания тестового пользователя
    Write-Host "👷 Создаем тестового рабочего..." -ForegroundColor Cyan
    
    npm run create-test-worker
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Тестовый аккаунт успешно создан в основной таблице!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📱 Данные для входа:" -ForegroundColor White
        Write-Host "   Номер телефона: +79999999999" -ForegroundColor Yellow
        Write-Host "   SMS код: 123456" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "🚀 Инструкция для тестирования:" -ForegroundColor White
        Write-Host "   1. Запустите мобильное приложение на телефоне" -ForegroundColor Gray
        Write-Host "   2. Введите номер телефона: +79999999999" -ForegroundColor Gray
        Write-Host "   3. Введите код подтверждения: 123456" -ForegroundColor Gray
        Write-Host "   4. Готово! Можете сразу тестировать функционал рабочего" -ForegroundColor Gray
        Write-Host ""
        Write-Host "💡 Теперь без предварительной регистрации - пользователь создается сразу в основной таблице" -ForegroundColor Blue
    } else {
        Write-Host "❌ Ошибка при создании тестового аккаунта" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "💥 Ошибка: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "🎉 Готово! Тестовый аккаунт создан и готов к использованию" -ForegroundColor Green 