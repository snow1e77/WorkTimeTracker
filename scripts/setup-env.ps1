#!/usr/bin/env pwsh

Write-Host "🔧 Настройка переменных окружения..." -ForegroundColor Yellow

# Переходим в папку сервера
$serverPath = "$PSScriptRoot\..\server"
Push-Location $serverPath

try {
    # Проверяем существование .env файла
    if (Test-Path ".env") {
        Write-Host "📄 Файл .env уже существует" -ForegroundColor Green
        $overwrite = Read-Host "Хотите перезаписать его? (y/N)"
        if ($overwrite -ne "y" -and $overwrite -ne "Y") {
            Write-Host "✅ Оставляем существующий .env файл" -ForegroundColor Green
            return
        }
    }

    # Проверяем существование env.example
    if (-not (Test-Path "env.example")) {
        Write-Host "❌ Файл env.example не найден!" -ForegroundColor Red
        exit 1
    }

    Write-Host "📝 Создаем .env файл из env.example..." -ForegroundColor Cyan

    # Читаем содержимое env.example
    $envContent = Get-Content "env.example" -Raw
    
    # Заменяем placeholder значения на значения для разработки
    $envContent = $envContent -replace 'your_secure_database_password_here', 'postgres'
    $envContent = $envContent -replace 'your_super_secret_jwt_key_here_minimum_32_characters_please_change_this', 'development_jwt_secret_key_change_in_production_32_chars_minimum'
    $envContent = $envContent -replace 'NODE_ENV=development', 'NODE_ENV=development'
    $envContent = $envContent -replace 'LOG_LEVEL=info', 'LOG_LEVEL=debug'
    $envContent = $envContent -replace 'HELMET_CSP_ENABLED=true', 'HELMET_CSP_ENABLED=false'
    $envContent = $envContent -replace 'DB_HOST=localhost', 'DB_HOST=localhost'
    $envContent = $envContent -replace 'DB_PORT=5432', 'DB_PORT=5433'

    # Сохраняем в .env файл
    $envContent | Out-File -FilePath ".env" -Encoding UTF8

    Write-Host ""
    Write-Host "✅ Файл .env успешно создан!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🔑 Настроенные значения для разработки:" -ForegroundColor White
    Write-Host "   • База данных: postgres/postgres@localhost:5433" -ForegroundColor Gray
    Write-Host "   • JWT Secret: development ключ (измените в production!)" -ForegroundColor Gray
    Write-Host "   • Логирование: debug уровень" -ForegroundColor Gray
    Write-Host ""
    Write-Host "⚠️  ВАЖНО: Перед деплоем в production обновите все секреты!" -ForegroundColor Red

} catch {
    Write-Host "💥 Ошибка: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "🎉 Настройка завершена!" -ForegroundColor Green 