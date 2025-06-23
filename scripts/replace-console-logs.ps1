# PowerShell скрипт для замены console.log на Winston logger

Write-Host "🔄 Начинаю замену console.log на winston logger..." -ForegroundColor Green

# Функция для обработки файлов
function Replace-ConsoleLogs {
    param(
        [string]$FilePath
    )
    
    $content = Get-Content $FilePath -Raw
    $originalContent = $content
    
    # Добавляем импорт logger если его нет
    if ($content -notmatch 'import.*logger.*from.*utils/logger' -and $content -match 'console\.(log|error|warn|info|debug)') {
        # Ищем место для добавления импорта
        if ($content -match "import.*from.*config/database") {
            $content = $content -replace "(import.*from.*config/database.*?;)", "`$1`nimport logger from '../utils/logger';"
        } elseif ($content -match "import.*from.*types") {
            $content = $content -replace "(import.*from.*types.*?;)", "`$1`nimport logger from '../utils/logger';"
        } elseif ($content -match "import.*from.*express") {
            $content = $content -replace "(import.*from.*express.*?;)", "`$1`nimport logger from '../utils/logger';"
        }
    }
    
    # Заменяем console.error на logger.error
    $content = $content -replace "console\.error\(\s*'([^']+)'[,\s]*([^)]*)\)", "logger.error('`$1', { error: `$2 })"
    $content = $content -replace "console\.error\(\s*`([^`]+)`[,\s]*([^)]*)\)", "logger.error('`$1', { error: `$2 })"
    $content = $content -replace "console\.error\(\s*([^,\)]+)\)", "logger.error(`$1)"
    
    # Заменяем console.log на logger.info
    $content = $content -replace "console\.log\(\s*'([^']+)'[,\s]*([^)]*)\)", "logger.info('`$1', { data: `$2 })"
    $content = $content -replace "console\.log\(\s*`([^`]+)`[,\s]*([^)]*)\)", "logger.info('`$1', { data: `$2 })"
    $content = $content -replace "console\.log\(\s*([^,\)]+)\)", "logger.info(`$1)"
    
    # Заменяем console.warn на logger.warn
    $content = $content -replace "console\.warn\(\s*'([^']+)'[,\s]*([^)]*)\)", "logger.warn('`$1', { data: `$2 })"
    $content = $content -replace "console\.warn\(\s*`([^`]+)`[,\s]*([^)]*)\)", "logger.warn('`$1', { data: `$2 })"
    $content = $content -replace "console\.warn\(\s*([^,\)]+)\)", "logger.warn(`$1)"
    
    # Заменяем console.info на logger.info
    $content = $content -replace "console\.info\(\s*'([^']+)'[,\s]*([^)]*)\)", "logger.info('`$1', { data: `$2 })"
    $content = $content -replace "console\.info\(\s*`([^`]+)`[,\s]*([^)]*)\)", "logger.info('`$1', { data: `$2 })"
    $content = $content -replace "console\.info\(\s*([^,\)]+)\)", "logger.info(`$1)"
    
    # Заменяем console.debug на logger.debug
    $content = $content -replace "console\.debug\(\s*'([^']+)'[,\s]*([^)]*)\)", "logger.debug('`$1', { data: `$2 })"
    $content = $content -replace "console\.debug\(\s*`([^`]+)`[,\s]*([^)]*)\)", "logger.debug('`$1', { data: `$2 })"
    $content = $content -replace "console\.debug\(\s*([^,\)]+)\)", "logger.debug(`$1)"
    
    # Сохраняем файл если были изменения
    if ($content -ne $originalContent) {
        Set-Content $FilePath -Value $content -Encoding UTF8
        Write-Host "✅ Обновлен: $FilePath" -ForegroundColor Green
        return $true
    }
    
    return $false
}

# Обрабатываем все TypeScript файлы в серверной части
$serverFiles = Get-ChildItem -Path "server/src" -Recurse -Filter "*.ts" | Where-Object { $_.Name -ne "logger.ts" }
$updatedCount = 0

foreach ($file in $serverFiles) {
    if (Replace-ConsoleLogs -FilePath $file.FullName) {
        $updatedCount++
    }
}

Write-Host "🎉 Замена завершена! Обновлено файлов: $updatedCount" -ForegroundColor Green
Write-Host "📝 Не забудьте проверить импорты logger в файлах" -ForegroundColor Yellow 