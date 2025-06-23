# OpenSSL Installation Script for Windows
# Скрипт установки OpenSSL для Windows

Write-Host "🔧 Установка OpenSSL для Windows..." -ForegroundColor Green

# Проверка прав администратора
function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# Функция установки через Chocolatey
function Install-ViaChocolatey {
    Write-Host "📦 Проверка Chocolatey..." -ForegroundColor Yellow
    
    if (-not (Get-Command choco -ErrorAction SilentlyContinue)) {
        Write-Host "Chocolatey не найден. Устанавливаем..." -ForegroundColor Yellow
        
        # Установка Chocolatey
        Set-ExecutionPolicy Bypass -Scope Process -Force
        [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
        iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
        
        # Обновление PATH
        $env:PATH = [Environment]::GetEnvironmentVariable("PATH", "Machine") + ";" + [Environment]::GetEnvironmentVariable("PATH", "User")
        
        if (Get-Command choco -ErrorAction SilentlyContinue) {
            Write-Host "✅ Chocolatey успешно установлен" -ForegroundColor Green
        } else {
            Write-Host "❌ Не удалось установить Chocolatey" -ForegroundColor Red
            return $false
        }
    }
    
    Write-Host "📦 Установка OpenSSL через Chocolatey..." -ForegroundColor Yellow
    try {
        choco install openssl -y
        
        # Обновление PATH
        $env:PATH = [Environment]::GetEnvironmentVariable("PATH", "Machine") + ";" + [Environment]::GetEnvironmentVariable("PATH", "User")
        
        if (Get-Command openssl -ErrorAction SilentlyContinue) {
            Write-Host "✅ OpenSSL успешно установлен через Chocolatey" -ForegroundColor Green
            return $true
        } else {
            Write-Host "❌ OpenSSL установлен, но не найден в PATH" -ForegroundColor Red
            return $false
        }
    }
    catch {
        Write-Host "❌ Ошибка установки через Chocolatey: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Функция скачивания и установки вручную
function Install-Manually {
    Write-Host "📥 Ручная установка OpenSSL..." -ForegroundColor Yellow
    
    $downloadUrl = "https://slproweb.com/download/Win64OpenSSL_Light-3_1_4.exe"
    $installerPath = "$env:TEMP\OpenSSL-Win64.exe"
    
    try {
        Write-Host "Скачивание OpenSSL..." -ForegroundColor Yellow
        Invoke-WebRequest -Uri $downloadUrl -OutFile $installerPath -UseBasicParsing
        
        Write-Host "Запуск установщика..." -ForegroundColor Yellow
        Start-Process -FilePath $installerPath -ArgumentList "/VERYSILENT /NORESTART /DIR=C:\OpenSSL-Win64" -Wait
        
        # Добавление в PATH
        $opensslPath = "C:\OpenSSL-Win64\bin"
        if (Test-Path $opensslPath) {
            $currentPath = [Environment]::GetEnvironmentVariable("PATH", "Machine")
            if ($currentPath -notlike "*$opensslPath*") {
                [Environment]::SetEnvironmentVariable("PATH", "$currentPath;$opensslPath", "Machine")
                $env:PATH += ";$opensslPath"
            }
            
            Write-Host "✅ OpenSSL установлен в: $opensslPath" -ForegroundColor Green
            return $true
        } else {
            Write-Host "❌ Установка не удалась" -ForegroundColor Red
            return $false
        }
    }
    catch {
        Write-Host "❌ Ошибка ручной установки: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
    finally {
        if (Test-Path $installerPath) {
            Remove-Item $installerPath -Force
        }
    }
}

# Функция проверки установки
function Test-OpenSSLInstallation {
    try {
        $version = & openssl version 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ OpenSSL найден: $version" -ForegroundColor Green
            return $true
        } else {
            return $false
        }
    }
    catch {
        return $false
    }
}

# Основная логика
Write-Host "🔍 Проверка текущей установки OpenSSL..." -ForegroundColor Cyan

if (Test-OpenSSLInstallation) {
    Write-Host "✅ OpenSSL уже установлен!" -ForegroundColor Green
    & openssl version
    exit 0
}

Write-Host "❌ OpenSSL не найден. Начинаем установку..." -ForegroundColor Yellow

if (-not (Test-Administrator)) {
    Write-Host "⚠️ Для установки требуются права администратора" -ForegroundColor Yellow
    Write-Host "Запустите PowerShell от имени администратора и повторите попытку" -ForegroundColor Yellow
    
    # Попытка перезапуска с правами администратора
    $currentScript = $MyInvocation.MyCommand.Path
    Start-Process PowerShell -ArgumentList "-ExecutionPolicy Bypass -File `"$currentScript`"" -Verb RunAs
    exit 0
}

Write-Host "`n🔧 Выберите метод установки:" -ForegroundColor Cyan
Write-Host "1. Через Chocolatey (рекомендуется)" -ForegroundColor White
Write-Host "2. Ручная загрузка и установка" -ForegroundColor White

$choice = Read-Host "Введите номер (1-2)"

switch ($choice) {
    "1" { 
        $success = Install-ViaChocolatey
    }
    "2" { 
        $success = Install-Manually
    }
    default { 
        Write-Host "❌ Неверный выбор" -ForegroundColor Red
        exit 1
    }
}

if ($success) {
    Write-Host "`n✅ OpenSSL успешно установлен!" -ForegroundColor Green
    Write-Host "Теперь вы можете запустить setup-ssl.ps1 для настройки сертификатов" -ForegroundColor Cyan
    
    # Финальная проверка
    if (Test-OpenSSLInstallation) {
        Write-Host "`n📋 Версия OpenSSL:" -ForegroundColor Cyan
        & openssl version
    }
} else {
    Write-Host "`n❌ Не удалось установить OpenSSL" -ForegroundColor Red
    Write-Host "Попробуйте установить вручную с https://slproweb.com/products/Win32OpenSSL.html" -ForegroundColor Yellow
    exit 1
} 