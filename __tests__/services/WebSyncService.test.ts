describe('WebSyncService', () => {
  it('должен загружаться без ошибок', () => {
    // Простая проверка что модуль загружается
    expect(() => {
      require('../../src/services/WebSyncService');
    }).not.toThrow();
  });

  it('должен экспортировать WebSyncService', () => {
    const module = require('../../src/services/WebSyncService');
    expect(module.WebSyncService).toBeDefined();
  });
}); 