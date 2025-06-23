import React, { useState } from 'react';
import { WebDatabaseService } from '../services/WebDatabaseService';
import { WebSyncService } from '../services/WebSyncService';
import { AuthUser, ConstructionSite, UserSiteAssignment } from '../types';

interface AssignmentsTabProps {
  users: AuthUser[];
  sites: ConstructionSite[];
  assignments: UserSiteAssignment[];
  onAssignmentsChange: () => void;
}

const AssignmentsTab: React.FC<AssignmentsTabProps> = ({
  users,
  sites,
  assignments,
  onAssignmentsChange
}) => {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [notes, setNotes] = useState('');
  const [validFrom, setValidFrom] = useState('');
  const [validTo, setValidTo] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const dbService = WebDatabaseService.getInstance();
  const syncService = WebSyncService.getInstance();

  const handleCreateAssignment = async () => {
    if (!selectedUserId || !selectedSiteId) {
      alert('Please select both worker and site');
      return;
    }

    setIsCreating(true);
    try {
      const assignment: UserSiteAssignment = {
        id: `assignment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: selectedUserId,
        siteId: selectedSiteId,
        assignedBy: 'admin-1', // В реальном приложении из контекста
        isActive: true,
        assignedAt: new Date(),
        validFrom: validFrom ? new Date(validFrom) : undefined,
        validTo: validTo ? new Date(validTo) : undefined,
        notes: notes || undefined
      };

      await dbService.createAssignment(assignment);
      await syncService.notifyAssignmentChange(assignment);
      
      // Очищаем форму
      setSelectedUserId('');
      setSelectedSiteId('');
      setNotes('');
      setValidFrom('');
      setValidTo('');
      
      onAssignmentsChange();

      console.log('✅ Assignment created successfully');
    } catch (error) {
      console.error('Failed to create assignment:', error);
      alert('Failed to create assignment');
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleAssignment = async (assignmentId: string, isActive: boolean) => {
    try {
      await dbService.updateAssignment(assignmentId, { isActive: !isActive });
      
      const assignment = assignments.find(a => a.id === assignmentId);
      if (assignment) {
        await syncService.notifyAssignmentChange({
          ...assignment,
          isActive: !isActive
        });
      }
      
      onAssignmentsChange();
    } catch (error) {
      console.error('Failed to toggle assignment:', error);
      alert('Failed to update assignment');
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!confirm('Are you sure you want to delete this assignment?')) {
      return;
    }

    try {
      await dbService.deleteAssignment(assignmentId);
      onAssignmentsChange();
    } catch (error) {
      console.error('Failed to delete assignment:', error);
      alert('Failed to delete assignment');
    }
  };

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user ? user.name : 'Unknown User';
  };

  const getSiteName = (siteId: string) => {
    const site = sites.find(s => s.id === siteId);
    return site ? site.name : 'Unknown Site';
  };

  const formatDate = (date: Date | undefined) => {
    return date ? new Date(date).toLocaleDateString() : '-';
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Worker Site Assignments</h2>
        <p style={styles.subtitle}>Assign workers to specific construction sites</p>
      </div>

      {/* Форма создания назначения */}
      <div style={styles.createSection}>
        <h3 style={styles.sectionTitle}>Create New Assignment</h3>
        <div style={styles.createForm}>
          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Worker:</label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                style={styles.select}
              >
                <option value="">Select Worker...</option>
                {users.filter(u => u.role === 'worker').map(user => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.phoneNumber})
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Construction Site:</label>
              <select
                value={selectedSiteId}
                onChange={(e) => setSelectedSiteId(e.target.value)}
                style={styles.select}
              >
                <option value="">Select Site...</option>
                {sites.filter(s => s.isActive).map(site => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Valid From (optional):</label>
              <input
                type="date"
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Valid To (optional):</label>
              <input
                type="date"
                value={validTo}
                onChange={(e) => setValidTo(e.target.value)}
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Notes (optional):</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes about this assignment..."
              style={styles.textarea}
              rows={3}
            />
          </div>

          <button
            onClick={handleCreateAssignment}
            disabled={isCreating || !selectedUserId || !selectedSiteId}
            style={{
              ...styles.createButton,
              ...(isCreating ? styles.disabledButton : {})
            }}
          >
            {isCreating ? 'Creating...' : 'Create Assignment'}
          </button>
        </div>
      </div>

      {/* Список назначений */}
      <div style={styles.assignmentsSection}>
        <h3 style={styles.sectionTitle}>Current Assignments ({assignments.length})</h3>
        
        {assignments.length === 0 ? (
          <div style={styles.noAssignments}>
            <p>No assignments created yet.</p>
          </div>
        ) : (
          <div style={styles.assignmentsList}>
            {assignments.map(assignment => (
              <div key={assignment.id} style={styles.assignmentCard}>
                <div style={styles.assignmentHeader}>
                  <div style={styles.assignmentInfo}>
                    <h4 style={styles.workerName}>
                      {getUserName(assignment.userId)}
                    </h4>
                    <p style={styles.siteName}>
                      📍 {getSiteName(assignment.siteId)}
                    </p>
                  </div>
                  
                  <div style={styles.assignmentStatus}>
                    <span style={{
                      ...styles.statusBadge,
                      ...(assignment.isActive ? styles.activeBadge : styles.inactiveBadge)
                    }}>
                      {assignment.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                <div style={styles.assignmentDetails}>
                  <div style={styles.dateInfo}>
                    <span><strong>Assigned:</strong> {formatDate(assignment.assignedAt)}</span>
                    {assignment.validFrom && (
                      <span><strong>From:</strong> {formatDate(assignment.validFrom)}</span>
                    )}
                    {assignment.validTo && (
                      <span><strong>To:</strong> {formatDate(assignment.validTo)}</span>
                    )}
                  </div>
                  
                  {assignment.notes && (
                    <div style={styles.assignmentNotes}>
                      <strong>Notes:</strong> {assignment.notes}
                    </div>
                  )}
                </div>

                <div style={styles.assignmentActions}>
                  <button
                    onClick={() => handleToggleAssignment(assignment.id, assignment.isActive)}
                    style={{
                      ...styles.actionButton,
                      ...(assignment.isActive ? styles.deactivateButton : styles.activateButton)
                    }}
                  >
                    {assignment.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  
                  <button
                    onClick={() => handleDeleteAssignment(assignment.id)}
                    style={{...styles.actionButton, ...styles.deleteButton}}
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

const styles = {
  container: {
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto',
  } as React.CSSProperties,

  header: {
    marginBottom: '30px',
  } as React.CSSProperties,

  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#333',
    margin: '0 0 10px 0',
  } as React.CSSProperties,

  subtitle: {
    fontSize: '16px',
    color: '#666',
    margin: '0',
  } as React.CSSProperties,

  createSection: {
    backgroundColor: 'white',
    padding: '25px',
    borderRadius: '8px',
    marginBottom: '30px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  } as React.CSSProperties,

  sectionTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#333',
    marginBottom: '20px',
  } as React.CSSProperties,

  createForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  } as React.CSSProperties,

  formRow: {
    display: 'flex',
    gap: '20px',
  } as React.CSSProperties,

  formGroup: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  } as React.CSSProperties,

  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#333',
    marginBottom: '8px',
  } as React.CSSProperties,

  select: {
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: 'white',
  } as React.CSSProperties,

  input: {
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
  } as React.CSSProperties,

  textarea: {
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
    resize: 'vertical',
    fontFamily: 'inherit',
  } as React.CSSProperties,

  createButton: {
    padding: '15px 30px',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    alignSelf: 'flex-start',
    transition: 'background-color 0.3s',
  } as React.CSSProperties,

  disabledButton: {
    backgroundColor: '#ccc',
    cursor: 'not-allowed',
  } as React.CSSProperties,

  assignmentsSection: {
    backgroundColor: 'white',
    padding: '25px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  } as React.CSSProperties,

  noAssignments: {
    textAlign: 'center',
    padding: '40px',
    color: '#666',
    fontSize: '16px',
  } as React.CSSProperties,

  assignmentsList: {
    display: 'grid',
    gap: '15px',
  } as React.CSSProperties,

  assignmentCard: {
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    padding: '20px',
    backgroundColor: '#fafafa',
  } as React.CSSProperties,

  assignmentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '15px',
  } as React.CSSProperties,

  assignmentInfo: {
    flex: 1,
  } as React.CSSProperties,

  workerName: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#333',
    margin: '0 0 5px 0',
  } as React.CSSProperties,

  siteName: {
    fontSize: '14px',
    color: '#666',
    margin: '0',
  } as React.CSSProperties,

  assignmentStatus: {
    display: 'flex',
    alignItems: 'center',
  } as React.CSSProperties,

  statusBadge: {
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '500',
    textTransform: 'uppercase',
  } as React.CSSProperties,

  activeBadge: {
    backgroundColor: '#e8f5e8',
    color: '#4CAF50',
  } as React.CSSProperties,

  inactiveBadge: {
    backgroundColor: '#ffebee',
    color: '#f44336',
  } as React.CSSProperties,

  assignmentDetails: {
    marginBottom: '15px',
  } as React.CSSProperties,

  dateInfo: {
    display: 'flex',
    gap: '20px',
    fontSize: '14px',
    color: '#666',
    marginBottom: '10px',
  } as React.CSSProperties,

  assignmentNotes: {
    fontSize: '14px',
    color: '#555',
    fontStyle: 'italic',
  } as React.CSSProperties,

  assignmentActions: {
    display: 'flex',
    gap: '10px',
  } as React.CSSProperties,

  actionButton: {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.3s',
  } as React.CSSProperties,

  activateButton: {
    backgroundColor: '#4CAF50',
    color: 'white',
  } as React.CSSProperties,

  deactivateButton: {
    backgroundColor: '#ff9800',
    color: 'white',
  } as React.CSSProperties,

  deleteButton: {
    backgroundColor: '#f44336',
    color: 'white',
  } as React.CSSProperties,
};

export default AssignmentsTab; 