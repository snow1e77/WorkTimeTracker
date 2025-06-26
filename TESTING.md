# Тестирование WorkTime Tracker

Этот документ содержит инструкции по настройке и запуску тестов для проекта WorkTime Tracker.

## Структура тестов

Проект содержит тесты для двух основных частей:

### 1. Серверная часть (server/)
- **Путь**: `server/tests/`
- **Технологии**: Jest, TypeScript, Supertest
- **Покрытие**: Сервисы, API роуты, middleware

### 2. Клиентская часть (React Native)
- **Путь**: `__tests__/`
- **Технологии**: Jest, React Native Testing Library
- **Покрытие**: Компоненты, экраны, утилиты, сервисы

## Установка зависимостей

### Основные зависимости
```bash
# Установка зависимостей для клиентской части
npm install

# Установка зависимостей для серверной части
cd server
npm install
cd ..
```

### Зависимости для тестирования уже включены:

**Клиентская часть:**
- `jest` - Фреймворк тестирования
- `@testing-library/react-native` - Библиотека для тестирования React Native
- `@testing-library/jest-native` - Расширения для Jest
- `react-test-renderer` - Рендерер для React тестов
- `@types/jest` - Типы TypeScript для Jest

**Серверная часть:**
- `jest` - Фреймворк тестирования
- `supertest` - Тестирование HTTP endpoints
- `ts-jest` - Поддержка TypeScript в Jest
- `@types/jest` - Типы TypeScript для Jest
- `@types/supertest` - Типы для Supertest

## Запуск тестов

### Все тесты
```bash
# Клиентские тесты
npm test

# Серверные тесты
npm run server:test

# Или через отдельные команды
cd server && npm test
```

### В режиме наблюдения
```bash
# Клиентские тесты
npm run test:watch

# Серверные тесты
cd server && npm run test:watch
```

### С покрытием кода
```bash
# Клиентские тесты
npm run test:coverage

# Серверные тесты
npm run server:test:coverage
```

## Конфигурация

### Jest конфигурация для клиента (jest.config.js)
```javascript
module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|expo|@expo)/)'
  ],
  testEnvironment: 'jsdom'
};
```

### Jest конфигурация для сервера (server/jest.config.js)
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  collectCoverageFrom: ['src/**/*.ts'],
  coverageDirectory: 'coverage'
};
```

## Написание тестов

### Структура тестов

#### Серверные тесты
```typescript
// tests/services/AuthService.test.ts
import { AuthService } from '../../src/services/AuthService';

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('hashPassword', () => {
    it('должен хэшировать пароль', async () => {
      const password = 'TestPassword123!';
      const hash = await AuthService.hashPassword(password);
      expect(hash).toBeDefined();
    });
  });
});
```

#### Клиентские тесты компонентов
```typescript
// __tests__/screens/LoginScreen.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import LoginScreen from '../../src/screens/LoginScreen';

describe('LoginScreen', () => {
  it('должен рендериться корректно', () => {
    const { getByText } = render(<LoginScreen />);
    expect(getByText('Войти')).toBeTruthy();
  });
});
```

#### Тесты сервисов
```typescript
// __tests__/services/AuthService.test.ts
import { AuthService } from '../../src/services/AuthService';

describe('AuthService', () => {
  it('должен валидировать номер телефона', () => {
    expect(AuthService.validatePhoneNumber('+79991234567')).toBe(true);
  });
});
```

### Моки и заглушки

#### Автоматические моки в jest.setup.js
- AsyncStorage
- React Navigation
- Expo модули (notifications, location, task-manager)
- Socket.IO
- React Native Paper
- React Native Maps

#### Пользовательские моки
```typescript
// Мокирование API клиента
jest.mock('../../src/services/ApiClient', () => ({
  ApiClient: {
    post: jest.fn(),
    get: jest.fn()
  }
}));
```

## Лучшие практики

### 1. Именование тестов
- Используйте описательные названия на русском языке
- Следуйте паттерну: "должен делать что-то"
- Группируйте связанные тесты в `describe` блоки

### 2. Структура тестов
```typescript
describe('ComponentName', () => {
  beforeEach(() => {
    // Настройка перед каждым тестом
  });

  describe('method/feature', () => {
    it('должен обрабатывать успешный случай', () => {
      // Arrange
      // Act  
      // Assert
    });

    it('должен обрабатывать ошибки', () => {
      // Test error cases
    });
  });
});
```

### 3. Покрытие кода
- Стремитесь к покрытию 80%+ для критических частей
- Фокусируйтесь на бизнес-логике и API endpoints
- Не забывайте тестировать edge cases

### 4. Интеграционные тесты
- Тестируйте полные пользовательские сценарии
- Используйте реальные HTTP запросы с моками базы данных
- Проверяйте взаимодействие между компонентами

## Continuous Integration

### GitHub Actions пример
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
      - run: cd server && npm ci && npm test
```

## Отладка тестов

### Запуск конкретного теста
```bash
# Один файл
npm test -- LoginScreen.test.tsx

# Конкретный тест
npm test -- --testNamePattern="должен входить в систему"

# С отладкой
npm test -- --verbose
```

### Общие проблемы и решения

1. **Моки не работают**
   - Проверьте порядок импортов
   - Убедитесь, что мок определен до импорта компонента

2. **Тесты падают на async операциях**
   - Используйте `waitFor` или `await`
   - Увеличьте timeout для медленных операций

3. **Проблемы с навигацией**
   - Оберните компонент в `NavigationContainer`
   - Используйте моки для navigation объекта

## Полезные команды

```bash
# Установка всех зависимостей
npm run clean && npm install && cd server && npm install

# Запуск тестов с детальным выводом
npm test -- --verbose --watchAll=false

# Генерация отчета о покрытии
npm run test:coverage && open coverage/lcov-report/index.html

# Обновление снапшотов
npm test -- --updateSnapshot
```

## Заключение

Регулярное тестирование помогает:
- Предотвращать регрессии
- Документировать поведение кода
- Повышать уверенность в изменениях
- Улучшать архитектуру приложения

Всегда пишите тесты для новой функциональности и обновляйте существующие при изменениях. 