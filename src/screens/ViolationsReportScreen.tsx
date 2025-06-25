import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Violation, AuthUser, ConstructionSite } from '../types';
import { DatabaseService } from '../services/DatabaseService';
import { exportViolationsToCSV } from '../utils/exportUtils';

const ViolationsReportScreen: React.FC = () => {
  const navigation = useNavigation();
  const [violations, setViolations] = useState<Violation[]>([]);
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [sites, setSites] = useState<ConstructionSite[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [selectedSeverity, setSelectedSeverity] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<'error' | 'info'>('info');

  const dbService = DatabaseService.getInstance();

  useEffect(() => {
    loadData();
  }, [selectedPeriod, selectedSeverity]);

  const loadData = async () => {
    setRefreshing(true);
    setStatusMessage('');
    
    try {
      const [violationsData, usersData, sitesData] = await Promise.all([
        dbService.getViolations(selectedPeriod, selectedSeverity),
        dbService.getAllUsers(),
        dbService.getConstructionSites()
      ]);
      
      setViolations(violationsData);
      setUsers(usersData);
      setSites(sitesData);
    } catch (error) {
      setStatusMessage('Failed to load violations data');
      setStatusType('error');
    } finally {
      setRefreshing(false);
    }
  };

  const handleResolveViolation = async (violationId: string) => {
    Alert.alert(
      'Resolve Violation',
      'Are you sure you want to mark this violation as resolved?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Resolve',
          onPress: async () => {
            try {
              await dbService.resolveViolation(violationId);
              setStatusMessage('Violation resolved successfully');
              setStatusType('info');
              loadData();
            } catch (error) {
              setStatusMessage('Failed to resolve violation');
              setStatusType('error');
            }
          }
        }
      ]
    );
  };

  const handleDeleteViolation = async (violationId: string) => {
    Alert.alert(
      'Delete Violation',
      'Are you sure you want to delete this violation? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await dbService.deleteViolation(violationId);
              setStatusMessage('Violation deleted successfully');
              setStatusType('info');
              loadData();
            } catch (error) {
              setStatusMessage('Failed to delete violation');
              setStatusType('error');
            }
          }
        }
      ]
    );
  };

  const getUserName = (userId: string): string => {
    const user = users.find(u => u.id === userId);
    return user?.name || 'Unknown User';
  };

  const getSiteName = (siteId?: string): string => {
    if (!siteId) return 'Unknown Site';
    const site = sites.find(s => s.id === siteId);
    return site?.name || 'Unknown Site';
  };

  const getViolationTypeText = (type: string): string => {
    switch (type) {
      case 'unauthorized_departure': return 'Unauthorized Departure';
      case 'late_arrival': return 'Late Arrival';
      case 'early_departure': return 'Early Departure';
      case 'no_show': return 'No Show';
      default: return type;
    }
  };

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'low': return '#f39c12';
      case 'medium': return '#e67e22';
      case 'high': return '#e74c3c';
      default: return '#95a5a6';
    }
  };

  const getStats = () => {
    const totalViolations = violations.length;
    const resolvedViolations = violations.filter(v => v.isResolved).length;
    const pendingViolations = totalViolations - resolvedViolations;
    const highSeverityViolations = violations.filter(v => v.severity === 'high').length;
    
    return { totalViolations, resolvedViolations, pendingViolations, highSeverityViolations };
  };

  const stats = getStats();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Violations Report</Text>
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

      {/* Period Selector */}
      <View style={styles.filterContainer}>
        <Text style={styles.filterTitle}>Period:</Text>
        <View style={styles.periodSelector}>
          {(['today', 'week', 'month'] as const).map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodButton,
                selectedPeriod === period && styles.periodButtonActive
              ]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text style={[
                styles.periodButtonText,
                selectedPeriod === period && styles.periodButtonTextActive
              ]}>
                {period === 'today' ? 'Today' : 
                 period === 'week' ? 'Week' : 'Month'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Severity Filter */}
      <View style={styles.filterContainer}>
        <Text style={styles.filterTitle}>Severity:</Text>
        <View style={styles.severitySelector}>
          {(['all', 'low', 'medium', 'high'] as const).map((severity) => (
            <TouchableOpacity
              key={severity}
              style={[
                styles.severityButton,
                selectedSeverity === severity && styles.severityButtonActive
              ]}
              onPress={() => setSelectedSeverity(severity)}
            >
              <Text style={[
                styles.severityButtonText,
                selectedSeverity === severity && styles.severityButtonTextActive
              ]}>
                {severity.charAt(0).toUpperCase() + severity.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Statistics */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.totalViolations}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#e74c3c' }]}>{stats.pendingViolations}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#27ae60' }]}>{stats.resolvedViolations}</Text>
          <Text style={styles.statLabel}>Resolved</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#e74c3c' }]}>{stats.highSeverityViolations}</Text>
          <Text style={styles.statLabel}>High Severity</Text>
        </View>
      </View>

      {/* Violations List */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadData} />
        }
      >
        {violations.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No Violations</Text>
            <Text style={styles.emptySubtitle}>
              No violations found for the selected period and severity
            </Text>
          </View>
        ) : (
          violations.map((violation) => (
            <View key={violation.id} style={styles.violationCard}>
              <View style={styles.violationHeader}>
                <View style={styles.violationInfo}>
                  <Text style={styles.violationType}>
                    {getViolationTypeText(violation.type)}
                  </Text>
                  <Text style={styles.violationUser}>
                    {getUserName(violation.userId)}
                  </Text>
                  <Text style={styles.violationSite}>
                    {getSiteName(violation.siteId)}
                  </Text>
                </View>
                <View style={styles.violationMeta}>
                  <View style={[
                    styles.severityBadge,
                    { backgroundColor: getSeverityColor(violation.severity) }
                  ]}>
                    <Text style={styles.severityText}>
                      {violation.severity.toUpperCase()}
                    </Text>
                  </View>
                  <View style={[
                    styles.statusBadge,
                    violation.isResolved ? styles.resolvedBadge : styles.pendingBadge
                  ]}>
                    <Text style={styles.statusBadgeText}>
                      {violation.isResolved ? 'Resolved' : 'Pending'}
                    </Text>
                  </View>
                </View>
              </View>

              <Text style={styles.violationDescription}>
                {violation.description}
              </Text>

              <Text style={styles.violationTime}>
                {new Date(violation.timestamp).toLocaleString()}
              </Text>

              {!violation.isResolved && (
                <View style={styles.violationActions}>
                  <TouchableOpacity
                    style={styles.resolveButton}
                    onPress={() => handleResolveViolation(violation.id)}
                  >
                    <Text style={styles.resolveButtonText}>Resolve</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteViolation(violation.id)}
                  >
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              )}
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
  placeholder: {
    width: 60,
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
  filterContainer: {
    backgroundColor: 'white',
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  periodSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#3498db',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6c757d',
  },
  periodButtonTextActive: {
    color: 'white',
  },
  severitySelector: {
    flexDirection: 'row',
    gap: 8,
  },
  severityButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
  },
  severityButtonActive: {
    backgroundColor: '#e74c3c',
  },
  severityButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6c757d',
  },
  severityButtonTextActive: {
    color: 'white',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#bdc3c7',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#95a5a6',
    textAlign: 'center',
    lineHeight: 22,
  },
  violationCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  violationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  violationInfo: {
    flex: 1,
  },
  violationType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  violationUser: {
    fontSize: 14,
    color: '#3498db',
    marginBottom: 2,
  },
  violationSite: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  violationMeta: {
    gap: 4,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: 'center',
  },
  severityText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'white',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: 'center',
  },
  resolvedBadge: {
    backgroundColor: '#27ae60',
  },
  pendingBadge: {
    backgroundColor: '#e74c3c',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'white',
  },
  violationDescription: {
    fontSize: 14,
    color: '#2c3e50',
    marginBottom: 8,
    lineHeight: 20,
  },
  violationTime: {
    fontSize: 12,
    color: '#95a5a6',
    marginBottom: 12,
  },
  violationActions: {
    flexDirection: 'row',
    gap: 10,
  },
  resolveButton: {
    flex: 1,
    backgroundColor: '#27ae60',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  resolveButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#e74c3c',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ViolationsReportScreen; 
