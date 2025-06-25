import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, ConstructionSite } from '../types';
import { DatabaseService } from '../services/DatabaseService';

// Динамически импортируем компоненты карт только на нативных платформах
let MapView: React.ComponentType<any>, 
    Marker: React.ComponentType<any>, 
    Circle: React.ComponentType<any>;
if (Platform.OS !== 'web') {
  try {
    const MapModule = require('react-native-maps');
    MapView = MapModule.default;
    Marker = MapModule.Marker;
    Circle = MapModule.Circle;
  } catch (error) {
    }
}

type EditSiteScreenProps = NativeStackScreenProps<RootStackParamList, 'EditSite'>;
type EditSiteScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'EditSite'>;

const EditSiteScreen: React.FC<EditSiteScreenProps> = () => {
  const navigation = useNavigation<EditSiteScreenNavigationProp>();
  const route = useRoute<EditSiteScreenProps['route']>();
  const { siteId } = route.params;

  const [site, setSite] = useState<ConstructionSite | null>(null);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [radius, setRadius] = useState('50');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<'error' | 'info'>('info');

  const dbService = DatabaseService.getInstance();

  useEffect(() => {
    loadSite();
  }, [siteId]);

  const loadSite = async () => {
    try {
      setLoading(true);
      const sites = await dbService.getConstructionSites();
      const currentSite = sites.find(s => s.id === siteId);
      
      if (currentSite) {
        setSite(currentSite);
        setName(currentSite.name);
        setAddress(currentSite.address);
        setLatitude(currentSite.latitude.toString());
        setLongitude(currentSite.longitude.toString());
        setRadius(currentSite.radius.toString());
      } else {
        setStatusMessage('Site not found');
        setStatusType('error');
      }
    } catch (error) {
      setStatusMessage('Failed to load site');
      setStatusType('error');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    if (!name.trim()) {
      setStatusMessage('Site name is required');
      setStatusType('error');
      return false;
    }

    if (!address.trim()) {
      setStatusMessage('Address is required');
      setStatusType('error');
      return false;
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const rad = parseInt(radius);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      setStatusMessage('Invalid latitude (must be between -90 and 90)');
      setStatusType('error');
      return false;
    }

    if (isNaN(lng) || lng < -180 || lng > 180) {
      setStatusMessage('Invalid longitude (must be between -180 and 180)');
      setStatusType('error');
      return false;
    }

    if (isNaN(rad) || rad < 10 || rad > 1000) {
      setStatusMessage('Invalid radius (must be between 10 and 1000 meters)');
      setStatusType('error');
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    setStatusMessage('');

    try {
      const updatedSite: ConstructionSite = {
        id: siteId,
        name: name.trim(),
        address: address.trim(),
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        radius: parseInt(radius),
        isActive: site?.isActive || true,
        createdAt: site?.createdAt || new Date(),
        updatedAt: new Date()
      };

      await dbService.updateConstructionSite(updatedSite);
      
      setStatusMessage('Site updated successfully!');
      setStatusType('info');
      
      // Navigate back after a short delay
      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    } catch (error) {
      setStatusMessage('Failed to update site');
      setStatusType('error');
    } finally {
      setSaving(false);
    }
  };

  const handleMapPress = (coordinate: { latitude: number; longitude: number }) => {
    setLatitude(coordinate.latitude.toString());
    setLongitude(coordinate.longitude.toString());
  };

  const centerOnMap = () => {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    
    if (!isNaN(lat) && !isNaN(lng)) {
      // Map will re-center automatically when coordinates change
      setStatusMessage('Map centered on coordinates');
      setStatusType('info');
    } else {
      setStatusMessage('Invalid coordinates');
      setStatusType('error');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading site...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!site) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Site not found</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const mapCoordinate = {
    latitude: parseFloat(latitude) || 0,
    longitude: parseFloat(longitude) || 0,
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.headerBackButtonText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Edit Site</Text>
        <View style={styles.placeholder} />
      </View>

      {statusMessage ? (
        <View style={[styles.statusCard, statusType === 'error' ? styles.statusError : styles.statusInfo]}>
          <Text style={[styles.statusText, statusType === 'error' ? styles.statusTextError : styles.statusTextInfo]}>
            {statusMessage}
          </Text>
          <TouchableOpacity
            style={styles.dismissButton}
            onPress={() => setStatusMessage('')}
          >
            <Text style={styles.dismissButtonText}>×</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <ScrollView style={styles.content}>
        <View style={styles.form}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Site Name *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter site name"
              maxLength={100}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Address *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={address}
              onChangeText={setAddress}
              placeholder="Enter full address"
              multiline
              numberOfLines={3}
              maxLength={200}
            />
          </View>

          <View style={styles.coordinatesRow}>
            <View style={[styles.formGroup, styles.coordinateInput]}>
              <Text style={styles.label}>Latitude *</Text>
              <TextInput
                style={styles.input}
                value={latitude}
                onChangeText={setLatitude}
                placeholder="0.000000"
                keyboardType="numeric"
              />
            </View>

            <View style={[styles.formGroup, styles.coordinateInput]}>
              <Text style={styles.label}>Longitude *</Text>
              <TextInput
                style={styles.input}
                value={longitude}
                onChangeText={setLongitude}
                placeholder="0.000000"
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Geofence Radius (meters) *</Text>
            <TextInput
              style={styles.input}
              value={radius}
              onChangeText={setRadius}
              placeholder="50"
              keyboardType="numeric"
            />
            <Text style={styles.hint}>Minimum: 10m, Maximum: 1000m</Text>
          </View>

          {/* Map Section */}
          {MapView && !isNaN(mapCoordinate.latitude) && !isNaN(mapCoordinate.longitude) && (
            <View style={styles.mapSection}>
              <View style={styles.mapHeader}>
                <Text style={styles.mapTitle}>Site Location</Text>
                <TouchableOpacity
                  style={styles.centerButton}
                  onPress={centerOnMap}
                >
                  <Text style={styles.centerButtonText}>📍 Center</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.mapContainer}>
                <MapView
                  style={styles.map}
                  region={{
                    latitude: mapCoordinate.latitude,
                    longitude: mapCoordinate.longitude,
                    latitudeDelta: 0.005,
                    longitudeDelta: 0.005,
                  }}
                  onPress={(event: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) => handleMapPress(event.nativeEvent.coordinate)}
                >
                  <Marker
                    coordinate={mapCoordinate}
                    title={name || 'Construction Site'}
                    description={address}
                    draggable
                    onDragEnd={(event: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) => handleMapPress(event.nativeEvent.coordinate)}
                  />
                  <Circle
                    center={mapCoordinate}
                    radius={parseInt(radius) || 50}
                    strokeColor="#3498db"
                    fillColor="rgba(52, 152, 219, 0.2)"
                  />
                </MapView>
              </View>
              
              <Text style={styles.mapHint}>
                Tap on the map or drag the marker to set coordinates
              </Text>
            </View>
          )}

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={styles.saveButtonText}>
                {saving ? 'Updating...' : 'Update Site'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  headerBackButton: {
    padding: 8,
  },
  headerBackButtonText: {
    fontSize: 18,
    color: '#3498db',
    fontWeight: '500',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  placeholder: {
    width: 60,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 18,
    color: '#e74c3c',
    marginBottom: 20,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 6,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  statusCard: {
    margin: 20,
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusInfo: {
    backgroundColor: '#d4edda',
    borderColor: '#c3e6cb',
    borderWidth: 1,
  },
  statusError: {
    backgroundColor: '#f8d7da',
    borderColor: '#f5c6cb',
    borderWidth: 1,
  },
  statusText: {
    flex: 1,
    fontSize: 14,
  },
  statusTextInfo: {
    color: '#155724',
  },
  statusTextError: {
    color: '#721c24',
  },
  dismissButton: {
    padding: 4,
  },
  dismissButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
  },
  content: {
    flex: 1,
  },
  form: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  coordinatesRow: {
    flexDirection: 'row',
    gap: 12,
  },
  coordinateInput: {
    flex: 1,
  },
  hint: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 4,
  },
  mapSection: {
    marginBottom: 20,
  },
  mapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mapTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  centerButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  centerButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  mapContainer: {
    height: 250,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f8f9fa',
  },
  map: {
    flex: 1,
  },
  mapHint: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'center',
    marginTop: 8,
  },
  buttonContainer: {
    gap: 12,
    marginTop: 20,
  },
  saveButton: {
    backgroundColor: '#27ae60',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonDisabled: {
    backgroundColor: '#95a5a6',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#e74c3c',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default EditSiteScreen; 
