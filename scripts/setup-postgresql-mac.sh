#!/bin/bash

# Setup PostgreSQL for WorkTime Tracker on macOS
# Этот скрипт настраивает PostgreSQL базу данных для проекта

# Параметры по умолчанию
DB_HOST="localhost"
PORT="5432"
DATABASE="worktime_tracker"
USER="worktime_user"
USE_DOCKER=false
FORCE=false

# Парсинг аргументов
while [[ $# -gt 0 ]]; do
    case $1 in
        --host)
            DB_HOST="$2"
            shift 2
            ;;
        --port)
            PORT="$2"
            shift 2
            ;;
        --database)
            DATABASE="$2"
            shift 2
            ;;
        --user)
            USER="$2"
            shift 2
            ;;
        --use-docker)
            USE_DOCKER=true
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        --help)
            echo "Использование: $0 [опции]"
            echo "Опции:"
            echo "  --host HOST        Хост базы данных (по умолчанию: localhost)"
            echo "  --port PORT        Порт базы данных (по умолчанию: 5432)"
            echo "  --database DB      Имя базы данных (по умолчанию: worktime_tracker)"
            echo "  --user USER        Имя пользователя БД (по умолчанию: worktime_user)"
            echo "  --use-docker       Использовать Docker для PostgreSQL"
            echo "  --force           Пересоздать существующие контейнеры/БД"
            echo "  --help            Показать эту справку"
            exit 0
            ;;
        *)
            echo "Неизвестная опция: $1"
            echo "Используйте --help для справки"
            exit 1
            ;;
    esac
done

echo "🐘 Настройка PostgreSQL для WorkTime Tracker на macOS"
echo "======================================================"

# Функция для проверки установки PostgreSQL
check_postgresql_installed() {
    if command -v psql &> /dev/null; then
        return 0
    else
        return 1
    fi
}

# Функция для проверки установки Docker
check_docker_installed() {
    if command -v docker &> /dev/null && docker --version &> /dev/null; then
        return 0
    else
        return 1
    fi
}

# Функция для проверки установки Homebrew
check_homebrew_installed() {
    if command -v brew &> /dev/null; then
        return 0
    else
        return 1
    fi
}

if [ "$USE_DOCKER" = true ]; then
    echo "🐳 Использование Docker для PostgreSQL..."
    
    if ! check_docker_installed; then
        echo "❌ Docker не установлен! Установите Docker Desktop."
        echo "Скачать: https://www.docker.com/products/docker-desktop/"
        exit 1
    fi
    
    # Проверяем, запущен ли контейнер
    existing_container=$(docker ps -a --filter "name=worktime-postgres" --format "{{.Names}}" 2>/dev/null)
    
    if [ ! -z "$existing_container" ] && [ "$FORCE" = false ]; then
        echo "⚠️  Контейнер worktime-postgres уже существует."
        echo "Используйте --force для пересоздания контейнера."
        exit 1
    fi
    
    if [ ! -z "$existing_container" ] && [ "$FORCE" = true ]; then
        echo "🗑️  Удаление существующего контейнера..."
        docker stop worktime-postgres 2>/dev/null || true
        docker rm worktime-postgres 2>/dev/null || true
    fi
    
    echo "🚀 Запуск PostgreSQL в Docker..."
    docker-compose up -d postgres
    
    sleep 10
    
    echo "✅ PostgreSQL запущен в Docker!"
    echo "📝 Параметры подключения:"
    echo "   Host: localhost"
    echo "   Port: 5432"
    echo "   Database: worktime_tracker"
    echo "   User: postgres"
    echo "   Password: postgres"
else
    echo "🔧 Настройка существующего PostgreSQL..."
    
    if ! check_postgresql_installed; then
        echo "❌ PostgreSQL не установлен!"
        
        if check_homebrew_installed; then
            echo "🍺 Устанавливаем PostgreSQL через Homebrew..."
            brew install postgresql@15
            brew services start postgresql@15
        else
            echo "❌ Homebrew не установлен!"
            echo "Установите Homebrew: /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
            echo "Затем выполните: brew install postgresql@15"
            echo "Или используйте флаг --use-docker"
            exit 1
        fi
    fi
    
    # Запрашиваем пароль
    echo -n "Введите пароль для пользователя $USER: "
    read -s PASSWORD
    echo ""
    
    echo "📋 Создание базы данных и пользователя..."
    
    # SQL команды для создания БД и пользователя
    create_db_sql="
-- Создание пользователя (игнорируем ошибку если уже существует)
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$USER') THEN
        CREATE ROLE $USER LOGIN PASSWORD '$PASSWORD';
    END IF;
END
\$\$;

-- Создание базы данных (если не существует)
SELECT 'CREATE DATABASE $DATABASE'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DATABASE')\\gexec

-- Назначение прав
GRANT ALL PRIVILEGES ON DATABASE $DATABASE TO $USER;
GRANT CONNECT ON DATABASE $DATABASE TO $USER;

-- Переключаемся на нашу БД и даем права на схему
\\c $DATABASE
GRANT ALL ON SCHEMA public TO $USER;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $USER;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $USER;
"
    
    # Выполняем SQL команды
    echo "$create_db_sql" | psql -h "$DB_HOST" -p "$PORT" -U postgres -d postgres
    
    if [ $? -eq 0 ]; then
        echo "✅ База данных и пользователь созданы успешно!"
    else
        echo "❌ Ошибка создания базы данных"
        echo "Возможно нужно ввести пароль суперпользователя PostgreSQL"
        exit 1
    fi
    
    # Обновляем .env файл
    echo "📝 Обновление файла server/.env..."
    
    env_file="server/.env"
    if [ ! -f "$env_file" ]; then
        if [ -f "server/env.example" ]; then
            cp server/env.example "$env_file"
        else
            touch "$env_file"
        fi
    fi
    
    # Обновляем настройки БД в .env
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS version of sed
        sed -i '' "s/^DB_HOST=.*/DB_HOST=$DB_HOST/" "$env_file"
        sed -i '' "s/^DB_PORT=.*/DB_PORT=$PORT/" "$env_file"
        sed -i '' "s/^DB_NAME=.*/DB_NAME=$DATABASE/" "$env_file"
        sed -i '' "s/^DB_USER=.*/DB_USER=$USER/" "$env_file"
        sed -i '' "s/^DB_PASSWORD=.*/DB_PASSWORD=$PASSWORD/" "$env_file"
    else
        # Linux version of sed
        sed -i "s/^DB_HOST=.*/DB_HOST=$DB_HOST/" "$env_file"
        sed -i "s/^DB_PORT=.*/DB_PORT=$PORT/" "$env_file"
        sed -i "s/^DB_NAME=.*/DB_NAME=$DATABASE/" "$env_file"
        sed -i "s/^DB_USER=.*/DB_USER=$USER/" "$env_file"
        sed -i "s/^DB_PASSWORD=.*/DB_PASSWORD=$PASSWORD/" "$env_file"
    fi
    
    echo "✅ Файл .env обновлен"
fi

# Проверяем наличие зависимостей сервера
echo "📦 Проверка зависимостей сервера..."
if [ ! -d "server/node_modules" ]; then
    echo "Устанавливаем зависимости сервера..."
    cd server && npm install && cd ..
fi

# Выполняем миграции
echo "🗄️  Выполнение миграций базы данных..."
cd server

if [ ! -f "dist/config/database.js" ]; then
    echo "📦 Сборка сервера..."
    npm run build
fi

npm run migrate

if [ $? -eq 0 ]; then
    echo "✅ Миграции выполнены успешно!"
else
    echo "❌ Ошибка выполнения миграций"
    echo "Попробуйте выполнить миграции вручную: cd server && npm run migrate"
fi

cd ..

# Проверка подключения
echo "🔍 Проверка подключения к базе данных..."

cd server
if [ -f "dist/config/database.js" ]; then
    node -e "
        const { testConnection } = require('./dist/config/database.js');
        testConnection().then(success => {
            if (success) {
                console.log('✅ Подключение к базе данных успешно!');
                process.exit(0);
            } else {
                console.log('❌ Не удалось подключиться к базе данных');
                process.exit(1);
            }
        }).catch(err => {
            console.log('❌ Ошибка подключения:', err.message);
            process.exit(1);
        });
    "
    if [ $? -eq 0 ]; then
        echo "✅ Подключение работает!"
    fi
else
    echo "⚠️  Не удалось проверить подключение. Убедитесь что сервер собран (npm run build)"
fi
cd ..

echo ""
echo "🎉 Настройка PostgreSQL завершена!"
echo "=================================="
echo ""
echo "📋 Следующие шаги:"
echo "1. Установите зависимости: npm install"
echo "2. Запустите сервер: npm run server:dev"
echo "3. Запустите приложение: npm start"
echo ""
echo "💡 Для автоматического запуска всего проекта используйте:"
echo "./quick-start-mac.sh" 