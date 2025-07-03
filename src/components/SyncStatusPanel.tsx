import React, { useState, useEffect, useRef } from 'react';
import { WebSyncService } from '../services/WebSyncService';

interface SyncDevice {
  deviceId: string;
  userId: string;
  userName: string;
  lastSync: Date;
  status: 'online' | 'offline' | 'syncing';
  pendingOperations: number;
  failedOperations: number;
}

interface SyncMetrics {
  totalDevices: number;
  onlineDevices: number;
  pendingOperations: number;
  failedOperations: number;
  avgSyncTime: number;
  syncSuccess: number;
}

const SyncStatusPanel: React.FC = () => {
  const [devices, setDevices] = useState<SyncDevice[]>([]);
  const [metrics, setMetrics] = useState<SyncMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const forceSyncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const webSyncService = WebSyncService.getInstance();

  useEffect(() => {
    loadSyncData();
    
    let interval: NodeJS.Timeout | null = null;
    
    if (autoRefresh) {
      interval = setInterval(loadSyncData, 30000); // Обновляем каждые 30 секунд
    }

    // Единый cleanup для всех ресурсов
    return () => {
      if (interval) {
        clearInterval(interval);
      }
      // Очищаем таймаут при размонтировании компонента
      if (forceSyncTimeoutRef.current) {
        clearTimeout(forceSyncTimeoutRef.current);
        forceSyncTimeoutRef.current = null;
      }
    };
  }, [autoRefresh]); // Добавляем autoRefresh как зависимость

  const loadSyncData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // В реальном приложении здесь были бы API запросы
      const mockDevices: SyncDevice[] = [
        {
          deviceId: 'device_001',
          userId: 'worker-1',
          userName: 'John Worker',
          lastSync: new Date(Date.now() - 2 * 60 * 1000), // 2 минуты назад
          status: 'online',
          pendingOperations: 0,
          failedOperations: 0
        },
        {
          deviceId: 'device_002',
          userId: 'worker-2',
          userName: 'Jane Worker',
          lastSync: new Date(Date.now() - 15 * 60 * 1000), // 15 минут назад
          status: 'offline',
          pendingOperations: 3,
          failedOperations: 1
        }
      ];

      const mockMetrics: SyncMetrics = {
        totalDevices: mockDevices.length,
        onlineDevices: mockDevices.filter(d => d.status === 'online').length,
        pendingOperations: mockDevices.reduce((sum, d) => sum + d.pendingOperations, 0),
        failedOperations: mockDevices.reduce((sum, d) => sum + d.failedOperations, 0),
        avgSyncTime: 2.5,
        syncSuccess: 95.2
      };

      setDevices(mockDevices);
      setMetrics(mockMetrics);

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load sync data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForceSync = async (deviceId?: string) => {
    try {
      if (deviceId) {
        // В реальном приложении отправляем WebSocket сообщение конкретному устройству
      } else {
        // В реальном приложении отправляем WebSocket сообщение всем устройствам
      }
      
      // Обновляем данные
      if (forceSyncTimeoutRef.current) {
        clearTimeout(forceSyncTimeoutRef.current);
      }
      forceSyncTimeoutRef.current = setTimeout(() => {
        forceSyncTimeoutRef.current = null;
        loadSyncData();
      }, 1000);
      
    } catch (error) {
      setError('Failed to force synchronization');
    }
  };

  const formatLastSync = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'online': return '#4CAF50';
      case 'syncing': return '#FF9800';
      case 'offline': return '#f44336';
      default: return '#9E9E9E';
    }
  };

  const getStatusIcon = (status: string): string => {
    switch (status) {
      case 'online': return '🟢';
      case 'syncing': return '🟡';
      case 'offline': return '🔴';
      default: return '⚪';
    }
  };

  if (isLoading && !metrics) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Loading sync status...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>Sync Status Dashboard</h2>
        <div style={styles.controls}>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh
          </label>
          <button 
            onClick={() => loadSyncData()} 
            style={styles.refreshButton}
            disabled={isLoading}
          >
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
          <button 
            onClick={() => handleForceSync()} 
            style={styles.forceButton}
          >
            Force Sync All
          </button>
        </div>
      </div>

      {error && (
        <div style={styles.errorContainer}>
          <p style={styles.errorText}>❌ {error}</p>
        </div>
      )}

      {metrics && (
        <div style={styles.metricsContainer}>
          <div style={styles.metricCard}>
            <h3>{metrics.totalDevices}</h3>
            <p>Total Devices</p>
          </div>
          <div style={styles.metricCard}>
            <h3 style={{ color: '#4CAF50' }}>{metrics.onlineDevices}</h3>
            <p>Online</p>
          </div>
          <div style={styles.metricCard}>
            <h3 style={{ color: '#FF9800' }}>{metrics.pendingOperations}</h3>
            <p>Pending</p>
          </div>
          <div style={styles.metricCard}>
            <h3 style={{ color: '#f44336' }}>{metrics.failedOperations}</h3>
            <p>Failed</p>
          </div>
          <div style={styles.metricCard}>
            <h3>{metrics.syncSuccess}%</h3>
            <p>Success Rate</p>
          </div>
        </div>
      )}

      <div style={styles.devicesContainer}>
        <h3>Device Status</h3>
        <div style={styles.devicesList}>
          {devices.map((device) => (
            <div key={device.deviceId} style={styles.deviceCard}>
              <div style={styles.deviceHeader}>
                <span style={styles.deviceStatus}>
                  {getStatusIcon(device.status)} {device.userName}
                </span>
                <span style={styles.deviceId}>{device.deviceId}</span>
              </div>
              
              <div style={styles.deviceInfo}>
                <p><strong>Last Sync:</strong> {formatLastSync(device.lastSync)}</p>
                <p><strong>Status:</strong> 
                  <span style={{ color: getStatusColor(device.status), marginLeft: '5px' }}>
                    {device.status}
                  </span>
                </p>
                
                {device.pendingOperations > 0 && (
                  <p><strong>Pending:</strong> {device.pendingOperations} operations</p>
                )}
                
                {device.failedOperations > 0 && (
                  <p style={{ color: '#f44336' }}>
                    <strong>Failed:</strong> {device.failedOperations} operations
                  </p>
                )}
              </div>
              
              <div style={styles.deviceActions}>
                <button 
                  onClick={() => handleForceSync(device.deviceId)}
                  style={styles.syncButton}
                >
                  Force Sync
                </button>
                {device.failedOperations > 0 && (
                  <button 
                    onClick={() => {/* TODO: Handle retry failed operations */}}
                    style={styles.retryButton}
                  >
                    Retry Failed
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '20px',
    backgroundColor: '#f5f5f5',
    borderRadius: '8px',
    margin: '20px 0'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    borderBottom: '1px solid #ddd',
    paddingBottom: '15px'
  },
  controls: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '14px'
  },
  refreshButton: {
    padding: '8px 16px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    backgroundColor: '#fff',
    cursor: 'pointer'
  },
  forceButton: {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: '#2196F3',
    color: 'white',
    cursor: 'pointer'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    padding: '40px'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #3498db',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  errorContainer: {
    padding: '10px',
    backgroundColor: '#ffebee',
    borderRadius: '4px',
    marginBottom: '20px'
  },
  errorText: {
    color: '#c62828',
    margin: 0
  },
  metricsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '15px',
    marginBottom: '30px'
  },
  metricCard: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    textAlign: 'center' as const,
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  devicesContainer: {
    marginTop: '20px'
  },
  devicesList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '15px',
    marginTop: '15px'
  },
  deviceCard: {
    backgroundColor: 'white',
    padding: '15px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  deviceHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
    paddingBottom: '8px',
    borderBottom: '1px solid #eee'
  },
  deviceStatus: {
    fontWeight: 'bold',
    fontSize: '16px'
  },
  deviceId: {
    fontSize: '12px',
    color: '#666',
    backgroundColor: '#f0f0f0',
    padding: '2px 6px',
    borderRadius: '4px'
  },
  deviceInfo: {
    fontSize: '14px',
    lineHeight: '1.4',
    marginBottom: '15px'
  },
  deviceActions: {
    display: 'flex',
    gap: '8px'
  },
  syncButton: {
    padding: '6px 12px',
    border: '1px solid #2196F3',
    borderRadius: '4px',
    backgroundColor: '#2196F3',
    color: 'white',
    cursor: 'pointer',
    fontSize: '12px'
  },
  retryButton: {
    padding: '6px 12px',
    border: '1px solid #FF9800',
    borderRadius: '4px',
    backgroundColor: '#FF9800',
    color: 'white',
    cursor: 'pointer',
    fontSize: '12px'
  }
};

export { SyncStatusPanel }; 

