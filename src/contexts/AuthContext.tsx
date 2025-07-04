import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthUser, AuthState } from '../types';
import { AuthService } from '../services/AuthService';
import { ApiDatabaseService } from '../services/ApiDatabaseService';
import logger from '../utils/logger';

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

  // Добавляем флаги для предотвращения race conditions
  const [loginInProgress, setLoginInProgress] = useState(false);
  const [registerInProgress, setRegisterInProgress] = useState(false);

  const authService = AuthService.getInstance();
  const dbService = ApiDatabaseService.getInstance();

  const checkAuthStatus = async () => {
    try {
      const token = await authService.getAuthToken();
      logger.auth('Checking auth status', { hasToken: !!token });
      
      if (!token) {
        setAuthState({ 
          isLoading: false, 
          isAuthenticated: false, 
          user: null 
        });
        return;
      }

      const user = await authService.getCurrentUser();
      logger.auth('Current user check result', { hasUser: !!user });
      
      setAuthState({
        isLoading: false,
        isAuthenticated: !!user,
        user,
      });
    } catch (error: any) {
      logger.error('Auth status check error', { error: error?.message || 'Unknown error' }, 'auth');
      
      // Check for specific "User not found" error to automatically clear tokens
      if (error?.message?.includes('User not found')) {
        logger.auth('User not found - clearing authentication tokens');
        await authService.removeAuthToken();
        setAuthState({ 
          isLoading: false, 
          isAuthenticated: false, 
          user: null 
        });
      } else if (error?.message?.includes('401') || error?.message?.includes('Unauthorized')) {
        logger.auth('Attempting token refresh due to 401 error');
        
        try {
          const refreshResult = await authService.refreshToken();
          if (refreshResult.success) {
            const user = await authService.getCurrentUser();
            logger.auth('User after token refresh', { hasUser: !!user });
            setAuthState({
              isLoading: false,
              isAuthenticated: !!user,
              user,
            });
          } else {
            throw new Error('Token refresh failed');
          }
        } catch (retryError) {
          logger.error('Retry after refresh failed', { error: retryError instanceof Error ? retryError.message : 'Unknown error' }, 'auth');
          await authService.removeAuthToken();
          setAuthState({ 
            isLoading: false, 
            isAuthenticated: false, 
            user: null 
          });
        }
      } else {
        logger.auth('Setting auth state to unauthenticated due to error');
        setAuthState({ 
          isLoading: false, 
          isAuthenticated: false, 
          user: null 
        });
      }
    }
  };

  // Основные методы аутентификации
  const login = async (phoneNumber: string): Promise<{ success: boolean; error?: string; needsContact?: boolean }> => {
    // Предотвращаем множественные одновременные запросы
    if (loginInProgress) {
      return { success: false, error: 'Login already in progress' };
    }

    try {
      setLoginInProgress(true);
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      logger.auth('Starting login process');
      const result = await authService.login(phoneNumber);
      
      logger.auth('AuthService result', { success: result.success, hasUser: !!result.user });
      
      if (result.success && result.user) {
        logger.auth('Setting authenticated state');
        setAuthState({
          isLoading: false,
          isAuthenticated: true,
          user: result.user,
        });

        // Проверяем что токен действительно сохранился
        const token = await authService.getAuthToken();
        logger.auth('Post-login token check', { hasToken: !!token });
        
        if (!token) {
          logger.warn('Warning - no token found after login', {}, 'auth');
          setAuthState(prev => ({ ...prev, isLoading: false }));
          return { 
            success: false, 
            error: 'Ошибка сохранения аутентификации' 
          };
        }

        logger.auth('Login completed successfully');
        return { success: true };
      } else {
        logger.auth('Login failed');
        setAuthState(prev => ({ ...prev, isLoading: false }));
        return { 
          success: false, 
          error: result.error,
          needsContact: result.needsContact 
        };
      }
    } catch (error) {
      logger.error('Login exception', { error: error instanceof Error ? error.message : 'Unknown error' }, 'auth');
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return { 
        success: false, 
        error: 'Ошибка при входе в систему' 
      };
    } finally {
      setLoginInProgress(false);
    }
  };

  const register = async (phoneNumber: string, name: string): Promise<{ success: boolean; error?: string }> => {
    // Предотвращаем множественные одновременные запросы
    if (registerInProgress) {
      return { success: false, error: 'Registration already in progress' };
    }

    try {
      setRegisterInProgress(true);
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      logger.auth('Starting registration process');
      const result = await authService.register(phoneNumber, name);
      
      logger.auth('AuthService result', { success: result.success, hasUser: !!result.user });
      
      if (result.success && result.user) {
        logger.auth('Setting authenticated state');
        setAuthState({
          isLoading: false,
          isAuthenticated: true,
          user: result.user,
        });

        // Проверяем что токен действительно сохранился
        const token = await authService.getAuthToken();
        logger.auth('Post-register token check', { hasToken: !!token });
        
        if (!token) {
          logger.warn('Warning - no token found after registration', {}, 'auth');
          setAuthState(prev => ({ ...prev, isLoading: false }));
          return { 
            success: false, 
            error: 'Ошибка сохранения аутентификации' 
          };
        }

        logger.auth('Registration completed successfully');
        return { success: true };
      } else {
        logger.auth('Registration failed');
        setAuthState(prev => ({ ...prev, isLoading: false }));
        return { 
          success: false, 
          error: result.error 
        };
      }
    } catch (error) {
      logger.error('Registration exception', { error: error instanceof Error ? error.message : 'Unknown error' }, 'auth');
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return { 
        success: false, 
        error: 'Ошибка при регистрации' 
      };
    } finally {
      setRegisterInProgress(false);
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

