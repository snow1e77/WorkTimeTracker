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
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { DatabaseService } from '../services/DatabaseService';
import { LocationService } from '../services/LocationService';
import { RootStackParamList } from '../types';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { user } = useAuth();
  
  const [isWorking, setIsWorking] = useState(false);
  const [shiftStartTime, setShiftStartTime] = useState<Date | null>(null);
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
          console.log('Location tracking initialization failed');
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

  const handleStartShift = () => {
    setIsWorking(true);
    setShiftStartTime(new Date());
  };

  const handleEndShift = () => {
    setIsWorking(false);
    setShiftStartTime(null);
  };

  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

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
}); 
