import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthUser, AuthState } from '../types';
import { AuthService } from '../services/AuthService';
import { ApiDatabaseService } from '../services/ApiDatabaseService';

interface AuthContextType extends AuthState {
  // Новые методы для SMS-аутентификации
  sendLoginCode: (phoneNumber: string) => Promise<{ success: boolean; userExists: boolean; error?: string }>;
  verifyLoginCode: (phoneNumber: string, code: string) => Promise<{ success: boolean; user?: AuthUser; error?: string; needsProfile?: boolean }>;
  createUserProfile: (phoneNumber: string, name: string, smsCode: string) => Promise<{ success: boolean; user?: AuthUser; error?: string }>;
  
  // Утилитарные методы
  refreshToken: () => Promise<{ success: boolean; error?: string }>;
  
  // Устаревшие методы - оставляем для совместимости
  /** @deprecated Используйте sendLoginCode + verifyLoginCode */
  login: (phoneNumber: string, password: string) => Promise<boolean>;
  /** @deprecated Используйте sendLoginCode + createUserProfile */
  register: (data: { name: string; phoneNumber: string; password: string }) => Promise<boolean>;
  
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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

  // Новые методы для SMS-аутентификации
  const sendLoginCode = async (phoneNumber: string) => {
    try {
      return await authService.sendLoginCode(phoneNumber);
    } catch (error) {
      return { success: false, userExists: false, error: 'Failed to send code' };
    }
  };

  const verifyLoginCode = async (phoneNumber: string, code: string) => {
    try {
      const result = await authService.verifyLoginCode(phoneNumber, code);
      
      if (result.success && result.user) {
        // Пользователь вошел в систему
        setAuthState({
          isAuthenticated: true,
          user: result.user,
          isLoading: false,
        });
      }
      
      return result;
    } catch (error) {
      return { success: false, error: 'Failed to verify code' };
    }
  };

  const createUserProfile = async (phoneNumber: string, name: string, smsCode: string) => {
    try {
      const result = await authService.createUserProfile(phoneNumber, name, smsCode);
      
      if (result.success && result.user) {
        // Новый пользователь создан и вошел в систему
        setAuthState({
          isAuthenticated: true,
          user: result.user,
          isLoading: false,
        });
      }
      
      return result;
    } catch (error) {
      return { success: false, error: 'Failed to create profile' };
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

  // Устаревшие методы - оставляем для совместимости
  const login = async (phoneNumber: string, password: string): Promise<boolean> => {
    try {
      const result = await authService.login({ phoneNumber, password });
      
      if (result.success && result.user) {
        setAuthState({
          isAuthenticated: true,
          user: result.user,
          isLoading: false,
        });
        return true;
      }
      
      return false;
    } catch (error) {
      return false;
    }
  };

  const register = async (data: { name: string; phoneNumber: string; password: string }): Promise<boolean> => {
    try {
      const result = await authService.register(data);
      
      if (result.success && result.user) {
        setAuthState({
          isAuthenticated: true,
          user: result.user,
          isLoading: false,
        });
        return true;
      }
      
      return false;
    } catch (error) {
      return false;
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
    // Новые методы
    sendLoginCode,
    verifyLoginCode,
    createUserProfile,
    refreshToken,
    // Устаревшие методы
    login,
    register,
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

