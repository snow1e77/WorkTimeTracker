#!/usr/bin/env pwsh
# Скрипт для запуска Work Time Tracker с Docker Compose
# Решает проблему с BuildKit bake

param(
    [switch]$Down,
    [switch]$Build,
    [switch]$Logs,
    [switch]$Status,
    [string]$Service = ""
)

# Переходим в корневую папку проекта
Set-Location $PSScriptRoot/..

Write-Host "========================================" -ForegroundColor Blue
Write-Host "  Work Time Tracker Docker Manager" -ForegroundColor Blue  
Write-Host "========================================" -ForegroundColor Blue

# Отключаем BuildKit для избежания проблем с bake
$env:DOCKER_BUILDKIT = 0
$env:COMPOSE_DOCKER_CLI_BUILD = 0

try {
    if ($Down) {
        Write-Host "Останавливаем все контейнеры..." -ForegroundColor Yellow
        docker-compose down
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Контейнеры успешно остановлены!" -ForegroundColor Green
        }
    }
    elseif ($Build) {
        Write-Host "Пересобираем и запускаем контейнеры..." -ForegroundColor Yellow
        docker-compose up -d --build
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Контейнеры успешно пересобраны и запущены!" -ForegroundColor Green
        }
    }
    elseif ($Logs) {
        if ($Service) {
            Write-Host "Показываем логи сервиса: $Service" -ForegroundColor Yellow
            docker-compose logs -f $Service
        } else {
            Write-Host "Показываем логи всех сервисов..." -ForegroundColor Yellow
            docker-compose logs -f
        }
    }
    elseif ($Status) {
        Write-Host "Статус контейнеров:" -ForegroundColor Yellow
        docker-compose ps
        Write-Host ""
        Write-Host "Доступные сервисы:" -ForegroundColor Blue
        Write-Host "  - Сервер приложения: http://localhost:3001" -ForegroundColor Green
        Write-Host "  - PgAdmin (БД): http://localhost:5050" -ForegroundColor Green
        Write-Host "  - PostgreSQL: localhost:5433" -ForegroundColor Green
        $nginxStatus = docker-compose ps | Select-String "worktime-nginx.*Up"
        if ($nginxStatus) {
            Write-Host "  - Nginx: http://localhost (80/443)" -ForegroundColor Green
        }
    }
    else {
        Write-Host "Запускаем контейнеры..." -ForegroundColor Yellow
        docker-compose up -d
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Контейнеры успешно запущены!" -ForegroundColor Green
            Write-Host ""
            Write-Host "Доступные сервисы:" -ForegroundColor Blue
            Write-Host "  - Сервер приложения: http://localhost:3001" -ForegroundColor Green
            Write-Host "  - PgAdmin (БД): http://localhost:5050" -ForegroundColor Green
            Write-Host "    Логин: admin@worktime.com | Пароль: admin" -ForegroundColor Cyan
            Write-Host "  - PostgreSQL: localhost:5433" -ForegroundColor Green
            Write-Host "    Пользователь: postgres | Пароль: postgres" -ForegroundColor Cyan
            
            # Проверяем nginx
            $nginxStatus = docker-compose ps | Select-String "worktime-nginx.*Up"
            if ($nginxStatus) {
                Write-Host "  - Nginx: http://localhost (80/443)" -ForegroundColor Green
            }
        }
    }
}
catch {
    Write-Host "Ошибка: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne $null) {
    Write-Host "Команда завершилась с ошибкой (код: $LASTEXITCODE)" -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host ""
Write-Host "Использование:" -ForegroundColor Blue
Write-Host "  .\scripts\start-docker.ps1          # Запустить все контейнеры" -ForegroundColor Yellow
Write-Host "  .\scripts\start-docker.ps1 -Down    # Остановить все контейнеры" -ForegroundColor Yellow
Write-Host "  .\scripts\start-docker.ps1 -Build   # Пересобрать и запустить" -ForegroundColor Yellow
Write-Host "  .\scripts\start-docker.ps1 -Status  # Показать статус" -ForegroundColor Yellow
Write-Host "  .\scripts\start-docker.ps1 -Logs    # Показать логи" -ForegroundColor Yellow
Write-Host "  .\scripts\start-docker.ps1 -Logs -Service server # Логи конкретного сервиса" -ForegroundColor Yellow 