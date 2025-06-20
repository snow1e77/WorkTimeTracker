import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, FlatList } from 'react-native';
import { 
  Card, 
  Title, 
  Paragraph, 
  Button, 
  Text,
  Chip,
  Divider,
  Surface
} from 'react-native-paper';
import { WorkShift } from '../types';

export default function HistoryScreen() {
  // Состояние для фильтров
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'completed' | 'pending' | 'active'>('all');

  // Пример данных смен
  const [allShifts] = useState<WorkShift[]>([
    {
      id: '1',
      userId: 'user1',
      siteId: 'site1',
      startTime: new Date('2024-01-15T08:00:00'),
      endTime: new Date('2024-01-15T17:30:00'),
      totalMinutes: 570,
      status: 'completed',
      startMethod: 'gps',
      endMethod: 'manual',
      adminConfirmed: true,
      createdAt: new Date('2024-01-15T08:00:00')
    },
    {
      id: '2',
      userId: 'user1',
      siteId: 'site1',
      startTime: new Date('2024-01-14T07:45:00'),
      endTime: new Date('2024-01-14T16:15:00'),
      totalMinutes: 510,
      status: 'completed',
      startMethod: 'manual',
      endMethod: 'gps',
      adminConfirmed: true,
      createdAt: new Date('2024-01-14T07:45:00')
    },
    {
      id: '3',
      userId: 'user1',
      siteId: 'site1',
      startTime: new Date('2024-01-13T08:15:00'),
      endTime: new Date('2024-01-13T17:00:00'),
      totalMinutes: 525,
      status: 'pending_approval',
      startMethod: 'manual',
      endMethod: 'manual',
      adminConfirmed: false,
      createdAt: new Date('2024-01-13T08:15:00')
    },
    {
      id: '4',
      userId: 'user1',
      siteId: 'site1',
      startTime: new Date('2024-01-12T09:00:00'),
      endTime: new Date('2024-01-12T18:00:00'),
      totalMinutes: 540,
      status: 'completed',
      startMethod: 'gps',
      endMethod: 'gps',
      adminConfirmed: true,
      createdAt: new Date('2024-01-12T09:00:00')
    },
    {
      id: '5',
      userId: 'user1',
      siteId: 'site1',
      startTime: new Date(),
      endTime: undefined,
      totalMinutes: 0,
      status: 'active',
      startMethod: 'gps',
      endMethod: 'manual',
      adminConfirmed: false,
      createdAt: new Date()
    }
  ]);

  // Функция фильтрации по периоду
  const filterByPeriod = (shifts: WorkShift[], period: string): WorkShift[] => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (period) {
      case 'today':
        return shifts.filter(shift => {
          const shiftDate = new Date(shift.startTime.getFullYear(), shift.startTime.getMonth(), shift.startTime.getDate());
          return shiftDate.getTime() === today.getTime();
        });
      
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 7);
        return shifts.filter(shift => shift.startTime >= weekAgo);
      
      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setMonth(today.getMonth() - 1);
        return shifts.filter(shift => shift.startTime >= monthAgo);
      
      default:
        return shifts;
    }
  };

  // Функция фильтрации по статусу
  const filterByStatus = (shifts: WorkShift[], status: string): WorkShift[] => {
    if (status === 'all') return shifts;
    if (status === 'pending') return shifts.filter(shift => shift.status === 'pending_approval');
    return shifts.filter(shift => shift.status === status);
  };

  // Получаем отфильтрованные смены
  const getFilteredShifts = (): WorkShift[] => {
    let filtered = filterByPeriod(allShifts, selectedPeriod);
    filtered = filterByStatus(filtered, selectedStatus);
    return filtered.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  };

  const shifts = getFilteredShifts();

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}ч ${mins}м`;
  };

  const getStatusColor = (status: WorkShift['status']) => {
    switch (status) {
      case 'completed':
        return '#4CAF50';
      case 'pending_approval':
        return '#FF9800';
      case 'active':
        return '#2196F3';
      default:
        return '#757575';
    }
  };

  const getStatusText = (status: WorkShift['status']) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'pending_approval':
        return 'Pending approval';
      case 'active':
        return 'Active';
      default:
        return 'Unknown';
    }
  };



  const calculateStats = () => {
    const totalMinutes = shifts.reduce((sum, shift) => sum + (shift.totalMinutes || 0), 0);
    const avgMinutes = shifts.length > 0 ? totalMinutes / shifts.length : 0;
    const confirmedShifts = shifts.filter(shift => shift.adminConfirmed).length;
    
    return {
      totalHours: totalMinutes / 60,
      avgHours: avgMinutes / 60,
      totalShifts: shifts.length,
      confirmedShifts
    };
  };

  const stats = calculateStats();

  const renderShiftItem = ({ item }: { item: WorkShift }) => (
    <Card style={styles.shiftCard}>
      <Card.Content>
        <View style={styles.shiftHeader}>
          <Text style={styles.shiftDate}>
            {item.startTime.toLocaleDateString('en-US', { 
              weekday: 'short', 
              day: 'numeric', 
              month: 'short' 
            })}
          </Text>
          <Chip 
            style={[styles.statusChip, { backgroundColor: getStatusColor(item.status) }]}
            textStyle={{ color: 'white', fontSize: 12 }}
          >
            {getStatusText(item.status)}
          </Chip>
        </View>

        <View style={styles.timeRow}>
          <View style={styles.timeInfo}>
            <Text style={styles.timeText}>
              {item.startTime.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </Text>
          </View>
          
          <Text style={styles.timeSeparator}>—</Text>
          
          <View style={styles.timeInfo}>
            <Text style={styles.timeText}>
              {item.endTime?.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit' 
              }) || '—'}
            </Text>
          </View>
        </View>

        {item.totalMinutes ? (
          <View style={styles.durationRow}>
            <Text style={styles.durationText}>
              Worked: {formatDuration(item.totalMinutes)}
            </Text>
            {!item.adminConfirmed ? (
              <Chip icon="clock-alert" mode="outlined" style={styles.pendingChip}>
                Pending approval
              </Chip>
            ) : null}
          </View>
        ) : null}

        {item.notes ? (
          <Paragraph style={styles.notes}>{item.notes}</Paragraph>
        ) : null}
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      {/* Statistics */}
      <Card style={styles.statsCard}>
        <Card.Content>
          <Title>Monthly Statistics</Title>
          <View style={styles.statsGrid}>
            <Surface style={styles.statItem} elevation={1}>
              <Text style={styles.statValue}>{stats.totalHours.toFixed(1)}</Text>
              <Text style={styles.statLabel}>hours</Text>
            </Surface>
            
            <Surface style={styles.statItem} elevation={1}>
              <Text style={styles.statValue}>{stats.totalShifts}</Text>
              <Text style={styles.statLabel}>shifts</Text>
            </Surface>
            
            <Surface style={styles.statItem} elevation={1}>
              <Text style={styles.statValue}>{stats.avgHours.toFixed(1)}</Text>
              <Text style={styles.statLabel}>avg/day</Text>
            </Surface>
            
            <Surface style={styles.statItem} elevation={1}>
              <Text style={styles.statValue}>{stats.confirmedShifts}</Text>
              <Text style={styles.statLabel}>confirmed</Text>
            </Surface>
          </View>
        </Card.Content>
      </Card>

      {/* Filters */}
      <Card style={styles.filtersCard}>
        <Card.Content>
          <View style={styles.filtersRow}>
            <Button 
              mode={selectedPeriod === 'today' ? 'contained-tonal' : 'outlined'} 
              compact
              onPress={() => setSelectedPeriod('today')}
            >
              Today
            </Button>
            <Button 
              mode={selectedPeriod === 'week' ? 'contained-tonal' : 'outlined'} 
              compact
              onPress={() => setSelectedPeriod('week')}
            >
              Week
            </Button>
            <Button 
              mode={selectedPeriod === 'month' ? 'contained-tonal' : 'outlined'} 
              compact
              onPress={() => setSelectedPeriod('month')}
            >
              Month
            </Button>
          </View>
          <View style={[styles.filtersRow, { marginTop: 8 }]}>
            <Button 
              mode={selectedStatus === 'all' ? 'contained-tonal' : 'outlined'} 
              compact
              onPress={() => setSelectedStatus('all')}
            >
              All
            </Button>
            <Button 
              mode={selectedStatus === 'completed' ? 'contained-tonal' : 'outlined'} 
              compact
              onPress={() => setSelectedStatus('completed')}
            >
              Completed
            </Button>
            <Button 
              mode={selectedStatus === 'pending' ? 'contained-tonal' : 'outlined'} 
              compact
              onPress={() => setSelectedStatus('pending')}
            >
              Pending
            </Button>
            <Button 
              mode={selectedStatus === 'active' ? 'contained-tonal' : 'outlined'} 
              compact
              onPress={() => setSelectedStatus('active')}
            >
              Active
            </Button>
          </View>
        </Card.Content>
      </Card>

      {/* Shift List */}
      <View style={styles.shiftsContainer}>
        <View style={styles.shiftsHeader}>
          <Title style={styles.shiftsTitle}>Shift History</Title>
          <Text style={styles.shiftsCount}>
            {shifts.length} shift{shifts.length !== 1 ? 's' : ''} found
          </Text>
        </View>
        
        {shifts.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No shifts found</Text>
            <Text style={styles.emptySubtitle}>
              Try adjusting your filters to see more results
            </Text>
          </View>
        ) : (
          <FlatList
            data={shifts}
            renderItem={renderShiftItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  statsCard: {
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  statItem: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    minWidth: 70,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  filtersCard: {
    marginBottom: 16,
  },
  filtersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shiftsContainer: {
    flex: 1,
  },
  shiftsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  shiftsTitle: {
    marginBottom: 0,
  },
  shiftsCount: {
    fontSize: 14,
    color: '#666',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
  shiftCard: {
    marginBottom: 8,
  },
  shiftHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  shiftDate: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusChip: {
    height: 28,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  timeText: {
    fontSize: 16,
    marginLeft: 8,
  },
  timeSeparator: {
    fontSize: 16,
    color: '#666',
    marginHorizontal: 16,
  },
  durationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  durationText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  pendingChip: {
    height: 24,
  },
  notes: {
    marginTop: 8,
    fontStyle: 'italic',
    color: '#666',
  },
  separator: {
    height: 8,
  },
}); 