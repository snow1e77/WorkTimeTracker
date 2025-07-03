import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import {
  IconButton,
  Menu,
  Provider,
  Text,
  Card,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { DatabaseService } from '../services/DatabaseService';
import { LocationService } from '../services/LocationService';
import { RootStackParamList } from '../types';
import logger from '../utils/logger';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { user } = useAuth();
  
  const [isWorking, setIsWorking] = useState(false);
  const [shiftStartTime, setShiftStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [menuVisible, setMenuVisible] = useState(false);

  const locationService = LocationService.getInstance();
  const dbService = DatabaseService.getInstance();

  // Initialize background location tracking for workers
  useEffect(() => {
    const initializeLocationTracking = async () => {
      if (user && user.role === 'worker') {
        try {
          const sites = await dbService.getConstructionSites();
          await locationService.initializeBackgroundTracking(user.id, sites);
        } catch (error) {
          logger.error('Location tracking initialization failed', {}, 'location');
        }
      }
    };

    if (user) {
      initializeLocationTracking();
    }

    return () => {
      if (user?.role === 'worker') {
        locationService.stopBackgroundTracking();
      }
    };
  }, [user]);

  // Секундомер
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isWorking && shiftStartTime) {
      interval = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - shiftStartTime.getTime()) / 1000);
        setElapsedTime(elapsed);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isWorking, shiftStartTime]);

  const handleStartShift = () => {
    setIsWorking(true);
    const now = new Date();
    setShiftStartTime(now);
    setElapsedTime(0);
  };

  const handleEndShift = () => {
    setIsWorking(false);
    setShiftStartTime(null);
    setElapsedTime(0);
  };

  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  // Форматирование времени для секундомера
  const formatElapsedTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Provider>
      <View style={styles.container}>
        {/* Menu button top left */}
        <View style={styles.menuContainer}>
          <Menu
            visible={menuVisible}
            onDismiss={closeMenu}
            anchor={
              <IconButton
                icon="menu"
                iconColor="white"
                size={30}
                onPress={openMenu}
              />
            }
            contentStyle={styles.menuContent}
          >
            <Menu.Item 
              onPress={() => {
                closeMenu();
                navigation.navigate('Schedule');
              }} 
              title="Schedule" 
              leadingIcon="calendar-clock"
            />
            <Menu.Item 
              onPress={() => {
                closeMenu();
                navigation.navigate('Documents');
              }} 
              title="Documents (Blueprints)" 
              leadingIcon="file-document-multiple"
            />
            <Menu.Item 
              onPress={() => {
                closeMenu();
                navigation.navigate('Assignments');
              }} 
              title="Assignments" 
              leadingIcon="clipboard-list"
            />
            <Menu.Item 
              onPress={() => {
                closeMenu();
                navigation.navigate('History');
              }} 
              title="History & Reports" 
              leadingIcon="history"
            />
          </Menu>
        </View>

        {/* Company and User Info Header */}
        <View style={styles.headerContainer}>
          <View style={styles.companyHeader}>
            <Text style={styles.companyName}>
              {user?.companyName || 'Строительная компания'}
            </Text>
            <Text style={styles.userName}>
              {user?.name || 'Рабочий'}
            </Text>
            <Text style={styles.userRole}>
              {user?.role === 'admin' ? 'Администратор' : 'Рабочий'}
            </Text>
          </View>
        </View>

        {/* Three main buttons */}
        <View style={styles.buttonsContainer}>
          {/* Chat button */}
          <TouchableOpacity
            style={styles.chatButton}
            onPress={() => navigation.navigate('Chat')}
          >
            <IconButton
              icon="chat"
              iconColor="white"
              size={30}
            />
          </TouchableOpacity>

          {/* Photo button */}
          <TouchableOpacity
            style={styles.photoButton}
            onPress={() => {
              // Handle photo functionality
            }}
          >
            <IconButton
              icon="camera"
              iconColor="white"
              size={30}
            />
          </TouchableOpacity>

          {/* Main start/stop button */}
          <TouchableOpacity
            style={[styles.mainButton, { backgroundColor: isWorking ? '#FF5722' : '#4CAF50' }]}
            onPress={isWorking ? handleEndShift : handleStartShift}
          >
            <IconButton
              icon={isWorking ? "stop" : "play"}
              iconColor="white"
              size={50}
            />
          </TouchableOpacity>
        </View>

        {/* Shift Information */}
        {isWorking && shiftStartTime && (
          <Card style={styles.shiftInfoCard}>
            <Card.Content>
              <View style={styles.shiftInfoColumns}>
                <View style={styles.column}>
                  <Text style={styles.timerValue}>{formatElapsedTime(elapsedTime)}</Text>
                </View>
                <View style={styles.column}>
                  <Text style={styles.shiftValue}>
                    {shiftStartTime.toLocaleDateString('en-US', {
                      day: '2-digit',
                      month: '2-digit', 
                      year: '2-digit'
                    })}
                  </Text>
                </View>
                <View style={styles.column}>
                  <Text style={styles.shiftValue}>
                    {shiftStartTime.toLocaleTimeString('en-US', { 
                      hour: '2-digit', 
                      minute: '2-digit',
                      hour12: false
                    })}
                  </Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        )}
      </View>
    </Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2C3E50',
  },
  menuContainer: {
    position: 'absolute',
    top: 50,
    left: 16,
    zIndex: 1000,
  },
  menuContent: {
    backgroundColor: 'white',
    borderRadius: 8,
    minWidth: 200,
  },
  buttonsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  chatButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  photoButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#9b59b6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  mainButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  shiftInfoCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#ccc',
  },
  shiftInfoColumns: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  column: {
    flex: 1,
    alignItems: 'center',
  },
  timerValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  shiftValue: {
    fontWeight: 'normal',
  },
  headerContainer: {
    paddingTop: 100,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  companyHeader: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  companyName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
    textAlign: 'center',
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#E8F4F8',
    marginBottom: 2,
    textAlign: 'center',
  },
  userRole: {
    fontSize: 14,
    color: '#BDC3C7',
    textAlign: 'center',
  },
}); 
