module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat', // Новая функциональность
        'fix', // Исправление ошибок
        'docs', // Изменения в документации
        'style', // Форматирование, точки с запятой и т.д.
        'refactor', // Рефакторинг кода
        'perf', // Улучшение производительности
        'test', // Добавление тестов
        'chore', // Обслуживание кода
        'build', // Изменения в сборке
        'ci', // Изменения CI/CD
        'revert', // Откат изменений
      ],
    ],
    'subject-case': [
      2,
      'never',
      ['sentence-case', 'start-case', 'pascal-case', 'upper-case'],
    ],
    'subject-empty': [2, 'never'],
    'subject-max-length': [2, 'always', 100],
    'body-max-line-length': [2, 'always', 100],
  },
};
