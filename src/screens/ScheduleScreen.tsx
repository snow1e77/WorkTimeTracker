import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Text as RNText,
  TouchableOpacity,
} from 'react-native';

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
  const [_selectedWeek, _setSelectedWeek] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [schedule, _setSchedule] = useState<ScheduleEntry[]>([
    {
      id: '1',
      date: new Date('2025-07-08'),
      siteName: 'Site A – Central building area',
      startTime: '08:00',
      endTime: '16:00',
      lunchStart: '12:00',
      lunchEnd: '13:00',
      status: 'scheduled',
      estimatedHours: 8,
      notes: 'General construction labor',
    },
    {
      id: '2',
      date: new Date('2025-07-09'),
      siteName: 'Construction Site B',
      startTime: '07:30',
      endTime: '16:30',
      lunchStart: '12:00',
      lunchEnd: '12:30',
      status: 'confirmed',
      estimatedHours: 8.5,
      notes: 'Foundation inspection',
    },
    {
      id: '3',
      date: new Date('2025-07-10'),
      siteName: 'Office Building A',
      startTime: '08:00',
      endTime: '17:00',
      lunchStart: '12:00',
      lunchEnd: '13:00',
      status: 'completed',
      estimatedHours: 8,
    },
    {
      id: '4',
      date: new Date('2025-07-11'),
      siteName: 'Residential Complex C',
      startTime: '09:00',
      endTime: '18:00',
      lunchStart: '13:00',
      lunchEnd: '14:00',
      status: 'scheduled',
      estimatedHours: 8,
      notes: 'Plumbing installation',
    },
    {
      id: '5',
      date: new Date('2025-07-14'),
      siteName: 'Commercial Center E',
      startTime: '08:30',
      endTime: '17:30',
      lunchStart: '12:30',
      lunchEnd: '13:30',
      status: 'scheduled',
      estimatedHours: 8,
      notes: 'HVAC system setup',
    },
  ]);

  // Generate calendar data for July 2025
  const generateCalendarData = () => {
    const year = 2025;
    const month = 6; // July (0-indexed)
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const calendarDays = [];

    // Add previous month's trailing days
    const prevMonth = new Date(year, month - 1, 0);
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      calendarDays.push({
        date: prevMonth.getDate() - i,
        isCurrentMonth: false,
        isWeekend: false,
        hasWork: false,
        workHours: 0,
        status: 'none',
      });
    }

    // Add current month's days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      const scheduleEntry = schedule.find(
        (entry) =>
          entry.date.getDate() === day &&
          entry.date.getMonth() === month &&
          entry.date.getFullYear() === year
      );

      calendarDays.push({
        date: day,
        fullDate: date,
        isCurrentMonth: true,
        isWeekend,
        hasWork: !!scheduleEntry,
        workHours: scheduleEntry ? scheduleEntry.estimatedHours : 0,
        status: scheduleEntry?.status || 'none',
        scheduleEntry,
      });
    }

    // Add next month's leading days to fill grid
    const totalCells = Math.ceil(calendarDays.length / 7) * 7;
    let nextMonthDay = 1;
    for (let i = calendarDays.length; i < totalCells; i++) {
      calendarDays.push({
        date: nextMonthDay++,
        isCurrentMonth: false,
        isWeekend: false,
        hasWork: false,
        workHours: 0,
        status: 'none',
      });
    }

    return calendarDays;
  };

  const getDateColor = (day: any) => {
    if (!day.isCurrentMonth) return '#F8F9FA'; // Light gray for other months
    if (day.hasWork) {
      switch (day.status) {
        case 'completed':
          return '#404B46'; // Dark green for completed
        case 'confirmed':
          return '#404B46'; // Dark green for confirmed
        case 'scheduled':
          return '#E1F4FF'; // Light blue for scheduled
        default:
          return '#E1F4FF';
      }
    }
    return day.isWeekend ? '#F8F9FA' : '#FFFFFF'; // Light for weekends, white for regular days
  };

  const getDateTextColor = (day: any) => {
    if (!day.isCurrentMonth) return '#C0C0C0';
    if (
      day.hasWork &&
      (day.status === 'completed' || day.status === 'confirmed')
    ) {
      return '#FFFFFF';
    }
    return '#404B46';
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const calendarDays = generateCalendarData();
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <RNText style={styles.headerTitle}>Work shifts</RNText>

        <View style={styles.monthNavigation}>
          <TouchableOpacity style={styles.navButton}>
            <RNText style={styles.navArrow}>‹</RNText>
          </TouchableOpacity>

          <RNText style={styles.monthYear}>July 2025</RNText>

          <TouchableOpacity style={styles.navButton}>
            <RNText style={styles.navArrow}>›</RNText>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Calendar Grid */}
        <View style={styles.calendarContainer}>
          {/* Week day headers */}
          <View style={styles.weekDaysContainer}>
            {weekDays.map((day, index) => (
              <View key={index} style={styles.weekDayHeader}>
                <RNText style={styles.weekDayText}>{day}</RNText>
              </View>
            ))}
          </View>

          {/* Calendar grid */}
          <View style={styles.calendarGrid}>
            {calendarDays.map((day, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.calendarDay,
                  { backgroundColor: getDateColor(day) },
                ]}
                onPress={() =>
                  day.scheduleEntry && setSelectedDate(day.fullDate)
                }
              >
                <RNText
                  style={[
                    styles.calendarDayText,
                    { color: getDateTextColor(day) },
                  ]}
                >
                  {day.date}
                </RNText>
                {day.hasWork && (
                  <RNText
                    style={[
                      styles.workHoursText,
                      { color: getDateTextColor(day) },
                    ]}
                  >
                    {day.workHours}h
                  </RNText>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Selected Date Details */}
        {selectedDate && (
          <View style={styles.detailsContainer}>
            <RNText style={styles.detailsTitle}>
              Shift details for Tuesday, July 8, 2025
            </RNText>

            <View style={styles.detailsContent}>
              <View style={styles.detailRow}>
                <RNText style={styles.detailLabel}>Work hours:</RNText>
                <RNText style={styles.detailValue}>08:00 – 16:00</RNText>
              </View>

              <View style={styles.detailRow}>
                <RNText style={styles.detailLabel}>Duration:</RNText>
                <RNText style={styles.detailValue}>8 hours</RNText>
              </View>

              <View style={styles.detailRow}>
                <RNText style={styles.detailLabel}>Role:</RNText>
                <RNText style={styles.detailValue}>
                  General construction labor
                </RNText>
              </View>

              <View style={styles.detailRow}>
                <RNText style={styles.detailLabel}>Location:</RNText>
                <RNText style={styles.detailValue}>
                  Site A – Central building area
                </RNText>
              </View>
            </View>
          </View>
        )}

        {/* Schedule List */}
        <View style={styles.scheduleList}>
          <RNText style={styles.sectionTitle}>Upcoming Shifts</RNText>

          {schedule.map((entry) => (
            <TouchableOpacity
              key={entry.id}
              style={styles.scheduleItem}
              onPress={() => setSelectedDate(entry.date)}
            >
              <View style={styles.scheduleItemContent}>
                <View style={styles.scheduleDateContainer}>
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor:
                          entry.status === 'completed' ||
                          entry.status === 'confirmed'
                            ? '#404B46'
                            : '#E1F4FF',
                      },
                    ]}
                  />
                  <View style={styles.scheduleDate}>
                    <RNText style={styles.scheduleDateText}>
                      {entry.date.toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </RNText>
                    <RNText style={styles.scheduleTimeText}>
                      {entry.startTime} - {entry.endTime}
                    </RNText>
                  </View>
                </View>

                <View style={styles.scheduleInfo}>
                  <RNText style={styles.scheduleTitle}>{entry.siteName}</RNText>
                  {entry.notes && (
                    <RNText style={styles.scheduleNotes}>{entry.notes}</RNText>
                  )}
                  <View style={styles.hoursContainer}>
                    <RNText style={styles.hoursText}>
                      {entry.estimatedHours}h
                    </RNText>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontFamily: 'Poppins-Medium',
    fontSize: 25,
    color: '#000000',
    marginBottom: 20,
    textAlign: 'center',
  },
  monthNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E1F4FF',
    borderRadius: 100,
    paddingVertical: 12,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  navButton: {
    padding: 8,
  },
  navArrow: {
    fontFamily: 'Poppins-Regular',
    fontSize: 18,
    color: '#000000',
  },
  monthYear: {
    fontFamily: 'Poppins-Regular',
    fontSize: 15,
    letterSpacing: -1,
    color: '#000000',
    marginHorizontal: 20,
    minWidth: 80,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  calendarContainer: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 37,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  weekDaysContainer: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  weekDayHeader: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  weekDayText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 10,
    letterSpacing: -0.5,
    color: '#404B46',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: '14.28%',
    height: 45,
    borderRadius: 8,
    margin: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  calendarDayText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    lineHeight: 16,
  },
  workHoursText: {
    fontFamily: 'Poppins-Light',
    fontSize: 8,
    position: 'absolute',
    bottom: 4,
  },
  detailsContainer: {
    backgroundColor: '#E1F4FF',
    margin: 16,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  detailsTitle: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    color: '#404B46',
    marginBottom: 16,
    textAlign: 'center',
  },
  detailsContent: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontFamily: 'Poppins-Light',
    fontSize: 14,
    color: '#404B46',
  },
  detailValue: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: '#404B46',
  },
  scheduleList: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontFamily: 'Poppins-Medium',
    fontSize: 18,
    color: '#000000',
    marginBottom: 16,
    textAlign: 'center',
  },
  scheduleItem: {
    backgroundColor: '#FAF5ED',
    borderRadius: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  scheduleItemContent: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  scheduleDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  scheduleDate: {
    alignItems: 'center',
    minWidth: 70,
  },
  scheduleDateText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    color: '#404B46',
    textAlign: 'center',
  },
  scheduleTimeText: {
    fontFamily: 'Poppins-Light',
    fontSize: 10,
    color: '#666666',
    textAlign: 'center',
    marginTop: 2,
  },
  scheduleInfo: {
    flex: 1,
  },
  scheduleTitle: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: '#000000',
    marginBottom: 4,
  },
  scheduleNotes: {
    fontFamily: 'Poppins-Light',
    fontSize: 12,
    color: '#666666',
    marginBottom: 8,
  },
  hoursContainer: {
    alignSelf: 'flex-start',
    backgroundColor: '#E1F4FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  hoursText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 10,
    color: '#404B46',
  },
});
