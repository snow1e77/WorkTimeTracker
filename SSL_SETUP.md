# 🔐 Настройка SSL сертификатов для WorkTime Tracker

## Быстрый старт

### 1. Для разработки (самоподписанный сертификат)

```powershell
# Запустите в PowerShell от имени администратора
cd WorkTimeTracker
.\scripts\setup-ssl.ps1 -SelfSigned -Domain "localhost"
```

### 2. Для продакшн (Let's Encrypt)

```powershell
# Замените yourdomain.com на ваш реальный домен
.\scripts\setup-ssl.ps1 -LetsEncrypt -Domain "yourdomain.com" -Production
```

## 📋 Предварительные требования

### Установка OpenSSL

```powershell
# Автоматическая установка OpenSSL
.\scripts\install-openssl.ps1
```

Или установите вручную:
- **Chocolatey**: `choco install openssl`
- **Ручная загрузка**: [Win32/Win64 OpenSSL](https://slproweb.com/products/Win32OpenSSL.html)

## 🔧 Различные сценарии настройки

### Сценарий 1: Локальная разработка

```powershell
# Создание самоподписанного сертификата для localhost
.\scripts\setup-ssl.ps1 -SelfSigned -Domain "localhost"

# Запуск с SSL
docker-compose -f docker-compose.yml -f docker-compose.ssl.yml up -d

# Откройте https://localhost в браузере
# Подтвердите исключение безопасности для самоподписанного сертификата
```

### Сценарий 2: Тестирование с кастомным доменом

```powershell
# Добавьте в файл hosts (C:\Windows\System32\drivers\etc\hosts):
# 127.0.0.1 myapp.local

# Создайте сертификат для кастомного домена
.\scripts\setup-ssl.ps1 -SelfSigned -Domain "myapp.local"

# Запустите приложение
docker-compose -f docker-compose.yml -f docker-compose.ssl.yml up -d

# Откройте https://myapp.local
```

### Сценарий 3: Продакшн сервер

```powershell
# На сервере с публичным IP и доменом
.\scripts\setup-ssl.ps1 -LetsEncrypt -Domain "yourdomain.com" -Production

# Следуйте инструкциям для настройки Certbot
# Обновите DNS записи вашего домена

# Запустите в продакшн режиме
docker-compose -f docker-compose.prod.yml up -d
```

## 📁 Структура SSL файлов

```
nginx/
├── ssl/
│   ├── cert.pem                 # SSL сертификат
│   ├── key.pem                  # Приватный ключ
│   ├── dhparam.pem              # Параметры Diffie-Hellman
│   ├── openssl.conf             # Конфигурация OpenSSL
│   └── lets-encrypt-instructions.txt
├── ssl.conf                     # Современная SSL конфигурация
├── nginx.conf                   # Основная конфигурация
└── nginx.prod.conf              # Продакшн конфигурация
```

## 🔍 Проверка SSL

### Проверка сертификата

```powershell
# Проверка сертификата
openssl x509 -in nginx/ssl/cert.pem -text -noout

# Проверка соответствия ключа и сертификата
openssl rsa -noout -modulus -in nginx/ssl/key.pem | openssl md5
openssl x509 -noout -modulus -in nginx/ssl/cert.pem | openssl md5
```

### Онлайн проверка

- **SSL Labs**: https://www.ssllabs.com/ssltest/
- **Mozilla Observatory**: https://observatory.mozilla.org/

## 🔒 Настройки безопасности

### Современные шифры (TLS 1.2 и 1.3)

```nginx
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
ssl_prefer_server_ciphers off;
```

### Заголовки безопасности

```nginx
# HSTS
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

# Защита от XSS
add_header X-XSS-Protection "1; mode=block" always;

# Защита от MIME-type sniffing
add_header X-Content-Type-Options "nosniff" always;

# Защита от clickjacking
add_header X-Frame-Options "DENY" always;
```

## 🔄 Обновление сертификатов

### Let's Encrypt (автоматическое)

```bash
# На Linux сервере
sudo crontab -e

# Добавьте строку для автоматического обновления
0 12 * * * /usr/bin/certbot renew --quiet && docker-compose restart nginx
```

### Самоподписанные (ручное)

```powershell
# Пересоздание самоподписанного сертификата
.\scripts\setup-ssl.ps1 -SelfSigned -Domain "localhost"

# Перезапуск контейнеров
docker-compose restart nginx
```

## 🚨 Устранение проблем

### Ошибка "OpenSSL не найден"

```powershell
# Установите OpenSSL
.\scripts\install-openssl.ps1

# Или добавьте в PATH вручную
$env:PATH += ";C:\OpenSSL-Win64\bin"
```

### Ошибка "Certificate verify failed"

```bash
# Проверьте системное время
# Убедитесь, что сертификат не просрочен
openssl x509 -in nginx/ssl/cert.pem -dates -noout
```

### Браузер не доверяет сертификату

Для самоподписанных сертификатов:
1. Нажмите "Дополнительно" в браузере
2. Выберите "Перейти на localhost (небезопасно)"
3. Или добавьте сертификат в доверенные в настройках браузера

### Nginx не запускается

```powershell
# Проверьте конфигурацию
docker-compose exec nginx nginx -t

# Проверьте логи
docker-compose logs nginx
```

## 📖 Дополнительные ресурсы

- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [OWASP Transport Layer Protection](https://owasp.org/www-project-cheat-sheets/cheatsheets/Transport_Layer_Protection_Cheat_Sheet.html)

## 🔧 Кастомизация

### Изменение домена

```powershell
# Обновите конфигурацию для нового домена
.\scripts\setup-ssl.ps1 -SelfSigned -Domain "newdomain.local"
```

### Добавление поддоменов

Отредактируйте `nginx/ssl/openssl.conf`:

```ini
[alt_names]
DNS.1 = yourdomain.com
DNS.2 = www.yourdomain.com
DNS.3 = api.yourdomain.com
DNS.4 = admin.yourdomain.com
```

### Настройка портов

В `docker-compose.ssl.yml`:

```yaml
services:
  nginx:
    ports:
      - "80:80"
      - "443:443"
      - "8443:8443"  # Дополнительный HTTPS порт
```

## ⚠️ Важные замечания

1. **Никогда не коммитьте приватные ключи** в Git
2. **Используйте сильные пароли** для защиты ключей
3. **Регулярно обновляйте сертификаты** 
4. **Мониторьте истечение сертификатов**
5. **Делайте резервные копии** SSL файлов

---

💡 **Совет**: После настройки SSL проверьте конфигурацию с помощью SSL Labs Test для получения оценки безопасности. 