import React, { useState, useEffect } from 'react';
import { WebSyncService } from '../services/WebSyncService';

interface SyncTabProps {
  onRefresh?: () => void;
}

// Интерфейсы для статуса синхронизации
interface SyncStatus {
  lastSync: Date | null;
  nextSync?: Date | null;
  isInProgress: boolean;
  deviceCount?: number;
  conflictCount?: number;
  errorCount?: number;
}

interface SyncHistoryItem {
  id: string;
  timestamp: Date;
  type: 'full' | 'incremental' | 'assignments';
  status: 'success' | 'error' | 'partial';
  deviceId?: string;
  userName?: string;
  syncType?: string;
  itemsCount: number;
  errorMessage?: string;
  duration: number; // в миллисекундах
  success?: boolean;
}

const SyncTab: React.FC<SyncTabProps> = ({ onRefresh }) => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [syncHistory, setSyncHistory] = useState<SyncHistoryItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [serverConnected, setServerConnected] = useState(false);

  const syncService = WebSyncService.getInstance();

  useEffect(() => {
    loadSyncData();
    checkServerConnection();
    
    // Обновляем данные каждые 10 секунд
    const interval = setInterval(() => {
      loadSyncData();
      checkServerConnection();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const loadSyncData = async () => {
    try {
      const status = syncService.getSyncStatus();
      const history = await syncService.getSyncHistory();
      
      setSyncStatus(status);
      setSyncHistory(history);
    } catch (error) {
      console.error('Failed to load sync data:', error);
    }
  };

  const checkServerConnection = async () => {
    try {
      const connected = await syncService.checkServerConnection();
      setServerConnected(connected);
    } catch (error) {
      setServerConnected(false);
    }
  };

  const handleForceSync = async () => {
    setIsRefreshing(true);
    try {
      const result = await syncService.forceFullSync();
      
      if (result.success) {
        alert('Sync completed successfully!');
        await loadSyncData();
        if (onRefresh) onRefresh();
      } else {
        alert(`Sync failed: ${result.error}`);
      }
    } catch (error) {
      alert('Force sync failed');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSyncAssignments = async () => {
    try {
      const result = await syncService.syncAssignments();
      
      if (result.success) {
        alert('Assignments synchronized successfully!');
        await loadSyncData();
      } else {
        alert(`Assignments sync failed: ${result.error}`);
      }
    } catch (error) {
      alert('Assignments sync failed');
    }
  };

  const formatTime = (date: Date | null): string => {
    if (!date) return 'Never';
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(new Date(date));
  };

  const getTimeSince = (date: Date | null): string => {
    if (!date) return 'Never';
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minutes ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hours ago`;
    
    const days = Math.floor(hours / 24);
    return `${days} days ago`;
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Synchronization Status</h2>
        <p style={styles.subtitle}>Monitor sync between web admin and mobile devices</p>
      </div>

      {/* Статус подключения */}
      <div style={styles.connectionCard}>
        <div style={styles.connectionHeader}>
          <h3 style={styles.cardTitle}>Server Connection</h3>
          <div style={{
            ...styles.connectionStatus,
            ...(serverConnected ? styles.connected : styles.disconnected)
          }}>
            <span style={styles.statusDot}></span>
            {serverConnected ? 'Connected' : 'Disconnected'}
          </div>
        </div>
        <p style={styles.connectionInfo}>
          {serverConnected 
            ? 'Successfully connected to sync server' 
            : 'Unable to connect to sync server. Check server status.'}
        </p>
      </div>

      {/* Статус синхронизации */}
      <div style={styles.statusCard}>
        <h3 style={styles.cardTitle}>Sync Status</h3>
        <div style={styles.statusGrid}>
          <div style={styles.statusItem}>
            <div style={styles.statusLabel}>Last Sync</div>
            <div style={styles.statusValue}>
              {formatTime(syncStatus?.lastSync || null)}
            </div>
            <div style={styles.statusDetail}>
              {getTimeSince(syncStatus?.lastSync || null)}
            </div>
          </div>

          <div style={styles.statusItem}>
            <div style={styles.statusLabel}>Next Sync</div>
            <div style={styles.statusValue}>
              {formatTime(syncStatus?.nextSync || null)}
            </div>
            <div style={styles.statusDetail}>
              Auto-sync every 5 minutes
            </div>
          </div>

          <div style={styles.statusItem}>
            <div style={styles.statusLabel}>Status</div>
            <div style={styles.statusValue}>
              {syncStatus?.isInProgress ? (
                <span style={styles.inProgress}>Syncing...</span>
              ) : (
                <span style={styles.idle}>Idle</span>
              )}
            </div>
            <div style={styles.statusDetail}>
              {syncStatus?.isInProgress ? 'Sync in progress' : 'Ready for sync'}
            </div>
          </div>
        </div>
      </div>

      {/* Действия синхронизации */}
      <div style={styles.actionsCard}>
        <h3 style={styles.cardTitle}>Sync Actions</h3>
        <div style={styles.actionButtons}>
          <button
            onClick={handleForceSync}
            disabled={isRefreshing || syncStatus?.isInProgress}
            style={{
              ...styles.actionButton,
              ...styles.primaryButton,
              ...(isRefreshing || syncStatus?.isInProgress ? styles.disabledButton : {})
            }}
          >
            {isRefreshing ? 'Syncing...' : '🔄 Force Full Sync'}
          </button>

          <button
            onClick={handleSyncAssignments}
            disabled={syncStatus?.isInProgress}
            style={{
              ...styles.actionButton,
              ...styles.secondaryButton,
              ...(syncStatus?.isInProgress ? styles.disabledButton : {})
            }}
          >
            📋 Sync Assignments
          </button>

          <button
            onClick={() => {
              loadSyncData();
              checkServerConnection();
            }}
            style={{...styles.actionButton, ...styles.refreshButton}}
          >
            🔃 Refresh Status
          </button>
        </div>
      </div>

      {/* История синхронизации */}
      <div style={styles.historyCard}>
        <h3 style={styles.cardTitle}>Sync History</h3>
        {syncHistory.length === 0 ? (
          <div style={styles.noHistory}>
            <p>No sync history available</p>
          </div>
        ) : (
          <div style={styles.historyList}>
            {syncHistory.slice(0, 10).map((entry, index) => (
              <div key={index} style={styles.historyItem}>
                <div style={styles.historyItemHeader}>
                  <div style={styles.historyItemUser}>
                    {entry.userName || 'System'}
                  </div>
                  <div style={styles.historyItemTime}>
                    {formatTime(entry.timestamp)}
                  </div>
                </div>
                <div style={styles.historyItemType}>
                  {entry.syncType || entry.type} sync
                  {entry.deviceId && ` from device ${entry.deviceId}`}
                </div>
                <div style={styles.historyItemStatus}>
                  {entry.success !== undefined ? (
                    entry.success ? (
                      <span style={styles.successStatus}>✓ Success</span>
                    ) : (
                      <span style={styles.errorStatus}>✗ Failed</span>
                    )
                  ) : (
                    <span style={{
                      ...styles.statusBadge,
                      ...(entry.status === 'success' ? styles.successStatus : 
                          entry.status === 'error' ? styles.errorStatus :
                          styles.warningStatus)
                    }}>
                      {entry.status}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Статистика */}
      <div style={styles.statsCard}>
        <h3 style={styles.cardTitle}>Sync Statistics</h3>
        <div style={styles.statsGrid}>
          <div style={styles.statItem}>
            <div style={styles.statValue}>
              {syncHistory.filter(h => h.success).length}
            </div>
            <div style={styles.statLabel}>Successful Syncs</div>
          </div>
          <div style={styles.statItem}>
            <div style={styles.statValue}>
              {syncHistory.filter(h => !h.success).length}
            </div>
            <div style={styles.statLabel}>Failed Syncs</div>
          </div>
          <div style={styles.statItem}>
            <div style={styles.statValue}>
              {syncHistory.filter(h => h.syncType === 'full').length}
            </div>
            <div style={styles.statLabel}>Full Syncs</div>
          </div>
          <div style={styles.statItem}>
            <div style={styles.statValue}>
              {new Set(syncHistory.map(h => h.deviceId)).size}
            </div>
            <div style={styles.statLabel}>Active Devices</div>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto',
  } as React.CSSProperties,

  header: {
    marginBottom: '30px',
  } as React.CSSProperties,

  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#333',
    margin: '0 0 10px 0',
  } as React.CSSProperties,

  subtitle: {
    fontSize: '16px',
    color: '#666',
    margin: '0',
  } as React.CSSProperties,

  connectionCard: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  } as React.CSSProperties,

  connectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  } as React.CSSProperties,

  cardTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#333',
    margin: '0',
  } as React.CSSProperties,

  connectionStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: '500',
    padding: '6px 12px',
    borderRadius: '20px',
  } as React.CSSProperties,

  connected: {
    backgroundColor: '#e8f5e8',
    color: '#4CAF50',
  } as React.CSSProperties,

  disconnected: {
    backgroundColor: '#ffebee',
    color: '#f44336',
  } as React.CSSProperties,

  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: 'currentColor',
  } as React.CSSProperties,

  connectionInfo: {
    fontSize: '14px',
    color: '#666',
    margin: '0',
  } as React.CSSProperties,

  statusCard: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  } as React.CSSProperties,

  statusGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginTop: '15px',
  } as React.CSSProperties,

  statusItem: {
    textAlign: 'center',
  } as React.CSSProperties,

  statusLabel: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '8px',
  } as React.CSSProperties,

  statusValue: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#333',
    marginBottom: '4px',
  } as React.CSSProperties,

  statusDetail: {
    fontSize: '12px',
    color: '#999',
  } as React.CSSProperties,

  inProgress: {
    color: '#ff9800',
  } as React.CSSProperties,

  idle: {
    color: '#4CAF50',
  } as React.CSSProperties,

  actionsCard: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  } as React.CSSProperties,

  actionButtons: {
    display: 'flex',
    gap: '15px',
    marginTop: '15px',
    flexWrap: 'wrap',
  } as React.CSSProperties,

  actionButton: {
    padding: '12px 24px',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  } as React.CSSProperties,

  primaryButton: {
    backgroundColor: '#2196F3',
    color: 'white',
  } as React.CSSProperties,

  secondaryButton: {
    backgroundColor: '#4CAF50',
    color: 'white',
  } as React.CSSProperties,

  refreshButton: {
    backgroundColor: '#ff9800',
    color: 'white',
  } as React.CSSProperties,

  disabledButton: {
    backgroundColor: '#ccc',
    cursor: 'not-allowed',
  } as React.CSSProperties,

  historyCard: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  } as React.CSSProperties,

  noHistory: {
    textAlign: 'center',
    color: '#666',
    padding: '40px',
  } as React.CSSProperties,

  historyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginTop: '15px',
  } as React.CSSProperties,

  historyItem: {
    border: '1px solid #e0e0e0',
    borderRadius: '6px',
    padding: '15px',
    backgroundColor: '#fafafa',
  } as React.CSSProperties,

  historyItemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '10px',
  } as React.CSSProperties,

  historyItemUser: {
    fontWeight: '600',
  } as React.CSSProperties,

  historyItemTime: {
    fontSize: '12px',
    color: '#666',
  } as React.CSSProperties,

  historyItemType: {
    fontSize: '12px',
    color: '#666',
  } as React.CSSProperties,

  historyItemStatus: {
    fontSize: '12px',
    color: '#666',
  } as React.CSSProperties,

  statusBadge: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: '600',
    textTransform: 'uppercase',
  } as React.CSSProperties,

  successStatus: {
    backgroundColor: '#e8f5e8',
    color: '#4CAF50',
  } as React.CSSProperties,

  errorStatus: {
    backgroundColor: '#ffebee',
    color: '#c62828',
  } as React.CSSProperties,

  warningStatus: {
    backgroundColor: '#fff3e0',
    color: '#f57c00',
  } as React.CSSProperties,

  statsCard: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  } as React.CSSProperties,

  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '20px',
    marginTop: '15px',
  } as React.CSSProperties,

  statItem: {
    textAlign: 'center',
    padding: '15px',
    backgroundColor: '#f9f9f9',
    borderRadius: '6px',
  } as React.CSSProperties,

  statValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: '5px',
  } as React.CSSProperties,

  statLabel: {
    fontSize: '12px',
    color: '#666',
    textTransform: 'uppercase',
  } as React.CSSProperties,
};

export default SyncTab; 
