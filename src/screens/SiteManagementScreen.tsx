import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ConstructionSite } from '../types';
import { DatabaseService } from '../services/DatabaseService';

const SiteManagementScreen: React.FC = () => {
  const navigation = useNavigation();
  const [sites, setSites] = useState<ConstructionSite[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const dbService = DatabaseService.getInstance();

  const loadSites = async () => {
    setRefreshing(true);
    try {
      // Load real sites from database
      const constructionSites = await dbService.getConstructionSites();
      setSites(constructionSites);
    } catch (error) {
      console.error('Error loading sites:', error);
      Alert.alert('Error', 'Failed to load sites');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadSites();
  }, []);

  const deleteSite = (siteId: string) => {
    Alert.alert(
      'Delete Site',
      'Are you sure you want to delete this site?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await dbService.deleteConstructionSite(siteId);
              setSites(sites.filter(site => site.id !== siteId));
            } catch (error) {
              console.error('Error deleting site:', error);
              Alert.alert('Error', 'Failed to delete site');
            }
          },
        },
      ]
    );
  };

  const toggleSiteStatus = async (siteId: string) => {
    try {
      const site = sites.find(s => s.id === siteId);
      if (site) {
        await dbService.updateSiteStatus(siteId, !site.isActive);
        setSites(sites.map(site => 
          site.id === siteId 
            ? { ...site, isActive: !site.isActive }
            : site
        ));
      }
    } catch (error) {
      console.error('Error changing site status:', error);
      Alert.alert('Error', 'Failed to change site status');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Sites</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('CreateSite' as never)}
        >
          <Text style={styles.addButtonText}>+ Create</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadSites} />
        }
      >
        {sites.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No Sites</Text>
            <Text style={styles.emptySubtitle}>
              Create your first site to get started
            </Text>
          </View>
        ) : (
          sites.map((site) => (
            <View key={site.id} style={styles.siteCard}>
              <View style={styles.siteHeader}>
                <View style={styles.siteInfo}>
                  <Text style={styles.siteName}>{site.name}</Text>
                  <Text style={styles.siteAddress}>{site.address}</Text>
                  <Text style={styles.siteRadius}>
                    Geofence radius: {site.radius}m
                  </Text>
                </View>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: site.isActive ? '#27ae60' : '#e74c3c' }
                ]}>
                  <Text style={styles.statusText}>
                    {site.isActive ? 'Active' : 'Inactive'}
                  </Text>
                </View>
              </View>

              <View style={styles.siteActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.editButton]}
                  onPress={() => {
                    Alert.alert('Edit', 'Editing feature will be available in the next version');
                  }}
                >
                  <Text style={styles.actionButtonText}>Edit</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.actionButton, styles.toggleButton]}
                  onPress={() => toggleSiteStatus(site.id)}
                >
                  <Text style={styles.actionButtonText}>
                    {site.isActive ? 'Deactivate' : 'Activate'}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => deleteSite(site.id)}
                >
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
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
  addButton: {
    backgroundColor: '#27ae60',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#7f8c8d',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#bdc3c7',
    textAlign: 'center',
  },
  siteCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  siteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  siteInfo: {
    flex: 1,
  },
  siteName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  siteAddress: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  siteRadius: {
    fontSize: 12,
    color: '#95a5a6',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    height: 24,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  siteActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#3498db',
  },
  toggleButton: {
    backgroundColor: '#f39c12',
  },
  deleteButton: {
    backgroundColor: '#e74c3c',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default SiteManagementScreen; 