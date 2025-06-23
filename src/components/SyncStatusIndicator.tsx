import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  Alert
} from 'react-native';
import { SyncService } from '../services/SyncService';

interface SyncStatus {
  isOnline: boolean;
  lastSyncTime: Date | null;
  pendingOperations: number;
  failedOperations: number;
  isInProgress: boolean;
  error?: string;
}

interface SyncStatusIndicatorProps {
  style?: any;
  showDetails?: boolean;
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({ 
  style, 
  showDetails = false 
}) => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: true,
    lastSyncTime: null,
    pendingOperations: 0,
    failedOperations: 0,
    isInProgress: false
  });

  const [pulseAnimation] = useState(new Animated.Value(1));
  const syncService = SyncService.getInstance();

  useEffect(() => {
    // Подписываемся на изменения статуса синхронизации
    const unsubscribe = syncService.onSyncStatusChange((status) => {
      setSyncStatus(status);
    });

    // Получаем текущий статус
    setSyncStatus(syncService.getSyncStatus());

    return unsubscribe;
  }, []);

  useEffect(() => {
    // Анимация пульсации для индикатора синхронизации
    if (syncStatus.isInProgress) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnimation, {
            toValue: 0.5,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnimation, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      
      return () => pulse.stop();
    } else {
      pulseAnimation.setValue(1);
    }
  }, [syncStatus.isInProgress]);

  const getStatusColor = (): string => {
    if (!syncStatus.isOnline) return '#ff4444';
    if (syncStatus.isInProgress) return '#ffaa00';
    if (syncStatus.failedOperations > 0) return '#ff6666';
    if (syncStatus.pendingOperations > 0) return '#66aaff';
    return '#44ff44';
  };

  const getStatusText = (): string => {
    if (!syncStatus.isOnline) return 'Offline';
    if (syncStatus.isInProgress) return 'Syncing...';
    if (syncStatus.failedOperations > 0) return `${syncStatus.failedOperations} failed`;
    if (syncStatus.pendingOperations > 0) return `${syncStatus.pendingOperations} pending`;
    return 'Synced';
  };

  const formatLastSyncTime = (): string => {
    if (!syncStatus.lastSyncTime) return 'Never';
    
    const now = new Date();
    const diff = now.getTime() - syncStatus.lastSyncTime.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const handlePress = () => {
    if (showDetails) {
      showSyncDetails();
    } else {
      forceSync();
    }
  };

  const forceSync = async () => {
    try {
      await syncService.forcSync();
    } catch (error) {
      Alert.alert('Sync Error', 'Failed to sync data. Please try again.');
    }
  };

  const showSyncDetails = () => {
    const stats = syncService.getQueueStats();
    const details = [
      `Total operations: ${stats.total}`,
      `Pending: ${stats.pending}`,
      `Completed: ${stats.completed}`,
      `Failed: ${stats.failed}`,
      `Last sync: ${formatLastSyncTime()}`,
      stats.oldestPending ? `Oldest pending: ${formatLastSyncTime()}` : null
    ].filter(Boolean).join('\n');

    Alert.alert(
      'Sync Status',
      details,
      [
        { text: 'Force Sync', onPress: forceSync },
        { text: 'Clean Queue', onPress: () => syncService.cleanupQueue() },
        { text: 'Close', style: 'cancel' }
      ]
    );
  };

  const renderCompactIndicator = () => (
    <TouchableOpacity onPress={handlePress} style={[styles.compactContainer, style]}>
      <Animated.View
        style={[
          styles.statusDot,
          { 
            backgroundColor: getStatusColor(),
            opacity: pulseAnimation
          }
        ]}
      />
      {syncStatus.isInProgress && (
        <ActivityIndicator
          size="small"
          color={getStatusColor()}
          style={styles.spinner}
        />
      )}
    </TouchableOpacity>
  );

  const renderDetailedIndicator = () => (
    <TouchableOpacity onPress={handlePress} style={[styles.detailedContainer, style]}>
      <View style={styles.statusRow}>
        <Animated.View
          style={[
            styles.statusDot,
            { 
              backgroundColor: getStatusColor(),
              opacity: pulseAnimation
            }
          ]}
        />
        <Text style={styles.statusText}>{getStatusText()}</Text>
        {syncStatus.isInProgress && (
          <ActivityIndicator
            size="small"
            color={getStatusColor()}
            style={styles.spinner}
          />
        )}
      </View>
      
      <Text style={styles.lastSyncText}>
        Last sync: {formatLastSyncTime()}
      </Text>
      
      {(syncStatus.pendingOperations > 0 || syncStatus.failedOperations > 0) && (
        <View style={styles.operationsRow}>
          {syncStatus.pendingOperations > 0 && (
            <Text style={styles.pendingText}>
              {syncStatus.pendingOperations} pending
            </Text>
          )}
          {syncStatus.failedOperations > 0 && (
            <Text style={styles.failedText}>
              {syncStatus.failedOperations} failed
            </Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );

  return showDetails ? renderDetailedIndicator() : renderCompactIndicator();
};

const styles = StyleSheet.create({
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  detailedContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginVertical: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  lastSyncText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 20,
  },
  operationsRow: {
    flexDirection: 'row',
    marginTop: 4,
    marginLeft: 20,
  },
  pendingText: {
    fontSize: 12,
    color: '#007AFF',
    marginRight: 12,
  },
  failedText: {
    fontSize: 12,
    color: '#FF3B30',
  },
  spinner: {
    marginLeft: 8,
  },
});

export default SyncStatusIndicator; 