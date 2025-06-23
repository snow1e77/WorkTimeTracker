# 🔒 Настройка безопасности WorkTimeTracker

## Быстрая настройка

### 1. Создание файлов окружения

```bash
# Скопируйте пример файла окружения
cp server/env.example server/.env
```

### 2. Генерация секретов

Запустите скрипт для генерации безопасных секретов:

```bash
# Windows PowerShell
.\scripts\generate-production-secrets.ps1

# Или вручную создайте секреты
```

### 3. Настройка переменных окружения

Отредактируйте `server/.env` и установите следующие значения:

```env
# Сгенерируйте сильный JWT секрет (минимум 32 символа)
JWT_SECRET=your_generated_jwt_secret_here

# Установите сильный пароль базы данных
DB_PASSWORD=your_secure_database_password

# Настройте Twilio для SMS (если используется)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=your_twilio_number
```

### 4. Создание папки secrets (опционально)

Если вы используете отдельные файлы для секретов:

```bash
mkdir secrets
echo "your_jwt_secret_here" > secrets/jwt_secret.txt
echo "your_db_password_here" > secrets/db_password.txt
```

**⚠️ ВАЖНО:** Файлы в папке `secrets/` автоматически исключены из Git!

## 🛡️ Рекомендации по безопасности

### Для разработки:
- Используйте локальные `.env` файлы
- Не коммитьте реальные секреты в Git
- Регулярно ротируйте JWT секреты

### Для production:
- Используйте переменные окружения или секретные менеджеры
- Установите сильные пароли (минимум 16 символов)
- Включите SSL для базы данных (`DB_SSL=true`)
- Настройте CORS только для необходимых доменов

## 🔑 Генерация безопасных паролей

### JWT Secret (PowerShell):
```powershell
[System.Web.Security.Membership]::GeneratePassword(64, 10)
```

### Database Password:
```powershell
-join ((65..90) + (97..122) + (48..57) + (33,35,36,37,38,42,43,45,61,63,64) | Get-Random -Count 24 | % {[char]$_})
```

## 📁 Структура секретов

```
WorkTimeTracker/
├── server/
│   ├── .env                 # Основные переменные окружения
│   └── env.example         # Пример конфигурации
├── secrets/                # Папка для секретных файлов (игнорируется Git)
│   ├── jwt_secret.txt      # JWT ключ
│   └── db_password.txt     # Пароль БД
└── .gitignore              # Правила исключения
```

## ⛔ Что НЕ нужно коммитить

- Файлы `.env`
- Папку `secrets/`
- Файлы `*.key`, `*.pem`, `*.cert`
- Логи и временные файлы
- Production конфигурации с реальными данными

## 🚨 Если секреты попали в Git

1. Удалите их из отслеживания:
```bash
git rm --cached secrets/*
git commit -m "Remove secrets from git"
```

2. Смените все скомпрометированные секреты
3. Проверьте историю Git на наличие других секретов

## 📞 Контакты

При обнаружении проблем безопасности обратитесь к команде разработки. 