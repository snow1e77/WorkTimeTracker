import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { WebDatabaseService } from '../services/WebDatabaseService';
import { AuthUser } from '../types';

interface PreRegisteredUser {
  id: string;
  phoneNumber: string;
  name?: string;
  role: 'worker' | 'admin';
  companyId?: string;
  addedBy: string;
  isActivated: boolean;
  activatedAt?: Date;
  appDownloadSent: boolean;
  appDownloadSentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface PreRegistrationPanelProps {
  currentUser?: AuthUser;
}

const PreRegistrationPanel: React.FC<PreRegistrationPanelProps> = ({ currentUser }) => {
  const [preRegisteredUsers, setPreRegisteredUsers] = useState<PreRegisteredUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUserData, setNewUserData] = useState({
    phoneNumber: '',
    name: '',
    role: 'worker' as 'worker' | 'admin'
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const dbService = WebDatabaseService.getInstance();

  useEffect(() => {
    loadPreRegisteredUsers();
  }, []);

  const loadPreRegisteredUsers = async () => {
    try {
      setLoading(true);
      // Пока используем заглушку, потом добавим API вызов
      const response = await fetch('/api/users/pre-registered', {
        headers: {
          'Authorization': `Bearer ${await getAuthToken()}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setPreRegisteredUsers(data.data?.users || []);
      }
    } catch (error) {
      } finally {
      setLoading(false);
    }
  };

  const getAuthToken = async (): Promise<string> => {
    // Stub for getting auth token
    return localStorage.getItem('authToken') || '';
  };

  const handleAddUser = async () => {
    if (!newUserData.phoneNumber.trim()) {
      setError('Please enter phone number');
      return;
    }

    // Phone number validation
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(newUserData.phoneNumber)) {
      setError('Phone number must be in international format (+1234567890)');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/users/pre-register', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await getAuthToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUserData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        await loadPreRegisteredUsers();
        setNewUserData({ phoneNumber: '', name: '', role: 'worker' });
        setShowAddForm(false);
        alert('User added successfully. SMS with download link has been sent.');
      } else {
        setError(data.error || 'Error adding user');
      }
    } catch (error) {
      setError('Server connection error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveUser = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      const response = await fetch(`/api/users/pre-registered/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${await getAuthToken()}`,
        },
      });

      if (response.ok) {
        await loadPreRegisteredUsers();
        alert('User deleted');
      } else {
        alert('Error deleting user');
      }
    } catch (error) {
      alert('Server connection error');
    }
  };

  const handleResendAppLink = async (phoneNumber: string) => {
    try {
      const response = await fetch('/api/users/resend-app-link', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await getAuthToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber }),
      });

      if (response.ok) {
        alert('Download link sent again');
      } else {
        alert('Error sending link');
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

  const filteredUsers = preRegisteredUsers.filter(user =>
    user.phoneNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.name && user.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (Platform.OS !== 'web') {
    return null; // This component is for web only
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Pre-Registration Management</h2>
        <p style={styles.subtitle}>
          Add users to the system before they attempt to log into the application
        </p>
      </div>

      <div style={styles.controls}>
        <input
          type="text"
          placeholder="Search by phone number or name"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />
        
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          style={styles.addButton}
        >
          {showAddForm ? 'Cancel' : 'Add User'}
        </button>
      </div>

      {showAddForm && (
        <div style={styles.addForm}>
          <h3>Add New User</h3>
          
          {error && (
            <div style={styles.error}>{error}</div>
          )}

          <div style={styles.formRow}>
            <input
              type="tel"
              placeholder="Phone number (+79123456789)"
              value={newUserData.phoneNumber}
              onChange={(e) => setNewUserData({ ...newUserData, phoneNumber: e.target.value })}
              style={styles.input}
            />
          </div>

          <div style={styles.formRow}>
            <input
              type="text"
              placeholder="Name (optional)"
              value={newUserData.name}
              onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
              style={styles.input}
            />
          </div>

          <div style={styles.formRow}>
            <select
              value={newUserData.role}
              onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value as 'worker' | 'admin' })}
              style={styles.select}
            >
              <option value="worker">Worker</option>
              <option value="admin">Administrator</option>
            </select>
          </div>

          <div style={styles.formActions}>
            <button
              onClick={handleAddUser}
              disabled={submitting}
              style={styles.submitButton}
            >
              {submitting ? 'Adding...' : 'Add'}
            </button>
          </div>
        </div>
      )}

      <div style={styles.usersList}>
        {loading ? (
          <div style={styles.loading}>Loading...</div>
        ) : filteredUsers.length === 0 ? (
          <div style={styles.empty}>
            {searchTerm ? 'No users found' : 'No pre-registered users'}
          </div>
        ) : (
          <div style={styles.usersGrid}>
            {filteredUsers.map((user) => (
              <div key={user.id} style={styles.userCard}>
                <div style={styles.userHeader}>
                  <div style={styles.userInfo}>
                    <h4 style={styles.userName}>
                      {user.name || 'Name not specified'}
                    </h4>
                    <div style={styles.userPhone}>{user.phoneNumber}</div>
                    <div style={styles.userRole}>
                      {user.role === 'admin' ? 'Administrator' : 'Worker'}
                    </div>
                  </div>
                  
                  <div style={styles.userStatus}>
                    <span 
                      style={{
                        ...styles.statusBadge,
                        backgroundColor: user.isActivated ? '#4CAF50' : '#FF9800'
                      }}
                    >
                      {user.isActivated ? 'Activated' : 'Awaiting activation'}
                    </span>
                  </div>
                </div>

                <div style={styles.userDetails}>
                  <div><strong>Added:</strong> {formatDate(user.createdAt)}</div>
                  {user.activatedAt && (
                    <div><strong>Activated:</strong> {formatDate(user.activatedAt)}</div>
                  )}
                  <div>
                    <strong>SMS sent:</strong> {user.appDownloadSent ? 'Yes' : 'No'}
                    {user.appDownloadSentAt && ` (${formatDate(user.appDownloadSentAt)})`}
                  </div>
                </div>

                <div style={styles.userActions}>
                  <button
                    onClick={() => handleResendAppLink(user.phoneNumber)}
                    style={styles.actionButton}
                  >
                    Resend Link
                  </button>
                  
                  <button
                    onClick={() => handleRemoveUser(user.id)}
                    style={styles.deleteButton}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f5f5f5',
    minHeight: '100vh',
  } as any,
  header: {
    marginBottom: 30,
  } as any,
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  } as any,
  subtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 1.5,
  } as any,
  controls: {
    display: 'flex',
    gap: 15,
    marginBottom: 30,
    alignItems: 'center',
  } as any,
  searchInput: {
    flex: 1,
    padding: 12,
    border: '1px solid #ddd',
    borderRadius: 8,
    fontSize: 16,
  } as any,
  addButton: {
    padding: '12px 24px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: 8,
    fontSize: 16,
    cursor: 'pointer',
  } as any,
  addForm: {
    backgroundColor: 'white',
    padding: 30,
    borderRadius: 12,
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    marginBottom: 30,
  } as any,
  error: {
    backgroundColor: '#ffebee',
    color: '#c62828',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  } as any,
  formRow: {
    marginBottom: 20,
  } as any,
  input: {
    width: '100%',
    padding: 12,
    border: '1px solid #ddd',
    borderRadius: 8,
    fontSize: 16,
  } as any,
  select: {
    width: '100%',
    padding: 12,
    border: '1px solid #ddd',
    borderRadius: 8,
    fontSize: 16,
    backgroundColor: 'white',
  } as any,
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
  } as any,
  submitButton: {
    padding: '12px 24px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: 8,
    fontSize: 16,
    cursor: 'pointer',
  } as any,
  usersList: {
    backgroundColor: 'white',
    borderRadius: 12,
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    overflow: 'hidden',
  } as any,
  loading: {
    padding: 40,
    textAlign: 'center',
    color: '#666',
  } as any,
  empty: {
    padding: 40,
    textAlign: 'center',
    color: '#666',
  } as any,
  usersGrid: {
    display: 'grid',
    gap: 20,
    padding: 20,
  } as any,
  userCard: {
    border: '1px solid #eee',
    borderRadius: 8,
    padding: 20,
    backgroundColor: '#fafafa',
  } as any,
  userHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  } as any,
  userInfo: {
    flex: 1,
  } as any,
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  } as any,
  userPhone: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  } as any,
  userRole: {
    fontSize: 14,
    color: '#888',
  } as any,
  userStatus: {
    marginLeft: 15,
  } as any,
  statusBadge: {
    padding: '4px 12px',
    borderRadius: 20,
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  } as any,
  userDetails: {
    fontSize: 14,
    color: '#666',
    lineHeight: 1.6,
    marginBottom: 15,
  } as any,
  userActions: {
    display: 'flex',
    gap: 10,
  } as any,
  actionButton: {
    padding: '8px 16px',
    backgroundColor: '#17a2b8',
    color: 'white',
    border: 'none',
    borderRadius: 6,
    fontSize: 14,
    cursor: 'pointer',
  } as any,
  deleteButton: {
    padding: '8px 16px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: 6,
    fontSize: 14,
    cursor: 'pointer',
  } as any,
});

export default PreRegistrationPanel; 
