// Определяем глобальные переменные в самом начале
Object.defineProperty(global, '__DEV__', {
  value: true,
  writable: false,
  configurable: false,
});

// Глобальные переменные для Jest
global.__DEV__ = true;
global.process = require('process'); 