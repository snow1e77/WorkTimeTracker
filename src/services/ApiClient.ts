import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG, ApiResponse } from '../config/api';

export class ApiClient {
  private static instance: ApiClient;
  private baseURL: string;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  private constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
  }

  static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  // Инициализация токенов
  async initialize(): Promise<void> {
    try {
      this.accessToken = await AsyncStorage.getItem('accessToken');
      this.refreshToken = await AsyncStorage.getItem('refreshToken');
    } catch (error) {
      }
  }

  // Установка токенов
  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    
    try {
      await AsyncStorage.setItem('accessToken', accessToken);
      await AsyncStorage.setItem('refreshToken', refreshToken);
    } catch (error) {
      }
  }

  // Очистка токенов
  async clearTokens(): Promise<void> {
    this.accessToken = null;
    this.refreshToken = null;
    
    try {
      await AsyncStorage.removeItem('accessToken');
      await AsyncStorage.removeItem('refreshToken');
    } catch (error) {
      }
  }

  // Получение заголовков для запроса
  private getHeaders(): Headers {
    const headers = new Headers(API_CONFIG.DEFAULT_HEADERS);
    
    if (this.accessToken) {
      headers.set('Authorization', `Bearer ${this.accessToken}`);
    }
    
    return headers;
  }

  // Обновление токена доступа
  private async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) {
      return false;
    }

    try {
      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: API_CONFIG.DEFAULT_HEADERS,
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          await this.setTokens(data.data.accessToken, data.data.refreshToken);
          return true;
        }
      }
    } catch (error) {
      }

    return false;
  }

  // Выполнение HTTP запроса
  async request<T = unknown>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const headers = this.getHeaders();

    // Добавляем заголовки из options
    if (options.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        headers.set(key, value as string);
      });
    }

    // Создаём AbortController для обработки timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

    const requestOptions: RequestInit = {
      ...options,
      headers,
      signal: controller.signal,
    };

    try {
      let response = await fetch(url, requestOptions);
      clearTimeout(timeoutId);

      // Если токен истёк, пытаемся обновить его
      if (response.status === 401 && this.accessToken) {
        const refreshed = await this.refreshAccessToken();
        
        if (refreshed) {
          // Повторяем запрос с новым токеном
          const newHeaders = this.getHeaders();
          if (options.headers) {
            Object.entries(options.headers).forEach(([key, value]) => {
              newHeaders.set(key, value as string);
            });
          }
          
          // Создаём новый AbortController для повторного запроса
          const retryController = new AbortController();
          const retryTimeoutId = setTimeout(() => retryController.abort(), API_CONFIG.TIMEOUT);
          
          try {
            response = await fetch(url, {
              ...requestOptions,
              headers: newHeaders,
              signal: retryController.signal,
            });
            clearTimeout(retryTimeoutId);
          } catch (retryError) {
            clearTimeout(retryTimeoutId);
            throw retryError;
          }
        } else {
          // Если не удалось обновить токен, очищаем сохранённые токены
          await this.clearTokens();
          return {
            success: false,
            error: 'Authentication failed. Please log in again.',
          };
        }
      }

      const data = await response.json();

      if (response.ok) {
        return data;
      } else {
        return {
          success: false,
          error: data.error || data.message || `HTTP ${response.status}`,
        };
      }
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof TypeError && error.message === 'Network request failed') {
        return {
          success: false,
          error: 'Network error. Please check your internet connection.',
        };
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  // Методы для различных типов запросов
  async get<T = unknown>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T = unknown>(endpoint: string, data?: Record<string, unknown>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T = unknown>(endpoint: string, data?: Record<string, unknown>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T = unknown>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  async patch<T = unknown>(endpoint: string, data?: Record<string, unknown>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // Проверка соединения с сервером
  async checkConnection(): Promise<boolean> {
    try {
      // Создаём AbortController для timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.baseURL.replace('/api', '/health')}`, {
        method: 'GET',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  // Получение информации о сервере
  async getServerInfo(): Promise<ApiResponse<Record<string, unknown>>> {
    return this.get('/info');
  }

  // Установка базового URL (для переключения между dev/prod серверами)
  setBaseURL(url: string): void {
    this.baseURL = url;
  }

  // Получение текущего базового URL
  getBaseURL(): string {
    return this.baseURL;
  }

  // Получение состояния аутентификации
  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  // Получение токена доступа
  getAccessToken(): string | null {
    return this.accessToken;
  }
}

// Экспортируем синглтон для удобства использования
export const apiClient = ApiClient.getInstance(); 
