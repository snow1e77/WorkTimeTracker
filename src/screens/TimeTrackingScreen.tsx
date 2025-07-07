import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Text as RNText, TouchableOpacity } from 'react-native';
import { scrollViewConfig } from '../config/scrollConfig';
import { Switch } from 'react-native-paper';
import * as Location from 'expo-location';
import { useAuth } from '../contexts/AuthContext';

export default function TimeTrackingScreen() {
  const { user } = useAuth();
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [gpsEnabled, setGpsEnabled] = useState(true);
  const [distance, setDistance] = useState(0);
  const [isInSiteRadius, setIsInSiteRadius] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [hasLocationPermission, setHasLocationPermission] = useState(false);

  // Координаты стройки (пример)
  const siteLocation = {
    latitude: 55.7558,
    longitude: 37.6176,
    radius: 100 // метры
  };

  useEffect(() => {
    requestLocationPermission();
  }, []);

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;

    const setupTracking = async () => {
      if (isTracking && gpsEnabled && hasLocationPermission) {
        const result = await startLocationTracking();
        if (result) {
          subscription = result;
        }
      } else if (subscription) {
        subscription.remove();
        subscription = null;
      }
    };

    setupTracking();

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [isTracking, gpsEnabled, hasLocationPermission]);

  const requestLocationPermission = async () => {
    try {
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      
      if (foregroundStatus !== 'granted') {
        setStatusMessage('Location permission is required for GPS tracking to work');
        setHasLocationPermission(false);
        return;
      }

      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      
      if (backgroundStatus !== 'granted') {
        setStatusMessage('Background location permission is recommended for automatic time tracking');
      }

      setHasLocationPermission(true);

      // Получаем текущее местоположение
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });
      setLocation(currentLocation);
      calculateDistance(currentLocation);
      setStatusMessage('Location permission granted');
      
    } catch (error) {
      setStatusMessage('Unable to get location permissions');
      setHasLocationPermission(false);
    }
  };

  const startLocationTracking = async (): Promise<Location.LocationSubscription | null> => {
    try {
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000, // 5 seconds
          distanceInterval: 10, // 10 meters
        },
        (newLocation) => {
          setLocation(newLocation);
          setLastUpdate(new Date());
          calculateDistance(newLocation);
        }
      );

      setStatusMessage('GPS tracking active');
      return subscription;
    } catch (error) {
      setStatusMessage('Unable to start GPS tracking');
      return null;
    }
  };

  const calculateDistance = (currentLocation: Location.LocationObject) => {
    const R = 6371e3; // Earth radius in meters
    const φ1 = siteLocation.latitude * Math.PI/180;
    const φ2 = currentLocation.coords.latitude * Math.PI/180;
    const Δφ = (currentLocation.coords.latitude - siteLocation.latitude) * Math.PI/180;
    const Δλ = (currentLocation.coords.longitude - siteLocation.longitude) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    const distanceInMeters = R * c;
    setDistance(Math.round(distanceInMeters));
    setIsInSiteRadius(distanceInMeters <= siteLocation.radius);
  };

  const toggleTracking = () => {
    if (isTracking) {
      setIsTracking(false);
      setStatusMessage('GPS tracking stopped');
    } else {
      setIsTracking(true);
      setStatusMessage('GPS tracking started');
    }
  };

  const _getLocationStatus = () => {
    if (!location) return 'Determining location...';
    if (isInSiteRadius) return 'At work site';
    return 'Outside work site';
  };

  const _getStatusColor = () => {
    if (!location) return '#FFC107';
    if (isInSiteRadius) return '#B7C8B5';
    return '#f44336';
  };

  return (
    <View style={styles.container}>
      {/* Header with User Avatar */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <RNText style={styles.avatarText}>
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </RNText>
          </View>
        </View>
        
        <View style={styles.userInfo}>
          <RNText style={styles.userName}>{user?.name || 'User'}</RNText>
          <RNText style={styles.userRole}>General construction labor</RNText>
        </View>

        <View style={styles.companyBadge}>
          <RNText style={styles.companyText}>🏢</RNText>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        {...scrollViewConfig}
      >
        {/* Status Cards Grid */}
        <View style={styles.cardsGrid}>
          {/* Photo Card */}
          <TouchableOpacity style={[styles.gridCard, styles.smallCard]}>
            <View style={styles.cardIconContainer}>
              <RNText style={styles.cardIcon}>📷</RNText>
            </View>
            <RNText style={styles.cardLabel}>Photo</RNText>
          </TouchableOpacity>

          {/* Work Shifts Card */}
          <TouchableOpacity style={[styles.gridCard, styles.largeCard]}>
            <View style={styles.cardIconContainer}>
              <RNText style={styles.cardIcon}>⏰</RNText>
            </View>
            <RNText style={styles.cardLabel}>Work shifts</RNText>
          </TouchableOpacity>

          {/* GPS Status Card */}
          <TouchableOpacity style={[styles.gridCard, styles.smallCard]}>
            <View style={styles.cardIconContainer}>
              <RNText style={styles.cardIcon}>📍</RNText>
            </View>
            <RNText style={styles.cardLabel}>GPS Status</RNText>
            <View style={[
              styles.statusIndicator, 
              { backgroundColor: isInSiteRadius ? '#404B46' : '#E1F4FF' }
            ]}>
              <RNText style={[
                styles.statusText, 
                { color: isInSiteRadius ? '#FFFFFF' : '#404B46' }
              ]}>
                {isInSiteRadius ? 'On Site' : 'Remote'}
              </RNText>
            </View>
          </TouchableOpacity>

          {/* Chat Card */}
          <TouchableOpacity style={[styles.gridCard, styles.largeCard]}>
            <View style={styles.cardIconContainer}>
              <RNText style={styles.cardIcon}>💬</RNText>
            </View>
            <RNText style={styles.cardLabel}>Chat</RNText>
          </TouchableOpacity>
        </View>

        {/* Location Details */}
        {location && (
          <View style={styles.locationCard}>
            <RNText style={styles.locationTitle}>Current Location</RNText>
            <View style={styles.locationRow}>
              <RNText style={styles.locationLabel}>Distance to site:</RNText>
              <RNText style={styles.locationValue}>{distance}m</RNText>
            </View>
            {lastUpdate && (
              <View style={styles.locationRow}>
                <RNText style={styles.locationLabel}>Last update:</RNText>
                <RNText style={styles.locationValue}>{lastUpdate.toLocaleTimeString()}</RNText>
              </View>
            )}
          </View>
        )}

        {/* GPS Controls */}
        <View style={styles.controlsCard}>
          <View style={styles.controlRow}>
            <RNText style={styles.controlLabel}>GPS Tracking</RNText>
            <Switch
              value={gpsEnabled}
              onValueChange={setGpsEnabled}
              thumbColor={gpsEnabled ? '#FFFFFF' : '#f4f3f4'}
              trackColor={{ false: '#E0E0E0', true: '#404B46' }}
            />
          </View>
          {statusMessage ? (
            <RNText style={styles.statusMessage}>{statusMessage}</RNText>
          ) : null}
        </View>
      </ScrollView>

      {/* Main Action Button */}
      <View style={styles.actionButtonContainer}>
        <TouchableOpacity
          onPress={toggleTracking}
          disabled={!hasLocationPermission}
          style={[
            styles.actionButton, 
            { 
              backgroundColor: isTracking ? '#FF6B6B' : '#404B46',
              opacity: !hasLocationPermission ? 0.5 : 1
            }
          ]}
        >
          <RNText style={styles.actionButtonIcon}>
            {isTracking ? '⏹️' : '▶️'}
          </RNText>
          <RNText style={styles.actionButtonText}>
            {isTracking ? 'Stop Shift' : 'Start Shift'}
          </RNText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 30,
    backgroundColor: '#FFFFFF',
  },
  avatarContainer: {
    marginRight: 15,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FAF5ED',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  avatarText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 24,
    color: '#404B46',
  },
  userInfo: {
    flex: 1,
    marginLeft: 10,
  },
  userName: {
    fontFamily: 'Poppins-Medium',
    fontSize: 18,
    color: '#000000',
    marginBottom: 2,
  },
  userRole: {
    fontFamily: 'Poppins-Light',
    fontSize: 14,
    color: '#666666',
  },
  companyBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E1F4FF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  companyText: {
    fontSize: 20,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  gridCard: {
    backgroundColor: '#FAF5ED',
    borderRadius: 27,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  smallCard: {
    width: '48%',
  },
  largeCard: {
    width: '100%',
  },
  cardIconContainer: {
    marginBottom: 8,
  },
  cardIcon: {
    fontSize: 28,
  },
  cardLabel: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#000000',
    textAlign: 'center',
  },
  statusIndicator: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 10,
    textAlign: 'center',
  },
  locationCard: {
    backgroundColor: '#E1F4FF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  locationTitle: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    color: '#404B46',
    marginBottom: 12,
  },
  locationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  locationLabel: {
    fontFamily: 'Poppins-Light',
    fontSize: 14,
    color: '#404B46',
  },
  locationValue: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: '#404B46',
  },
  controlsCard: {
    backgroundColor: '#FAF5ED',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  controlLabel: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#000000',
  },
  statusMessage: {
    fontFamily: 'Poppins-Light',
    fontSize: 12,
    color: '#666666',
    marginTop: 8,
    textAlign: 'center',
  },
  actionButtonContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  actionButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  actionButtonIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  actionButtonText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    color: '#FFFFFF',
    textAlign: 'center',
  },
}); 
