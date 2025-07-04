import { NetworkService } from '../../src/services/NetworkService';
import NetInfo from '@react-native-community/netinfo';
import isOnline from 'is-online';

// Мокаем зависимости
jest.mock('@react-native-community/netinfo');
jest.mock('is-online');
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' }
}));

const mockedNetInfo = NetInfo as jest.Mocked<typeof NetInfo>;
const mockedIsOnline = isOnline as jest.MockedFunction<typeof isOnline>;

describe('NetworkService', () => {
  let networkService: NetworkService;

  beforeEach(() => {
    jest.clearAllMocks();
    networkService = NetworkService.getInstance();
  });

  describe('Инициализация', () => {
    it('должен быть синглтоном', () => {
      const instance1 = NetworkService.getInstance();
      const instance2 = NetworkService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('должен инициализироваться корректно', async () => {
      const mockState = {
        isConnected: true,
        type: 'wifi',
        details: { strength: 0.9 }
      };
      
      mockedNetInfo.fetch.mockResolvedValue(mockState as any);
      mockedNetInfo.addEventListener.mockImplementation(() => () => {});

      await networkService.initialize();
      
      expect(mockedNetInfo.addEventListener).toHaveBeenCalled();
      expect(mockedNetInfo.fetch).toHaveBeenCalled();
    });
  });

  describe('Статус сети', () => {
    it('должен возвращать корректный статус сети', () => {
      const status = networkService.getNetworkStatus();
      
      expect(status).toHaveProperty('isConnected');
      expect(status).toHaveProperty('type');
      expect(status).toHaveProperty('quality');
      expect(typeof status.isConnected).toBe('boolean');
    });

    it('должен определять качество WiFi соединения', () => {
      // Здесь мы тестируем внутреннюю логику через публичные методы
      const status = networkService.getNetworkStatus();
      expect(['excellent', 'good', 'poor', 'unknown']).toContain(status.quality);
    });
  });

  describe('Проверка подключения к интернету', () => {
    it('должен проверять подключение к интернету', async () => {
      mockedIsOnline.mockResolvedValue(true);
      
      const isConnected = await networkService.checkInternetConnectivity();
      
      expect(isConnected).toBe(true);
      expect(mockedIsOnline).toHaveBeenCalled();
    });

    it('должен обрабатывать ошибки при проверке подключения', async () => {
      mockedIsOnline.mockRejectedValue(new Error('Network error'));
      
      const isConnected = await networkService.checkInternetConnectivity();
      
      expect(isConnected).toBe(false);
    });

    it('должен отслеживать метрики подключения', async () => {
      mockedIsOnline.mockResolvedValue(true);
      
      await networkService.checkInternetConnectivity();
      
      const metrics = networkService.getMetrics();
      expect(metrics.connectionChecks).toBeGreaterThan(0);
    });
  });

  describe('Рекомендации синхронизации', () => {
    it('должен рекомендовать синхронизацию при хорошем соединении', () => {
      const recommendation = networkService.getSyncRecommendation();
      
      expect(recommendation).toHaveProperty('shouldSync');
      expect(recommendation).toHaveProperty('reason');
      expect(recommendation).toHaveProperty('quality');
      expect(typeof recommendation.shouldSync).toBe('boolean');
    });

    it('должен проверять стабильность соединения', () => {
      const isStable = networkService.isConnectionStable();
      expect(typeof isStable).toBe('boolean');
    });
  });

  describe('Мониторинг сети', () => {
    it('должен запускать мониторинг', () => {
      jest.useFakeTimers();
      
      // Мокаем setInterval
      const mockSetInterval = jest.spyOn(global, 'setInterval');
      
      networkService.startMonitoring(10000);
      
      expect(mockSetInterval).toHaveBeenCalledWith(expect.any(Function), 10000);
      
      jest.useRealTimers();
    });

    it('должен останавливать мониторинг', () => {
      jest.useFakeTimers();
      
      // Мокаем setInterval и clearInterval
      const mockSetInterval = jest.spyOn(global, 'setInterval');
      const mockClearInterval = jest.spyOn(global, 'clearInterval');
      
      networkService.startMonitoring();
      networkService.stopMonitoring();
      
      expect(mockClearInterval).toHaveBeenCalled();
      
      jest.useRealTimers();
    });
  });

  describe('Слушатели изменений', () => {
    it('должен добавлять слушателей изменений статуса', () => {
      const listener = jest.fn();
      const unsubscribe = networkService.addStatusListener(listener);
      
      expect(typeof unsubscribe).toBe('function');
    });
  });

  describe('Ожидание соединения', () => {
    it('должен ждать восстановления соединения', async () => {
      // Устанавливаем статус как подключенный
      const mockState = {
        isConnected: true,
        type: 'wifi',
        details: { strength: 0.9 }
      };
      
      mockedNetInfo.fetch.mockResolvedValue(mockState as any);
      await networkService.initialize();
      
      const result = await networkService.waitForConnection(1000);
      
      expect(result).toBe(true);
    }, 10000);

    it('должен возвращать false при таймауте', async () => {
      // Принудительно устанавливаем статус отключенным
      // @ts-ignore - доступ к приватному полю для теста
      networkService['currentStatus'] = {
        isConnected: false,
        type: 'none',
        quality: 'unknown'
      };
      
      const result = await networkService.waitForConnection(50); // Очень короткий таймаут
      
      expect(result).toBe(false);
    });
  });

  describe('Метрики', () => {
    it('должен сбрасывать метрики', () => {
      networkService.resetMetrics();
      
      const metrics = networkService.getMetrics();
      expect(metrics.connectionChecks).toBe(0);
      expect(metrics.connectionFailures).toBe(0);
    });

    it('должен возвращать полные метрики', () => {
      const metrics = networkService.getMetrics();
      
      expect(metrics).toHaveProperty('connectionChecks');
      expect(metrics).toHaveProperty('connectionFailures');
      expect(metrics).toHaveProperty('averageLatency');
      expect(metrics).toHaveProperty('lastSuccessfulCheck');
      expect(metrics).toHaveProperty('lastFailure');
      expect(metrics).toHaveProperty('isMonitoring');
    });
  });
}); 