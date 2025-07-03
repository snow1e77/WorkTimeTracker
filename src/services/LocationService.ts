import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { LocationEvent, ConstructionSite } from '../types';
import { ApiDatabaseService } from './ApiDatabaseService';
import { notificationService } from './NotificationService';
import logger from '../utils/logger';

const LOCATION_TASK_NAME = 'background-location-task';
const LOCATION_UPDATE_INTERVAL = 30000; // 30 секунд

interface LocationServiceConfig {
  userId: string;
  sites: ConstructionSite[];
  isTracking: boolean;
}

class LocationService {
  private static instance: LocationService;
  private config: LocationServiceConfig | null = null;
  private dbService = ApiDatabaseService.getInstance();
  private lastKnownLocation: Location.LocationObject | null = null;
  private currentSiteId: string | null = null;

  public static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  // Инициализация фонового отслеживания
  public async initializeBackgroundTracking(userId: string, sites: ConstructionSite[]): Promise<boolean> {
    try {
      // Запрашиваем разрешения
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      if (foregroundStatus !== 'granted') {
        logger.warn('Foreground location permission not granted', {}, 'location');
        return false;
      }

      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus !== 'granted') {
        logger.warn('Background location permission not granted', {}, 'location');
      }

      // Настраиваем конфигурацию
      this.config = {
        userId,
        sites,
        isTracking: true
      };

      // Определяем задачу для фонового отслеживания
      TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }: any) => {
        if (error) {
          logger.error('Background location task error', { error: error.message }, 'location');
          return;
        }
        
        if (data) {
          await this.handleLocationUpdate(data);
        }
      });

      // Запускаем фоновое отслеживание
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: LOCATION_UPDATE_INTERVAL,
        distanceInterval: 50, // 50 метров
        foregroundService: {
          notificationTitle: 'Отслеживание рабочего времени',
          notificationBody: 'Приложение отслеживает ваше местоположение для работы',
        },
      });

      logger.info('Background location tracking started', { userId, sitesCount: sites.length }, 'location');
      return true;
    } catch (error) {
      logger.error('Failed to initialize background tracking', { error: error instanceof Error ? error.message : 'Unknown error' }, 'location');
      return false;
    }
  }

  // Остановка фонового отслеживания
  public async stopBackgroundTracking(): Promise<void> {
    try {
      const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
      if (hasStarted) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
        logger.info('Background location tracking stopped', {}, 'location');
      }
      
      this.config = null;
      this.lastKnownLocation = null;
      this.currentSiteId = null;
    } catch (error) {
      logger.error('Failed to stop background tracking', { error: error instanceof Error ? error.message : 'Unknown error' }, 'location');
    }
  }

  // Обработка обновления локации
  private async handleLocationUpdate(data: any): Promise<void> {
    try {
      if (!this.config || !data.locations || data.locations.length === 0) {
        return;
      }

      const location = data.locations[0];
      this.lastKnownLocation = location;

      // Проверяем расстояние до каждого объекта
      let nearestSite: ConstructionSite | null = null;
      let minDistance = Infinity;

      for (const site of this.config.sites) {
        const distance = this.calculateDistance(
          location.coords.latitude,
          location.coords.longitude,
          site.latitude,
          site.longitude
        );

        if (distance < minDistance) {
          minDistance = distance;
          nearestSite = site;
        }
      }

      // Определяем событие
      let eventType: 'site_entry' | 'site_exit' | 'tracking_update' = 'tracking_update';
      const wasInCurrentSite = this.currentSiteId !== null;
      const isInSite = nearestSite && minDistance <= nearestSite.radius;

      if (isInSite && !wasInCurrentSite && nearestSite) {
        eventType = 'site_entry';
        this.currentSiteId = nearestSite.id;
        // Отправляем уведомление о входе на объект
        try {
          await notificationService.notifyGeofenceEvent('entry', nearestSite.name);
        } catch (error) {
          logger.error('Failed to send geofence entry notification', { error: error instanceof Error ? error.message : 'Unknown error' }, 'location');
        }
      } else if (!isInSite && wasInCurrentSite) {
        eventType = 'site_exit';
        // Найдем сайт, с которого происходит выход
        const exitSite = this.config.sites.find(site => site.id === this.currentSiteId);
        const siteName = exitSite ? exitSite.name : 'Unknown Site';
        
        // Отправляем уведомление о выходе с объекта
        try {
          await notificationService.notifyGeofenceEvent('exit', siteName);
        } catch (error) {
          logger.error('Failed to send geofence exit notification', { error: error instanceof Error ? error.message : 'Unknown error' }, 'location');
        }
        
        this.currentSiteId = null;
      }

      // Сохраняем событие в базу данных
      const locationEvent: Omit<LocationEvent, 'id' | 'timestamp'> = {
        userId: this.config.userId,
        siteId: this.currentSiteId || undefined,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        eventType,
        distance: nearestSite ? minDistance : undefined,
      };

      await this.saveLocationEvent(locationEvent);

    } catch (error) {
      logger.error('Failed to handle location update', { error: error instanceof Error ? error.message : 'Unknown error' }, 'location');
    }
  }

  // Расчёт расстояния между двумя точками
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Радиус Земли в метрах
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  // Сохранение события геолокации
  private async saveLocationEvent(event: Omit<LocationEvent, 'id' | 'timestamp'>): Promise<void> {
    try {
      await this.dbService.createLocationEvent({
        ...event,
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error('Failed to save location event', { error: error instanceof Error ? error.message : 'Unknown error' }, 'location');
    }
  }

  // Получение текущего местоположения
  public async getCurrentLocation(): Promise<Location.LocationObject | null> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        logger.warn('Location permission not granted for getCurrentLocation', {}, 'location');
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      this.lastKnownLocation = location;
      return location;
    } catch (error) {
      logger.error('Failed to get current location', { error: error instanceof Error ? error.message : 'Unknown error' }, 'location');
      return null;
    }
  }

  // Получение последнего известного местоположения
  public getLastKnownLocation(): Location.LocationObject | null {
    return this.lastKnownLocation;
  }

  // Получение текущего статуса отслеживания
  public isTracking(): boolean {
    return this.config?.isTracking || false;
  }

  // Получение ID текущего объекта
  public getCurrentSiteId(): string | null {
    return this.currentSiteId;
  }

  // Обновление списка объектов
  public updateSites(sites: ConstructionSite[]): void {
    if (this.config) {
      this.config.sites = sites;
    }
  }
}

export { LocationService }; 

