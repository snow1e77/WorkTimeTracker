import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import isOnline from 'is-online';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from '../utils/logger';

export interface NetworkStatus {
  isConnected: boolean;
  type: string;
  quality: 'excellent' | 'good' | 'poor' | 'unknown';
  latency?: number;
  isInternetReachable?: boolean;
}

export interface NetworkMetrics {
  connectionChecks: number;
  connectionFailures: number;
  averageLatency: number;
  lastSuccessfulCheck: Date | null;
  lastFailure: Date | null;
  isMonitoring: boolean;
}

export class NetworkService {
  private static instance: NetworkService;
  private currentStatus: NetworkStatus = {
    isConnected: false,
    type: 'unknown',
    quality: 'unknown'
  };
  
  private metrics: NetworkMetrics = {
    connectionChecks: 0,
    connectionFailures: 0,
    averageLatency: 0,
    lastSuccessfulCheck: null,
    lastFailure: null,
    isMonitoring: false
  };

  private listeners: Array<(status: NetworkStatus) => void> = [];
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;
  private unsubscribe: (() => void) | null = null;

  private constructor() {}

  static getInstance(): NetworkService {
    if (!NetworkService.instance) {
      NetworkService.instance = new NetworkService();
    }
    return NetworkService.instance;
  }

  // Инициализация сетевого мониторинга
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Get initial network state
      const state = await NetInfo.fetch();
      this.currentStatus.isConnected = state.isConnected ?? false;
      this.currentStatus.type = state.type || 'unknown';
      this.currentStatus.isInternetReachable = state.isInternetReachable ?? false;
      
      // Subscribe to network state changes  
      this.unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
        this.handleNetworkStateChange(state);
      });
      
      this.isInitialized = true;
      this.notifyListeners();
    } catch (error) {
      logger.error('Failed to initialize NetworkService', { error: error instanceof Error ? error.message : 'Unknown error' }, 'network');
    }
  }

  // Добавляем метод для очистки ресурсов
  public cleanup(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    this.listeners = [];
    this.isInitialized = false;
  }

  // Обработчик изменений состояния сети
  private handleNetworkStateChange(state: NetInfoState): void {
    const newStatus: NetworkStatus = {
      isConnected: state.isConnected ?? false,
      type: state.type || 'unknown',
      quality: this.determineQuality(state),
      isInternetReachable: state.isInternetReachable ?? undefined
    };

    // Обновляем статус только если он изменился
    if (this.hasStatusChanged(newStatus)) {
      this.currentStatus = newStatus;
      this.notifyListeners();
      
      // Обновляем метрики
      this.updateMetrics(newStatus.isConnected);
    }
  }

  // Определение качества соединения
  private determineQuality(state: NetInfoState): 'excellent' | 'good' | 'poor' | 'unknown' {
    if (!state.isConnected) return 'unknown';

    const details = state.details as any;
    
    // Для WiFi
    if (state.type === 'wifi' && details?.strength !== undefined) {
      if (details.strength >= 0.8) return 'excellent';
      if (details.strength >= 0.5) return 'good';
      return 'poor';
    }

    // Для мобильной сети
    if (state.type === 'cellular' && details?.cellularGeneration) {
      switch (details.cellularGeneration) {
        case '5g': return 'excellent';
        case '4g': return 'good';
        case '3g': return 'poor';
        default: return 'poor';
      }
    }

    // По умолчанию для других типов
    return state.isConnected ? 'good' : 'unknown';
  }

  // Проверка изменения статуса
  private hasStatusChanged(newStatus: NetworkStatus): boolean {
    return (
      this.currentStatus.isConnected !== newStatus.isConnected ||
      this.currentStatus.type !== newStatus.type ||
      this.currentStatus.quality !== newStatus.quality
    );
  }

  // Получить текущий статус сети
  public getNetworkStatus(): NetworkStatus {
    return { ...this.currentStatus };
  }

  // Проверить доступность интернета
  public async checkInternetConnectivity(): Promise<boolean> {
    this.metrics.connectionChecks++;
    
    try {
      let connected = false;
      const startTime = Date.now();

      if (Platform.OS === 'web') {
        // Для веб используем простой fetch
        try {
          const response = await fetch('https://www.google.com/generate_204', {
            method: 'HEAD',
            mode: 'no-cors',
            cache: 'no-cache'
          });
          connected = true;
        } catch {
          connected = navigator.onLine;
        }
      } else {
        // Для мобильных устройств используем isOnline
        connected = await isOnline();
      }

      const latency = Date.now() - startTime;
      
      if (connected) {
        this.metrics.lastSuccessfulCheck = new Date();
        this.updateLatency(latency);
        this.currentStatus.latency = latency;
      } else {
        this.metrics.connectionFailures++;
        this.metrics.lastFailure = new Date();
      }

      return connected;
    } catch (error) {
      this.metrics.connectionFailures++;
      this.metrics.lastFailure = new Date();
      return false;
    }
  }

  // Обновить среднее время отклика
  private updateLatency(newLatency: number): void {
    const checksCount = this.metrics.connectionChecks - this.metrics.connectionFailures;
    if (checksCount <= 1) {
      this.metrics.averageLatency = newLatency;
    } else {
      // Скользящее среднее
      this.metrics.averageLatency = 
        (this.metrics.averageLatency * (checksCount - 1) + newLatency) / checksCount;
    }
  }

  // Обновить метрики
  private updateMetrics(isConnected: boolean): void {
    if (isConnected) {
      this.metrics.lastSuccessfulCheck = new Date();
    } else {
      this.metrics.connectionFailures++;
      this.metrics.lastFailure = new Date();
    }
  }

  // Добавить слушателя изменений статуса
  public addStatusListener(listener: (status: NetworkStatus) => void): () => void {
    this.listeners.push(listener);
    
    // Возвращаем функцию для отписки
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Уведомить всех слушателей
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.currentStatus);
      } catch (error) {
        logger.error('Error in network status listener', { error: error instanceof Error ? error.message : 'Unknown error' }, 'network');
      }
    });
  }

  // Запустить мониторинг сети
  public startMonitoring(intervalMs: number = 30000): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.metrics.isMonitoring = true;
    
    this.monitoringInterval = setInterval(async () => {
      await this.checkInternetConnectivity();
    }, intervalMs);
  }

  // Остановить мониторинг
  public stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.metrics.isMonitoring = false;
  }

  // Получить метрики
  public getMetrics(): NetworkMetrics {
    return { ...this.metrics };
  }

  // Сбросить метрики
  public resetMetrics(): void {
    this.metrics = {
      connectionChecks: 0,
      connectionFailures: 0,
      averageLatency: 0,
      lastSuccessfulCheck: null,
      lastFailure: null,
      isMonitoring: this.metrics.isMonitoring
    };
  }

  // Проверить, стабильно ли соединение
  public isConnectionStable(): boolean {
    const failureRate = this.metrics.connectionChecks > 0 
      ? this.metrics.connectionFailures / this.metrics.connectionChecks 
      : 0;
    
    return failureRate < 0.1 && this.currentStatus.isConnected;
  }

  // Получить рекомендацию по синхронизации
  public getSyncRecommendation(): {
    shouldSync: boolean;
    reason: string;
    quality: 'excellent' | 'good' | 'poor' | 'unknown';
  } {
    if (!this.currentStatus.isConnected) {
      return {
        shouldSync: false,
        reason: 'No network connection',
        quality: 'unknown'
      };
    }

    if (!this.isConnectionStable()) {
      return {
        shouldSync: false,
        reason: 'Connection is unstable',
        quality: 'poor'
      };
    }

    const quality = this.currentStatus.quality;
    
    if (quality === 'poor') {
      return {
        shouldSync: false,
        reason: 'Poor connection quality',
        quality
      };
    }

    return {
      shouldSync: true,
      reason: `Connection quality is ${quality}`,
      quality
    };
  }

  // Ожидание восстановления соединения
  public async waitForConnection(timeoutMs: number = 30000): Promise<boolean> {
    if (this.currentStatus.isConnected) {
      return true;
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        unsubscribe();
        resolve(false);
      }, timeoutMs);

      const unsubscribe = this.addStatusListener((status) => {
        if (status.isConnected) {
          clearTimeout(timeout);
          unsubscribe();
          resolve(true);
        }
      });
    });
  }
}

export default NetworkService; 