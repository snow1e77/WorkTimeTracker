import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { 
  Card, 
  Title, 
  Paragraph, 
  Button, 
  Switch, 
  Text,
  Chip,
  List,
  ProgressBar,
  HelperText
} from 'react-native-paper';
import * as Location from 'expo-location';

export default function TimeTrackingScreen() {
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

  const getLocationStatus = () => {
    if (!location) return 'Determining location...';
    if (isInSiteRadius) return 'At work site';
    return 'Outside work site';
  };

  const getStatusColor = () => {
    if (!location) return '#FFC107';
    if (isInSiteRadius) return '#4CAF50';
    return '#f44336';
  };

  return (
    <View style={styles.container}>
      {/* Status Message */}
      {statusMessage ? (
        <Card style={styles.statusCard}>
          <Card.Content>
            <HelperText type="info" visible={true}>
              {statusMessage}
            </HelperText>
          </Card.Content>
        </Card>
      ) : null}

      {/* GPS Status */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>GPS Status</Title>
          <View style={styles.statusRow}>
            <Chip 
              icon="map-marker" 
              style={[styles.statusChip, { backgroundColor: getStatusColor() }]}
              textStyle={{ color: 'white' }}
            >
              {getLocationStatus()}
            </Chip>
          </View>
          
          {distance > 0 && (
            <Paragraph>Distance to site: {distance} m</Paragraph>
          )}
          
          {lastUpdate && (
            <Paragraph>
              Last update: {lastUpdate.toLocaleTimeString()}
            </Paragraph>
          )}
        </Card.Content>
      </Card>

      {/* Tracking Control */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>Control</Title>
          
          <List.Item
            title="GPS tracking"
            description="Automatic location tracking"
            left={() => <List.Icon icon="crosshairs-gps" />}
            right={() => (
              <Switch
                value={gpsEnabled}
                onValueChange={setGpsEnabled}
              />
            )}
          />

          <Button
            mode={isTracking ? "outlined" : "contained"}
            onPress={toggleTracking}
            style={styles.trackingButton}
            buttonColor={isTracking ? undefined : '#4CAF50'}
            disabled={!hasLocationPermission}
          >
            {isTracking ? 'Stop tracking' : 'Start tracking'}
          </Button>
        </Card.Content>
      </Card>

      {/* Location Information */}
      {location && (
        <Card style={styles.card}>
          <Card.Content>
            <Title>Location</Title>
            <Paragraph>Latitude: {location.coords.latitude.toFixed(6)}</Paragraph>
            <Paragraph>Longitude: {location.coords.longitude.toFixed(6)}</Paragraph>
            <Paragraph>Accuracy: ±{location.coords.accuracy?.toFixed(0)} m</Paragraph>
            
            {location.coords.speed && (
              <Paragraph>Speed: {(location.coords.speed * 3.6).toFixed(1)} km/h</Paragraph>
            )}
          </Card.Content>
        </Card>
      )}

      {/* GPS Accuracy */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>GPS Signal Quality</Title>
          <View style={styles.accuracyContainer}>
            <Text>Accuracy: {location?.coords.accuracy ? `±${location.coords.accuracy.toFixed(0)} m` : 'Unknown'}</Text>
            <ProgressBar
              progress={location?.coords.accuracy ? Math.max(0, Math.min(1, (100 - location.coords.accuracy) / 100)) : 0}
              color="#4CAF50"
              style={styles.accuracyBar}
            />
          </View>
        </Card.Content>
      </Card>
    </View>
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
  card: {
    marginBottom: 16,
  },
  statusRow: {
    marginVertical: 12,
  },
  statusChip: {
    alignSelf: 'flex-start',
  },
  trackingButton: {
    marginTop: 16,
  },
  accuracyContainer: {
    marginTop: 8,
  },
  accuracyBar: {
    marginTop: 8,
    height: 8,
  },
}); 
