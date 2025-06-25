import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  TextInput,
} from 'react-native';
import { DatabaseService } from '../services/DatabaseService';
import { AuthUser } from '../types';

const UserManagementScreen: React.FC = () => {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<'error' | 'info'>('info');

  const dbService = DatabaseService.getInstance();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setStatusMessage('');
      const allUsers = await dbService.getAllUsers();
      setUsers(allUsers);
    } catch (error) {
      setStatusMessage('Failed to load users');
      setStatusType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'worker' | 'admin') => {
    try {
      await dbService.updateUserRole(userId, newRole);
      setStatusMessage(`User role updated to ${newRole === 'admin' ? 'Foreman' : 'Worker'}`);
      setStatusType('info');
      loadUsers(); // Refresh the list
      setSelectedUserId(null);
    } catch (error) {
      setStatusMessage('Failed to update user role');
      setStatusType('error');
    }
  };

  const handleStatusToggle = async (userId: string, currentStatus: boolean) => {
    try {
      await dbService.updateUserStatus(userId, !currentStatus);
      setStatusMessage(`User ${!currentStatus ? 'activated' : 'deactivated'}`);
      setStatusType('info');
      loadUsers(); // Refresh the list
    } catch (error) {
      setStatusMessage('Failed to update user status');
      setStatusType('error');
    }
  };

  const handleDeleteUser = async (user: AuthUser) => {
    try {
      await dbService.deleteUser(user.id);
      setStatusMessage('User deleted successfully');
      setStatusType('info');
      loadUsers(); // Refresh the list
    } catch (error) {
      setStatusMessage('Failed to delete user');
      setStatusType('error');
    }
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchText.toLowerCase()) ||
    user.phoneNumber.includes(searchText)
  );

  const getRoleText = (role: string) => role === 'admin' ? 'Foreman' : 'Worker';
  const getRoleStyle = (role: string) => role === 'admin' ? styles.foremanBadge : styles.workerBadge;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading users...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>User Management</Text>
        <Text style={styles.subtitle}>Manage roles and permissions</Text>
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

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or phone..."
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      <ScrollView style={styles.scrollView}>
        {filteredUsers.map((user) => (
          <View key={user.id} style={styles.userCard}>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user.name}</Text>
              <Text style={styles.userPhone}>{user.phoneNumber}</Text>
              <View style={styles.badgeContainer}>
                <View style={[styles.roleBadge, getRoleStyle(user.role)]}>
                  <Text style={styles.roleText}>{getRoleText(user.role)}</Text>
                </View>
                <View style={[styles.statusBadge, user.isActive ? styles.activeBadge : styles.inactiveBadge]}>
                  <Text style={styles.statusBadgeText}>{user.isActive ? 'Active' : 'Inactive'}</Text>
                </View>
              </View>
            </View>

            {selectedUserId === user.id ? (
              <View style={styles.roleSelectionContainer}>
                <Text style={styles.roleSelectionTitle}>Select new role for {user.name}:</Text>
                
                <TouchableOpacity
                  style={styles.roleOption}
                  onPress={() => handleRoleChange(user.id, 'worker')}
                >
                  <Text style={styles.roleOptionText}>👷 Worker</Text>
                  <Text style={styles.roleOptionDesc}>Regular employee</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.roleOption}
                  onPress={() => handleRoleChange(user.id, 'admin')}
                >
                  <Text style={styles.roleOptionText}>👨‍💼 Foreman</Text>
                  <Text style={styles.roleOptionDesc}>Site manager with admin access</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setSelectedUserId(null)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.userActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => setSelectedUserId(user.id)}
                >
                  <Text style={styles.actionButtonText}>Change Role</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.statusButton]}
                  onPress={() => handleStatusToggle(user.id, user.isActive)}
                >
                  <Text style={styles.actionButtonText}>
                    {user.isActive ? 'Deactivate' : 'Activate'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => handleDeleteUser(user)}
                >
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
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
  searchContainer: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  userCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userInfo: {
    marginBottom: 12,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  userPhone: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 8,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  foremanBadge: {
    backgroundColor: '#3498db',
  },
  workerBadge: {
    backgroundColor: '#95a5a6',
  },
  roleText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  activeBadge: {
    backgroundColor: '#27ae60',
  },
  inactiveBadge: {
    backgroundColor: '#e74c3c',
  },
  statusBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  roleSelectionContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
  },
  roleSelectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
    textAlign: 'center',
  },
  userActions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  actionButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    flex: 1,
    minWidth: 80,
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
    textAlign: 'center',
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  roleOption: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: 'white',
  },
  roleOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  roleOptionDesc: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  cancelButton: {
    backgroundColor: '#95a5a6',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default UserManagementScreen; 
