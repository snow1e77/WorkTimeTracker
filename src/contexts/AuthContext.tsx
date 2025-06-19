import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthUser, AuthState } from '../types';
import { AuthService } from '../services/AuthService';
import { DatabaseService } from '../services/DatabaseService';

interface AuthContextType extends AuthState {
  login: (phoneNumber: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  register: (data: { name: string; phoneNumber: string; password: string }) => Promise<boolean>;
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
      console.log('🔄 Checking auth status...');
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      // Initialize database first
      console.log('🔄 Initializing database from AuthContext...');
      await dbService.initDatabase();
      console.log('✅ Database initialized from AuthContext');
      
      // Check authentication
      console.log('🔄 Getting current user...');
      const user = await authService.getCurrentUser();
      console.log('✅ Current user:', user ? `${user.name} (${user.phoneNumber})` : 'No user');
      
      setAuthState({
        isAuthenticated: !!user,
        user,
        isLoading: false,
      });
    } catch (error) {
      console.error('❌ Error checking auth status:', error);
      setAuthState({
        isAuthenticated: false,
        user: null,
        isLoading: false,
      });
    }
  };

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
      console.error('Login error:', error);
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
    login,
    logout,
    register,
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