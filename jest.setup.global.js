// Определяем глобальные переменные в самом начале
if (typeof global !== 'undefined') {
  global.__DEV__ = true;
  global.__RCT_DEV_MENU_ENABLED__ = false;
  global.__RCT_NEW_ARCH_ENABLED__ = false;
  global.__BUNDLE_START_TIME__ = 0;
}

// Также для window объекта (на случай web тестов)
if (typeof window !== 'undefined') {
  window.__DEV__ = true;
  window.__RCT_DEV_MENU_ENABLED__ = false;
  window.__RCT_NEW_ARCH_ENABLED__ = false;
  window.__BUNDLE_START_TIME__ = 0;
}

// Устанавливаем процесс и другие переменные
global.process = global.process || require('process');

// Дополнительная проверка для React Native
if (typeof __DEV__ === 'undefined') {
  global.__DEV__ = true;
}

Object.defineProperty(global, '__DEV__', {
  value: true,
  writable: false,
  configurable: false,
}); 