import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { 
  Card, 
  Title, 
  Paragraph, 
  Text,
  Chip,
  Button,
  IconButton,
  Surface,
  Divider
} from 'react-native-paper';
import logger from '../utils/logger';

interface ScheduleEntry {
  id: string;
  date: Date;
  siteName: string;
  startTime: string;
  endTime: string;
  lunchStart?: string;
  lunchEnd?: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  estimatedHours: number;
  actualHours?: number;
  notes?: string;
}

export default function ScheduleScreen() {
  const [selectedWeek, setSelectedWeek] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const [schedule, setSchedule] = useState<ScheduleEntry[]>([
    {
      id: '1',
      date: new Date('2024-01-22'),
      siteName: 'Office Building A',
      startTime: '08:00',
      endTime: '17:00',
      lunchStart: '12:00',
      lunchEnd: '13:00',
      status: 'scheduled',
      estimatedHours: 8,
      notes: 'Electrical work on second floor'
    },
    {
      id: '2',
      date: new Date('2024-01-23'),
      siteName: 'Construction Site B',
      startTime: '07:30',
      endTime: '16:30',
      lunchStart: '12:00',
      lunchEnd: '12:30',
      status: 'confirmed',
      estimatedHours: 8.5,
      notes: 'Foundation inspection'
    },
    {
      id: '3',
      date: new Date('2024-01-24'),
      siteName: 'Office Building A',
      startTime: '08:00',
      endTime: '17:00',
      lunchStart: '12:00',
      lunchEnd: '13:00',
      status: 'scheduled',
      estimatedHours: 8
    },
    {
      id: '4',
      date: new Date('2024-01-25'),
      siteName: 'Residential Complex C',
      startTime: '09:00',
      endTime: '18:00',
      lunchStart: '13:00',
      lunchEnd: '14:00',
      status: 'scheduled',
      estimatedHours: 8,
      notes: 'Plumbing installation'
    },
    {
      id: '5',
      date: new Date('2024-01-26'),
      siteName: 'Commercial Center E',
      startTime: '08:30',
      endTime: '17:30',
      lunchStart: '12:30',
      lunchEnd: '13:30',
      status: 'scheduled',
      estimatedHours: 8,
      notes: 'HVAC system setup'
    }
  ]);

  const getWeekDates = (weekOffset: number) => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1 + (weekOffset * 7));
    
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      weekDates.push(date);
    }
    return weekDates;
  };

  const getScheduleForWeek = (weekOffset: number) => {
    const weekDates = getWeekDates(weekOffset);
    if (weekDates.length < 7) return [];
    
    const startDate = weekDates[0]!;
    const endDate = weekDates[6]!;
    
    return schedule.filter(entry => 
      entry.date >= startDate && entry.date <= endDate
    );
  };

  const getStatusColor = (status: ScheduleEntry['status']) => {
    switch (status) {
      case 'confirmed': return '#27ae60';
      case 'completed': return '#2ecc71';
      case 'scheduled': return '#3498db';
      case 'cancelled': return '#e74c3c';
      default: return '#95a5a6';
    }
  };

  const getStatusIcon = (status: ScheduleEntry['status']) => {
    switch (status) {
      case 'confirmed': return 'check-circle';
      case 'completed': return 'check-circle-outline';
      case 'scheduled': return 'clock-outline';
      case 'cancelled': return 'cancel';
      default: return 'help-circle';
    }
  };

  const getStatusLabel = (status: ScheduleEntry['status']) => {
    switch (status) {
      case 'confirmed': return 'Confirmed';
      case 'completed': return 'Completed';
      case 'scheduled': return 'Scheduled';
      case 'cancelled': return 'Cancelled';
      default: return 'Unknown';
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours || '0');
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes || '00'} ${ampm}`;
  };

  const calculateWorkingHours = (entry: ScheduleEntry) => {
    const start = new Date(`2000-01-01T${entry.startTime}:00`);
    const end = new Date(`2000-01-01T${entry.endTime}:00`);
    let workingMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
    
    if (entry.lunchStart && entry.lunchEnd) {
      const lunchStart = new Date(`2000-01-01T${entry.lunchStart}:00`);
      const lunchEnd = new Date(`2000-01-01T${entry.lunchEnd}:00`);
      const lunchMinutes = (lunchEnd.getTime() - lunchStart.getTime()) / (1000 * 60);
      workingMinutes -= lunchMinutes;
    }
    
    return workingMinutes / 60;
  };

  const getTotalHoursForWeek = (weekOffset: number) => {
    const weekSchedule = getScheduleForWeek(weekOffset);
    return weekSchedule.reduce((total, entry) => {
      if (entry.status !== 'cancelled') {
        return total + calculateWorkingHours(entry);
      }
      return total;
    }, 0);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const handleConfirmSchedule = (entryId: string) => {
    setSchedule(prev => prev.map(entry => 
      entry.id === entryId ? { ...entry, status: 'confirmed' } : entry
    ));
  };

  const weekSchedule = getScheduleForWeek(selectedWeek);
  const weekDates = getWeekDates(selectedWeek);
  const totalHours = getTotalHoursForWeek(selectedWeek);

  const getWeekLabel = (weekOffset: number) => {
    if (weekOffset === 0) return 'This Week';
    if (weekOffset === 1) return 'Next Week';
    if (weekOffset === -1) return 'Last Week';
    return `Week ${weekOffset > 0 ? '+' : ''}${weekOffset}`;
  };

  return (
    <View style={styles.container}>
      <Surface style={styles.header} elevation={2}>
        <Title style={styles.headerTitle}>Work Schedule</Title>
        <Paragraph style={styles.headerSubtitle}>
          View your weekly work schedule and assignments
        </Paragraph>
      </Surface>

      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Card style={styles.navigationCard}>
          <Card.Content>
            <View style={styles.weekNavigation}>
              <Button
                mode="outlined"
                onPress={() => setSelectedWeek(selectedWeek - 1)}
                style={styles.navButton}
                compact
              >
                Previous
              </Button>
              
              <View style={styles.weekInfo}>
                <Text style={styles.weekLabel}>{getWeekLabel(selectedWeek)}</Text>
                <Text style={styles.weekDates}>
                  {weekDates.length >= 7 ? `${formatDate(weekDates[0]!)} - ${formatDate(weekDates[6]!)}` : 'Invalid week'}
                </Text>
              </View>
              
              <Button
                mode="outlined"
                onPress={() => setSelectedWeek(selectedWeek + 1)}
                style={styles.navButton}
                compact
              >
                Next
              </Button>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.summaryCard}>
          <Card.Content>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{weekSchedule.length}</Text>
                <Text style={styles.summaryLabel}>Days Scheduled</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{totalHours.toFixed(1)}h</Text>
                <Text style={styles.summaryLabel}>Total Hours</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>
                  {weekSchedule.filter(e => e.status === 'confirmed').length}
                </Text>
                <Text style={styles.summaryLabel}>Confirmed</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        <View style={styles.scheduleContainer}>
          {weekSchedule.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Card.Content style={styles.emptyContent}>
                <IconButton
                  icon="calendar-blank"
                  size={60}
                  iconColor="#95a5a6"
                />
                <Text style={styles.emptyTitle}>No schedule for this week</Text>
                <Paragraph style={styles.emptyText}>
                  You have no scheduled work for the selected week
                </Paragraph>
              </Card.Content>
            </Card>
          ) : (
            weekSchedule.map(entry => {
              const workingHours = calculateWorkingHours(entry);
              
              return (
                <Card key={entry.id} style={styles.scheduleCard}>
                  <Card.Content>
                    <View style={styles.entryHeader}>
                      <View style={styles.entryInfo}>
                        <Text style={styles.entryDate}>{formatDate(entry.date)}</Text>
                        <Text style={styles.entrySite}>📍 {entry.siteName}</Text>
                      </View>
                      <Chip
                        icon={getStatusIcon(entry.status)}
                        style={[styles.statusChip, { backgroundColor: getStatusColor(entry.status) }]}
                        textStyle={styles.chipText}
                      >
                        {getStatusLabel(entry.status)}
                      </Chip>
                    </View>

                    <Divider style={styles.divider} />

                    <View style={styles.timeContainer}>
                      <View style={styles.timeRow}>
                        <View style={styles.timeItem}>
                          <Text style={styles.timeLabel}>Start Time</Text>
                          <Text style={styles.timeValue}>{formatTime(entry.startTime)}</Text>
                        </View>
                        <View style={styles.timeItem}>
                          <Text style={styles.timeLabel}>End Time</Text>
                          <Text style={styles.timeValue}>{formatTime(entry.endTime)}</Text>
                        </View>
                        <View style={styles.timeItem}>
                          <Text style={styles.timeLabel}>Working Hours</Text>
                          <Text style={styles.timeValue}>{workingHours.toFixed(1)}h</Text>
                        </View>
                      </View>

                      {entry.lunchStart && entry.lunchEnd && (
                        <View style={styles.lunchRow}>
                          <Text style={styles.lunchLabel}>
                            🍽️ Lunch: {formatTime(entry.lunchStart)} - {formatTime(entry.lunchEnd)}
                          </Text>
                        </View>
                      )}
                    </View>

                    {entry.notes && (
                      <View style={styles.notesContainer}>
                        <Text style={styles.notesLabel}>Notes:</Text>
                        <Text style={styles.notesText}>{entry.notes}</Text>
                      </View>
                    )}
                  </Card.Content>

                  <Card.Actions>
                    {entry.status === 'scheduled' && (
                      <Button
                        mode="outlined"
                        onPress={() => handleConfirmSchedule(entry.id)}
                        style={styles.confirmButton}
                        compact
                      >
                        Confirm
                      </Button>
                    )}
                    <Button
                      mode="text"
                      onPress={() => logger.info('View schedule entry details', { entryId: entry.id }, 'schedule')}
                      compact
                    >
                      Details
                    </Button>
                  </Card.Actions>
                </Card>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  navigationCard: {
    marginBottom: 16,
  },
  weekNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navButton: {
    borderColor: '#3498db',
  },
  weekInfo: {
    alignItems: 'center',
    flex: 1,
  },
  weekLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
  },
  weekDates: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 4,
  },
  summaryCard: {
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 4,
  },
  scheduleContainer: {
    gap: 12,
  },
  scheduleCard: {
    marginBottom: 12,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  entryInfo: {
    flex: 1,
  },
  entryDate: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  entrySite: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  statusChip: {
    height: 32,
  },
  chipText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    marginVertical: 12,
  },
  timeContainer: {
    marginBottom: 12,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  timeItem: {
    alignItems: 'center',
    flex: 1,
  },
  timeLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  timeValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
  },
  lunchRow: {
    alignItems: 'center',
    marginTop: 8,
  },
  lunchLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    fontStyle: 'italic',
  },
  notesContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#ecf0f1',
    borderRadius: 8,
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#34495e',
    lineHeight: 18,
  },
  confirmButton: {
    borderColor: '#27ae60',
  },
  emptyCard: {
    marginTop: 40,
  },
  emptyContent: {
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#7f8c8d',
    marginBottom: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: '#7f8c8d',
  },
}); 