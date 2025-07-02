import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { scrollViewConfig, scrollContentStyle } from '../config/scrollConfig';
import {
  Card,
  Title,
  Paragraph,
  Button,
  Chip,
  Text,
  IconButton,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { DatabaseService } from '../services/DatabaseService';
import { LocationService } from '../services/LocationService';
import { RootStackParamList } from '../types';
import { SyncStatusIndicator } from '../components/SyncStatusIndicator';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { user } = useAuth();
  
  const [isWorking, setIsWorking] = useState(false);
  const [shiftStartTime, setShiftStartTime] = useState<Date | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [currentDuration, setCurrentDuration] = useState('00:00:00');
  const [locationTracking, setLocationTracking] = useState(false);

  const locationService = LocationService.getInstance();
  const dbService = DatabaseService.getInstance();

  // Инициализация фонового отслеживания геолокации
  useEffect(() => {
    const initializeLocationTracking = async () => {
      if (user && user.role === 'worker') {
        try {
          // Получаем список активных объектов
          const sites = await dbService.getConstructionSites();
          
          // Запускаем фоновое отслеживание
          const success = await locationService.initializeBackgroundTracking(user.id, sites);
          
          if (success) {
            setLocationTracking(true);
            setStatusMessage('Location tracking started automatically');
            } else {
            setStatusMessage('Could not start location tracking. Please enable location permissions.');
            }
        } catch (error) {
          setStatusMessage('Location tracking initialization failed');
        }
      }
    };

    if (user) {
      initializeLocationTracking();
    }

    // Очистка при размонтировании компонента
    return () => {
      if (user?.role === 'worker') {
        locationService.stopBackgroundTracking();
      }
    };
  }, [user]);

  // Таймер для обновления длительности смены
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isWorking && shiftStartTime) {
      interval = setInterval(() => {
        const now = new Date();
        const diffMs = now.getTime() - shiftStartTime.getTime();
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
        
        setCurrentDuration(
          `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
      }, 1000);
    } else {
      setCurrentDuration('00:00:00');
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isWorking, shiftStartTime]);

  const handleStartShift = () => {
    setIsWorking(true);
    setShiftStartTime(new Date());
    setStatusMessage('Work shift successfully started');
  };

  const handleEndShift = () => {
    if (shiftStartTime) {
      const endTime = new Date();
      const totalMinutes = Math.floor((endTime.getTime() - shiftStartTime.getTime()) / (1000 * 60));
      setIsWorking(false);
      setShiftStartTime(null);
      setStatusMessage(`Shift completed. Worked: ${Math.floor(totalMinutes / 60)} h ${totalMinutes % 60} min`);
    }
  };

  const dismissMessage = () => {
    setStatusMessage('');
  };

  return (
    <View style={styles.container}>
      {/* Статус сообщение */}
      {statusMessage ? (
        <Card style={styles.statusCard}>
          <Card.Content>
            <Paragraph>{statusMessage}</Paragraph>
            <Button mode="text" onPress={dismissMessage} style={styles.dismissButton}>
              Dismiss
            </Button>
          </Card.Content>
        </Card>
      ) : null}

      <ScrollView 
        {...scrollViewConfig}
        contentContainerStyle={[scrollContentStyle, styles.scrollContent]}
      >
        {/* Header с информацией о пользователе */}
        <View style={styles.header}>
          <View style={styles.userInfo}>
            <Text style={styles.greeting}>Hda Bygg OÜ</Text>
            <Text style={styles.subtitle}>Alexander Gerhard</Text>
          </View>
                     <SyncStatusIndicator status="idle" />
        </View>

        {/* Welcome Card */}
        <Card style={styles.card}>
          <Card.Content>
            <Title>Welcome, {user?.name || 'User'}!</Title>
            <Paragraph>Track your work time and manage your shifts</Paragraph>
          </Card.Content>
        </Card>

        {/* Current Status */}
        <Card style={styles.card}>
          <Card.Content>
            <Title>Current Status</Title>
            <View style={styles.statusRow}>
              <Chip 
                icon={isWorking ? "clock" : "clock-outline"} 
                style={[styles.statusChip, { backgroundColor: isWorking ? '#4CAF50' : '#757575' }]}
                textStyle={{ color: 'white' }}
              >
                {isWorking ? 'Working' : 'Not Working'}
              </Chip>
            </View>
            
            {isWorking && shiftStartTime ? (
              <>
                <Paragraph>
                  Shift started: {shiftStartTime.toLocaleTimeString()}
                </Paragraph>
                <View style={styles.durationContainer}>
                  <Chip 
                    icon="timer" 
                    style={styles.durationChip}
                    textStyle={styles.durationText}
                  >
                    Duration: {currentDuration}
                  </Chip>
                </View>
              </>
            ) : null}
            
            <Paragraph>Current Duration: {currentDuration}</Paragraph>
            
            {/* Location tracking status - только для работников */}
            {user?.role === 'worker' && (
              <View style={styles.locationStatus}>
                <Chip 
                  icon={locationTracking ? "map-marker-check" : "map-marker-off"} 
                  style={[styles.locationChip, { 
                    backgroundColor: locationTracking ? '#4CAF50' : '#FF5722' 
                  }]}
                  textStyle={{ color: 'white', fontSize: 12 }}
                >
                  {locationTracking ? 'Location tracking active' : 'Location tracking off'}
                </Chip>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Admin Panel Access - только для админов */}
        {user?.role === 'admin' && (
          <Card style={styles.card}>
            <Card.Content>
              <Title>Admin Panel</Title>
              <Button
                mode="contained"
                icon="account-supervisor"
                onPress={() => navigation.navigate('Admin')}
                style={[styles.adminButton, { backgroundColor: '#FF9800' }]}
              >
                Open Admin Panel
              </Button>
            </Card.Content>
          </Card>
        )}

        {/* Разделы с дополнительной информацией */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Projects</Text>
          <Paragraph>No active projects</Paragraph>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chat</Text>
          <Paragraph>1</Paragraph>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tracker</Text>
          <Paragraph>Time tracking active</Paragraph>
        </View>

        {/* Добавляем отступ снизу для кнопок */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Большие круглые кнопки внизу экрана */}
      <View style={styles.bottomButtonsContainer}>
        {/* Кнопка камеры/фото */}
        {user?.role === 'worker' && (
          <TouchableOpacity
            style={styles.cameraButton}
            onPress={() => navigation.navigate('Chat')}
          >
            <IconButton
              icon="camera"
              iconColor="#333"
              size={40}
            />
          </TouchableOpacity>
        )}

        {/* Основная кнопка начала/окончания смены */}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2C3E50',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
  },
  bottomSpacing: {
    height: 120, // Пространство для кнопок
  },
  statusCard: {
    marginBottom: 16,
    backgroundColor: '#e3f2fd',
  },
  dismissButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  card: {
    marginBottom: 16,
  },
  statusRow: {
    marginVertical: 12,
  },
  statusChip: {
    alignSelf: 'flex-start',
  },
  durationContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
  durationChip: {
    backgroundColor: '#4CAF50',
  },
  durationText: {
    color: 'white',
  },
  adminButton: {
    marginTop: 12,
  },
  chatButton: {
    marginTop: 12,
  },
  locationStatus: {
    marginTop: 12,
    marginBottom: 8,
  },
  locationChip: {
    alignSelf: 'flex-start',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  userInfo: {
    flex: 1,
  },
  greeting: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  syncContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 8,
  },
  section: {
    backgroundColor: '#fff',
    margin: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  bottomButtonsContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  cameraButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  mainButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
}); 
