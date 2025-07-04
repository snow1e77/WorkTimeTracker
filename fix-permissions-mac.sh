#!/bin/bash

echo "🔧 Установка прав выполнения для скриптов macOS"
echo "================================================"

# Переходим в папку проекта
cd "$(dirname "$0")"

echo ""
echo "📂 Установка прав выполнения для shell скриптов..."

# Массив скриптов для установки прав
scripts=(
    "check-services-mac.sh"
    "create-test-worker.sh"
    "quick-start-mac.sh"
    "stop-project-mac.sh"
    "scripts/setup-postgresql-mac.sh"
    "fix-permissions-mac.sh"
)

success_count=0
total_count=${#scripts[@]}

for script in "${scripts[@]}"; do
    if [ -f "$script" ]; then
        chmod +x "$script"
        if [ $? -eq 0 ]; then
            echo "✅ $script - права установлены"
            ((success_count++))
        else
            echo "❌ $script - ошибка установки прав"
        fi
    else
        echo "⚠️  $script - файл не найден"
    fi
done

echo ""
echo "📊 Результат: $success_count из $total_count скриптов обработано"

echo ""
echo "🔍 Проверка текущих прав:"
for script in "${scripts[@]}"; do
    if [ -f "$script" ]; then
        permissions=$(ls -la "$script" | awk '{print $1}')
        echo "$permissions $script"
    fi
done

echo ""
echo "✅ Готово! Теперь вы можете запускать скрипты:"
echo ""
echo "🚀 Основные команды:"
echo "  ./quick-start-mac.sh       - Полная настройка и запуск"
echo "  ./stop-project-mac.sh      - Остановка всех сервисов"
echo "  ./check-services-mac.sh    - Проверка состояния"
echo "  ./create-test-worker.sh    - Создание тестового пользователя"
echo ""
echo "🔧 Дополнительные:"
echo "  ./scripts/setup-postgresql-mac.sh  - Настройка PostgreSQL"
echo "" 