import React, { useState } from 'react';
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
  ProgressBar,
  Divider
} from 'react-native-paper';

interface Assignment {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  dueDate: Date;
  assignedBy: string;
  siteName: string;
  estimatedHours: number;
  completedHours?: number;
  notes?: string;
  createdAt: Date;
}

export default function AssignmentsScreen() {
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'pending' | 'in_progress' | 'completed' | 'overdue'>('all');
  const [refreshing, setRefreshing] = useState(false);

  const [assignments, setAssignments] = useState<Assignment[]>([
    {
      id: '1',
      title: 'Install electrical wiring - Floor 2',
      description: 'Complete electrical installation for second floor including outlets, switches, and lighting fixtures',
      priority: 'high',
      status: 'in_progress',
      dueDate: new Date('2024-01-20'),
      assignedBy: 'John Smith',
      siteName: 'Office Building A',
      estimatedHours: 8,
      completedHours: 3,
      createdAt: new Date('2024-01-15')
    },
    {
      id: '2',
      title: 'Safety equipment check',
      description: 'Perform daily safety equipment inspection and report any issues',
      priority: 'medium',
      status: 'pending',
      dueDate: new Date('2024-01-18'),
      assignedBy: 'Jane Doe',
      siteName: 'Construction Site B',
      estimatedHours: 2,
      createdAt: new Date('2024-01-16')
    },
    {
      id: '3',
      title: 'Concrete foundation inspection',
      description: 'Inspect concrete foundation for quality and compliance with specifications',
      priority: 'high',
      status: 'completed',
      dueDate: new Date('2024-01-16'),
      assignedBy: 'Mike Johnson',
      siteName: 'Residential Complex C',
      estimatedHours: 4,
      completedHours: 4,
      notes: 'Foundation meets all requirements. Ready for next phase.',
      createdAt: new Date('2024-01-14')
    }
  ]);

  const getFilteredAssignments = () => {
    if (selectedStatus === 'all') return assignments;
    return assignments.filter(assignment => assignment.status === selectedStatus);
  };

  const getPriorityColor = (priority: Assignment['priority']) => {
    switch (priority) {
      case 'high': return '#e74c3c';
      case 'medium': return '#f39c12';
      case 'low': return '#27ae60';
      default: return '#95a5a6';
    }
  };

  const getStatusColor = (status: Assignment['status']) => {
    switch (status) {
      case 'completed': return '#27ae60';
      case 'in_progress': return '#3498db';
      case 'pending': return '#f39c12';
      case 'overdue': return '#e74c3c';
      default: return '#95a5a6';
    }
  };

  const getStatusIcon = (status: Assignment['status']) => {
    switch (status) {
      case 'completed': return 'check-circle';
      case 'in_progress': return 'clock';
      case 'pending': return 'clock-outline';
      case 'overdue': return 'alert-circle';
      default: return 'help-circle';
    }
  };

  const getStatusLabel = (status: Assignment['status']) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'in_progress': return 'In Progress';
      case 'pending': return 'Pending';
      case 'overdue': return 'Overdue';
      default: return 'Unknown';
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getDaysUntilDue = (dueDate: Date) => {
    const today = new Date();
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getProgress = (assignment: Assignment) => {
    if (assignment.status === 'completed') return 1;
    if (assignment.status === 'pending') return 0;
    if (assignment.completedHours && assignment.estimatedHours) {
      return Math.min(assignment.completedHours / assignment.estimatedHours, 1);
    }
    return 0;
  };

  const handleStartTask = (assignmentId: string) => {
    setAssignments(prev => prev.map(assignment => 
      assignment.id === assignmentId ? { ...assignment, status: 'in_progress' } : assignment
    ));
  };

  const handleCompleteTask = (assignmentId: string) => {
    setAssignments(prev => prev.map(assignment => 
      assignment.id === assignmentId ? { ...assignment, status: 'completed' } : assignment
    ));
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const filteredAssignments = getFilteredAssignments();

  const getAssignmentCounts = () => {
    return {
      total: assignments.length,
      pending: assignments.filter(a => a.status === 'pending').length,
      inProgress: assignments.filter(a => a.status === 'in_progress').length,
      completed: assignments.filter(a => a.status === 'completed').length,
      overdue: assignments.filter(a => a.status === 'overdue').length,
    };
  };

  const counts = getAssignmentCounts();

  return (
    <View style={styles.container}>
      <Surface style={styles.header} elevation={2}>
        <Title style={styles.headerTitle}>My Assignments</Title>
        <Paragraph style={styles.headerSubtitle}>
          Track and manage your work assignments
        </Paragraph>
      </Surface>

      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Card style={styles.statsCard}>
          <Card.Content>
            <Text style={styles.statsTitle}>Overview</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{counts.total}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: '#f39c12' }]}>{counts.pending}</Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: '#3498db' }]}>{counts.inProgress}</Text>
                <Text style={styles.statLabel}>In Progress</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: '#27ae60' }]}>{counts.completed}</Text>
                <Text style={styles.statLabel}>Completed</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.filtersCard}>
          <Card.Content>
            <Text style={styles.filtersTitle}>Filter by Status</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.filtersContainer}>
                {[
                  { key: 'all', label: 'All' },
                  { key: 'pending', label: 'Pending' },
                  { key: 'in_progress', label: 'In Progress' },
                  { key: 'completed', label: 'Completed' },
                  { key: 'overdue', label: 'Overdue' }
                ].map(filter => (
                  <Chip
                    key={filter.key}
                    selected={selectedStatus === filter.key}
                    onPress={() => setSelectedStatus(filter.key as any)}
                    style={[
                      styles.filterChip,
                      selectedStatus === filter.key && styles.selectedFilter
                    ]}
                    textStyle={selectedStatus === filter.key ? styles.selectedFilterText : {}}
                  >
                    {filter.label}
                  </Chip>
                ))}
              </View>
            </ScrollView>
          </Card.Content>
        </Card>

        <View style={styles.assignmentsContainer}>
          {filteredAssignments.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Card.Content style={styles.emptyContent}>
                <IconButton
                  icon="clipboard-check-outline"
                  size={60}
                  iconColor="#95a5a6"
                />
                <Text style={styles.emptyTitle}>No assignments found</Text>
                <Paragraph style={styles.emptyText}>
                  No assignments match the selected filter
                </Paragraph>
              </Card.Content>
            </Card>
          ) : (
            filteredAssignments.map(assignment => {
              const daysUntilDue = getDaysUntilDue(assignment.dueDate);
              const progress = getProgress(assignment);
              
              return (
                <Card key={assignment.id} style={styles.assignmentCard}>
                  <Card.Content>
                    <View style={styles.assignmentHeader}>
                      <View style={styles.assignmentInfo}>
                        <Text style={styles.assignmentTitle}>{assignment.title}</Text>
                        <Text style={styles.assignmentSite}>📍 {assignment.siteName}</Text>
                      </View>
                      <View style={styles.assignmentBadges}>
                        <Chip
                          icon="flag"
                          style={[styles.priorityChip, { backgroundColor: getPriorityColor(assignment.priority) }]}
                          textStyle={styles.chipText}
                          compact
                        >
                          {assignment.priority.toUpperCase()}
                        </Chip>
                      </View>
                    </View>

                    <Paragraph style={styles.assignmentDescription}>
                      {assignment.description}
                    </Paragraph>

                    {assignment.status === 'in_progress' && (
                      <View style={styles.progressContainer}>
                        <View style={styles.progressHeader}>
                          <Text style={styles.progressLabel}>Progress</Text>
                          <Text style={styles.progressText}>
                            {Math.round(progress * 100)}% ({assignment.completedHours || 0}/{assignment.estimatedHours}h)
                          </Text>
                        </View>
                        <ProgressBar 
                          progress={progress} 
                          color="#3498db"
                          style={styles.progressBar}
                        />
                      </View>
                    )}

                    <Divider style={styles.divider} />

                    <View style={styles.assignmentMeta}>
                      <View style={styles.metaRow}>
                        <Text style={styles.metaLabel}>Assigned by:</Text>
                        <Text style={styles.metaValue}>{assignment.assignedBy}</Text>
                      </View>
                      <View style={styles.metaRow}>
                        <Text style={styles.metaLabel}>Due date:</Text>
                        <Text style={[
                          styles.metaValue,
                          daysUntilDue < 0 ? styles.overdue : daysUntilDue <= 2 ? styles.urgent : {}
                        ]}>
                          {formatDate(assignment.dueDate)}
                          {daysUntilDue === 0 && ' (Today)'}
                          {daysUntilDue === 1 && ' (Tomorrow)'}
                          {daysUntilDue > 1 && ` (${daysUntilDue} days)`}
                          {daysUntilDue < 0 && ` (${Math.abs(daysUntilDue)} days overdue)`}
                        </Text>
                      </View>
                      <View style={styles.metaRow}>
                        <Text style={styles.metaLabel}>Estimated time:</Text>
                        <Text style={styles.metaValue}>{assignment.estimatedHours} hours</Text>
                      </View>
                    </View>

                    {assignment.notes && (
                      <View style={styles.notesContainer}>
                        <Text style={styles.notesLabel}>Notes:</Text>
                        <Text style={styles.notesText}>{assignment.notes}</Text>
                      </View>
                    )}
                  </Card.Content>

                  <Card.Actions style={styles.assignmentActions}>
                    <Chip
                      icon={getStatusIcon(assignment.status)}
                      style={[styles.statusChip, { backgroundColor: getStatusColor(assignment.status) }]}
                      textStyle={styles.chipText}
                    >
                      {getStatusLabel(assignment.status)}
                    </Chip>
                    
                    <View style={styles.actionButtons}>
                      {assignment.status === 'pending' && (
                        <Button
                          mode="contained"
                          onPress={() => handleStartTask(assignment.id)}
                          style={styles.startButton}
                          compact
                        >
                          Start
                        </Button>
                      )}
                      {assignment.status === 'in_progress' && (
                        <Button
                          mode="contained"
                          onPress={() => handleCompleteTask(assignment.id)}
                          style={styles.completeButton}
                          compact
                        >
                          Complete
                        </Button>
                      )}
                    </View>
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
  statsCard: {
    marginBottom: 16,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    color: '#2C3E50',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  statLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 4,
  },
  filtersCard: {
    marginBottom: 16,
  },
  filtersTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  filtersContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    marginRight: 8,
  },
  selectedFilter: {
    backgroundColor: '#2C3E50',
  },
  selectedFilterText: {
    color: 'white',
  },
  assignmentsContainer: {
    gap: 12,
  },
  assignmentCard: {
    marginBottom: 12,
  },
  assignmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  assignmentInfo: {
    flex: 1,
  },
  assignmentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  assignmentSite: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  assignmentBadges: {
    alignItems: 'flex-end',
  },
  assignmentDescription: {
    fontSize: 14,
    color: '#34495e',
    marginBottom: 16,
    lineHeight: 20,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
  },
  progressText: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
  divider: {
    marginVertical: 16,
  },
  assignmentMeta: {
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaLabel: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  metaValue: {
    fontSize: 14,
    color: '#2C3E50',
    fontWeight: '500',
  },
  overdue: {
    color: '#e74c3c',
    fontWeight: 'bold',
  },
  urgent: {
    color: '#f39c12',
    fontWeight: '600',
  },
  notesContainer: {
    marginTop: 16,
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
  assignmentActions: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusChip: {
    height: 32,
  },
  priorityChip: {
    height: 24,
  },
  chipText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  startButton: {
    backgroundColor: '#3498db',
  },
  completeButton: {
    backgroundColor: '#27ae60',
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