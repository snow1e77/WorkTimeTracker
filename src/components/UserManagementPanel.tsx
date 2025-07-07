import React, { useState, useEffect } from 'react';
import { View, Text, Platform } from 'react-native';
import { AuthUser } from '../types';
import logger from '../utils/logger';

interface User {
  id: string;
  phoneNumber: string;
  name: string;
  role: 'worker' | 'foreman' | 'admin' | 'superadmin';
  companyId?: string;
  isVerified: boolean;
  isActive: boolean;
  foremanId?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface UserManagementPanelProps {
  currentUser?: AuthUser;
}

const UserManagementPanel: React.FC<UserManagementPanelProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUserData, setNewUserData] = useState({
    phoneNumber: '',
    name: '',
    role: 'worker' as 'worker' | 'foreman' | 'admin',
    foremanPhone: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'worker' | 'foreman' | 'admin' | 'superadmin'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    loadUsers();
  }, [filterRole, filterStatus]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      if (filterRole !== 'all') params.set('role', filterRole);
      if (filterStatus === 'active') params.set('isActive', 'true');
      if (filterStatus === 'inactive') params.set('isActive', 'false');
      if (searchTerm) params.set('search', searchTerm);

      const response = await fetch(`/api/users/all?${params}`, {
        headers: {
          'Authorization': `Bearer ${await getAuthToken()}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data.data?.users || []);
      } else {
        logger.error('Failed to load users', {}, 'admin');
      }
    } catch (error) {
              logger.error('Error loading users', { error: error instanceof Error ? error.message : 'Unknown error' }, 'admin');
    } finally {
      setLoading(false);
    }
  };

  const getAuthToken = async (): Promise<string> => {
    return localStorage.getItem('authToken') || '';
  };

  const handleAddUser = async () => {
    if (!newUserData.phoneNumber.trim()) {
      setError('Enter phone number');
      return;
    }

    if (!newUserData.name.trim()) {
      setError('Enter user name');
      return;
    }

    // Phone number validation
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(newUserData.phoneNumber)) {
      setError('Phone number must be in international format (+79001234567)');
      return;
    }

    // Foreman phone validation for workers
    if (newUserData.role === 'worker') {
      if (!newUserData.foremanPhone.trim()) {
        setError('Enter foreman phone number for worker');
        return;
      }
      if (!phoneRegex.test(newUserData.foremanPhone)) {
        setError('Foreman phone number must be in international format');
        return;
      }
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/users/register-user', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await getAuthToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUserData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        await loadUsers();
        setNewUserData({ phoneNumber: '', name: '', role: 'worker', foremanPhone: '' });
        setShowAddForm(false);
        alert('User successfully registered');
      } else {
        setError(data.error || 'Error adding user');
      }
    } catch (error) {
      setError('Server connection error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${await getAuthToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (response.ok) {
        await loadUsers();
        alert(`User ${!currentStatus ? 'activated' : 'deactivated'}`);
      } else {
        alert('Error changing user status');
      }
    } catch (error) {
      alert('Server connection error');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${await getAuthToken()}`,
        },
      });

      if (response.ok) {
        await loadUsers();
        alert('User deleted');
      } else {
        alert('Error deleting user');
      }
    } catch (error) {
      alert('Server connection error');
    }
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const formatPhoneNumber = (phone: string): string => {
    // Format phone number for better display
    if (phone.startsWith('+7')) {
      return phone.replace(/^(\+7)(\d{3})(\d{3})(\d{2})(\d{2})$/, '$1 $2 $3-$4-$5');
    }
    return phone;
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.phoneNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && user.isActive) ||
                         (filterStatus === 'inactive' && !user.isActive);
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  if (Platform.OS !== 'web') {
    return null; // This component is for web only
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>User Management</h2>
        <p style={styles.subtitle}>
          Registration and management of system users. Users can immediately log into the application.
        </p>
      </div>

      <div style={styles.controls}>
        <div style={styles.searchRow}>
          <input
            type="text"
            placeholder="Search by phone number or name"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
          
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value as any)}
            style={styles.filterSelect}
          >
            <option value="all">All roles</option>
            <option value="worker">Workers</option>
            <option value="foreman">Foremen</option>
            <option value="admin">Administrators</option>
            <option value="superadmin">Super admins</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            style={styles.filterSelect}
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          style={styles.addButton}
        >
          {showAddForm ? 'Cancel' : 'Add User'}
        </button>
      </div>

      {showAddForm && (
        <div style={styles.addForm}>
          <h3 style={styles.formTitle}>New User Registration</h3>
          <p style={styles.formSubtitle}>
            User will be immediately registered and able to log into the application
          </p>
          
          {error && <div style={styles.error}>{error}</div>}
          
          <div style={styles.formField}>
            <label style={styles.label}>Phone number:</label>
            <input
              type="tel"
              placeholder="+79001234567"
              value={newUserData.phoneNumber}
              onChange={(e) => setNewUserData(prev => ({ ...prev, phoneNumber: e.target.value }))}
              style={styles.input}
            />
          </div>

          <div style={styles.formField}>
            <label style={styles.label}>Name:</label>
            <input
              type="text"
              placeholder="John Doe"
              value={newUserData.name}
              onChange={(e) => setNewUserData(prev => ({ ...prev, name: e.target.value }))}
              style={styles.input}
            />
          </div>

          <div style={styles.formField}>
            <label style={styles.label}>Role:</label>
            <select
              value={newUserData.role}
              onChange={(e) => setNewUserData(prev => ({ ...prev, role: e.target.value as 'worker' | 'foreman' | 'admin', foremanPhone: e.target.value !== 'worker' ? '' : prev.foremanPhone }))}
              style={styles.select}
            >
              <option value="worker">Worker</option>
              <option value="foreman">Foreman</option>
              <option value="admin">Administrator</option>
            </select>
          </div>

          {newUserData.role === 'worker' && (
            <div style={styles.formField}>
              <label style={styles.label}>Foreman phone number:</label>
              <input
                type="tel"
                placeholder="+79001234567"
                value={newUserData.foremanPhone}
                onChange={(e) => setNewUserData(prev => ({ ...prev, foremanPhone: e.target.value }))}
                style={styles.input}
              />
            </div>
          )}

          <div style={styles.formActions}>
            <button
              onClick={handleAddUser}
              disabled={submitting}
              style={styles.submitButton}
            >
              {submitting ? 'Registering...' : 'Register User'}
            </button>
          </div>
        </div>
      )}

      <div style={styles.tableContainer}>
        {loading ? (
          <div style={styles.loading}>Loading users...</div>
        ) : filteredUsers.length === 0 ? (
          <div style={styles.emptyState}>
            {searchTerm ? 'No users found' : 'No registered users'}
          </div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeader}>
                <th style={styles.tableHeaderCell}>Phone Number</th>
                <th style={styles.tableHeaderCell}>Name</th>
                <th style={styles.tableHeaderCell}>Role</th>
                <th style={styles.tableHeaderCell}>Status</th>
                <th style={styles.tableHeaderCell}>Registration Date</th>
                <th style={styles.tableHeaderCell}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => (
                <tr key={user.id} style={styles.tableRow}>
                  <td style={styles.tableCell}>
                    {formatPhoneNumber(user.phoneNumber)}
                  </td>
                  <td style={styles.tableCell}>{user.name}</td>
                  <td style={styles.tableCell}>
                    <span style={
                      user.role === 'superadmin' ? styles.superadminBadge :
                      user.role === 'admin' ? styles.adminBadge :
                      user.role === 'foreman' ? styles.foremanBadge :
                      styles.workerBadge
                    }>
                      {user.role === 'superadmin' ? 'Super Admin' :
                       user.role === 'admin' ? 'Administrator' :
                       user.role === 'foreman' ? 'Foreman' :
                       'Worker'}
                    </span>
                  </td>
                  <td style={styles.tableCell}>
                    <span style={user.isActive ? styles.activeBadge : styles.inactiveBadge}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={styles.tableCell}>
                    {formatDate(new Date(user.createdAt))}
                  </td>
                  <td style={styles.tableCell}>
                    <div style={styles.actions}>
                      <button
                        onClick={() => handleToggleUserStatus(user.id, user.isActive)}
                        style={user.isActive ? styles.deactivateButton : styles.activateButton}
                        title={user.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {user.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        style={styles.deleteButton}
                        title="Delete user"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={styles.info}>
        <h3>ℹ️ Информация</h3>
        <ul>
          <li>Пользователи создаются сразу в основной таблице и могут входить в приложение</li>
                                    <li>Пользователи входят только по номеру телефона</li>
          <li>Предварительная регистрация больше не используется</li>
        </ul>
      </div>
    </div>
  );
};

// Для веб-платформы используем обычные CSS стили
const styles = Platform.OS === 'web' ? {
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#f5f5f5',
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  controls: {
    marginBottom: 20,
  },
  searchRow: {
    display: 'flex' as const,
    gap: 12,
    marginBottom: 12,
    alignItems: 'center' as const,
  },
  searchInput: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    border: '1px solid #ddd',
    fontSize: 16,
  },
  filterSelect: {
    padding: 12,
    borderRadius: 8,
    border: '1px solid #ddd',
    fontSize: 16,
    minWidth: 150,
  },
  addButton: {
    padding: '12px 24px',
    borderRadius: 8,
    border: 'none',
    backgroundColor: '#007AFF',
    color: 'white',
    fontSize: 16,
    fontWeight: '500' as const,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  addForm: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 12,
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    marginBottom: 8,
    color: '#333',
  },
  formSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  error: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#FFF3F3',
    border: '1px solid #FFB3B3',
    color: '#D8000C',
    marginBottom: 16,
  },
  formField: {
    marginBottom: 16,
  },
  label: {
    display: 'block',
    marginBottom: 6,
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#333',
  },
  input: {
    width: '100%',
    padding: 12,
    borderRadius: 8,
    border: '1px solid #ddd',
    fontSize: 16,
    boxSizing: 'border-box' as const,
  },
  select: {
    width: '100%',
    padding: 12,
    borderRadius: 8,
    border: '1px solid #ddd',
    fontSize: 16,
    boxSizing: 'border-box' as const,
  },
  formActions: {
    display: 'flex' as const,
    justifyContent: 'flex-end' as const,
    gap: 12,
    marginTop: 20,
  },
  submitButton: {
    padding: '12px 24px',
    borderRadius: 8,
    border: 'none',
    backgroundColor: '#34C759',
    color: 'white',
    fontSize: 16,
    fontWeight: '500' as const,
    cursor: 'pointer',
  },
  tableContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    marginBottom: 20,
  },
  loading: {
    padding: 40,
    textAlign: 'center' as const,
    color: '#666',
    fontSize: 16,
  },
  emptyState: {
    padding: 40,
    textAlign: 'center' as const,
    color: '#666',
    fontSize: 16,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
  },
  tableHeader: {
    backgroundColor: '#f8f9fa',
  },
  tableHeaderCell: {
    padding: 16,
    textAlign: 'left' as const,
    fontWeight: '600' as const,
    color: '#333',
    borderBottom: '1px solid #eee',
  },
  tableRow: {
    borderBottom: '1px solid #eee',
  },
  tableCell: {
    padding: 16,
    color: '#333',
  },
  superadminBadge: {
    padding: '4px 8px',
    borderRadius: 4,
    backgroundColor: '#8E44AD',
    color: 'white',
    fontSize: 12,
    fontWeight: '500' as const,
  },
  adminBadge: {
    padding: '4px 8px',
    borderRadius: 4,
    backgroundColor: '#FF9500',
    color: 'white',
    fontSize: 12,
    fontWeight: '500' as const,
  },
  foremanBadge: {
    padding: '4px 8px',
    borderRadius: 4,
    backgroundColor: '#2ECC71',
    color: 'white',
    fontSize: 12,
    fontWeight: '500' as const,
  },
  workerBadge: {
    padding: '4px 8px',
    borderRadius: 4,
    backgroundColor: '#007AFF',
    color: 'white',
    fontSize: 12,
    fontWeight: '500' as const,
  },
  activeBadge: {
    padding: '4px 8px',
    borderRadius: 4,
    backgroundColor: '#34C759',
    color: 'white',
    fontSize: 12,
    fontWeight: '500' as const,
  },
  inactiveBadge: {
    padding: '4px 8px',
    borderRadius: 4,
    backgroundColor: '#FF3B30',
    color: 'white',
    fontSize: 12,
    fontWeight: '500' as const,
  },
  actions: {
    display: 'flex' as const,
    gap: 8,
  },
  activateButton: {
    padding: '6px 12px',
    borderRadius: 6,
    border: 'none',
    backgroundColor: '#34C759',
    color: 'white',
    fontSize: 12,
    cursor: 'pointer',
  },
  deactivateButton: {
    padding: '6px 12px',
    borderRadius: 6,
    border: 'none',
    backgroundColor: '#FF9500',
    color: 'white',
    fontSize: 12,
    cursor: 'pointer',
  },
  deleteButton: {
    padding: '6px 12px',
    borderRadius: 6,
    border: 'none',
    backgroundColor: '#FF3B30',
    color: 'white',
    fontSize: 12,
    cursor: 'pointer',
  },
  info: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
  },
} : {} as any; // Для React Native возвращаем пустой объект

export default UserManagementPanel; 