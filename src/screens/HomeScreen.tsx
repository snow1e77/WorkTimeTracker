import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { 
  Card, 
  Title, 
  Paragraph, 
  Button, 
  IconButton, 
  Text,
  Surface,
  Chip 
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, WorkShift } from '../types';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [currentShift, setCurrentShift] = useState<WorkShift | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [workingTime, setWorkingTime] = useState('00:00');

  // Simulate current shift
  useEffect(() => {
    const timer = setInterval(() => {
      if (currentShift && !currentShift.endTime) {
        const now = new Date();
        const diff = now.getTime() - currentShift.startTime.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setWorkingTime(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [currentShift]);

  const handleStartShift = () => {
    const newShift: WorkShift = {
      id: Date.now().toString(),
      userId: 'user1',
      siteId: 'site1',
      startTime: new Date(),
      status: 'active',
      startMethod: 'manual',
      adminConfirmed: false,
      createdAt: new Date()
    };
    setCurrentShift(newShift);
    setIsTracking(true);
    Alert.alert('Shift Started', 'Work shift successfully started');
  };

  const handleEndShift = () => {
    if (currentShift) {
      const now = new Date();
      const totalMinutes = Math.floor((now.getTime() - currentShift.startTime.getTime()) / (1000 * 60));
      
      setCurrentShift({
        ...currentShift,
        endTime: now,
        totalMinutes,
        status: 'completed',
        endMethod: 'manual'
      });
      setIsTracking(false);
      Alert.alert('Shift Completed', `Worked: ${Math.floor(totalMinutes / 60)} h ${totalMinutes % 60} min`);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Current shift status */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>Current Shift</Title>
          {currentShift && !currentShift.endTime ? (
            <>
              <View style={styles.statusRow}>
                <Chip icon="clock" mode="outlined" style={styles.statusChip}>
                  Active
                </Chip>
                <Text style={styles.workingTime}>{workingTime}</Text>
              </View>
              <Paragraph>Started: {currentShift.startTime.toLocaleTimeString()}</Paragraph>
              <Button 
                mode="contained" 
                onPress={handleEndShift}
                style={styles.endButton}
                buttonColor="#f44336"
              >
                End Shift
              </Button>
            </>
          ) : (
            <>
              <Paragraph>Shift not started</Paragraph>
              <Button 
                mode="contained" 
                onPress={handleStartShift}
                style={styles.startButton}
              >
                Start Shift
              </Button>
            </>
          )}
        </Card.Content>
      </Card>

      {/* Quick actions */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>Quick Actions</Title>
          <View style={styles.quickActions}>
            <Surface style={styles.actionButton} elevation={2}>
              <IconButton 
                icon="map-marker" 
                size={30}
                onPress={() => navigation.navigate('TimeTracking')}
              />
              <Text>GPS Tracking</Text>
            </Surface>
            
            <Surface style={styles.actionButton} elevation={2}>
              <IconButton 
                icon="history" 
                size={30}
                onPress={() => navigation.navigate('History')}
              />
              <Text>History</Text>
            </Surface>
            
            <Surface style={styles.actionButton} elevation={2}>
              <IconButton 
                icon="cog" 
                size={30}
                onPress={() => navigation.navigate('Settings')}
              />
              <Text>Settings</Text>
            </Surface>
          </View>
        </Card.Content>
      </Card>

      {/* Today's summary */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>Today</Title>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>7.5</Text>
              <Text style={styles.summaryLabel}>hours</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>1</Text>
              <Text style={styles.summaryLabel}>shift</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>0</Text>
              <Text style={styles.summaryLabel}>violations</Text>
            </View>
          </View>
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
  card: {
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
  },
  statusChip: {
    backgroundColor: '#4CAF50',
  },
  workingTime: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  startButton: {
    marginTop: 16,
    backgroundColor: '#4CAF50',
  },
  endButton: {
    marginTop: 16,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  actionButton: {
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    minWidth: 80,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
}); 