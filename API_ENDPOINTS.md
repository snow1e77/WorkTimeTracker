# API Endpoints Documentation

## Аутентификация

### Вход в систему (упрощенный)

**Endpoint:** `POST /api/auth/login`

**Описание:** Простой вход по номеру телефона

**Запрос:**
```json
{
  "phoneNumber": "+79999999999"
}
```

**Ответ (успешный):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid-here",
      "phoneNumber": "+79999999999",
      "name": "Тестовый Рабочий",
      "role": "worker",
      "isActive": true,
      "isVerified": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    "tokens": {
      "accessToken": "jwt-token-here",
      "refreshToken": "refresh-token-here"
    }
  }
}
```

**Ответ (пользователь не найден):**
```json
{
  "success": false,
  "error": "Ваш номер телефона не найден в системе. Обратитесь к прорабу или бригадиру для добавления в базу данных.",
  "needsContact": true
}
```

### Получение текущего пользователя

**Endpoint:** `GET /api/auth/me`

**Описание:** Получение информации о текущем аутентифицированном пользователе

**Headers:**
```
Authorization: Bearer <access_token>
```

**Ответ:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid-here",
      "phoneNumber": "+79999999999",
      "name": "Тестовый Рабочий",
      "role": "worker",
      "isActive": true,
      "isVerified": true
    }
  }
}
```

### Обновление токена

**Endpoint:** `POST /api/auth/refresh`

**Запрос:**
```json
{
  "refreshToken": "refresh-token-here"
}
```

**Ответ:**
```json
{
  "success": true,
  "data": {
    "accessToken": "new-jwt-token",
    "refreshToken": "new-refresh-token"
  }
}
```

### Выход из системы

**Endpoint:** `POST /api/auth/logout`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Запрос:**
```json
{
  "refreshToken": "refresh-token-here"
}
```

**Ответ:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

## Управление пользователями

### Регистрация пользователя (только админы)

**Endpoint:** `POST /api/users/register-user`

**Headers:**
```
Authorization: Bearer <admin_access_token>
```

**Запрос:**
```json
{
  "phoneNumber": "+79001234567",
  "name": "Иван Иванов",
  "role": "worker"
}
```

**Ответ:**
```json
{
  "success": true,
  "message": "Пользователь успешно зарегистрирован",
  "data": {
    "user": {
      "id": "uuid-here",
      "phoneNumber": "+79001234567",
      "name": "Иван Иванов",
      "role": "worker",
      "isActive": true,
      "isVerified": true
    }
  }
}
```

### Получение списка пользователей

**Endpoint:** `GET /api/users`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `page` (optional): Номер страницы (по умолчанию 1)
- `limit` (optional): Количество записей на странице (по умолчанию 20)
- `role` (optional): Фильтр по роли (worker, admin)
- `isActive` (optional): Фильтр по активности (true, false)
- `search` (optional): Поиск по имени или номеру телефона

**Ответ:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "uuid-here",
        "phoneNumber": "+79001234567",
        "name": "Иван Иванов",
        "role": "worker",
        "isActive": true,
        "isVerified": true,
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

## Строительные объекты

### Получение списка объектов

**Endpoint:** `GET /api/sites`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Ответ:**
```json
{
  "success": true,
  "data": {
    "sites": [
      {
        "id": "uuid-here",
        "name": "Объект №1",
        "address": "ул. Строительная, 1",
        "latitude": 55.7558,
        "longitude": 37.6173,
        "radius": 100,
        "isActive": true
      }
    ]
  }
}
```

### Создание объекта (только админы)

**Endpoint:** `POST /api/sites`

**Headers:**
```
Authorization: Bearer <admin_access_token>
```

**Запрос:**
```json
{
  "name": "Новый объект",
  "address": "ул. Новая, 123",
  "latitude": 55.7558,
  "longitude": 37.6173,
  "radius": 100
}
```

## Рабочие смены

### Начало смены

**Endpoint:** `POST /api/shifts/start`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Запрос:**
```json
{
  "siteId": "uuid-here",
  "location": {
    "latitude": 55.7558,
    "longitude": 37.6173
  },
  "notes": "Начало работы"
}
```

### Завершение смены

**Endpoint:** `POST /api/shifts/end`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Запрос:**
```json
{
  "location": {
    "latitude": 55.7558,
    "longitude": 37.6173
  },
  "notes": "Окончание работы"
}
```

## Уведомления

### Регистрация push токена

**Endpoint:** `POST /api/notifications/register-token`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Запрос:**
```json
{
  "pushToken": "expo-push-token-here",
  "deviceType": "android"
}
```

## Синхронизация

### Получение статуса синхронизации

**Endpoint:** `GET /api/sync/status`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Ответ:**
```json
{
  "success": true,
  "data": {
    "lastSync": "2024-01-01T12:00:00.000Z",
    "pendingChanges": 0,
    "isOnline": true
  }
}
```

---

## Коды ошибок

- `400` - Неверный запрос (валидация)
- `401` - Не аутентифицирован
- `403` - Нет прав доступа
- `404` - Ресурс не найден
- `429` - Слишком много запросов
- `500` - Внутренняя ошибка сервера

## Примечания

- ✅ **Простая аутентификация** - вход только по номеру телефона
- 🔒 **JWT токены** используются для аутентификации
- 📱 **Тестовый аккаунт**: +79999999999 (роль: worker)
- ⚡ **Rate limiting** настроен для защиты от злоупотреблений 