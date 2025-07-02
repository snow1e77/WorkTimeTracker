import React, { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { AuthUser } from '../types';

interface User {
  id: string;
  phoneNumber: string;
  name: string;
  role: 'worker' | 'admin';
  companyId?: string;
  isVerified: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface UserManagementProps {
  currentUser?: AuthUser;
}

const UserManagement: React.FC<UserManagementProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<User[]>([]);
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

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
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
        console.error('Failed to load users');
      }
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAuthToken = async (): Promise<string> => {
    return localStorage.getItem('authToken') || '';
  };

  const handleAddUser = async () => {
    if (!newUserData.phoneNumber.trim()) {
      setError('Введите номер телефона');
      return;
    }

    if (!newUserData.name.trim()) {
      setError('Введите имя пользователя');
      return;
    }

    // Phone number validation
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(newUserData.phoneNumber)) {
      setError('Номер телефона должен быть в международном формате (+79001234567)');
      return;
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
        setNewUserData({ phoneNumber: '', name: '', role: 'worker' });
        setShowAddForm(false);
        alert('Пользователь успешно зарегистрирован и может входить в приложение');
      } else {
        setError(data.error || 'Ошибка добавления пользователя');
      }
    } catch (error) {
      setError('Ошибка соединения с сервером');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const formatPhoneNumber = (phone: string): string => {
    if (phone.startsWith('+7')) {
      return phone.replace(/^(\+7)(\d{3})(\d{3})(\d{2})(\d{2})$/, '$1 $2 $3-$4-$5');
    }
    return phone;
  };

  const filteredUsers = users.filter(user =>
    user.phoneNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (Platform.OS !== 'web') {
    return null;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Управление пользователями</h2>
        <p style={styles.subtitle}>
          Регистрация пользователей в системе. Пользователи могут сразу входить в приложение.
        </p>
      </div>

      <div style={styles.controls}>
        <input
          type="text"
          placeholder="Поиск по номеру телефона или имени"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />
        
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          style={styles.addButton}
        >
          {showAddForm ? 'Отмена' : 'Добавить пользователя'}
        </button>
      </div>

      {showAddForm && (
        <div style={styles.addForm}>
          <h3 style={styles.formTitle}>Регистрация нового пользователя</h3>
          <p style={styles.formNote}>
            💡 Пользователь будет сразу зарегистрирован и сможет входить в приложение по номеру телефона
          </p>
          
          {error && <div style={styles.error}>{error}</div>}
          
          <div style={styles.formField}>
            <label style={styles.label}>Номер телефона:</label>
            <input
              type="tel"
              placeholder="+79001234567"
              value={newUserData.phoneNumber}
              onChange={(e) => setNewUserData(prev => ({ ...prev, phoneNumber: e.target.value }))}
              style={styles.input}
            />
          </div>

          <div style={styles.formField}>
            <label style={styles.label}>Имя:</label>
            <input
              type="text"
              placeholder="Иван Иванов"
              value={newUserData.name}
              onChange={(e) => setNewUserData(prev => ({ ...prev, name: e.target.value }))}
              style={styles.input}
            />
          </div>

          <div style={styles.formField}>
            <label style={styles.label}>Роль:</label>
            <select
              value={newUserData.role}
              onChange={(e) => setNewUserData(prev => ({ ...prev, role: e.target.value as 'worker' | 'admin' }))}
              style={styles.select}
            >
              <option value="worker">Рабочий</option>
              <option value="admin">Администратор</option>
            </select>
          </div>

          <div style={styles.formActions}>
            <button
              onClick={handleAddUser}
              disabled={submitting}
              style={styles.submitButton}
            >
              {submitting ? 'Регистрация...' : 'Зарегистрировать'}
            </button>
          </div>
        </div>
      )}

      <div style={styles.tableContainer}>
        {loading ? (
          <div style={styles.loading}>Загрузка пользователей...</div>
        ) : filteredUsers.length === 0 ? (
          <div style={styles.emptyState}>
            {searchTerm ? 'Пользователи не найдены' : 'Нет зарегистрированных пользователей'}
          </div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeader}>
                <th style={styles.tableHeaderCell}>Номер телефона</th>
                <th style={styles.tableHeaderCell}>Имя</th>
                <th style={styles.tableHeaderCell}>Роль</th>
                <th style={styles.tableHeaderCell}>Статус</th>
                <th style={styles.tableHeaderCell}>Дата регистрации</th>
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
                    <span style={user.role === 'admin' ? styles.adminBadge : styles.workerBadge}>
                      {user.role === 'admin' ? 'Администратор' : 'Рабочий'}
                    </span>
                  </td>
                  <td style={styles.tableCell}>
                    <span style={user.isActive ? styles.activeBadge : styles.inactiveBadge}>
                      {user.isActive ? 'Активен' : 'Неактивен'}
                    </span>
                  </td>
                  <td style={styles.tableCell}>
                    {formatDate(new Date(user.createdAt))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={styles.info}>
        <h3>ℹ️ Как это работает</h3>
        <ul>
          <li>✅ Пользователи создаются сразу в основной таблице</li>
          <li>📱 Могут сразу входить в мобильное приложение</li>
          <li>🔓 Вход только по номеру телефона</li>
          <li>⚡ Предварительная регистрация больше не нужна</li>
        </ul>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: '1.5',
  },
  controls: {
    display: 'flex',
    gap: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    border: '1px solid #ddd',
    fontSize: 16,
  },
  addButton: {
    padding: '12px 24px',
    borderRadius: 8,
    border: 'none',
    backgroundColor: '#007AFF',
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    cursor: 'pointer',
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
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  formNote: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 20,
    fontStyle: 'italic',
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
    fontWeight: '500',
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
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: 20,
  },
  submitButton: {
    padding: '12px 24px',
    borderRadius: 8,
    border: 'none',
    backgroundColor: '#34C759',
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
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
    fontWeight: '600',
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
  adminBadge: {
    padding: '4px 8px',
    borderRadius: 4,
    backgroundColor: '#FF9500',
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  workerBadge: {
    padding: '4px 8px',
    borderRadius: 4,
    backgroundColor: '#007AFF',
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  activeBadge: {
    padding: '4px 8px',
    borderRadius: 4,
    backgroundColor: '#34C759',
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  inactiveBadge: {
    padding: '4px 8px',
    borderRadius: 4,
    backgroundColor: '#FF3B30',
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  info: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
  },
};

export default UserManagement; 