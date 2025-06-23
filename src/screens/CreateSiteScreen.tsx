import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useNavigation } from '@react-navigation/native';
import { SiteFormData, MapCoordinate } from '../types';

const CreateSiteScreen: React.FC = () => {
  const navigation = useNavigation();
  const mapRef = useRef<MapView>(null);
  
  const [formData, setFormData] = useState<SiteFormData>({
    name: '',
    address: '',
    latitude: 55.7558,
    longitude: 37.6176,
    radius: 100,
  });

  const [mapRegion, setMapRegion] = useState({
    latitude: 55.7558,
    longitude: 37.6176,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });

  const [showMap, setShowMap] = useState(false);

  const handleMapPress = (event: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setFormData({
      ...formData,
      latitude,
      longitude,
    });
  };

  const centerMap = () => {
    mapRef.current?.animateToRegion({
      latitude: formData.latitude,
      longitude: formData.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    });
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Enter site name');
      return false;
    }
    if (!formData.address.trim()) {
      Alert.alert('Error', 'Enter site address');
      return false;
    }
    if (formData.radius < 10 || formData.radius > 1000) {
      Alert.alert('Error', 'Radius must be between 10 and 1000 meters');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      // Here will be saving to database
      // Create site in database
      
      Alert.alert(
        'Success',
        'Site created successfully',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to create site');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>‹ Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.title}>New Site</Text>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
        >
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.form}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Site name *</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="Site name"
                placeholderTextColor="#bdc3c7"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Address *</Text>
              <TextInput
                style={styles.input}
                value={formData.address}
                onChangeText={(text) => setFormData({ ...formData, address: text })}
                placeholder="Site address"
                placeholderTextColor="#bdc3c7"
                multiline
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Geofence radius (meters) *</Text>
              <TextInput
                style={styles.input}
                value={formData.radius.toString()}
                onChangeText={(text) => {
                  const radius = parseInt(text) || 0;
                  setFormData({ ...formData, radius });
                }}
                placeholder="Radius (m)"
                placeholderTextColor="#bdc3c7"
                keyboardType="numeric"
              />
              <Text style={styles.hint}>Recommended range: 50-200 meters</Text>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.locationHeader}>
              <Text style={styles.sectionTitle}>Coordinates</Text>
              <TouchableOpacity
                style={styles.mapToggleButton}
                onPress={() => setShowMap(!showMap)}
              >
                <Text style={styles.mapToggleText}>
                  {showMap ? 'Hide map' : 'Show map'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.coordinateRow}>
              <View style={styles.coordinateInput}>
                <Text style={styles.label}>Latitude</Text>
                <TextInput
                  style={styles.input}
                  value={formData.latitude.toFixed(6)}
                  onChangeText={(text) => {
                    const latitude = parseFloat(text) || 0;
                    setFormData({ ...formData, latitude });
                  }}
                  keyboardType="numeric"
                />
              </View>
              
              <View style={styles.coordinateInput}>
                <Text style={styles.label}>Longitude</Text>
                <TextInput
                  style={styles.input}
                  value={formData.longitude.toFixed(6)}
                  onChangeText={(text) => {
                    const longitude = parseFloat(text) || 0;
                    setFormData({ ...formData, longitude });
                  }}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {showMap && (
              <View style={styles.mapContainer}>
                <Text style={styles.mapHint}>
                  Tap on the map to select coordinates
                </Text>
                <MapView
                  ref={mapRef}
                  style={styles.map}
                  initialRegion={mapRegion}
                  onPress={handleMapPress}
                  showsUserLocation
                  showsMyLocationButton
                >
                  <Marker
                    coordinate={{
                      latitude: formData.latitude,
                      longitude: formData.longitude,
                    }}
                    title={formData.name || 'New site'}
                    description={`Radius: ${formData.radius}m`}
                    draggable
                    onDragEnd={(e) => {
                      const { latitude, longitude } = e.nativeEvent.coordinate;
                      setFormData({ ...formData, latitude, longitude });
                    }}
                  />
                </MapView>
                
                <TouchableOpacity
                  style={styles.centerButton}
                  onPress={centerMap}
                >
                  <Text style={styles.centerButtonText}>📍 Center</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 18,
    color: '#3498db',
    fontWeight: '500',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  saveButton: {
    backgroundColor: '#27ae60',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  form: {
    flex: 1,
    padding: 20,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#34495e',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e1e8ed',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#2c3e50',
    backgroundColor: '#ffffff',
  },
  hint: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 4,
  },
  locationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  mapToggleButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  mapToggleText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  coordinateRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  coordinateInput: {
    flex: 1,
  },
  mapContainer: {
    marginTop: 10,
  },
  mapHint: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 10,
  },
  map: {
    height: 300,
    borderRadius: 8,
  },
  centerButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'white',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  centerButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2c3e50',
  },
});

export default CreateSiteScreen; 