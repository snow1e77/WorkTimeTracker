import React, { useEffect, useRef, useState } from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PaperProvider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, Platform, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import WebRouter from './src/components/WebRouter';
import { notificationService } from './src/services/NotificationService';
import logger from './src/utils/logger';

import { RootStackParamList } from './src/types';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';

// Onboarding screens moved to web components

// Authentication screens
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';

// Main screens
import HomeScreen from './src/screens/HomeScreen';
import TimeTrackingScreen from './src/screens/TimeTrackingScreen';
import ScheduleScreen from './src/screens/ScheduleScreen';
import DocumentsScreen from './src/screens/DocumentsScreen';
import AssignmentsScreen from './src/screens/AssignmentsScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ChatScreen from './src/screens/ChatScreen';

// Admin screens
import AdminScreen from './src/screens/AdminScreen';
import SiteManagementScreen from './src/screens/SiteManagementScreen';
import CreateSiteScreen from './src/screens/CreateSiteScreen';
import WorkReportsScreen from './src/screens/WorkReportsScreen';
import UserManagementScreen from './src/screens/UserManagementScreen';

// Enable scroll optimization for iOS simulator
if (Platform.OS === 'ios' && __DEV__) {
  // Правильный способ отключения font scaling
  const TextRender = Text as any;
  TextRender.defaultProps = TextRender.defaultProps || {};
  TextRender.defaultProps.allowFontScaling = false;
}

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Отладочная информация
  // Инициализация NotificationService
  useEffect(() => {
    const initNotifications = async () => {
      try {
        await notificationService.initialize();
      } catch (error) {
        logger.error('Failed to initialize notification service', { 
          error: error instanceof Error ? error.message : 'Unknown error' 
        }, 'app');
      }
    };

    if (Platform.OS !== 'web') {
      initNotifications();
    }
  }, []);

  // Автоматическая навигация к Home после аутентификации
  useEffect(() => {
    logger.debug('Auth state changed', {
      isAuthenticated,
      isLoading,
      hasNavigationRef: !!navigationRef.current
    }, 'app');
    
    if (isAuthenticated && !isLoading && navigationRef.current) {
      try {
        const currentRouteName = navigationRef.current.getCurrentRoute()?.name;
        logger.debug('Current route', { currentRouteName }, 'app');
        
        // Навигируем только если мы не уже на главной странице
        if (currentRouteName !== 'Home') {
          logger.info('Navigating to Home screen after authentication', {}, 'app');
          
          // Очищаем предыдущий таймер если он существует
          if (navigationTimeoutRef.current) {
            clearTimeout(navigationTimeoutRef.current);
          }
          
          // Небольшая задержка для обеспечения полной инициализации
          navigationTimeoutRef.current = setTimeout(() => {
            if (navigationRef.current) {
              navigationRef.current.reset({
                index: 0,
                routes: [{ name: 'Home' }],
              });
              logger.info('Navigation to Home completed', {}, 'app');
            }
            navigationTimeoutRef.current = null;
          }, 100);
        } else {
          logger.debug('Already on Home screen, no navigation needed', {}, 'app');
        }
      } catch (error) {
        logger.error('Navigation error', { error: error instanceof Error ? error.message : 'Unknown error' }, 'app');
      }
    } else if (!isAuthenticated && !isLoading && navigationRef.current) {
      const currentRouteName = navigationRef.current.getCurrentRoute()?.name;
      logger.debug('User not authenticated', { currentRouteName }, 'app');
      
      // Если пользователь не аутентифицирован и не на экране входа, навигируем к Login
      if (currentRouteName !== 'Login' && currentRouteName !== 'Register') {
        logger.info('Navigating to Login screen', {}, 'app');
        
        // Очищаем предыдущий таймер если он существует
        if (navigationTimeoutRef.current) {
          clearTimeout(navigationTimeoutRef.current);
        }
        
        navigationTimeoutRef.current = setTimeout(() => {
          if (navigationRef.current) {
            navigationRef.current.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          }
          navigationTimeoutRef.current = null;
        }, 100);
      }
    }
  }, [isAuthenticated, isLoading]);
  
  // Очистка таймера при размонтировании
  useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
    };
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <StatusBar style="auto" />
      <Stack.Navigator 
        screenOptions={{
          headerStyle: {
            backgroundColor: '#2196F3',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        {!isAuthenticated ? (
          <>
            {/* Authentication screens - доступны только для неавторизованных пользователей */}
            <Stack.Screen 
              name="Login" 
              component={LoginScreen} 
              options={{ title: 'Login', headerShown: false }}
            />
            <Stack.Screen 
              name="Register" 
              component={RegisterScreen} 
              options={{ title: 'Register', headerShown: false }}
            />
          </>
        ) : (
          <>
            {/* Main screens - доступны только для аутентифицированных пользователей */}
            <Stack.Screen 
              name="Home" 
              component={HomeScreen} 
              options={{ title: 'Work Time Tracker' }}
            />
            <Stack.Screen 
              name="TimeTracking" 
              component={TimeTrackingScreen} 
              options={{ title: 'Time Tracking' }}
            />
            <Stack.Screen 
              name="Schedule" 
              component={ScheduleScreen} 
              options={{ title: 'Work Schedule' }}
            />
            <Stack.Screen 
              name="Documents" 
              component={DocumentsScreen} 
              options={{ title: 'Documents & Blueprints' }}
            />
            <Stack.Screen 
              name="Assignments" 
              component={AssignmentsScreen} 
              options={{ title: 'My Assignments' }}
            />
            <Stack.Screen 
              name="History" 
              component={HistoryScreen} 
              options={{ title: 'Shift History' }}
            />
            <Stack.Screen 
              name="Settings" 
              component={SettingsScreen} 
              options={{ title: 'Settings' }}
            />
            <Stack.Screen 
              name="Chat" 
              component={ChatScreen} 
              options={{ title: 'Chat with Foreman' }}
            />
            <Stack.Screen 
              name="Admin" 
              component={AdminScreen} 
              options={{ title: 'Foreman Panel' }}
            />
            <Stack.Screen 
              name="SiteManagement" 
              component={SiteManagementScreen} 
              options={{ title: 'Site Management' }}
            />
            <Stack.Screen 
              name="CreateSite" 
              component={CreateSiteScreen} 
              options={{ title: 'Create Site' }}
            />
            <Stack.Screen 
              name="WorkReports" 
              component={WorkReportsScreen} 
              options={{ title: 'Work Reports' }}
            />
            <Stack.Screen 
              name="UserManagement" 
              component={UserManagementScreen} 
              options={{ title: 'User Management' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default function App() {
  // Если это веб-платформа, показываем веб-роутер (лендинг или админ-панель)
  if (Platform.OS === 'web') {
    return (
      <PaperProvider>
        <WebRouter />
      </PaperProvider>
    );
  }

  // Для мобильных устройств показываем обычное приложение
  return (
    <PaperProvider>
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </PaperProvider>
  );
}

