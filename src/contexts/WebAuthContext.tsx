import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthUser } from '../types';
import { WebAuthService } from '../services/WebAuthService';
import logger from '../utils/logger';

interface WebAuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (phoneNumber: string) => Promise<void>;
  logout: () => void;
}

const WebAuthContext = createContext<WebAuthContextType | undefined>(undefined);

interface WebAuthProviderProps {
  children: ReactNode;
}

export const WebAuthProvider: React.FC<WebAuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const authService = WebAuthService.getInstance();

  const isAuthenticated = !!user;

  // Проверяем сохраненный токен при загрузке
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      setIsLoading(true);
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (phoneNumber: string) => {
    try {
      setIsLoading(true);
      const result = await authService.login(phoneNumber);
      
      if (result.success && result.user) {
        setUser(result.user);
      } else {
        throw new Error(result.error || 'Login failed');
      }
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
    } catch (error) {
      logger.error('Failed to logout from web auth', {
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 'webAuth');
      // Even if logout fails, clear user state for safety
      setUser(null);
    }
  };

  const value: WebAuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
  };

  return (
    <WebAuthContext.Provider value={value}>
      {children}
    </WebAuthContext.Provider>
  );
};

export const useWebAuth = (): WebAuthContextType => {
  const context = useContext(WebAuthContext);
  if (!context) {
    throw new Error('useWebAuth must be used within a WebAuthProvider');
  }
  return context;
}; 
