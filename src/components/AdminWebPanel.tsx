import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { WebDatabaseService } from '../services/WebDatabaseService';
import { AuthUser, ConstructionSite, WorkReport, UserSiteAssignment } from '../types';

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
    console.warn('Leaflet не установлен:', error);
  }
}

// Компонент для обработки кликов по карте
const MapClickHandler: React.FC<{ onMapClick: (lat: number, lng: number) => void }> = ({ onMapClick }) => {
  if (!useMapEvents) {
    return null;
  }
  
  try {
    useMapEvents({
      click: (e: any) => {
        console.log('MapClickHandler: click event', e);
        if (e && e.latlng) {
          onMapClick(e.latlng.lat, e.latlng.lng);
        }
      },
    });
  } catch (error) {
    console.error('MapClickHandler error:', error);
  }
  
  return null;
};

// Компонент интерактивной карты
const InteractiveMap: React.FC<{
  center: [number, number];
  zoom?: number;
  onMapClick?: (lat: number, lng: number) => void;
  markers?: Array<{ position: [number, number]; title?: string }>;
  style?: React.CSSProperties;
}> = ({ center, zoom = 13, onMapClick, markers = [], style }) => {
  // Если Leaflet не загружен, показываем заглушку
  if (!MapContainer || !TileLayer || !Marker) {
    return (
      <div style={{
        ...style,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8f9fa',
        border: '2px dashed #dee2e6',
        borderRadius: '8px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#6c757d', margin: 0 }}>🗺️ Map not loaded</p>
          <p style={{ color: '#6c757d', fontSize: '12px', margin: '4px 0 0 0' }}>
            Run: npm install leaflet react-leaflet @types/leaflet
          </p>
        </div>
      </div>
    );
  }

  try {
    return (
      <MapContainer
        center={center}
        zoom={zoom}
        style={style}
        scrollWheelZoom={false} // Отключаем скролл по умолчанию
        doubleClickZoom={true}  // Оставляем зум по двойному клику
        dragging={true}         // Оставляем перетаскивание
        zoomControl={true}      // Показываем кнопки зума
        touchZoom={true}        // Зум на мобильных устройствах
        key={`${center[0]}-${center[1]}`} // Force re-render when center changes
        whenCreated={(mapInstance: any) => {
          // Включаем скролл зум только когда карта в фокусе
          mapInstance.on('focus', () => {
            mapInstance.scrollWheelZoom.enable();
          });
          mapInstance.on('blur', () => {
            mapInstance.scrollWheelZoom.disable();
          });
          // Включаем скролл зум при клике по карте
          mapInstance.on('click', () => {
            mapInstance.scrollWheelZoom.enable();
            setTimeout(() => {
              mapInstance.scrollWheelZoom.disable();
            }, 5000); // Отключаем через 5 секунд
          });
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {onMapClick && <MapClickHandler onMapClick={onMapClick} />}
        
        {markers.map((marker, index) => (
          <Marker key={`marker-${index}-${marker.position[0]}-${marker.position[1]}`} position={marker.position}>
            {/* Можно добавить Popup с информацией */}
          </Marker>
        ))}
      </MapContainer>
    );
  } catch (error) {
    console.error('Map rendering error:', error);
    return (
      <div style={{
        ...style,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ffe6e6',
        border: '2px solid #ff9999',
        borderRadius: '8px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#cc0000', margin: 0 }}>❌ Map Error</p>
          <p style={{ color: '#cc0000', fontSize: '12px', margin: '4px 0 0 0' }}>
            Check console for details
          </p>
        </div>
      </div>
    );
  }
};

interface WebAdminPanelProps {
  onLogout?: () => void;
}

const AdminWebPanel: React.FC<WebAdminPanelProps> = ({ onLogout }) => {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [sites, setSites] = useState<ConstructionSite[]>([]);
  const [reports, setReports] = useState<WorkReport[]>([]);
  const [assignments, setAssignments] = useState<UserSiteAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'users' | 'reports' | 'sites' | 'assignments'>('users');
  const [searchTerm, setSearchTerm] = useState('');
  const [reportPeriod, setReportPeriod] = useState<'today' | 'week' | 'month'>('week');
  const [showSiteForm, setShowSiteForm] = useState(false);
  const [editingSite, setEditingSite] = useState<ConstructionSite | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [siteFormData, setSiteFormData] = useState({
    name: '',
    address: '',
    latitude: 55.7558,
    longitude: 37.6176,
    radius: 100,
  });
  const [newAssignment, setNewAssignment] = useState({
    userId: '',
    siteId: '',
    notes: ''
  });

  const dbService = WebDatabaseService.getInstance();

  // Загружаем CSS для Leaflet при монтировании компонента
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined' && L) {
      // Добавляем CSS для Leaflet
      const leafletCSS = document.createElement('link');
      leafletCSS.rel = 'stylesheet';
      leafletCSS.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      leafletCSS.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
      leafletCSS.crossOrigin = '';
      document.head.appendChild(leafletCSS);

      // Исправляем проблему с иконками маркеров в Leaflet
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      return () => {
        // Убираем CSS при размонтировании
        if (document.head.contains(leafletCSS)) {
          document.head.removeChild(leafletCSS);
        }
      };
    }
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedTab === 'reports') {
      loadReports();
    }
  }, [selectedTab, reportPeriod]);

  const loadData = async () => {
    try {
      setLoading(true);
      await dbService.initDatabase();
      const allUsers = await dbService.getAllUsers();
      const allSites = await dbService.getConstructionSites();
      const allAssignments = await dbService.getAllAssignments();
      setUsers(allUsers);
      setSites(allSites);
      setAssignments(allAssignments);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      await dbService.initDatabase();
      const allUsers = await dbService.getAllUsers();
      setUsers(allUsers);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadSites = async () => {
    try {
      const allSites = await dbService.getConstructionSites();
      setSites(allSites);
    } catch (error) {
      console.error('Error loading sites:', error);
    }
  };

  const loadReports = async () => {
    try {
      const workReports = await dbService.getWorkReports(reportPeriod);
      setReports(workReports);
    } catch (error) {
      console.error('Error loading reports:', error);
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'worker' | 'admin') => {
    try {
      await dbService.updateUserRole(userId, newRole);
      loadUsers();
      alert(`User role updated to ${newRole === 'admin' ? 'Admin' : 'Worker'}`);
    } catch (error) {
      console.error('Error updating user role:', error);
      alert('Failed to update user role');
    }
  };

  const handleStatusToggle = async (userId: string, currentStatus: boolean) => {
    try {
      await dbService.updateUserStatus(userId, !currentStatus);
      loadUsers();
      alert(`User ${!currentStatus ? 'activated' : 'deactivated'}`);
    } catch (error) {
      console.error('Error updating user status:', error);
      alert('Failed to update user status');
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (window.confirm(`Are you sure you want to delete ${userName}?`)) {
      try {
        await dbService.deleteUser(userId);
        loadUsers();
        alert('User deleted successfully');
      } catch (error) {
        console.error('Error deleting user:', error);
        alert('Failed to delete user');
      }
    }
  };

  // Site management functions
  const handleSiteStatusToggle = async (siteId: string, currentStatus: boolean) => {
    try {
      await dbService.updateSiteStatus(siteId, !currentStatus);
      loadSites();
      alert(`Site ${!currentStatus ? 'activated' : 'deactivated'}`);
    } catch (error) {
      console.error('Error updating site status:', error);
      alert('Failed to update site status');
    }
  };

  const handleDeleteSite = async (siteId: string, siteName: string) => {
    if (window.confirm(`Are you sure you want to delete "${siteName}"?`)) {
      try {
        await dbService.deleteConstructionSite(siteId);
        loadSites();
        alert('Site deleted successfully');
      } catch (error) {
        console.error('Error deleting site:', error);
        alert('Failed to delete site');
      }
    }
  };

  const handleSiteFormSubmit = async () => {
    if (!siteFormData.name.trim() || !siteFormData.address.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const newSite: ConstructionSite = {
        id: editingSite ? editingSite.id : 'site-' + Date.now(),
        name: siteFormData.name,
        address: siteFormData.address,
        latitude: siteFormData.latitude,
        longitude: siteFormData.longitude,
        radius: siteFormData.radius,
        companyId: 'default-company',
        isActive: true,
        createdAt: new Date(),
      };

      // В реальном приложении здесь был бы API call для создания/обновления объекта
      const currentSites = await dbService.getConstructionSites();
      if (editingSite) {
        const updatedSites = currentSites.map(site => 
          site.id === editingSite.id ? newSite : site
        );
        localStorage.setItem('worktime_sites', JSON.stringify(updatedSites));
      } else {
        currentSites.push(newSite);
        localStorage.setItem('worktime_sites', JSON.stringify(currentSites));
      }

      setShowSiteForm(false);
      setEditingSite(null);
      setSiteFormData({
        name: '',
        address: '',
        latitude: 55.7558,
        longitude: 37.6176,
        radius: 100,
      });
      loadSites();
      alert(`Site ${editingSite ? 'updated' : 'created'} successfully`);
    } catch (error) {
      console.error('Error saving site:', error);
      alert('Failed to save site');
    }
  };

  const handleEditSite = (site: ConstructionSite) => {
    setEditingSite(site);
    setSiteFormData({
      name: site.name,
      address: site.address,
      latitude: site.latitude,
      longitude: site.longitude,
      radius: site.radius,
    });
    setShowSiteForm(true);
  };

  const handleMapClick = (lat: number, lng: number) => {
    console.log('Map clicked at:', lat, lng);
    setSiteFormData({
      ...siteFormData,
      latitude: lat,
      longitude: lng,
    });
  };

  const centerMapOnCoordinates = () => {
    // Функция для центрирования карты по введенным координатам
    // Карта автоматически обновится через center prop
  };

  const handleExportReports = () => {
    try {
      const csvContent = "data:text/csv;charset=utf-8," 
        + "Employee,Site,Hours,Minutes,Shifts,Violations,Date\n"
        + reports.map(report => 
            `${report.userName},${report.siteName},${report.totalHours},${report.totalMinutes},${report.shiftsCount},${report.violations},${report.date}`
          ).join("\n");
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `work_reports_${reportPeriod}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting reports:', error);
      alert('Failed to export reports');
    }
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.phoneNumber.includes(searchTerm)
  );

  // Функция для отображения вкладки назначений
  const renderAssignments = () => {
    const handleCreateAssignment = async () => {
      if (!newAssignment.userId || !newAssignment.siteId) {
        alert('Please select both user and site');
        return;
      }

      try {
        const assignment: UserSiteAssignment = {
          id: `assignment-${Date.now()}`,
          userId: newAssignment.userId,
          siteId: newAssignment.siteId,
          assignedBy: 'admin-1',
          isActive: true,
          assignedAt: new Date(),
          notes: newAssignment.notes
        };

        await dbService.createAssignment(assignment);
        setAssignments([...assignments, assignment]);
        setNewAssignment({ userId: '', siteId: '', notes: '' });
        alert('Assignment created successfully!');
      } catch (error) {
        console.error('Error creating assignment:', error);
        alert('Failed to create assignment');
      }
    };

    const handleToggleAssignment = async (assignmentId: string, isActive: boolean) => {
      try {
        await dbService.updateAssignment(assignmentId, { isActive: !isActive });
        setAssignments(assignments.map(assignment => 
          assignment.id === assignmentId 
            ? { ...assignment, isActive: !isActive }
            : assignment
        ));
      } catch (error) {
        console.error('Error updating assignment:', error);
        alert('Failed to update assignment');
      }
    };

    const handleDeleteAssignment = async (assignmentId: string) => {
      if (!confirm('Are you sure you want to delete this assignment?')) {
        return;
      }

      try {
        await dbService.deleteAssignment(assignmentId);
        setAssignments(assignments.filter(assignment => assignment.id !== assignmentId));
        alert('Assignment deleted successfully!');
      } catch (error) {
        console.error('Error deleting assignment:', error);
        alert('Failed to delete assignment');
      }
    };

    const getUserName = (userId: string) => {
      const user = users.find(u => u.id === userId);
      return user ? user.name : 'Unknown User';
    };

    const getSiteName = (siteId: string) => {
      const site = sites.find(s => s.id === siteId);
      return site ? site.name : 'Unknown Site';
    };

    return (
      <div style={webStyles.content}>
        <h2>Worker Site Assignments</h2>
        
        <div style={webStyles.siteForm}>
          <h3>Create New Assignment</h3>
          <div style={webStyles.formRow}>
            <select
              value={newAssignment.userId}
              onChange={(e) => setNewAssignment({...newAssignment, userId: e.target.value})}
              style={webStyles.formInput}
            >
              <option value="">Select Worker</option>
              {users.filter(user => user.role === 'worker').map(user => (
                <option key={user.id} value={user.id}>{user.name}</option>
              ))}
            </select>
            
            <select
              value={newAssignment.siteId}
              onChange={(e) => setNewAssignment({...newAssignment, siteId: e.target.value})}
              style={webStyles.formInput}
            >
              <option value="">Select Site</option>
              {sites.filter(site => site.isActive).map(site => (
                <option key={site.id} value={site.id}>{site.name}</option>
              ))}
            </select>
          </div>
          
          <textarea
            placeholder="Notes (optional)"
            value={newAssignment.notes}
            onChange={(e) => setNewAssignment({...newAssignment, notes: e.target.value})}
            style={{...webStyles.formInput, height: '80px', resize: 'vertical'}}
          />
          
          <button onClick={handleCreateAssignment} style={webStyles.saveButton}>
            Create Assignment
          </button>
        </div>

        <div style={webStyles.tableContainer}>
          <table style={webStyles.table}>
            <thead>
              <tr style={webStyles.tableHeader}>
                <th style={webStyles.th}>Worker</th>
                <th style={webStyles.th}>Site</th>
                <th style={webStyles.th}>Status</th>
                <th style={webStyles.th}>Assigned Date</th>
                <th style={webStyles.th}>Notes</th>
                <th style={webStyles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map(assignment => (
                <tr key={assignment.id} style={webStyles.tableRow}>
                  <td style={webStyles.td}>{getUserName(assignment.userId)}</td>
                  <td style={webStyles.td}>{getSiteName(assignment.siteId)}</td>
                  <td style={webStyles.td}>
                    <span style={{
                      ...webStyles.badge,
                      backgroundColor: assignment.isActive ? '#2ecc71' : '#e74c3c'
                    }}>
                      {assignment.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={webStyles.td}>
                    {assignment.assignedAt.toLocaleDateString()}
                  </td>
                  <td style={webStyles.td}>{assignment.notes || '-'}</td>
                  <td style={webStyles.td}>
                    <div style={webStyles.actionButtons}>
                      <button
                        onClick={() => handleToggleAssignment(assignment.id, assignment.isActive)}
                        style={{
                          ...webStyles.button,
                          backgroundColor: assignment.isActive ? '#f39c12' : '#2ecc71'
                        }}
                      >
                        {assignment.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleDeleteAssignment(assignment.id)}
                        style={{
                          ...webStyles.button,
                          backgroundColor: '#e74c3c'
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderUserManagement = () => (
    <div style={webStyles.content}>
      <div style={webStyles.searchContainer}>
        <input
          type="text"
          placeholder="Search users by name or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={webStyles.searchInput}
        />
      </div>

      <div style={webStyles.tableContainer}>
        <table style={webStyles.table}>
          <thead>
            <tr style={webStyles.tableHeader}>
              <th style={webStyles.th}>Name</th>
              <th style={webStyles.th}>Phone</th>
              <th style={webStyles.th}>Role</th>
              <th style={webStyles.th}>Status</th>
              <th style={webStyles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id} style={webStyles.tableRow}>
                <td style={webStyles.td}>{user.name}</td>
                <td style={webStyles.td}>{user.phoneNumber}</td>
                <td style={webStyles.td}>
                  <span style={{
                    ...webStyles.badge,
                    backgroundColor: user.role === 'admin' ? '#3498db' : '#95a5a6'
                  }}>
                    {user.role === 'admin' ? 'Admin' : 'Worker'}
                  </span>
                </td>
                <td style={webStyles.td}>
                  <span style={{
                    ...webStyles.badge,
                    backgroundColor: user.isActive ? '#27ae60' : '#e74c3c'
                  }}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={webStyles.td}>
                  <div style={webStyles.actionButtons}>
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value as 'worker' | 'admin')}
                      style={webStyles.selectButton}
                    >
                      <option value="worker">Worker</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button
                      onClick={() => handleStatusToggle(user.id, user.isActive)}
                      style={{
                        ...webStyles.button,
                        backgroundColor: user.isActive ? '#e74c3c' : '#27ae60'
                      }}
                    >
                      {user.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user.id, user.name)}
                      style={{
                        ...webStyles.button,
                        backgroundColor: '#e74c3c'
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderReports = () => (
    <div style={webStyles.content}>
      <div style={webStyles.reportsHeader}>
        <h2 style={webStyles.sectionTitle}>Work Reports</h2>
        <div style={webStyles.reportsControls}>
          <select
            value={reportPeriod}
            onChange={(e) => setReportPeriod(e.target.value as 'today' | 'week' | 'month')}
            style={webStyles.periodSelect}
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
          <button onClick={handleExportReports} style={webStyles.exportButton}>
            📊 Export CSV
          </button>
        </div>
      </div>

      {reports.length === 0 ? (
        <p style={webStyles.placeholder}>
          No reports available for the selected period
        </p>
      ) : (
        <div style={webStyles.tableContainer}>
          <table style={webStyles.table}>
            <thead>
              <tr style={webStyles.tableHeader}>
                <th style={webStyles.th}>Employee</th>
                <th style={webStyles.th}>Site</th>
                <th style={webStyles.th}>Hours</th>
                <th style={webStyles.th}>Shifts</th>
                <th style={webStyles.th}>Violations</th>
                <th style={webStyles.th}>Date</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report, index) => (
                <tr key={index} style={webStyles.tableRow}>
                  <td style={webStyles.td}>{report.userName}</td>
                  <td style={webStyles.td}>{report.siteName}</td>
                  <td style={webStyles.td}>
                    <span style={{
                      ...webStyles.badge,
                      backgroundColor: report.totalHours >= 8 ? '#27ae60' : '#f39c12'
                    }}>
                      {report.totalHours.toFixed(1)}h
                    </span>
                  </td>
                  <td style={webStyles.td}>{report.shiftsCount}</td>
                  <td style={webStyles.td}>
                    {report.violations > 0 ? (
                      <span style={{
                        ...webStyles.badge,
                        backgroundColor: '#e74c3c'
                      }}>
                        {report.violations}
                      </span>
                    ) : (
                      <span style={{
                        ...webStyles.badge,
                        backgroundColor: '#95a5a6'
                      }}>
                        0
                      </span>
                    )}
                  </td>
                  <td style={webStyles.td}>{new Date(report.date).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderSites = () => (
    <div style={webStyles.content}>
      <div style={webStyles.sitesHeader}>
        <h2 style={webStyles.sectionTitle}>Construction Sites</h2>
        <button 
          onClick={() => {
            setEditingSite(null);
            setSiteFormData({
              name: '',
              address: '',
              latitude: 55.7558,
              longitude: 37.6176,
              radius: 100,
            });
            setShowSiteForm(true);
          }}
          style={webStyles.addButton}
        >
          ➕ Add Site
        </button>
      </div>

      {showSiteForm && (
        <div style={webStyles.siteForm}>
          <h3 style={webStyles.formTitle}>
            {editingSite ? 'Edit Site' : 'Create New Site'}
          </h3>
          <div style={webStyles.formRow}>
            <input
              type="text"
              placeholder="Site name *"
              value={siteFormData.name}
              onChange={(e) => setSiteFormData({...siteFormData, name: e.target.value})}
              style={webStyles.formInput}
            />
            <input
              type="text"
              placeholder="Address *"
              value={siteFormData.address}
              onChange={(e) => setSiteFormData({...siteFormData, address: e.target.value})}
              style={webStyles.formInput}
            />
          </div>
          <div style={webStyles.formRow}>
            <input
              type="number"
              placeholder="Latitude"
              value={siteFormData.latitude.toFixed(6)}
              onChange={(e) => setSiteFormData({...siteFormData, latitude: parseFloat(e.target.value) || 0})}
              style={webStyles.formInput}
              step="0.000001"
            />
            <input
              type="number"
              placeholder="Longitude"
              value={siteFormData.longitude.toFixed(6)}
              onChange={(e) => setSiteFormData({...siteFormData, longitude: parseFloat(e.target.value) || 0})}
              style={webStyles.formInput}
              step="0.000001"
            />
          </div>
          <div style={webStyles.formRow}>
            <input
              type="number"
              placeholder="Radius (m)"
              value={siteFormData.radius}
              onChange={(e) => setSiteFormData({...siteFormData, radius: parseInt(e.target.value) || 0})}
              style={webStyles.formInput}
              min="10"
              max="1000"
            />
            <button 
              type="button"
              onClick={() => setShowMap(!showMap)}
              style={webStyles.mapToggleButton}
            >
              {showMap ? '🗺️ Hide Map' : '🗺️ Show Map'}
            </button>
          </div>
          
          {showMap && (
            <div style={webStyles.mapSection}>
              <p style={webStyles.mapHint}>
                💡 Click on the map to select the object location
              </p>
              <p style={webStyles.mapInstructions}>
                🖱️ Click on map to enable zoom with mouse wheel (auto-disables after 5 seconds) | 
                🖱️ Double-click to zoom | 🤏 Use zoom controls (+/-) on the right
              </p>
              <InteractiveMap
                center={[siteFormData.latitude, siteFormData.longitude]}
                zoom={15}
                onMapClick={handleMapClick}
                markers={[{
                  position: [siteFormData.latitude, siteFormData.longitude],
                  title: siteFormData.name || 'New Site'
                }]}
                style={webStyles.mapContainer}
              />
              <div style={webStyles.mapControls}>
                <p style={webStyles.coordinatesDisplay}>
                  📍 Selected coordinates: {siteFormData.latitude.toFixed(6)}, {siteFormData.longitude.toFixed(6)}
                </p>
                <button 
                  type="button"
                  onClick={centerMapOnCoordinates}
                  style={webStyles.centerButton}
                >
                  🎯 Center Map
                </button>
              </div>
            </div>
          )}
          <div style={webStyles.formActions}>
            <button onClick={handleSiteFormSubmit} style={webStyles.saveButton}>
              💾 {editingSite ? 'Update' : 'Create'}
            </button>
            <button 
              onClick={() => {
                setShowSiteForm(false);
                setEditingSite(null);
              }}
              style={webStyles.cancelButton}
            >
              ❌ Cancel
            </button>
          </div>
        </div>
      )}

      {sites.length === 0 ? (
        <p style={webStyles.placeholder}>
          No construction sites found. Create your first site to get started.
        </p>
      ) : (
        <div style={webStyles.tableContainer}>
          <table style={webStyles.table}>
            <thead>
              <tr style={webStyles.tableHeader}>
                <th style={webStyles.th}>Name</th>
                <th style={webStyles.th}>Address</th>
                <th style={webStyles.th}>Coordinates</th>
                <th style={webStyles.th}>Radius</th>
                <th style={webStyles.th}>Status</th>
                <th style={webStyles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sites.map((site) => (
                <tr key={site.id} style={webStyles.tableRow}>
                  <td style={webStyles.td}>{site.name}</td>
                  <td style={webStyles.td}>{site.address}</td>
                  <td style={webStyles.td}>
                    {site.latitude.toFixed(4)}, {site.longitude.toFixed(4)}
                  </td>
                  <td style={webStyles.td}>{site.radius}m</td>
                  <td style={webStyles.td}>
                    <span style={{
                      ...webStyles.badge,
                      backgroundColor: site.isActive ? '#27ae60' : '#e74c3c'
                    }}>
                      {site.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={webStyles.td}>
                    <div style={webStyles.actionButtons}>
                      <button
                        onClick={() => handleEditSite(site)}
                        style={{
                          ...webStyles.button,
                          backgroundColor: '#3498db'
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleSiteStatusToggle(site.id, site.isActive)}
                        style={{
                          ...webStyles.button,
                          backgroundColor: site.isActive ? '#e74c3c' : '#27ae60'
                        }}
                      >
                        {site.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleDeleteSite(site.id, site.name)}
                        style={{
                          ...webStyles.button,
                          backgroundColor: '#e74c3c'
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <div style={webStyles.loadingContainer}>
          <Text style={styles.loadingText}>Loading admin panel...</Text>
        </div>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <div style={webStyles.adminPanel}>
        <div style={webStyles.header}>
          <h1 style={webStyles.title}>WorkTime Admin Panel</h1>
          {onLogout && (
            <button onClick={onLogout} style={webStyles.logoutButton}>
              Logout
            </button>
          )}
        </div>

        <div style={webStyles.tabs}>
          <button
            onClick={() => setSelectedTab('users')}
            style={{
              ...webStyles.tab,
              backgroundColor: selectedTab === 'users' ? '#3498db' : '#ecf0f1'
            }}
          >
            Users ({users.length})
          </button>
          <button
            onClick={() => setSelectedTab('reports')}
            style={{
              ...webStyles.tab,
              backgroundColor: selectedTab === 'reports' ? '#3498db' : '#ecf0f1'
            }}
          >
            Reports ({reports.length})
          </button>
          <button
            onClick={() => setSelectedTab('sites')}
            style={{
              ...webStyles.tab,
              backgroundColor: selectedTab === 'sites' ? '#3498db' : '#ecf0f1'
            }}
          >
            Sites ({sites.length})
          </button>
          <button
            onClick={() => setSelectedTab('assignments')}
            style={{
              ...webStyles.tab,
              backgroundColor: selectedTab === 'assignments' ? '#3498db' : '#ecf0f1'
            }}
          >
            Assignments ({assignments.length})
          </button>
        </div>

        {selectedTab === 'users' && renderUserManagement()}
        {selectedTab === 'reports' && renderReports()}
        {selectedTab === 'sites' && renderSites()}
        {selectedTab === 'assignments' && renderAssignments()}
      </div>
    </View>
  );


};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
  },
});

// Web-specific styles
const webStyles = {
  adminPanel: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
    backgroundColor: '#ffffff',
    minHeight: '100vh',
  } as React.CSSProperties,
  
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '2px solid #ecf0f1',
    paddingBottom: '20px',
    marginBottom: '30px',
  } as React.CSSProperties,

  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#2c3e50',
    margin: 0,
  } as React.CSSProperties,

  logoutButton: {
    padding: '10px 20px',
    backgroundColor: '#e74c3c',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '14px',
  } as React.CSSProperties,

  tabs: {
    display: 'flex',
    marginBottom: '30px',
    borderBottom: '1px solid #ddd',
  } as React.CSSProperties,

  tab: {
    padding: '12px 24px',
    border: 'none',
    backgroundColor: '#ecf0f1',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '500',
    marginRight: '5px',
    borderRadius: '5px 5px 0 0',
  } as React.CSSProperties,

  content: {
    padding: '20px 0',
  } as React.CSSProperties,

  searchContainer: {
    marginBottom: '20px',
  } as React.CSSProperties,

  searchInput: {
    width: '100%',
    padding: '12px',
    fontSize: '16px',
    border: '1px solid #ddd',
    borderRadius: '5px',
    boxSizing: 'border-box',
  } as React.CSSProperties,

  tableContainer: {
    overflowX: 'auto',
    border: '1px solid #ddd',
    borderRadius: '5px',
  } as React.CSSProperties,

  table: {
    width: '100%',
    borderCollapse: 'collapse',
  } as React.CSSProperties,

  tableHeader: {
    backgroundColor: '#f8f9fa',
  } as React.CSSProperties,

  tableRow: {
    borderBottom: '1px solid #ddd',
  } as React.CSSProperties,

  th: {
    padding: '15px',
    textAlign: 'left',
    fontWeight: '600',
    color: '#2c3e50',
  } as React.CSSProperties,

  td: {
    padding: '15px',
    verticalAlign: 'middle',
  } as React.CSSProperties,

  badge: {
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500',
    color: 'white',
  } as React.CSSProperties,

  actionButtons: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  } as React.CSSProperties,

  button: {
    padding: '6px 12px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
    color: 'white',
  } as React.CSSProperties,

  selectButton: {
    padding: '6px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    backgroundColor: 'white',
  } as React.CSSProperties,

  sectionTitle: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: '20px',
  } as React.CSSProperties,

  placeholder: {
    fontSize: '16px',
    color: '#7f8c8d',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: '40px',
    backgroundColor: '#f8f9fa',
    borderRadius: '5px',
  } as React.CSSProperties,

  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
  } as React.CSSProperties,

  // Reports styles
  reportsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  } as React.CSSProperties,

  reportsControls: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
  } as React.CSSProperties,

  periodSelect: {
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    backgroundColor: 'white',
  } as React.CSSProperties,

  exportButton: {
    padding: '8px 16px',
    backgroundColor: '#27ae60',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  } as React.CSSProperties,

  // Sites styles
  sitesHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  } as React.CSSProperties,

  addButton: {
    padding: '10px 20px',
    backgroundColor: '#27ae60',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
  } as React.CSSProperties,

  siteForm: {
    backgroundColor: '#f8f9fa',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px solid #dee2e6',
  } as React.CSSProperties,

  formTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: '15px',
  } as React.CSSProperties,

  formRow: {
    display: 'flex',
    gap: '12px',
    marginBottom: '12px',
  } as React.CSSProperties,

  formInput: {
    flex: 1,
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
  } as React.CSSProperties,

  formActions: {
    display: 'flex',
    gap: '10px',
    marginTop: '15px',
  } as React.CSSProperties,

  saveButton: {
    padding: '10px 20px',
    backgroundColor: '#3498db',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  } as React.CSSProperties,

  cancelButton: {
    padding: '10px 20px',
    backgroundColor: '#95a5a6',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  } as React.CSSProperties,

  // Стили для карты
  mapToggleButton: {
    padding: '10px 15px',
    backgroundColor: '#3498db',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    whiteSpace: 'nowrap',
  } as React.CSSProperties,

  mapSection: {
    marginTop: '15px',
    padding: '15px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    border: '1px solid #dee2e6',
  } as React.CSSProperties,

  mapHint: {
    fontSize: '14px',
    color: '#495057',
    margin: '0 0 10px 0',
    textAlign: 'center',
    fontStyle: 'italic',
  } as React.CSSProperties,

  mapInstructions: {
    fontSize: '12px',
    color: '#6c757d',
    margin: '0 0 15px 0',
    textAlign: 'center',
    lineHeight: '1.4',
  } as React.CSSProperties,

  mapContainer: {
    height: '400px',
    width: '100%',
    borderRadius: '6px',
    border: '1px solid #ddd',
    marginBottom: '15px',
  } as React.CSSProperties,

  mapControls: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px',
    backgroundColor: 'white',
    borderRadius: '6px',
    border: '1px solid #ddd',
  } as React.CSSProperties,

  coordinatesDisplay: {
    fontSize: '12px',
    color: '#495057',
    margin: 0,
    fontFamily: 'monospace',
  } as React.CSSProperties,

  centerButton: {
    padding: '6px 12px',
    backgroundColor: '#17a2b8',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
  } as React.CSSProperties,
};

export default AdminWebPanel; 