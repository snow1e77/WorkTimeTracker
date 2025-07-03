import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { WebDatabaseService } from '../services/WebDatabaseService';
import { WebSyncService } from '../services/WebSyncService';
import { AuthUser, ConstructionSite, WorkReport, UserSiteAssignment, PhotoReport, WorkSchedule, WorkerLocation, Project } from '../types';
import AssignmentsTab from './AssignmentsTab';
import SyncTab from './SyncTab';
import { SyncStatusPanel } from './SyncStatusPanel';
import ChatManagementPanel from './ChatManagementPanel';
import PreRegistrationPanel from './PreRegistrationPanel';
import ProjectManagementPanel from './ProjectManagementPanel';
import logger from '../utils/logger';

// Импорты для карты (только для веб-платформы)
let MapContainer: any, TileLayer: any, Marker: any, useMapEvents: any;
let L: any;

if (Platform.OS === 'web') {
  try {
    const leaflet = require('leaflet');
    const reactLeaflet = require('react-leaflet');
    L = leaflet;
    MapContainer = reactLeaflet.MapContainer;
    TileLayer = reactLeaflet.TileLayer;
    Marker = reactLeaflet.Marker;
    useMapEvents = reactLeaflet.useMapEvents;
  } catch (error) {
    logger.warn('Failed to load Leaflet for web maps', { error: error instanceof Error ? error.message : 'Unknown error' }, 'maps');
  }
}

interface WebAdminPanelProps {
  onLogout?: () => void;
  currentUser?: AuthUser | null;
}

const AdminWebPanel: React.FC<WebAdminPanelProps> = ({ onLogout, currentUser }) => {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [sites, setSites] = useState<ConstructionSite[]>([]);
  const [reports, setReports] = useState<WorkReport[]>([]);
  const [photoReports, setPhotoReports] = useState<PhotoReport[]>([]);
  const [workersLocations, setWorkersLocations] = useState<WorkerLocation[]>([]);
  const [schedules, setSchedules] = useState<WorkSchedule[]>([]);
  const [assignments, setAssignments] = useState<UserSiteAssignment[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'projects' | 'workers' | 'schedule' | 'reports' | 'users' | 'assignments' | 'sync' | 'chat' | 'preregistration'>('projects');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<AuthUser | null>(null);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [syncHistory, setSyncHistory] = useState<any[]>([]);
  const [chatPanelVisible, setChatPanelVisible] = useState(false);

  const dbService = WebDatabaseService.getInstance();
  const syncService = WebSyncService.getInstance();

  useEffect(() => {
    loadData();
    loadSyncData();
    // Обновляем данные каждые 30 секунд
    const interval = setInterval(() => {
      loadData();
      loadSyncData();
    }, 30000);
    
    // Правильно очищаем интервал при размонтировании
    return () => {
      clearInterval(interval);
    };
  }, []); // Добавляем пустой массив зависимостей

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersData, sitesData, reportsData, photoReportsData, locationsData, schedulesData, assignmentsData, projectsData] = await Promise.all([
        dbService.getAllUsers(),
        dbService.getConstructionSites(),
        dbService.getWorkReports('week'),
        dbService.getPhotoReports(),
        dbService.getWorkersLocations(),
        dbService.getWorkSchedules(),
        dbService.getAllAssignments(),
        dbService.getProjects()
      ]);
      
      setUsers(usersData);
      setSites(sitesData);
      setReports(reportsData);
      setPhotoReports(photoReportsData);
      setWorkersLocations(locationsData);
      setSchedules(schedulesData);
      setAssignments(assignmentsData);
      setProjects(projectsData);
    } catch (error) {
      logger.error('Failed to load admin panel data', { error: error instanceof Error ? error.message : 'Unknown error' }, 'admin');
    } finally {
      setLoading(false);
    }
  };

  const loadProjectData = async (projectId: string) => {
    try {
      const [projectSites, projectAssignments] = await Promise.all([
        dbService.getProjectSites(projectId),
        dbService.getAllAssignments()
      ]);
      
      // Фильтруем данные по выбранному проекту
      setSites(projectSites);
      setAssignments(projectAssignments.filter(assignment => 
        projectSites.some(site => site.id === assignment.siteId)
      ));
    } catch (error) {
      logger.error('Failed to load project data', { error: error instanceof Error ? error.message : 'Unknown error' }, 'admin');
    }
  };

  const loadSyncData = async () => {
    try {
      const status = syncService.getSyncStatus();
      const history = await syncService.getSyncHistory();
      
      setSyncStatus(status);
      setSyncHistory(history);
    } catch (error) {
      logger.error('Failed to load sync data', { error: error instanceof Error ? error.message : 'Unknown error' }, 'sync');
    }
  };

  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatTimestamp = (timestamp: Date): string => {
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(timestamp);
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'working': return '#4CAF50';
      case 'lunch': return '#FF9800';
      case 'left_site': return '#f44336';
      case 'offline': return '#9E9E9E';
      default: return '#9E9E9E';
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'working': return 'Working';
      case 'lunch': return 'Lunch';
      case 'left_site': return 'Left site';
      case 'offline': return 'Offline';
      default: return 'Unknown';
    }
  };

  // Рендер вкладки "Рабочие"
  const renderWorkersTab = () => (
    <div style={styles.tabContent}>
      <div style={styles.header}>
        <h2 style={styles.title}>
          {selectedProject 
            ? `Проект: ${selectedProject.name} - Рабочие` 
            : 'Worker Tracking'
          }
        </h2>
        <p style={styles.subtitle}>
          {selectedProject 
            ? `Текущее местоположение и статус рабочих на проекте "${selectedProject.name}"` 
            : 'Current location and status of workers'
          }
        </p>
        {selectedProject && (
          <div style={styles.projectInfo}>
            <button
              style={styles.backToProjectsButton}
              onClick={() => {
                setSelectedProject(null);
                setSelectedTab('projects');
                loadData(); // Перезагружаем все данные
              }}
            >
              ← Вернуться к проектам
            </button>
          </div>
        )}
      </div>

      <div style={styles.workersGrid}>
        {workersLocations.map((worker) => (
          <div key={worker.userId} style={styles.workerCard}>
            <div style={styles.workerHeader}>
              <div style={styles.workerAvatar}>
                {worker.userAvatar ? (
                  <img src={worker.userAvatar} alt={worker.userName} style={styles.avatarImage} />
                ) : (
                  <div style={styles.avatarPlaceholder}>
                    {worker.userName.split(' ').map(n => n[0]).join('')}
                  </div>
                )}
              </div>
              <div style={styles.workerInfo}>
                <h3 style={styles.workerName}>{worker.userName}</h3>
                <div style={styles.statusBadge}>
                  <span 
                    style={{
                      ...styles.statusDot,
                      backgroundColor: getStatusColor(worker.status)
                    }}
                  />
                  {getStatusText(worker.status)}
                </div>
              </div>
            </div>

            {worker.currentSiteName && (
              <div style={styles.siteInfo}>
                <strong>Site:</strong> {worker.currentSiteName}
              </div>
            )}

            {worker.shiftStartTime && (
              <div style={styles.timeInfo}>
                <div><strong>Shift started:</strong> {formatTimestamp(worker.shiftStartTime)}</div>
                {worker.timeOnSite && worker.timeOnSite > 0 && (
                  <div><strong>Time on site:</strong> {formatTime(worker.timeOnSite)}</div>
                )}
              </div>
            )}

            {worker.lastPhotoReportTime && (
              <div style={styles.photoInfo}>
                <strong>Last photo report:</strong> {formatTimestamp(worker.lastPhotoReportTime)}
                {(Date.now() - worker.lastPhotoReportTime.getTime()) > 60 * 60 * 1000 && (
                  <span style={styles.warningText}> (over an hour ago!)</span>
                )}
              </div>
            )}

            <div style={styles.locationInfo}>
              <strong>Last update:</strong> {formatTimestamp(worker.timestamp)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Рендер вкладки "Расписание"
  const renderScheduleTab = () => (
    <div style={styles.tabContent}>
      <div style={styles.header}>
        <h2 style={styles.title}>Work Schedule</h2>
        <p style={styles.subtitle}>Manage schedules by sites</p>
      </div>

      <div style={styles.scheduleGrid}>
        {sites.filter(site => site.isActive).map((site) => {
          const siteSchedules = schedules.filter(schedule => schedule.siteId === site.id);
          
          return (
            <div key={site.id} style={styles.scheduleCard}>
              <h3 style={styles.siteName}>{site.name}</h3>
              <p style={styles.siteAddress}>{site.address}</p>
              
              <div style={styles.weekSchedule}>
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day, index) => {
                  const daySchedule = siteSchedules.find(s => s.dayOfWeek === (index + 1) % 7);
                  
                  return (
                    <div key={index} style={styles.daySchedule}>
                      <strong>{day}:</strong>
                      {daySchedule ? (
                        <div style={styles.scheduleTime}>
                          <span>{daySchedule.startTime} - {daySchedule.endTime}</span>
                          {daySchedule.lunchStart && daySchedule.lunchEnd && (
                            <span style={styles.lunchTime}>
                              (lunch: {daySchedule.lunchStart} - {daySchedule.lunchEnd})
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={styles.noSchedule}>Day off</span>
                      )}
                    </div>
                  );
                })}
              </div>
              
              <button 
                style={styles.editButton}
                onClick={() => {
                  alert(`Edit schedule for ${site.name}`);
                }}
              >
                Edit Schedule
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );

  // Рендер вкладки "Отчёты"
  const renderReportsTab = () => (
    <div style={styles.tabContent}>
      <div style={styles.header}>
        <h2 style={styles.title}>Work Reports</h2>
        <p style={styles.subtitle}>Work reports and photo reports</p>
      </div>

      {/* Фотоотчёты */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Worker Photo Reports</h3>
        <div style={styles.photoGrid}>
          {photoReports.map((report) => {
            const user = users.find(u => u.id === report.userId);
            const site = sites.find(s => s.id === report.siteId);
            
            return (
              <div key={report.id} style={styles.photoReportCard}>
                <img 
                  src={report.photoUri} 
                  alt="Photo Report" 
                  style={styles.reportPhoto}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDIwMCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIxNTAiIGZpbGw9IiNmNWY1ZjUiLz4KICA8dGV4dCB4PSIxMDAiIHk9Ijc1IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTk5IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiPlBob3RvPC90ZXh0Pgo8L3N2Zz4=';
                  }}
                />
                <div style={styles.reportPhotoInfo}>
                  <strong>{user?.name || 'Unknown'}</strong>
                  <div>{site?.name || 'Unknown site'}</div>
                  <div style={styles.timestamp}>{formatTimestamp(report.timestamp)}</div>
                  <div style={styles.validation}>
                    {report.isValidated ? (
                      <span style={styles.validated}>✅ Validated</span>
                    ) : (
                      <span style={styles.notValidated}>⏳ Pending review</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Отчёты по времени работы */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Time Reports</h3>
        <div style={styles.reportsTable}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th>Worker</th>
                <th>Site</th>
                <th>Working Hours</th>
                <th>Shifts Count</th>
                <th>Violations</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report, index) => (
                <tr key={index} style={index % 2 === 0 ? styles.evenRow : styles.oddRow}>
                  <td>{report.userName}</td>
                  <td>{report.siteName}</td>
                  <td>{report.totalHours}h {report.totalMinutes}m</td>
                  <td>{report.shiftsCount}</td>
                  <td style={report.violations > 0 ? styles.violations : {}}>
                    {report.violations}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // Рендер вкладки "Список рабочих"
  const renderUsersTab = () => (
    <div style={styles.tabContent}>
      <div style={styles.header}>
        <h2 style={styles.title}>Worker Management</h2>
        <p style={styles.subtitle}>Worker information and site assignments</p>
      </div>

      <div style={styles.searchSection}>
        <input
          type="text"
          placeholder="Search workers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      <div style={styles.usersGrid}>
        {users
          .filter(user => user.role === 'worker')
          .filter(user => 
            user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.phoneNumber.includes(searchTerm)
          )
          .map((user) => {
            const userAssignments = assignments.filter(a => a.userId === user.id && a.isActive);
            const workerLocation = workersLocations.find(loc => loc.userId === user.id);
            
            return (
              <div key={user.id} style={styles.userCard}>
                <div style={styles.userHeader}>
                  <div style={styles.userAvatar}>
                    <div style={styles.avatarPlaceholder}>
                      {user.name.split(' ').map(n => n[0]).join('')}
                    </div>
                  </div>
                  <div style={styles.userInfo}>
                    <h3 style={styles.userName}>{user.name}</h3>
                    <p style={styles.userPhone}>{user.phoneNumber}</p>
                    <div style={styles.userStatus}>
                      <span 
                        style={{
                          ...styles.statusDot,
                          backgroundColor: user.isActive ? '#4CAF50' : '#f44336'
                        }}
                      />
                      {user.isActive ? 'Active' : 'Inactive'}
                    </div>
                  </div>
                </div>

                {/* Назначенные объекты */}
                <div style={styles.assignments}>
                  <strong>Assigned sites:</strong>
                  {userAssignments.length > 0 ? (
                    <ul>
                      {userAssignments.map((assignment) => {
                        const site = sites.find(s => s.id === assignment.siteId);
                        return (
                          <li key={assignment.id}>
                            {site?.name || 'Unknown site'}
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p style={styles.noAssignments}>No assignments</p>
                  )}
                </div>

                {/* Текущий статус */}
                {workerLocation && (
                  <div style={styles.currentStatus}>
                    <strong>Current status:</strong>
                    <div style={styles.statusInfo}>
                      <span 
                        style={{
                          ...styles.statusDot,
                          backgroundColor: getStatusColor(workerLocation.status)
                        }}
                      />
                      {getStatusText(workerLocation.status)}
                      {workerLocation.currentSiteName && (
                        <span> at site "{workerLocation.currentSiteName}"</span>
                      )}
                    </div>
                  </div>
                )}

                <div style={styles.userActions}>
                  <button 
                    style={styles.detailButton}
                    onClick={() => setSelectedUser(user)}
                  >
                    Details
                  </button>
                  <button 
                    style={styles.assignButton}
                    onClick={() => {
                      alert(`Assign worker ${user.name} to site`);
                    }}
                  >
                    Assign to Site
                  </button>
                </div>
              </div>
            );
          })}
      </div>

      {/* Детальная информация о выбранном рабочем */}
      {selectedUser && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3>Details: {selectedUser.name}</h3>
              <button 
                style={styles.closeButton}
                onClick={() => setSelectedUser(null)}
              >
                ×
              </button>
            </div>
            <div style={styles.modalBody}>
              <p><strong>Phone:</strong> {selectedUser.phoneNumber}</p>
              <p><strong>Status:</strong> {selectedUser.isActive ? 'Active' : 'Inactive'}</p>
              <p><strong>Registration date:</strong> {formatTimestamp(selectedUser.createdAt)}</p>
              
              <div style={styles.detailSection}>
                <h4>Shift History</h4>
                <p>Feature in development...</p>
              </div>
              
              <div style={styles.detailSection}>
                <h4>Violations</h4>
                <p>Feature in development...</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={styles.loadingText}>Loading data...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Навигационные вкладки */}
      <div style={styles.tabs}>
        <button
          style={{
            ...styles.tab,
            ...(selectedTab === 'projects' ? styles.activeTab : {})
          }}
          onClick={() => setSelectedTab('projects')}
        >
          🏗️ Проекты
        </button>
        <button
          style={{
            ...styles.tab,
            ...(selectedTab === 'workers' ? styles.activeTab : {})
          }}
          onClick={() => setSelectedTab('workers')}
        >
          👷 Workers
        </button>
        <button
          style={{
            ...styles.tab,
            ...(selectedTab === 'schedule' ? styles.activeTab : {})
          }}
          onClick={() => setSelectedTab('schedule')}
        >
          📅 Schedule
        </button>
        <button
          style={{
            ...styles.tab,
            ...(selectedTab === 'reports' ? styles.activeTab : {})
          }}
          onClick={() => setSelectedTab('reports')}
        >
          📊 Reports
        </button>
        <button
          style={{
            ...styles.tab,
            ...(selectedTab === 'users' ? styles.activeTab : {})
          }}
          onClick={() => setSelectedTab('users')}
        >
          👥 Workers List
        </button>
        <button
          style={{
            ...styles.tab,
            ...(selectedTab === 'assignments' ? styles.activeTab : {})
          }}
          onClick={() => setSelectedTab('assignments')}
        >
          📋 Assignments
        </button>
        <button
          style={{
            ...styles.tab,
            ...(selectedTab === 'sync' ? styles.activeTab : {})
          }}
          onClick={() => setSelectedTab('sync')}
        >
          🔄 Sync
        </button>
        <button
          style={{
            ...styles.tab,
            ...(selectedTab === 'chat' ? styles.activeTab : {})
          }}
          onClick={() => setSelectedTab('chat')}
        >
          💬 Chat
        </button>
        <button
          style={{
            ...styles.tab,
            ...(selectedTab === 'preregistration' ? styles.activeTab : {})
          }}
          onClick={() => setSelectedTab('preregistration')}
        >
          👤 Pre-Registration
        </button>
        
        <div style={styles.tabActions}>
          <button style={styles.refreshButton} onClick={loadData}>
            🔄 Refresh
          </button>
          {onLogout && (
            <button style={styles.logoutButton} onClick={onLogout}>
              Logout
            </button>
          )}
        </div>
      </div>

      {/* Содержимое вкладок */}
      {selectedTab === 'projects' && (
        <ProjectManagementPanel 
          currentUser={currentUser || null}
          onSelectProject={(project) => {
            setSelectedProject(project);
            if (project) {
              loadProjectData(project.id);
              setSelectedTab('workers');
            }
          }}
          selectedProject={selectedProject}
        />
      )}
      {selectedTab === 'workers' && renderWorkersTab()}
      {selectedTab === 'schedule' && renderScheduleTab()}
      {selectedTab === 'reports' && renderReportsTab()}
      {selectedTab === 'users' && renderUsersTab()}
      {selectedTab === 'assignments' && (
        <AssignmentsTab
          users={users}
          sites={sites}
          assignments={assignments}
          onAssignmentsChange={loadData}
        />
      )}
      {selectedTab === 'sync' && (
        <SyncStatusPanel />
      )}
      {selectedTab === 'chat' && (
        <div style={styles.tabContent}>
          <div style={styles.header}>
            <h2 style={styles.title}>Chat Management</h2>
            <p style={styles.subtitle}>Manage worker communications and daily tasks</p>
          </div>
          <div style={styles.chatSection}>
            <button
              style={styles.openChatButton}
              onClick={() => setChatPanelVisible(true)}
            >
              💬 Open Chat Panel
            </button>
            <p style={styles.chatDescription}>
              View and manage conversations with workers, assign daily tasks, and monitor photo reports.
            </p>
          </div>
        </div>
      )}
      {selectedTab === 'preregistration' && (
        <PreRegistrationPanel />
      )}

      {/* Chat Management Panel */}
      <ChatManagementPanel 
        visible={chatPanelVisible}
        onClose={() => setChatPanelVisible(false)}
      />
    </div>
  );
};

// Стили компонента
const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
  } as React.CSSProperties,

  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    backgroundColor: '#f5f5f5',
  } as React.CSSProperties,

  loadingText: {
    fontSize: '18px',
    color: '#666',
  } as React.CSSProperties,

  tabs: {
    display: 'flex',
    backgroundColor: 'white',
    borderBottom: '1px solid #ddd',
    padding: '0 20px',
    alignItems: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  } as React.CSSProperties,

  tab: {
    padding: '15px 20px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '500',
    color: '#666',
    borderBottom: '3px solid transparent',
    transition: 'all 0.3s ease',
  } as React.CSSProperties,

  activeTab: {
    color: '#2196F3',
    borderBottomColor: '#2196F3',
  } as React.CSSProperties,

  tabActions: {
    marginLeft: 'auto',
    display: 'flex',
    gap: '10px',
  } as React.CSSProperties,

  refreshButton: {
    padding: '8px 16px',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  } as React.CSSProperties,

  logoutButton: {
    padding: '8px 16px',
    backgroundColor: '#f44336',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  } as React.CSSProperties,

  tabContent: {
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto',
  } as React.CSSProperties,

  header: {
    marginBottom: '30px',
    textAlign: 'center' as const,
  } as React.CSSProperties,

  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '8px',
  } as React.CSSProperties,

  subtitle: {
    fontSize: '16px',
    color: '#666',
    margin: 0,
  } as React.CSSProperties,

  // Стили для вкладки "Рабочие"
  workersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px',
    marginBottom: '30px',
  } as React.CSSProperties,

  workerCard: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  } as React.CSSProperties,

  workerHeader: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '15px',
  } as React.CSSProperties,

  workerAvatar: {
    marginRight: '15px',
  } as React.CSSProperties,

  avatarImage: {
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    objectFit: 'cover' as const,
  } as React.CSSProperties,

  avatarPlaceholder: {
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    backgroundColor: '#2196F3',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    fontWeight: 'bold',
  } as React.CSSProperties,

  workerInfo: {
    flex: 1,
  } as React.CSSProperties,

  workerName: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '600',
    color: '#333',
  } as React.CSSProperties,

  statusBadge: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '14px',
    color: '#666',
    marginTop: '5px',
  } as React.CSSProperties,

  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    marginRight: '8px',
  } as React.CSSProperties,

  siteInfo: {
    marginBottom: '10px',
    fontSize: '14px',
    color: '#333',
  } as React.CSSProperties,

  timeInfo: {
    marginBottom: '10px',
    fontSize: '14px',
    color: '#333',
    lineHeight: '1.4',
  } as React.CSSProperties,

  photoInfo: {
    marginBottom: '10px',
    fontSize: '14px',
    color: '#333',
  } as React.CSSProperties,

  warningText: {
    color: '#f44336',
    fontWeight: '500',
  } as React.CSSProperties,

  locationInfo: {
    fontSize: '12px',
    color: '#666',
  } as React.CSSProperties,

  // Стили для вкладки "Расписание"
  scheduleGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
    gap: '20px',
  } as React.CSSProperties,

  scheduleCard: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  } as React.CSSProperties,

  siteName: {
    margin: '0 0 5px 0',
    fontSize: '20px',
    fontWeight: '600',
    color: '#333',
  } as React.CSSProperties,

  siteAddress: {
    margin: '0 0 20px 0',
    fontSize: '14px',
    color: '#666',
  } as React.CSSProperties,

  weekSchedule: {
    marginBottom: '20px',
  } as React.CSSProperties,

  daySchedule: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: '1px solid #eee',
    fontSize: '14px',
  } as React.CSSProperties,

  scheduleTime: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'flex-end' as const,
  } as React.CSSProperties,

  lunchTime: {
    fontSize: '12px',
    color: '#666',
    fontStyle: 'italic' as const,
  } as React.CSSProperties,

  noSchedule: {
    color: '#999',
    fontStyle: 'italic' as const,
  } as React.CSSProperties,

  editButton: {
    width: '100%',
    padding: '10px',
    backgroundColor: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  } as React.CSSProperties,

  // Стили для вкладки "Отчёты"
  section: {
    marginBottom: '40px',
  } as React.CSSProperties,

  sectionTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#333',
    marginBottom: '20px',
  } as React.CSSProperties,

  photoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '20px',
  } as React.CSSProperties,

  photoReportCard: {
    backgroundColor: 'white',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  } as React.CSSProperties,

  reportPhoto: {
    width: '100%',
    height: '150px',
    objectFit: 'cover' as const,
  } as React.CSSProperties,

  reportPhotoInfo: {
    padding: '15px',
  } as React.CSSProperties,

  timestamp: {
    fontSize: '12px',
    color: '#666',
    marginTop: '5px',
  } as React.CSSProperties,

  validation: {
    marginTop: '10px',
  } as React.CSSProperties,

  validated: {
    color: '#4CAF50',
    fontSize: '14px',
    fontWeight: '500',
  } as React.CSSProperties,

  notValidated: {
    color: '#FF9800',
    fontSize: '14px',
    fontWeight: '500',
  } as React.CSSProperties,

  reportsTable: {
    backgroundColor: 'white',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  } as React.CSSProperties,

  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
  } as React.CSSProperties,

  evenRow: {
    backgroundColor: '#f9f9f9',
  } as React.CSSProperties,

  oddRow: {
    backgroundColor: 'white',
  } as React.CSSProperties,

  violations: {
    color: '#f44336',
    fontWeight: '500',
  } as React.CSSProperties,

  // Стили для вкладки "Список рабочих"
  searchSection: {
    marginBottom: '20px',
  } as React.CSSProperties,

  searchInput: {
    width: '100%',
    maxWidth: '400px',
    padding: '10px 15px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '16px',
  } as React.CSSProperties,

  usersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '20px',
  } as React.CSSProperties,

  userCard: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  } as React.CSSProperties,

  userHeader: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '15px',
  } as React.CSSProperties,

  userAvatar: {
    marginRight: '15px',
  } as React.CSSProperties,

  userInfo: {
    flex: 1,
  } as React.CSSProperties,

  userName: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '600',
    color: '#333',
  } as React.CSSProperties,

  userPhone: {
    margin: '5px 0',
    fontSize: '14px',
    color: '#666',
  } as React.CSSProperties,

  userStatus: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '14px',
    color: '#666',
  } as React.CSSProperties,

  assignments: {
    marginBottom: '15px',
    fontSize: '14px',
    color: '#333',
  } as React.CSSProperties,

  noAssignments: {
    color: '#999',
    fontStyle: 'italic' as const,
    margin: '5px 0',
  } as React.CSSProperties,

  currentStatus: {
    marginBottom: '15px',
    fontSize: '14px',
    color: '#333',
  } as React.CSSProperties,

  statusInfo: {
    display: 'flex',
    alignItems: 'center',
    marginTop: '5px',
  } as React.CSSProperties,

  userActions: {
    display: 'flex',
    gap: '10px',
  } as React.CSSProperties,

  detailButton: {
    flex: 1,
    padding: '8px 16px',
    backgroundColor: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  } as React.CSSProperties,

  assignButton: {
    flex: 1,
    padding: '8px 16px',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  } as React.CSSProperties,

  // Модальное окно
  modal: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  } as React.CSSProperties,

  modalContent: {
    backgroundColor: 'white',
    borderRadius: '8px',
    width: '90%',
    maxWidth: '600px',
    maxHeight: '80%',
    overflow: 'auto',
  } as React.CSSProperties,

  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    borderBottom: '1px solid #eee',
  } as React.CSSProperties,

  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#666',
  } as React.CSSProperties,

  modalBody: {
    padding: '20px',
  } as React.CSSProperties,

  detailSection: {
    marginTop: '20px',
    padding: '15px',
    backgroundColor: '#f9f9f9',
    borderRadius: '4px',
  } as React.CSSProperties,

  chatSection: {
    marginBottom: '20px',
  } as React.CSSProperties,

  openChatButton: {
    padding: '10px 20px',
    backgroundColor: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  } as React.CSSProperties,

  chatDescription: {
    marginTop: '10px',
    fontSize: '14px',
    color: '#666',
  } as React.CSSProperties,

  // Стили для проектов
  projectInfo: {
    marginBottom: '15px',
  } as React.CSSProperties,

  backToProjectsButton: {
    padding: '8px 16px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  } as React.CSSProperties,
};

export default AdminWebPanel; 
