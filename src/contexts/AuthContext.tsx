import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthUser, AuthState } from '../types';
import { AuthService } from '../services/AuthService';
import { ApiDatabaseService } from '../services/ApiDatabaseService';

interface AuthContextType extends AuthState {
  // Основные методы аутентификации
  login: (phoneNumber: string) => Promise<{ success: boolean; user?: AuthUser; error?: string; needsContact?: boolean }>;
  register: (phoneNumber: string, name: string) => Promise<{ success: boolean; user?: AuthUser; error?: string }>;
  
  // Утилитарные методы
  refreshToken: () => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    isLoading: true,
  });

  const authService = AuthService.getInstance();
  const dbService = ApiDatabaseService.getInstance();

  const checkAuthStatus = async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      // Инициализируем API подключение
      await dbService.initDatabase();
      // Проверяем аутентификацию
      const user = await authService.getCurrentUser();
      setAuthState({
        isAuthenticated: !!user,
        user,
        isLoading: false,
      });
    } catch (error) {
      // Если ошибка связана с неавторизованным доступом, попробуем обновить токен
      if (error instanceof Error && error.message.includes('401')) {
        const refreshResult = await authService.refreshToken();
        
        if (refreshResult.success) {
          try {
            const user = await authService.getCurrentUser();
            setAuthState({
              isAuthenticated: !!user,
              user,
              isLoading: false,
            });
            return;
          } catch (retryError) {
            }
        }
      }
      
      setAuthState({
        isAuthenticated: false,
        user: null,
        isLoading: false,
      });
    }
  };

  // Основные методы аутентификации
  const login = async (phoneNumber: string) => {
    try {
      const result = await authService.login(phoneNumber);
      
      if (result.success && result.user) {
        setAuthState({
          isAuthenticated: true,
          user: result.user,
          isLoading: false,
        });
      }
      
      return result;
    } catch (error) {
      return { success: false, error: 'Ошибка входа в систему' };
    }
  };

  const register = async (phoneNumber: string, name: string) => {
    try {
      const result = await authService.register(phoneNumber, name);
      
      if (result.success && result.user) {
        setAuthState({
          isAuthenticated: true,
          user: result.user,
          isLoading: false,
        });
      }
      
      return result;
    } catch (error) {
      return { success: false, error: 'Ошибка регистрации' };
    }
  };

  // Обновление токена
  const refreshToken = async () => {
    try {
      const result = await authService.refreshToken();
      
      if (result.success) {
        // После успешного обновления токена, перепроверяем пользователя
        const user = await authService.getCurrentUser();
        setAuthState(prev => ({
          ...prev,
          isAuthenticated: !!user,
          user,
        }));
      } else {
        // Если обновление токена не удалось, выходим из системы
        setAuthState({
          isAuthenticated: false,
          user: null,
          isLoading: false,
        });
      }
      
      return result;
    } catch (error) {
      setAuthState({
        isAuthenticated: false,
        user: null,
        isLoading: false,
      });
      return { success: false, error: 'Failed to refresh token' };
    }
  };



  const logout = async (): Promise<void> => {
    try {
      await authService.logout();
      setAuthState({
        isAuthenticated: false,
        user: null,
        isLoading: false,
      });
    } catch (error) {
      // Даже если logout на сервере не удался, очищаем локальное состояние
      setAuthState({
        isAuthenticated: false,
        user: null,
        isLoading: false,
      });
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const value: AuthContextType = {
    ...authState,
    login,
    register,
    refreshToken,
    logout,
    checkAuthStatus,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 

