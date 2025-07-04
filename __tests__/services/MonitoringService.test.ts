describe('MonitoringService', () => {
  it('должен загружаться без ошибок', () => {
    // Простая проверка что модуль загружается
    expect(() => {
      require('../../src/services/MonitoringService');
    }).not.toThrow();
  });

  it('должен экспортировать MonitoringService', () => {
    const module = require('../../src/services/MonitoringService');
    expect(module.MonitoringService).toBeDefined();
  });
}); 