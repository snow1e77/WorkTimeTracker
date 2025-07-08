#!/bin/bash

# 🚀 Автоматический скрипт развертывания WorkTimeTracker
# Сервер: 185.132.127.139 (AlmaLinux)
# Домен: gabygg.nu

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Конфигурация
DOMAIN="gabygg.nu"
SERVER_IP="185.132.127.139"
SERVER_USER="root"
SERVER_PASSWORD="aJttmb8rQuJIbvDP"
PROJECT_NAME="WorkTimeTracker"
PROJECT_DIR="/opt/$PROJECT_NAME"

# Функция логирования
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

# Проверка параметров
check_requirements() {
    log "Проверка системных требований..."
    
    command -v docker >/dev/null 2>&1 || { error "Docker не установлен. Установите Docker сначала."; }
    command -v docker-compose >/dev/null 2>&1 || { error "Docker Compose не установлен."; }
    command -v ssh >/dev/null 2>&1 || { error "SSH клиент не доступен."; }
    
    log "✅ Все требования выполнены"
}

# Функция для выполнения команд на сервере
exec_remote() {
    local cmd="$1"
    sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" "$cmd"
}

# Функция для копирования файлов на сервер
copy_to_server() {
    local src="$1"
    local dest="$2"
    sshpass -p "$SERVER_PASSWORD" scp -o StrictHostKeyChecking=no -r "$src" "$SERVER_USER@$SERVER_IP:$dest"
}

# Установка зависимостей на сервере
install_dependencies() {
    log "Установка зависимостей на сервере..."
    
    exec_remote "dnf update -y"
    exec_remote "dnf install -y epel-release"
    exec_remote "dnf install -y docker docker-compose git curl wget nano firewalld fail2ban sshpass"
    
    # Запуск Docker
    exec_remote "systemctl start docker"
    exec_remote "systemctl enable docker"
    
    # Настройка firewalld
    exec_remote "systemctl start firewalld"
    exec_remote "systemctl enable firewalld"
    exec_remote "firewall-cmd --permanent --add-service=http"
    exec_remote "firewall-cmd --permanent --add-service=https"
    exec_remote "firewall-cmd --permanent --add-service=ssh"
    exec_remote "firewall-cmd --reload"
    
    log "✅ Зависимости установлены"
}

# Генерация безопасных паролей
generate_passwords() {
    log "Генерация безопасных паролей..."
    
    export RANDOM_DB_PASSWORD=$(openssl rand -base64 32 | tr -d '/')
    export RANDOM_JWT_SECRET=$(openssl rand -base64 64 | tr -d '/')
    export RANDOM_REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d '/')
    
    info "Пароли сгенерированы и экспортированы в переменные окружения"
}

# Создание .env файла
create_env_file() {
    log "Создание .env файла..."
    
    cat > .env.production << EOF
# === PRODUCTION ENVIRONMENT ===
NODE_ENV=production
DOMAIN=$DOMAIN
SERVER_IP=$SERVER_IP

# === DATABASE ===
DB_PASSWORD=$RANDOM_DB_PASSWORD
DATABASE_URL=postgresql://worktime_user:$RANDOM_DB_PASSWORD@db:5432/worktime_tracker_prod

# === AUTHENTICATION ===
JWT_SECRET=$RANDOM_JWT_SECRET

# === REDIS ===
REDIS_PASSWORD=$RANDOM_REDIS_PASSWORD

# === API CONFIGURATION ===
API_RATE_LIMIT=100
AUTH_RATE_LIMIT=5
CORS_ORIGINS=https://$DOMAIN,https://www.$DOMAIN

# === SSL ===
SSL_EMAIL=admin@$DOMAIN

# === MONITORING ===
LOG_LEVEL=info
BACKUP_RETENTION_DAYS=30

# === GENERATED ON ===
GENERATED_AT=$(date)
EOF

    log "✅ .env файл создан"
}

# Подготовка проекта
prepare_project() {
    log "Подготовка проекта для развертывания..."
    
    # Создание необходимых директорий
    mkdir -p nginx/{logs,ssl,certbot-webroot}
    mkdir -p server/{logs,uploads,backups}
    mkdir -p redis/data
    
    # Копирование конфигураций
    generate_passwords
    create_env_file
    
    log "✅ Проект подготовлен"
}

# Копирование проекта на сервер
deploy_to_server() {
    log "Копирование проекта на сервер $SERVER_IP..."
    
    # Создание директории проекта
    exec_remote "mkdir -p $PROJECT_DIR"
    exec_remote "rm -rf $PROJECT_DIR/*"
    
    # Копирование файлов
    copy_to_server "./" "$PROJECT_DIR/"
    
    # Установка правильных прав
    exec_remote "chown -R root:root $PROJECT_DIR"
    exec_remote "chmod +x $PROJECT_DIR/deploy.sh"
    
    log "✅ Проект скопирован на сервер"
}

# Сборка и запуск контейнеров
build_and_start() {
    log "Сборка и запуск контейнеров..."
    
    exec_remote "cd $PROJECT_DIR && docker-compose -f docker-compose.production.yml down --remove-orphans"
    exec_remote "cd $PROJECT_DIR && docker-compose -f docker-compose.production.yml build --no-cache"
    exec_remote "cd $PROJECT_DIR && docker-compose -f docker-compose.production.yml up -d"
    
    log "✅ Контейнеры запущены"
}

# Настройка SSL сертификатов
setup_ssl() {
    log "Настройка SSL сертификатов для $DOMAIN..."
    
    # Получение SSL сертификатов
    exec_remote "cd $PROJECT_DIR && docker-compose -f docker-compose.production.yml run --rm certbot"
    
    # Перезапуск Nginx
    exec_remote "cd $PROJECT_DIR && docker-compose -f docker-compose.production.yml restart nginx"
    
    log "✅ SSL сертификаты настроены"
}

# Настройка автообновления SSL
setup_ssl_renewal() {
    log "Настройка автообновления SSL сертификатов..."
    
    exec_remote "echo '0 3 * * * cd $PROJECT_DIR && docker-compose -f docker-compose.production.yml run --rm certbot renew && docker-compose -f docker-compose.production.yml restart nginx' | crontab -"
    
    log "✅ Автообновление SSL настроено"
}

# Настройка бэкапов
setup_backups() {
    log "Настройка автоматических бэкапов..."
    
    # Создание скрипта бэкапа
    exec_remote "cat > $PROJECT_DIR/backup.sh << 'EOFBACKUP'
#!/bin/bash
DATE=\$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=\"$PROJECT_DIR/server/backups\"
mkdir -p \$BACKUP_DIR

# Бэкап базы данных
docker-compose -f $PROJECT_DIR/docker-compose.production.yml exec -T db pg_dump -U worktime_user worktime_tracker_prod | gzip > \$BACKUP_DIR/db_backup_\$DATE.sql.gz

# Бэкап файлов
tar -czf \$BACKUP_DIR/files_backup_\$DATE.tar.gz $PROJECT_DIR/server/uploads

# Удаление старых бэкапов (старше 30 дней)
find \$BACKUP_DIR -type f -mtime +30 -delete

echo \"Backup completed: \$DATE\"
EOFBACKUP"

    exec_remote "chmod +x $PROJECT_DIR/backup.sh"
    
    # Добавление в crontab (каждый день в 2:00)
    exec_remote "echo '0 2 * * * $PROJECT_DIR/backup.sh' | crontab -"
    
    log "✅ Автоматические бэкапы настроены"
}

# Проверка состояния
check_status() {
    log "Проверка состояния развертывания..."
    
    sleep 30  # Ждем запуска всех сервисов
    
    # Проверка Docker контейнеров
    exec_remote "cd $PROJECT_DIR && docker-compose -f docker-compose.production.yml ps"
    
    # Проверка доступности
    if curl -f -s "http://$DOMAIN/health" > /dev/null; then
        log "✅ Сайт доступен по HTTP"
    else
        warn "❌ Сайт недоступен по HTTP"
    fi
    
    if curl -f -s -k "https://$DOMAIN/health" > /dev/null; then
        log "✅ Сайт доступен по HTTPS"
    else
        warn "❌ Сайт недоступен по HTTPS (возможно, SSL еще настраивается)"
    fi
}

# Показать статистику
show_summary() {
    log "=== РАЗВЕРТЫВАНИЕ ЗАВЕРШЕНО ==="
    info "🌐 Домен: https://$DOMAIN"
    info "🖥️  Сервер: $SERVER_IP"
    info "📁 Директория: $PROJECT_DIR"
    info "🔐 Пароли сохранены в: .env.production"
    echo ""
    info "📋 ПОЛЕЗНЫЕ КОМАНДЫ:"
    info "   Просмотр логов: ssh $SERVER_USER@$SERVER_IP 'cd $PROJECT_DIR && docker-compose -f docker-compose.production.yml logs -f'"
    info "   Перезапуск: ssh $SERVER_USER@$SERVER_IP 'cd $PROJECT_DIR && docker-compose -f docker-compose.production.yml restart'"
    info "   Статус: ssh $SERVER_USER@$SERVER_IP 'cd $PROJECT_DIR && docker-compose -f docker-compose.production.yml ps'"
    echo ""
    log "🚀 WorkTimeTracker успешно развернут!"
}

# Основная функция
main() {
    case "${1:-deploy}" in
        "requirements")
            check_requirements
            ;;
        "prepare")
            prepare_project
            ;;
        "deploy")
            check_requirements
            install_dependencies
            prepare_project
            deploy_to_server
            build_and_start
            setup_ssl
            setup_ssl_renewal
            setup_backups
            check_status
            show_summary
            ;;
        "update")
            deploy_to_server
            build_and_start
            check_status
            ;;
        "ssl")
            setup_ssl
            ;;
        "status")
            check_status
            ;;
        *)
            echo "Использование: $0 {deploy|update|ssl|status|requirements|prepare}"
            echo ""
            echo "  deploy      - Полное развертывание (по умолчанию)"
            echo "  update      - Обновление приложения"
            echo "  ssl         - Настройка SSL"
            echo "  status      - Проверка статуса"
            echo "  requirements - Проверка требований"
            echo "  prepare     - Подготовка проекта"
            exit 1
            ;;
    esac
}

# Проверка наличия sshpass
if ! command -v sshpass >/dev/null 2>&1; then
    warn "sshpass не установлен. Установка..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install hudochenkov/sshpass/sshpass
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo apt-get update && sudo apt-get install -y sshpass || sudo dnf install -y sshpass || sudo yum install -y sshpass
    else
        error "Установите sshpass вручную для вашей ОС"
    fi
fi

# Запуск основной функции
main "$@" 