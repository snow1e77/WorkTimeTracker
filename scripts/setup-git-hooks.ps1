# Скрипт для настройки Git hooks в Windows окружении
# Убеждаемся, что husky и git hooks работают корректно

Write-Host "Настройка Git hooks для Windows..." -ForegroundColor Green

# Проверяем наличие Git
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Error "Git не найден в PATH. Установите Git и добавьте его в PATH."
    exit 1
}

# Проверяем наличие Node.js и npm
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Error "npm не найден в PATH. Установите Node.js."
    exit 1
}

# Устанавливаем husky если не установлен
Write-Host "Проверка установки husky..." -ForegroundColor Yellow
npm list husky --depth=0 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Установка husky..." -ForegroundColor Yellow
    npm install --save-dev husky
}

# Инициализируем husky
Write-Host "Инициализация husky..." -ForegroundColor Yellow
npx husky install

# Настраиваем core.hooksPath для git
Write-Host "Настройка git hooks path..." -ForegroundColor Yellow
git config core.hooksPath .husky

# Проверяем права выполнения файлов hooks
Write-Host "Проверка прав доступа к hooks..." -ForegroundColor Yellow
if (Test-Path ".husky/pre-commit") {
    Write-Host "pre-commit hook найден" -ForegroundColor Green
}

if (Test-Path ".husky/commit-msg") {
    Write-Host "commit-msg hook найден" -ForegroundColor Green
}

Write-Host "Git hooks настроены успешно!" -ForegroundColor Green
Write-Host "Теперь вы можете делать коммиты без WSL." -ForegroundColor Cyan 