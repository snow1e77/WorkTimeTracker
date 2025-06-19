import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { WebAuthProvider, useWebAuth } from '../contexts/WebAuthContext';
import AdminWebPanel from './AdminWebPanel';

const WebLoginForm: React.FC<{ onLogin: (phone: string, password: string) => Promise<void> }> = ({ onLogin }) => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onLogin(phone, password);
    } catch (error) {
      console.error('Login error:', error);
      alert('Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={webStyles.loginContainer}>
      <div style={webStyles.loginForm}>
        <h1 style={webStyles.loginTitle}>WorkTime Admin Login</h1>
        <form onSubmit={handleSubmit}>
          <input
            type="tel"
            placeholder="Phone Number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            style={webStyles.input}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={webStyles.input}
            required
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              ...webStyles.loginButton,
              opacity: loading ? 0.6 : 1,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

const WebAppContent: React.FC = () => {
  const { isAuthenticated, user, login, logout } = useWebAuth();

  const handleLogin = async (phone: string, password: string) => {
    await login(phone, password);
  };

  const handleLogout = () => {
    logout();
  };

  if (!isAuthenticated) {
    return <WebLoginForm onLogin={handleLogin} />;
  }

  // Проверяем, является ли пользователь администратором
  if (user?.role !== 'admin') {
    return (
      <div style={webStyles.accessDenied}>
        <h1>Access Denied</h1>
        <p>You don't have permission to access the admin panel.</p>
        <button onClick={handleLogout} style={webStyles.logoutButton}>
          Logout
        </button>
      </div>
    );
  }

  return <AdminWebPanel onLogout={handleLogout} />;
};

const WebApp: React.FC = () => {
  return (
    <View style={styles.container}>
      <WebAuthProvider>
        <WebAppContent />
      </WebAuthProvider>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
});

const webStyles = {
  loginContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
  } as React.CSSProperties,

  loginForm: {
    backgroundColor: 'white',
    padding: '40px',
    borderRadius: '10px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    width: '100%',
    maxWidth: '400px',
  } as React.CSSProperties,

  loginTitle: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: '30px',
    textAlign: 'center',
  } as React.CSSProperties,

  input: {
    width: '100%',
    padding: '12px',
    fontSize: '16px',
    border: '1px solid #ddd',
    borderRadius: '5px',
    marginBottom: '15px',
    boxSizing: 'border-box',
  } as React.CSSProperties,

  loginButton: {
    width: '100%',
    padding: '12px',
    fontSize: '16px',
    fontWeight: '600',
    color: 'white',
    backgroundColor: '#3498db',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
  } as React.CSSProperties,

  accessDenied: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    textAlign: 'center',
  } as React.CSSProperties,

  logoutButton: {
    padding: '10px 20px',
    fontSize: '14px',
    color: 'white',
    backgroundColor: '#e74c3c',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    marginTop: '20px',
  } as React.CSSProperties,
};

export default WebApp; 