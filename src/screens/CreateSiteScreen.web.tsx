import React, { useState } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { SiteFormData } from '../types';

const CreateSiteScreen: React.FC = () => {
  const navigation = useNavigation();
  
  const [formData, setFormData] = useState<SiteFormData>({
    name: '',
    address: '',
    latitude: 55.7558,
    longitude: 37.6176,
    radius: 100,
  });

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
            <Text style={styles.sectionTitle}>Coordinates</Text>

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

            <View style={styles.webMapPlaceholder}>
              <Text style={styles.webMapText}>🗺️ Interactive Map</Text>
              <Text style={styles.webMapDescription}>
                Map functionality will be available in the mobile app.
                For now, please enter coordinates manually.
              </Text>
              <Text style={styles.coordinatesDisplay}>
                📍 Current coordinates: {formData.latitude.toFixed(4)}, {formData.longitude.toFixed(4)}
              </Text>
            </View>
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
  coordinateRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  coordinateInput: {
    flex: 1,
  },
  webMapPlaceholder: {
    backgroundColor: '#e8f4fd',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#3498db',
    borderStyle: 'dashed',
    padding: 20,
    alignItems: 'center',
    marginTop: 10,
  },
  webMapText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  webMapDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 20,
  },
  coordinatesDisplay: {
    fontSize: 12,
    color: '#3498db',
    fontWeight: '500',
  },
});

export default CreateSiteScreen; 