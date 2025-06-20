import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
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

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { user } = useAuth();
  
  const [isWorking, setIsWorking] = useState(false);
  const [shiftStartTime, setShiftStartTime] = useState<Date | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [currentDuration, setCurrentDuration] = useState('00:00:00');

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

      {/* Quick Actions */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>Quick Actions</Title>
          
          <List.Item
            title="Time Tracking"
            description="Monitor GPS and work location"
            left={() => <List.Icon icon="crosshairs-gps" />}
            onPress={() => navigation.navigate('TimeTracking')}
          />
          
          <List.Item
            title="Shift History"
            description="View your work history"
            left={() => <List.Icon icon="history" />}
            onPress={() => navigation.navigate('History')}
          />
          
          <List.Item
            title="Settings"
            description="Configure app preferences"
            left={() => <List.Icon icon="cog" />}
            onPress={() => navigation.navigate('Settings')}
          />
          
          {user?.role === 'admin' && (
            <List.Item
              title="Admin Panel"
              description="Manage sites and users"
              left={() => <List.Icon icon="account-supervisor" />}
              onPress={() => navigation.navigate('Admin')}
            />
          )}
        </Card.Content>
      </Card>

      {/* Today's Summary */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>Today's Summary</Title>
          <Paragraph>Total hours: 0.0</Paragraph>
          <Paragraph>Shifts: 0</Paragraph>
          <Paragraph>Status: No violations</Paragraph>
        </Card.Content>
      </Card>
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
}); 