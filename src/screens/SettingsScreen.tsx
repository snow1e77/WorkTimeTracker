import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { scrollViewConfig, scrollContentStyle } from '../config/scrollConfig';
import { 
  Card, 
  Title, 
  List, 
  Switch, 
  Button,
  Text,
  TextInput,
  Chip,
  HelperText
} from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';
import { formatInternationalPhoneNumber } from '../utils/phoneUtils';
import { formatDateUS } from '../utils/dateUtils';
import { notificationService } from '../services/NotificationService';

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
  const [gpsEvents, setGpsEvents] = useState(true);
  const [breakReminders, setBreakReminders] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);

  // Privacy Settings
  const [privacyMode, setPrivacyMode] = useState(false);
  const [privacyStartTime, setPrivacyStartTime] = useState('18:00');
  const [privacyEndTime, setPrivacyEndTime] = useState('08:00');

  // Status messages
  const [statusMessage, setStatusMessage] = useState('');
  const [isEditing, setIsEditing] = useState<'start' | 'end' | null>(null);

  // Загрузка настроек уведомлений при инициализации
  useEffect(() => {
    const loadNotificationSettings = async () => {
      try {
        const settings = await notificationService.getNotificationSettings();
        setNotificationsEnabled(settings.enabled);
        setSoundEnabled(settings.sound);
        setVibrationEnabled(settings.vibration);
        setShiftReminders(settings.shiftReminders);
        setBreakReminders(settings.breakReminders);
        setGpsEvents(settings.gpsEvents);
        setViolationAlerts(settings.violations);
      } catch (error) {
        }
    };

    loadNotificationSettings();
  }, []);

  const handleGpsToggle = (value: boolean) => {
    setGpsEnabled(value);
    if (!value) {
      setStatusMessage('GPS disabled - automatic time tracking will be unavailable');
    } else {
      setStatusMessage('GPS enabled');
    }
  };

  const handlePrivacyToggle = (value: boolean) => {
    setPrivacyMode(value);
    if (value) {
      setStatusMessage('Privacy mode enabled - GPS tracking will be disabled during specified hours');
    } else {
      setStatusMessage('Privacy mode disabled');
    }
  };

  const handleTimeEdit = (type: 'start' | 'end') => {
    setIsEditing(type);
  };

  const handleTimeSave = (time: string) => {
    if (isEditing === 'start') {
      setPrivacyStartTime(time);
      setStatusMessage('Privacy start time updated');
    } else if (isEditing === 'end') {
      setPrivacyEndTime(time);
      setStatusMessage('Privacy end time updated');
    }
    setIsEditing(null);
  };

  const resetSettings = () => {
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
    setStatusMessage('Settings restored to defaults');
  };

  const handleLogout = async () => {
    try {
      await logout();
      setStatusMessage('Signed out successfully');
    } catch (error) {
      setStatusMessage('Unable to sign out');
    }
  };

  const handleSaveSettings = async () => {
    try {
      // Сохраняем настройки уведомлений
      await notificationService.saveNotificationSettings({
        enabled: notificationsEnabled,
        sound: soundEnabled,
        vibration: vibrationEnabled,
        shiftReminders,
        breakReminders,
        gpsEvents,
        violations: violationAlerts,
      });
      
      setStatusMessage('Settings saved successfully');
    } catch (error) {
      setStatusMessage('Failed to save settings');
    }
  };

  const handleTestNotification = async () => {
    try {
      await notificationService.sendTestNotification();
      setStatusMessage('Test notification sent');
    } catch (error) {
      setStatusMessage('Failed to send test notification');
    }
  };

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={[scrollContentStyle, styles.scrollContent]}
      {...scrollViewConfig}
    >
      {/* Status Message */}
      {statusMessage ? (
        <Card style={styles.statusCard}>
          <Card.Content>
            <HelperText type="info" visible={true}>
              {statusMessage}
            </HelperText>
          </Card.Content>
        </Card>
      ) : null}

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

          <List.Item
            title="Vibration"
            description="Vibrate on notifications"
            left={() => <List.Icon icon="vibrate" />}
            right={() => (
              <Switch
                value={vibrationEnabled}
                onValueChange={setVibrationEnabled}
                disabled={!notificationsEnabled}
              />
            )}
          />

          <List.Item
            title="GPS events"
            description="Site entry/exit notifications"
            left={() => <List.Icon icon="map-marker" />}
            right={() => (
              <Switch
                value={gpsEvents}
                onValueChange={setGpsEvents}
                disabled={!notificationsEnabled}
              />
            )}
          />

          <List.Item
            title="Break reminders"
            description="Notifications for break time"
            left={() => <List.Icon icon="coffee" />}
            right={() => (
              <Switch
                value={breakReminders}
                onValueChange={setBreakReminders}
                disabled={!notificationsEnabled}
              />
            )}
          />

          <Button
            mode="outlined"
            onPress={handleTestNotification}
            style={styles.actionButton}
            icon="bell-ring"
            disabled={!notificationsEnabled}
          >
            Test Notification
          </Button>
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

              {isEditing === 'start' && (
                <View style={styles.timeEditContainer}>
                  <TextInput
                    label="Start Time (HH:MM)"
                    value={privacyStartTime}
                    onChangeText={handleTimeSave}
                    placeholder="18:00"
                    style={styles.timeInput}
                  />
                </View>
              )}

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

              {isEditing === 'end' && (
                <View style={styles.timeEditContainer}>
                  <TextInput
                    label="End Time (HH:MM)"
                    value={privacyEndTime}
                    onChangeText={handleTimeSave}
                    placeholder="08:00"
                    style={styles.timeInput}
                  />
                </View>
              )}
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
            onPress={handleSaveSettings}
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  statusCard: {
    marginBottom: 16,
    backgroundColor: '#e3f2fd',
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
  timeEditContainer: {
    padding: 16,
    backgroundColor: '#f8f9fa',
    marginVertical: 8,
    borderRadius: 8,
  },
  timeInput: {
    marginVertical: 8,
  },
}); 
