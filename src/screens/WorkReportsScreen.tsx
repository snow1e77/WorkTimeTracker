﻿import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  RefreshControl,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { WorkReport } from '../types';
import { DatabaseService } from '../services/DatabaseService';
import { exportToCSV, exportToPDF, generateReportSummary } from '../utils/exportUtils';

const WorkReportsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [reports, setReports] = useState<WorkReport[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<'error' | 'info'>('info');
  const dbService = DatabaseService.getInstance();

  const loadReports = async () => {
    setRefreshing(true);
    setStatusMessage('');
    
    try {
      // Load real reports from database
      const periodReports = await dbService.getWorkReports(selectedPeriod);
      setReports(periodReports);
    } catch (error) {
      setStatusMessage('Failed to load reports');
      setStatusType('error');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [selectedPeriod]);

  const getPeriodTitle = () => {
    switch (selectedPeriod) {
      case 'today':
        return 'Today';
      case 'week':
        return 'This Week';
      case 'month':
        return 'This Month';
    }
  };

  const getTotalStats = () => {
    const totalHours = reports.reduce((sum, report) => sum + report.totalHours, 0);
    const totalWorkers = reports.length;
    const totalViolations = reports.reduce((sum, report) => sum + report.violations, 0);
    
    return { totalHours, totalWorkers, totalViolations };
  };

  const handleExportToCSV = async () => {
    try {
      if (Platform.OS === 'web') {
        exportToCSV(reports, selectedPeriod);
        setStatusMessage('Report exported to CSV successfully');
        setStatusType('info');
      } else {
        setStatusMessage('CSV export is only available on web platform');
        setStatusType('info');
      }
    } catch (error) {
      setStatusMessage('Failed to export report to CSV');
      setStatusType('error');
    }
  };

  const handleExportToPDF = async () => {
    try {
      if (Platform.OS === 'web') {
        exportToPDF(reports, selectedPeriod);
        setStatusMessage('Opening print dialog for PDF export...');
        setStatusType('info');
      } else {
        setStatusMessage('PDF export is only available on web platform');
        setStatusType('info');
      }
    } catch (error) {
      setStatusMessage('Failed to export report to PDF');
      setStatusType('error');
    }
  };

  const showDetails = () => {
    setStatusMessage('Detailed information will be available in the next version');
    setStatusType('info');
  };

  const showViolations = () => {
    setStatusMessage('Violation details will be available in the next version');
    setStatusType('info');
  };

  const stats = getTotalStats();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Time Reports</Text>
        <View style={styles.exportButtons}>
          <TouchableOpacity
            style={styles.exportButton}
            onPress={handleExportToCSV}
          >
            <Text style={styles.exportButtonText}>📊 CSV</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.exportButton}
            onPress={handleExportToPDF}
          >
            <Text style={styles.exportButtonText}>📄 PDF</Text>
          </TouchableOpacity>
        </View>
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

      {/* Period filter */}
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

      {/* Summary statistics */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.totalWorkers}</Text>
          <Text style={styles.statLabel}>Employees</Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.totalHours.toFixed(1)}h</Text>
          <Text style={styles.statLabel}>Total Hours</Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: stats.totalViolations > 0 ? '#e74c3c' : '#27ae60' }]}>
            {stats.totalViolations}
          </Text>
          <Text style={styles.statLabel}>Violations</Text>
        </View>
      </View>

      {/* Reports list */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadReports} />
        }
      >
        <Text style={styles.sectionTitle}>
          Detailed Reports - {getPeriodTitle()}
        </Text>

        {reports.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No Data</Text>
            <Text style={styles.emptySubtitle}>
              No reports available for the selected period
            </Text>
          </View>
        ) : (
          reports.map((report, index) => (
            <View key={index} style={styles.reportCard}>
              <View style={styles.reportHeader}>
                <View style={styles.workerInfo}>
                  <Text style={styles.workerName}>{report.userName}</Text>
                  <Text style={styles.siteName}>{report.siteName}</Text>
                </View>
                
                <View style={styles.hoursInfo}>
                  <Text style={styles.hoursText}>{report.totalHours}h</Text>
                  <Text style={styles.shiftsText}>{report.shiftsCount} shifts</Text>
                </View>
              </View>

              <View style={styles.reportDetails}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Work time:</Text>
                  <Text style={styles.detailValue}>
                    {Math.floor(report.totalMinutes / 60)}h {report.totalMinutes % 60}min
                  </Text>
                </View>
                
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Violations:</Text>
                  <Text style={[
                    styles.detailValue,
                    { color: report.violations > 0 ? '#e74c3c' : '#27ae60' }
                  ]}>
                    {report.violations === 0 ? 'None' : report.violations}
                  </Text>
                </View>
                
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Date:</Text>
                  <Text style={styles.detailValue}>
                    {new Date(report.date).toLocaleDateString('en-US')}
                  </Text>
                </View>
              </View>

              <View style={styles.reportActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={showDetails}
                >
                  <Text style={styles.actionButtonText}>Details</Text>
                </TouchableOpacity>
                
                {report.violations > 0 && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.violationsButton]}
                    onPress={showViolations}
                  >
                    <Text style={styles.actionButtonText}>Violations</Text>
                  </TouchableOpacity>
                )}
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
  exportButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  exportButton: {
    backgroundColor: '#9b59b6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  exportButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
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
  statusInfo: {
    backgroundColor: '#e3f2fd',
  },
  statusError: {
    backgroundColor: '#ffebee',
  },
  statusText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  statusTextInfo: {
    color: '#1976d2',
  },
  statusTextError: {
    color: '#c62828',
  },
  dismissButton: {
    padding: 5,
  },
  dismissButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 8,
    padding: 4,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  periodButtonActive: {
    backgroundColor: '#3498db',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  periodButtonTextActive: {
    color: 'white',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
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
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
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
  reportCard: {
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
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  workerInfo: {
    flex: 1,
  },
  workerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  siteName: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  hoursInfo: {
    alignItems: 'flex-end',
  },
  hoursText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#27ae60',
  },
  shiftsText: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  reportDetails: {
    marginBottom: 15,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
  },
  reportActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#3498db',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  violationsButton: {
    backgroundColor: '#e74c3c',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default WorkReportsScreen; 
