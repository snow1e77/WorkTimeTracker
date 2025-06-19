import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { 
  Card, 
  Title, 
  List, 
  Switch, 
  Button,
  Text,
  TextInput,
  Chip,
  Dialog,
  Portal
} from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';
import { formatInternationalPhoneNumber } from '../utils/phoneUtils';
import { formatDateUS } from '../utils/dateUtils';

export default function SettingsScreen() {
  const { user, logout } = useAuth();

  // GPS Settings
  const [gpsEnabled, setGpsEnabled] = useState(true);
  const [backgroundTracking, setBackgroundTracking] = useState(true);
  const [highAccuracy, setHighAccuracy] = useState(true);
  const [updateInterval, setUpdateInterval] = useState('5');

  // Notification Settings
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [violationAlerts, setViolationAlerts] = useState(true);
  const [shiftReminders, setShiftReminders] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Privacy Settings
  const [privacyMode, setPrivacyMode] = useState(false);
  const [privacyStartTime, setPrivacyStartTime] = useState('18:00');
  const [privacyEndTime, setPrivacyEndTime] = useState('08:00');

  // Dialogs
  const [showTimeDialog, setShowTimeDialog] = useState(false);
  const [editingTime, setEditingTime] = useState<'start' | 'end' | null>(null);
  const [tempTime, setTempTime] = useState('');

  const handleGpsToggle = (value: boolean) => {
    setGpsEnabled(value);
    if (!value) {
      Alert.alert(
        'GPS Disabled',
        'Automatic time tracking will be unavailable',
        [{ text: 'OK' }]
      );
    }
  };

  const handlePrivacyToggle = (value: boolean) => {
    setPrivacyMode(value);
    if (value) {
      Alert.alert(
        'Privacy Mode',
        'GPS tracking will be disabled during specified hours',
        [{ text: 'OK' }]
      );
    }
  };

  const handleTimeEdit = (type: 'start' | 'end') => {
    setEditingTime(type);
    setTempTime(type === 'start' ? privacyStartTime : privacyEndTime);
    setShowTimeDialog(true);
  };

  const handleTimeSave = () => {
    if (editingTime === 'start') {
      setPrivacyStartTime(tempTime);
    } else if (editingTime === 'end') {
      setPrivacyEndTime(tempTime);
    }
    setShowTimeDialog(false);
    setEditingTime(null);
  };

  const resetSettings = () => {
    Alert.alert(
      'Reset Settings',
      'Restore default settings?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset', 
          style: 'destructive',
          onPress: () => {
            setGpsEnabled(true);
            setBackgroundTracking(true);
            setHighAccuracy(true);
            setUpdateInterval('5');
            setNotificationsEnabled(true);
            setViolationAlerts(true);
            setShiftReminders(true);
            setSoundEnabled(true);
            setPrivacyMode(false);
            setPrivacyStartTime('18:00');
            setPrivacyEndTime('08:00');
            Alert.alert('Done', 'Settings reset');
          }
        }
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of your account?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              Alert.alert('Error', 'Unable to sign out');
            }
          }
        }
      ]
    );
  };



  return (
    <ScrollView style={styles.container}>
      {/* User Profile */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>User Profile</Title>
          
          <List.Item
            title={user?.name || 'User'}
            description={user?.phoneNumber ? formatInternationalPhoneNumber(user.phoneNumber) : 'No phone number'}
            left={() => <List.Icon icon="account" />}
          />

          <List.Item
            title="Role"
            description={user?.role === 'admin' ? 'Administrator' : 'Employee'}
            left={() => <List.Icon icon="badge-account" />}
          />

          <List.Item
            title="Registration Date"
            description={user?.createdAt ? formatDateUS(new Date(user.createdAt)) : 'Not specified'}
            left={() => <List.Icon icon="calendar" />}
          />
        </Card.Content>
      </Card>

      {/* GPS and Location */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>GPS and Location</Title>
          
          <List.Item
            title="GPS tracking"
            description="Automatic location detection"
            left={() => <List.Icon icon="crosshairs-gps" />}
            right={() => (
              <Switch
                value={gpsEnabled}
                onValueChange={handleGpsToggle}
              />
            )}
          />

          <List.Item
            title="Background tracking"
            description="GPS works when app is minimized"
            left={() => <List.Icon icon="crosshairs-gps" />}
            right={() => (
              <Switch
                value={backgroundTracking}
                onValueChange={setBackgroundTracking}
                disabled={!gpsEnabled}
              />
            )}
          />

          <List.Item
            title="High accuracy"
            description="Enhanced location precision"
            left={() => <List.Icon icon="crosshairs" />}
            right={() => (
              <Switch
                value={highAccuracy}
                onValueChange={setHighAccuracy}
                disabled={!gpsEnabled}
              />
            )}
          />

          <List.Item
            title="Update interval"
            description={`${updateInterval} seconds`}
            left={() => <List.Icon icon="timer" />}
            right={() => (
              <View style={styles.inputContainer}>
                <TextInput
                  value={updateInterval}
                  onChangeText={setUpdateInterval}
                  keyboardType="numeric"
                  style={styles.intervalInput}
                  disabled={!gpsEnabled}
                />
                <Text>sec</Text>
              </View>
            )}
          />
        </Card.Content>
      </Card>

      {/* Notifications */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>Notifications</Title>
          
          <List.Item
            title="Enable notifications"
            description="Receive push notifications"
            left={() => <List.Icon icon="bell" />}
            right={() => (
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
              />
            )}
          />

          <List.Item
            title="Violation alerts"
            description="Alerts when leaving the site"
            left={() => <List.Icon icon="alert" />}
            right={() => (
              <Switch
                value={violationAlerts}
                onValueChange={setViolationAlerts}
                disabled={!notificationsEnabled}
              />
            )}
          />

          <List.Item
            title="Shift reminders"
            description="Notifications about start/end of work"
            left={() => <List.Icon icon="clock-alert" />}
            right={() => (
              <Switch
                value={shiftReminders}
                onValueChange={setShiftReminders}
                disabled={!notificationsEnabled}
              />
            )}
          />

          <List.Item
            title="Sound notifications"
            description="Play sound for notifications"
            left={() => <List.Icon icon="volume-high" />}
            right={() => (
              <Switch
                value={soundEnabled}
                onValueChange={setSoundEnabled}
                disabled={!notificationsEnabled}
              />
            )}
          />
        </Card.Content>
      </Card>

      {/* Privacy */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>Privacy</Title>
          
          <List.Item
            title="Privacy mode"
            description="Disable tracking during non-working hours"
            left={() => <List.Icon icon="shield-account" />}
            right={() => (
              <Switch
                value={privacyMode}
                onValueChange={handlePrivacyToggle}
              />
            )}
          />

          {privacyMode && (
            <>
              <List.Item
                title="Start of privacy time"
                description={`Disable from ${privacyStartTime}`}
                left={() => <List.Icon icon="clock-start" />}
                onPress={() => handleTimeEdit('start')}
                right={() => (
                  <Chip icon="pencil" mode="outlined">
                    {privacyStartTime}
                  </Chip>
                )}
              />

              <List.Item
                title="End of privacy time"
                description={`Enable from ${privacyEndTime}`}
                left={() => <List.Icon icon="clock-end" />}
                onPress={() => handleTimeEdit('end')}
                right={() => (
                  <Chip icon="pencil" mode="outlined">
                    {privacyEndTime}
                  </Chip>
                )}
              />
            </>
          )}
        </Card.Content>
      </Card>

      {/* Actions */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>Actions</Title>
          
          <Button
            mode="outlined"
            onPress={resetSettings}
            style={styles.actionButton}
            icon="restore"
          >
            Reset Settings
          </Button>

          <Button
            mode="contained"
            onPress={() => Alert.alert('Saved', 'Settings saved')}
            style={styles.actionButton}
            icon="content-save"
          >
            Save Settings
          </Button>

          <Button
            mode="contained"
            onPress={handleLogout}
            style={[styles.actionButton, styles.logoutButton]}
            icon="logout"
            buttonColor="#f44336"
            textColor="#ffffff"
          >
            Sign Out
          </Button>
        </Card.Content>
      </Card>

      {/* Time Edit Dialog */}
      <Portal>
        <Dialog visible={showTimeDialog} onDismiss={() => setShowTimeDialog(false)}>
          <Dialog.Title>
            {editingTime === 'start' ? 'Start Time' : 'End Time'}
          </Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Time (HH:MM)"
              value={tempTime}
              onChangeText={setTempTime}
              placeholder="End Time"
              style={styles.timeInput}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowTimeDialog(false)}>Cancel</Button>
            <Button onPress={handleTimeSave}>Save</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  intervalInput: {
    width: 60,
    height: 40,
    marginRight: 8,
  },
  actionButton: {
    marginVertical: 8,
  },
  logoutButton: {
    marginTop: 16,
  },
  timeInput: {
    marginVertical: 8,
  },
}); 