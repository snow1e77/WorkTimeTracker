# WorkTime Tracker API Documentation

## Базовая информация
- **Base URL**: `http://localhost:3001/api`
- **Аутентификация**: Bearer Token (JWT)
- **Формат данных**: JSON

## Роуты аутентификации (`/auth`)

### POST `/auth/send-code`
Отправка SMS кода для входа/регистрации
```json
{
  "phoneNumber": "+79001234567"
}
```

### POST `/auth/login`
Вход в систему с помощью SMS кода
```json
{
  "phoneNumber": "+79001234567",
  "code": "123456"
}
```

### POST `/auth/register`
Регистрация нового пользователя
```json
{
  "phoneNumber": "+79001234567",
  "name": "Иван Иванов",
  "code": "123456"
}
```

### POST `/auth/refresh`
Обновление токена доступа
```json
{
  "refreshToken": "refresh_token_here"
}
```

### POST `/auth/logout`
Выход из системы

## Роуты пользователей (`/users`)

### GET `/users`
Получение списка пользователей (только для админов)
- **Query params**: `page`, `limit`, `role`, `isActive`, `search`

### GET `/users/:userId`
Получение информации о пользователе

### PUT `/users/:userId`
Обновление пользователя

### DELETE `/users/:userId`
Удаление пользователя (только для админов)

### PUT `/users/:userId/password`
Изменение пароля пользователя

### GET `/users/:userId/assignments`
Получение назначений пользователя

### GET `/users/:userId/shifts`
Получение смен пользователя

### GET `/users/workers`
Получение списка работников (только для админов)

### POST `/users/bulk-update`
Массовое обновление пользователей (только для админов)

## Роуты строительных объектов (`/sites`)

### GET `/sites`
Получение списка строительных объектов
- **Query params**: `page`, `limit`, `isActive`, `search`, `userSites`

### POST `/sites`
Создание нового строительного объекта (только для админов)

### GET `/sites/:siteId`
Получение информации о строительном объекте

### PUT `/sites/:siteId`
Обновление строительного объекта (только для админов)

### DELETE `/sites/:siteId`
Удаление строительного объекта (только для админов)

### GET `/sites/my`
Получение строительных объектов пользователя

### GET `/sites/stats`
Получение статистики объектов (только для админов)

### POST `/sites/:siteId/check-location`
Проверка нахождения в радиусе объекта

### GET `/sites/:siteId/assignments`
Получение назначений для объекта (только для админов)

### GET `/sites/:siteId/shifts`
Получение смен для объекта (только для админов)

## Роуты назначений (`/assignments`)

### GET `/assignments`
Получение списка назначений
- **Query params**: `page`, `limit`, `isActive`, `userId`, `siteId`, `assignedBy`

### POST `/assignments`
Создание нового назначения (только для админов)

### GET `/assignments/:assignmentId`
Получение информации о назначении

### PUT `/assignments/:assignmentId`
Обновление назначения (только для админов)

### DELETE `/assignments/:assignmentId`
Удаление назначения (только для админов)

### GET `/assignments/my`
Получение назначений пользователя

### GET `/assignments/stats`
Получение статистики назначений (только для админов)

### GET `/assignments/site/:siteId`
Получение назначений объекта

### GET `/assignments/user/:userId`
Получение назначений пользователя (только для админов)

### POST `/assignments/bulk`
Массовое назначение пользователей (только для админов)

## Роуты рабочих смен (`/shifts`)

### GET `/shifts`
Получение списка смен
- **Query params**: `page`, `limit`, `isActive`, `userId`, `siteId`, `startDate`, `endDate`

### POST `/shifts/start`
Начало рабочей смены

### POST `/shifts/:shiftId/end`
Завершение рабочей смены

### GET `/shifts/:shiftId`
Получение информации о смене

### PUT `/shifts/:shiftId`
Обновление смены (только для админов)

### DELETE `/shifts/:shiftId`
Удаление смены (только для админов)

### GET `/shifts/my`
Получение смен пользователя

### GET `/shifts/active`
Получение активной смены пользователя

### GET `/shifts/stats`
Получение статистики смен (только для админов)

### GET `/shifts/user/:userId/hours`
Получение рабочих часов пользователя за период

## Роуты отчетов (`/reports`)

### GET `/reports/work`
Получение рабочих отчетов
- **Query params**: `startDate`, `endDate`, `userId`, `siteId`, `groupBy`

### GET `/reports/violations`
Получение отчета по нарушениям (только для админов)

### GET `/reports/statistics`
Получение общей статистики (только для админов)

### GET `/reports/export/:type`
Экспорт отчетов в CSV (только для админов)

## Роуты уведомлений (`/notifications`)

### POST `/notifications/register-token`
Регистрация push токена пользователя

### POST `/notifications/send-test`
Отправка тестового уведомления (только для админов)

### POST `/notifications/violation-alert`
Отправка уведомления о нарушении (только для админов)

### POST `/notifications/assignment-notification`
Отправка уведомления о назначении (только для админов)

### POST `/notifications/shift-reminder`
Отправка напоминания о смене (только для админов)

### POST `/notifications/overtime-alert`
Отправка уведомления о сверхурочной работе (только для админов)

### POST `/notifications/broadcast`
Массовая отправка уведомлений (только для админов)

### POST `/notifications/delivery-receipts`
Получение статуса доставки уведомлений (только для админов)

### POST `/notifications/validate-token`
Валидация push токена

### POST `/notifications/cleanup-tokens`
Очистка недействительных токенов (только для админов)

### DELETE `/notifications/token`
Удаление push токена пользователя

### GET `/notifications/preferences`
Получение настроек уведомлений пользователя

### PUT `/notifications/preferences`
Обновление настроек уведомлений пользователя

## Роуты чата (`/chat`)

### GET `/chat/my-chat`
Получение чата работника с прорабом

### GET `/chat/foreman-chats`
Получение всех чатов прораба (только для админов)

### GET `/chat/:chatId/messages`
Получение сообщений чата

### POST `/chat/send-message`
Отправка сообщения

### POST `/chat/assign-task`
Назначение задачи (только для админов)

### POST `/chat/validate-photo`
Валидация фотоотчета (только для админов)

## Роуты синхронизации (`/sync`)

### GET `/sync`
Получение данных для синхронизации

### POST `/sync`
Отправка данных для синхронизации

### GET `/sync/status`
Получение статуса синхронизации

### POST `/sync/full`
Принудительная полная синхронизация

### POST `/sync/web-changes`
Синхронизация изменений от веб админ-панели (только для админов)

### GET `/sync/devices/:userId`
Получить активные устройства пользователя

## Коды ответов

- **200** - Успешно
- **201** - Создано
- **400** - Ошибка валидации
- **401** - Не авторизован
- **403** - Доступ запрещен
- **404** - Не найдено
- **500** - Внутренняя ошибка сервера

## Формат ответов

### Успешный ответ
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { /* response data */ }
}
```

### Ошибка
```json
{
  "success": false,
  "error": "Error message",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

## Аутентификация

Для доступа к защищенным эндпоинтам необходимо включить заголовок:
```
Authorization: Bearer <access_token>
``` 