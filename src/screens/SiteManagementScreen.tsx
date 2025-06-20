import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, ConstructionSite } from '../types';
import { DatabaseService } from '../services/DatabaseService';

type SiteManagementScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'SiteManagement'>;

const SiteManagementScreen: React.FC = () => {
  const navigation = useNavigation<SiteManagementScreenNavigationProp>();
  const [sites, setSites] = useState<ConstructionSite[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<'error' | 'info'>('info');

  const dbService = DatabaseService.getInstance();

  useEffect(() => {
    loadSites();
  }, []);

  const loadSites = async () => {
    setRefreshing(true);
    setStatusMessage('');
    try {
      const allSites = await dbService.getConstructionSites();
      setSites(allSites);
    } catch (error) {
      console.error('Error loading sites:', error);
      setStatusMessage('Failed to load sites');
      setStatusType('error');
    } finally {
      setRefreshing(false);
    }
  };

  const handleDeleteSite = async (siteId: string) => {
    try {
      await dbService.deleteConstructionSite(siteId);
      setStatusMessage('Site deleted successfully');
      setStatusType('info');
      loadSites();
    } catch (error) {
      console.error('Error deleting site:', error);
      setStatusMessage('Failed to delete site');
      setStatusType('error');
    }
  };

  const handleStatusChange = async (siteId: string, isActive: boolean) => {
    try {
      await dbService.updateSiteStatus(siteId, !isActive);
      setStatusMessage(`Site ${!isActive ? 'activated' : 'deactivated'} successfully`);
      setStatusType('info');
      loadSites();
    } catch (error) {
      console.error('Error changing site status:', error);
      setStatusMessage('Failed to change site status');
      setStatusType('error');
    }
  };

  const handleEditSite = () => {
    setStatusMessage('Editing feature will be available in the next version');
    setStatusType('info');
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
        <Text style={styles.title}>Site Management</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => navigation.navigate('CreateSite')}
        >
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
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

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadSites} />
        }
      >
        {sites.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No Sites Found</Text>
            <Text style={styles.emptySubtitle}>
              Create your first work site to get started
            </Text>
            <TouchableOpacity 
              style={styles.createButton}
              onPress={() => navigation.navigate('CreateSite')}
            >
              <Text style={styles.createButtonText}>Create First Site</Text>
            </TouchableOpacity>
          </View>
        ) : (
          sites.map((site) => (
            <View key={site.id} style={styles.siteCard}>
              <View style={styles.siteHeader}>
                <View style={styles.siteInfo}>
                  <Text style={styles.siteName}>{site.name}</Text>
                  <Text style={styles.siteAddress}>{site.address}</Text>
                  <Text style={styles.siteRadius}>Radius: {site.radius}m</Text>
                </View>
                <View style={[
                  styles.statusBadge, 
                  site.isActive ? styles.activeBadge : styles.inactiveBadge
                ]}>
                  <Text style={styles.statusBadgeText}>
                    {site.isActive ? 'Active' : 'Inactive'}
                  </Text>
                </View>
              </View>

              <View style={styles.siteActions}>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.editButton]}
                  onPress={handleEditSite}
                >
                  <Text style={styles.actionButtonText}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.actionButton, styles.statusButton]}
                  onPress={() => handleStatusChange(site.id, site.isActive)}
                >
                  <Text style={styles.actionButtonText}>
                    {site.isActive ? 'Deactivate' : 'Activate'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => handleDeleteSite(site.id)}
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
  activeBadge: {
    backgroundColor: '#2ecc71',
  },
  inactiveBadge: {
    backgroundColor: '#e74c3c',
  },
  statusBadgeText: {
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
  statusButton: {
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
  statusCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    margin: 20,
    padding: 15,
    borderRadius: 8,
    elevation: 2,
  },
  statusError: {
    backgroundColor: '#ffebee',
  },
  statusInfo: {
    backgroundColor: '#e3f2fd',
  },
  statusText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  statusTextError: {
    color: '#c62828',
  },
  statusTextInfo: {
    color: '#1976d2',
  },
  dismissButton: {
    padding: 5,
  },
  dismissButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
  },
  createButton: {
    backgroundColor: '#27ae60',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 6,
    marginTop: 20,
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default SiteManagementScreen; 