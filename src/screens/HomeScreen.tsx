import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Text } from 'react-native';
import { 
  Card, 
  Title, 
  Paragraph, 
  Button, 
  List, 
  Chip,
  HelperText
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { LocationService } from '../services/LocationService';
import { DatabaseService } from '../services/DatabaseService';
import SyncStatusIndicator from '../components/SyncStatusIndicator';

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
          console.log('🔄 Инициализация отслеживания геолокации для работника');
          
          // Получаем список активных объектов
          const sites = await dbService.getConstructionSites();
          
          // Запускаем фоновое отслеживание
          const success = await locationService.initializeBackgroundTracking(user.id, sites);
          
          if (success) {
            setLocationTracking(true);
            setStatusMessage('Location tracking started automatically');
            console.log('✅ Отслеживание геолокации запущено');
          } else {
            setStatusMessage('Could not start location tracking. Please enable location permissions.');
            console.log('❌ Не удалось запустить отслеживание геолокации');
          }
        } catch (error) {
          console.error('❌ Ошибка инициализации отслеживания:', error);
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
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <Text style={styles.greeting}>Hello, {user?.name || 'User'}!</Text>
          <Text style={styles.subtitle}>Work Time Tracker</Text>
        </View>
        
        {/* Добавляем индикатор синхронизации */}
        <View style={styles.syncContainer}>
          <SyncStatusIndicator showDetails={false} />
        </View>
      </View>

      {/* Детальный индикатор синхронизации в настройках */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sync Status</Text>
        <SyncStatusIndicator showDetails={true} />
      </View>

      {/* Status Message */}
      {statusMessage ? (
        <Card style={styles.statusCard}>
          <Card.Content>
            <HelperText type="info" visible={true}>
              {statusMessage}
            </HelperText>
            <Button
              mode="text"
              onPress={dismissMessage}
              style={styles.dismissButton}
            >
              Dismiss
            </Button>
          </Card.Content>
        </Card>
      ) : null}

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
          
          <Button
            mode={isWorking ? "outlined" : "contained"}
            onPress={isWorking ? handleEndShift : handleStartShift}
            style={styles.shiftButton}
            buttonColor={isWorking ? undefined : '#4CAF50'}
          >
            {isWorking ? 'End Shift' : 'Start Shift'}
          </Button>
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

      {/* Chat Access - только для работников */}
      {user?.role === 'worker' && (
        <Card style={styles.card}>
          <Card.Content>
            <Title>Communication</Title>
            <Paragraph>Chat with your foreman and send work photos</Paragraph>
            <Button
              mode="contained"
              icon="chat"
              onPress={() => navigation.navigate('Chat')}
              style={[styles.chatButton, { backgroundColor: '#2196F3' }]}
            >
              Open Chat
            </Button>
          </Card.Content>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
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
  shiftButton: {
    marginTop: 16,
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
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
    margin: 16,
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
}); 