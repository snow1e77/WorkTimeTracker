# Система подсчета нарушений

## 📋 Описание

Реализована система автоматического подсчета нарушений для отчетов по рабочему времени. Система позволяет:

- ✅ Отслеживать различные типы нарушений
- ✅ Классифицировать их по степени серьезности  
- ✅ Автоматически подсчитывать нарушения в отчетах
- ✅ Получать детальную статистику по нарушениям

## 🗃️ Структура базы данных

### Таблица `violations`

```sql
CREATE TABLE violations (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  siteId TEXT,
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  isResolved INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users (id),
  FOREIGN KEY (siteId) REFERENCES construction_sites (id)
);
```

## 📊 Типы нарушений

| Тип | Описание | Обычная серьезность |
|-----|----------|-------------------|
| `unauthorized_departure` | Покидание объекта без разрешения | high |
| `late_arrival` | Опоздание на работу | medium |
| `early_departure` | Ранний уход с работы | medium |
| `no_show` | Неявка на работу | high |

## 🚨 Уровни серьезности

- **`low`** - Незначительные нарушения
- **`medium`** - Средние нарушения
- **`high`** - Критические нарушения

## 🔧 Новые методы в DatabaseService

### `createViolation(violation)`
Создает новое нарушение в базе данных.

```typescript
await db.createViolation({
  userId: 'user123',
  siteId: 'site456',
  type: 'late_arrival',
  description: 'Опоздание на 15 минут',
  severity: 'medium'
});
```

### `getViolations(period, severity)`
Получает список нарушений за период с фильтрацией по серьезности.

```typescript
const violations = await db.getViolations('month', 'high');
```

### `getViolationsSummary(period)`
Получает статистику по нарушениям за период.

```typescript
const summary = await db.getViolationsSummary('week');
// Возвращает:
// {
//   total: 5,
//   resolved: 2,
//   unresolved: 3,
//   byType: { late_arrival: 3, unauthorized_departure: 2 },
//   bySeverity: { low: 1, medium: 2, high: 2 }
// }
```

### `resolveViolation(violationId)`
Помечает нарушение как решенное.

```typescript
await db.resolveViolation('viol123');
```

### `deleteViolation(violationId)`
Удаляет нарушение из базы данных.

```typescript
await db.deleteViolation('viol123');
```

## 📈 Интеграция с отчетами

Метод `getWorkReports()` теперь автоматически подсчитывает количество нарушений для каждого работника:

```typescript
const reports = await db.getWorkReports('month');
// Каждый отчет теперь включает поле violations:
// {
//   userId: 'user123',
//   userName: 'Иван Иванов',
//   siteId: 'site456',
//   siteName: 'Стройка №1',
//   totalHours: 160,
//   totalMinutes: 0,
//   shiftsCount: 20,
//   date: '2024-01-15',
//   violations: 3  // <- Автоматический подсчет
// }
```

## 🧪 Тестирование

Для тестирования системы создан файл `test_violations.js`:

```bash
node test_violations.js
```

Тест создает тестовые нарушения и проверяет работу всех методов.

## 🔄 Автоматическое создание нарушений

В будущем можно добавить автоматическое создание нарушений на основе:

- GPS-трекинга (покидание объекта без разрешения)
- Рабочего времени (опоздания, ранние уходы)
- Системы учета рабочего времени (неявки)

## 📱 Использование в интерфейсе

### В отчетах по работе
```typescript
// WorkReportsScreen.tsx
const reports = await DatabaseService.getInstance().getWorkReports(period);
// reports[i].violations теперь содержит количество нарушений
```

### В отчетах по нарушениям
```typescript
// ViolationsReportScreen.tsx
const violations = await DatabaseService.getInstance().getViolations(period, severity);
const summary = await DatabaseService.getInstance().getViolationsSummary(period);
```

## ✅ Результат

- [x] TODO: Implement violations count - **ЗАВЕРШЕНО**
- [x] Создана таблица violations в базе данных
- [x] Реализован автоматический подсчет нарушений в отчетах
- [x] Добавлены методы для работы с нарушениями
- [x] Создана статистика по нарушениям
- [x] Добавлены соответствующие TypeScript типы
- [x] Создан тестовый скрипт

Система готова к использованию! 🎉 