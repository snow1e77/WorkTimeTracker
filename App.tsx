import React, { useEffect, useRef, useState } from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PaperProvider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import WebApp from './src/components/WebApp';
import { notificationService } from './src/services/NotificationService';

import { RootStackParamList } from './src/types';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';

// Onboarding screens moved to web components

// Authentication screens
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import VerifyPhoneScreen from './src/screens/VerifyPhoneScreen';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';

// Main screens
import HomeScreen from './src/screens/HomeScreen';
import TimeTrackingScreen from './src/screens/TimeTrackingScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ChatScreen from './src/screens/ChatScreen';

// Admin screens
import AdminScreen from './src/screens/AdminScreen';
import SiteManagementScreen from './src/screens/SiteManagementScreen';
import CreateSiteScreen from './src/screens/CreateSiteScreen';
import WorkReportsScreen from './src/screens/WorkReportsScreen';
import UserManagementScreen from './src/screens/UserManagementScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

  // Отладочная информация
  console.log('🔍 AppNavigator - isAuthenticated:', isAuthenticated, 'isLoading:', isLoading);

  // Инициализация NotificationService
  useEffect(() => {
    const initNotifications = async () => {
      try {
        await notificationService.initialize();
        console.log('✅ NotificationService инициализирован');
      } catch (error) {
        console.error('❌ Ошибка инициализации NotificationService:', error);
      }
    };

    if (Platform.OS !== 'web') {
      initNotifications();
    }
  }, []);

  // Автоматическая навигация к Home после аутентификации
  useEffect(() => {
    if (isAuthenticated && navigationRef.current) {
      console.log('🔄 Навигация к Home экрану');
      try {
        navigationRef.current.navigate('Home');
      } catch (error) {
        console.error('❌ Ошибка навигации к Home:', error);
      }
    }
  }, [isAuthenticated]);

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
            <Stack.Screen 
              name="VerifyPhone" 
              component={VerifyPhoneScreen} 
              options={{ title: 'Verify Phone Number' }}
            />
            <Stack.Screen 
              name="ResetPassword" 
              component={ResetPasswordScreen} 
              options={{ title: 'Reset Password', headerShown: false }}
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
  // Если это веб-платформа, показываем специальную админ панель
  if (Platform.OS === 'web') {
    return (
      <PaperProvider>
        <WebApp />
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
