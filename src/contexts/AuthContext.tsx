import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthUser, AuthState } from '../types';
import { AuthService } from '../services/AuthService';
import { DatabaseService } from '../services/DatabaseService';

interface AuthContextType extends AuthState {
  // Новые методы для SMS-аутентификации
  sendLoginCode: (phoneNumber: string) => Promise<{ success: boolean; userExists: boolean; error?: string }>;
  verifyLoginCode: (phoneNumber: string, code: string) => Promise<{ success: boolean; user?: AuthUser; error?: string; needsProfile?: boolean }>;
  createUserProfile: (phoneNumber: string, name: string, smsCode: string) => Promise<{ success: boolean; user?: AuthUser; error?: string }>;
  
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
  const dbService = DatabaseService.getInstance();

  const checkAuthStatus = async () => {
    try {
      console.log('🔄 Проверка статуса аутентификации...');
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      // Инициализируем базу данных сначала
      console.log('🔄 Инициализация базы данных из AuthContext...');
      await dbService.initDatabase();
      console.log('✅ База данных инициализирована из AuthContext');
      
      // Проверяем аутентификацию
      console.log('🔄 Получение текущего пользователя...');
      const user = await authService.getCurrentUser();
      console.log('✅ Текущий пользователь:', user ? `${user.name} (${user.phoneNumber})` : 'Нет пользователя');
      
      setAuthState({
        isAuthenticated: !!user,
        user,
        isLoading: false,
      });
    } catch (error) {
      console.error('❌ Ошибка проверки статуса аутентификации:', error);
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
      console.error('Ошибка отправки кода:', error);
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
      console.error('Ошибка проверки кода:', error);
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
      console.error('Ошибка создания профиля:', error);
      return { success: false, error: 'Failed to create profile' };
    }
  };

  // Устаревшие методы - оставляем для совместимости
  const login = async (phoneNumber: string, password: string): Promise<boolean> => {
    console.warn('⚠️ AuthContext.login устарел, используйте sendLoginCode + verifyLoginCode');
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
      console.error('Login error:', error);
      return false;
    }
  };

  const register = async (data: { name: string; phoneNumber: string; password: string }): Promise<boolean> => {
    console.warn('⚠️ AuthContext.register устарел, используйте sendLoginCode + createUserProfile');
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
      console.error('Registration error:', error);
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
      console.error('Logout error:', error);
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