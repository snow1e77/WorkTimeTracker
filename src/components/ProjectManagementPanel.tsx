import React, { useState, useEffect } from 'react';
import { Project, AuthUser } from '../types';
import { WebDatabaseService } from '../services/WebDatabaseService';
import logger from '../utils/logger';

interface ProjectManagementPanelProps {
  currentUser: AuthUser | null;
  onSelectProject?: (project: Project | null) => void;
  selectedProject?: Project | null;
}

const ProjectManagementPanel: React.FC<ProjectManagementPanelProps> = ({ 
  currentUser, 
  onSelectProject, 
  selectedProject 
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [newProject, setNewProject] = useState<{
    name: string;
    description: string;
    startDate: string;
    endDate: string;
    budget: string;
    currency: string;
    address: string;
    status: Project['status'];
  }>({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    budget: '',
    currency: 'RUB',
    address: '',
    status: 'planning'
  });

  const dbService = WebDatabaseService.getInstance();

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const projectsData = await dbService.getProjects();
      setProjects(projectsData);
    } catch (error) {
              logger.error('Failed to load projects', { error: error instanceof Error ? error.message : 'Unknown error' }, 'admin');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !newProject.name.trim()) return;

    try {
      const project: Project = {
        id: `project-${Date.now()}`,
        name: newProject.name.trim(),
        description: newProject.description.trim() || undefined,
        companyId: currentUser.companyId || 'default-company',
        startDate: new Date(newProject.startDate),
        endDate: newProject.endDate ? new Date(newProject.endDate) : undefined,
        status: newProject.status,
        budget: newProject.budget ? parseFloat(newProject.budget) : undefined,
        currency: newProject.currency,
        address: newProject.address.trim() || undefined,
        isActive: true,
        createdBy: currentUser.id,
        createdAt: new Date(),
      };

      await dbService.createProject(project);
      await loadProjects();
      setShowCreateForm(false);
      resetForm();
    } catch (error) {
              logger.error('Failed to create project', { error: error instanceof Error ? error.message : 'Unknown error' }, 'admin');
    }
  };

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject || !newProject.name.trim()) return;

    try {
      const updates: Partial<Project> = {
        name: newProject.name.trim(),
        description: newProject.description.trim() || undefined,
        startDate: new Date(newProject.startDate),
        endDate: newProject.endDate ? new Date(newProject.endDate) : undefined,
        status: newProject.status,
        budget: newProject.budget ? parseFloat(newProject.budget) : undefined,
        currency: newProject.currency,
        address: newProject.address.trim() || undefined,
        updatedAt: new Date(),
      };

      await dbService.updateProject(editingProject.id, updates);
      await loadProjects();
      setEditingProject(null);
      resetForm();
    } catch (error) {
              logger.error('Failed to update project', { error: error instanceof Error ? error.message : 'Unknown error' }, 'admin');
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот проект?')) return;

    try {
      await dbService.deleteProject(projectId);
      await loadProjects();
      if (selectedProject?.id === projectId) {
        onSelectProject?.(null);
      }
    } catch (error) {
              logger.error('Failed to delete project', { error: error instanceof Error ? error.message : 'Unknown error' }, 'admin');
    }
  };

  const handleToggleProjectStatus = async (projectId: string, isActive: boolean) => {
    try {
      await dbService.updateProjectStatus(projectId, isActive);
      await loadProjects();
    } catch (error) {
              logger.error('Failed to change project status', { error: error instanceof Error ? error.message : 'Unknown error' }, 'admin');
    }
  };

  const resetForm = () => {
    setNewProject({
      name: '',
      description: '',
      startDate: '',
      endDate: '',
      budget: '',
      currency: 'RUB',
      address: '',
      status: 'planning'
    });
  };

  const startEdit = (project: Project) => {
    setEditingProject(project);
    
    // Приводим опциональные поля к строкам с дефолтными значениями
    const safeDescription = project.description ?? '';
    const safeCurrency = project.currency ?? 'RUB';
    const safeAddress = project.address ?? '';
    const safeBudget = project.budget?.toString() ?? '';
    
    setNewProject({
      name: project.name,
      description: safeDescription,
      startDate: project.startDate.toISOString().split('T')[0],
      endDate: project.endDate ? project.endDate.toISOString().split('T')[0] : '',
      budget: safeBudget,
      currency: safeCurrency,
      address: safeAddress,
      status: project.status
    });
    setShowCreateForm(true);
  };

  const cancelEdit = () => {
    setEditingProject(null);
    setShowCreateForm(false);
    resetForm();
  };

  const getStatusColor = (status: Project['status']): string => {
    switch (status) {
      case 'active': return '#4CAF50';
      case 'planning': return '#2196F3';
      case 'paused': return '#FF9800';
      case 'completed': return '#9C27B0';
      case 'cancelled': return '#f44336';
      default: return '#9E9E9E';
    }
  };

  const getStatusText = (status: Project['status']): string => {
    switch (status) {
      case 'active': return 'Активный';
      case 'planning': return 'Планирование';
      case 'paused': return 'Приостановлен';
      case 'completed': return 'Завершён';
      case 'cancelled': return 'Отменён';
      default: return status;
    }
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  };

  const formatCurrency = (amount: number, currency: string): string => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: currency || 'RUB'
    }).format(amount);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Управление проектами</h2>
        <div style={styles.headerActions}>
          {selectedProject && (
            <button 
              style={styles.backButton}
              onClick={() => onSelectProject?.(null)}
            >
              ← Назад к проектам
            </button>
          )}
          <button 
            style={styles.createButton}
            onClick={() => setShowCreateForm(true)}
          >
            + Создать проект
          </button>
        </div>
      </div>

      {showCreateForm && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h3 style={styles.modalTitle}>
              {editingProject ? 'Редактировать проект' : 'Создать новый проект'}
            </h3>
            <form onSubmit={editingProject ? handleUpdateProject : handleCreateProject}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Название проекта*</label>
                <input
                  type="text"
                  value={newProject.name}
                  onChange={(e) => setNewProject({...newProject, name: e.target.value})}
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Описание</label>
                <textarea
                  value={newProject.description}
                  onChange={(e) => setNewProject({...newProject, description: e.target.value})}
                  style={styles.textarea}
                  rows={3}
                />
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Дата начала*</label>
                  <input
                    type="date"
                    value={newProject.startDate}
                    onChange={(e) => setNewProject({...newProject, startDate: e.target.value})}
                    style={styles.input}
                    required
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Дата окончания</label>
                  <input
                    type="date"
                    value={newProject.endDate}
                    onChange={(e) => setNewProject({...newProject, endDate: e.target.value})}
                    style={styles.input}
                  />
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Статус</label>
                  <select
                    value={newProject.status}
                    onChange={(e) => setNewProject({...newProject, status: e.target.value as Project['status']})}
                    style={styles.select}
                  >
                    <option value="planning">Планирование</option>
                    <option value="active">Активный</option>
                    <option value="paused">Приостановлен</option>
                    <option value="completed">Завершён</option>
                    <option value="cancelled">Отменён</option>
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Валюта</label>
                  <select
                    value={newProject.currency}
                    onChange={(e) => setNewProject({...newProject, currency: e.target.value})}
                    style={styles.select}
                  >
                    <option value="RUB">RUB - Рубль</option>
                    <option value="USD">USD - Доллар</option>
                    <option value="EUR">EUR - Евро</option>
                  </select>
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Бюджет</label>
                <input
                  type="number"
                  value={newProject.budget}
                  onChange={(e) => setNewProject({...newProject, budget: e.target.value})}
                  style={styles.input}
                  min="0"
                  step="0.01"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Адрес</label>
                <input
                  type="text"
                  value={newProject.address}
                  onChange={(e) => setNewProject({...newProject, address: e.target.value})}
                  style={styles.input}
                />
              </div>

              <div style={styles.modalActions}>
                <button type="button" onClick={cancelEdit} style={styles.cancelButton}>
                  Отмена
                </button>
                <button type="submit" style={styles.submitButton}>
                  {editingProject ? 'Обновить' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div style={styles.loading}>Загрузка проектов...</div>
      ) : (
        <div style={styles.projectsGrid}>
          {projects.map((project) => (
            <div key={project.id} style={styles.projectCard}>
              <div style={styles.projectHeader}>
                <h3 style={styles.projectName}>{project.name}</h3>
                <div style={styles.projectActions}>
                  <button
                    onClick={() => onSelectProject?.(project)}
                    style={styles.selectButton}
                    title="Выбрать проект"
                  >
                    Выбрать
                  </button>
                  <button
                    onClick={() => startEdit(project)}
                    style={styles.editButton}
                    title="Редактировать"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleToggleProjectStatus(project.id, !project.isActive)}
                    style={{
                      ...styles.toggleButton,
                      backgroundColor: project.isActive ? '#f44336' : '#4CAF50'
                    }}
                    title={project.isActive ? 'Деактивировать' : 'Активировать'}
                  >
                    {project.isActive ? '⏸️' : '▶️'}
                  </button>
                  <button
                    onClick={() => handleDeleteProject(project.id)}
                    style={styles.deleteButton}
                    title="Удалить"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              {project.description && (
                <p style={styles.projectDescription}>{project.description}</p>
              )}

              <div style={styles.projectInfo}>
                <div style={styles.statusBadge}>
                  <span 
                    style={{
                      ...styles.statusDot,
                      backgroundColor: getStatusColor(project.status)
                    }}
                  />
                  {getStatusText(project.status)}
                </div>

                <div style={styles.projectDates}>
                  <strong>Период:</strong> {formatDate(project.startDate)}
                  {project.endDate && ` - ${formatDate(project.endDate)}`}
                </div>

                {project.budget && (
                  <div style={styles.projectBudget}>
                    <strong>Бюджет:</strong> {formatCurrency(project.budget, project.currency || 'RUB')}
                  </div>
                )}

                {project.address && (
                  <div style={styles.projectAddress}>
                    <strong>Адрес:</strong> {project.address}
                  </div>
                )}

                <div style={styles.projectMeta}>
                  <small>Создан: {formatDate(project.createdAt)}</small>
                  {!project.isActive && (
                    <span style={styles.inactiveLabel}>Неактивен</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {projects.length === 0 && !loading && (
        <div style={styles.emptyState}>
          <h3>Проекты не найдены</h3>
          <p>Создайте первый проект для начала работы</p>
        </div>
      )}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    padding: '20px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#2c3e50',
    margin: '0',
  },
  headerActions: {
    display: 'flex',
    gap: '10px',
  },
  backButton: {
    padding: '8px 16px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  createButton: {
    padding: '8px 16px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  projectsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
    gap: '20px',
  },
  projectCard: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    border: '1px solid #e9ecef',
  },
  projectHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '10px',
  },
  projectName: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#2c3e50',
    margin: '0',
    flex: '1',
  },
  projectActions: {
    display: 'flex',
    gap: '5px',
  },
  selectButton: {
    padding: '4px 8px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  editButton: {
    padding: '4px 8px',
    backgroundColor: '#ffc107',
    color: 'black',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  toggleButton: {
    padding: '4px 8px',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  deleteButton: {
    padding: '4px 8px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  projectDescription: {
    fontSize: '14px',
    color: '#6c757d',
    marginBottom: '15px',
  },
  projectInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  statusBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: '500',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  projectDates: {
    fontSize: '14px',
    color: '#495057',
  },
  projectBudget: {
    fontSize: '14px',
    color: '#495057',
  },
  projectAddress: {
    fontSize: '14px',
    color: '#495057',
  },
  projectMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '10px',
    paddingTop: '10px',
    borderTop: '1px solid #e9ecef',
  },
  inactiveLabel: {
    fontSize: '12px',
    color: '#dc3545',
    fontWeight: 'bold',
  },
  modal: {
    position: 'fixed',
    top: '0',
    left: '0',
    right: '0',
    bottom: '0',
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '24px',
    width: '90%',
    maxWidth: '600px',
    maxHeight: '90vh',
    overflow: 'auto',
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    marginBottom: '20px',
    color: '#2c3e50',
  },
  formGroup: {
    marginBottom: '16px',
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },
  label: {
    display: 'block',
    marginBottom: '4px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#495057',
  },
  input: {
    width: '100%',
    padding: '8px',
    border: '1px solid #ced4da',
    borderRadius: '4px',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    padding: '8px',
    border: '1px solid #ced4da',
    borderRadius: '4px',
    fontSize: '14px',
    resize: 'vertical',
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    padding: '8px',
    border: '1px solid #ced4da',
    borderRadius: '4px',
    fontSize: '14px',
    backgroundColor: 'white',
    boxSizing: 'border-box',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '20px',
  },
  cancelButton: {
    padding: '8px 16px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  submitButton: {
    padding: '8px 16px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '16px',
    color: '#6c757d',
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px',
    color: '#6c757d',
  },
};

export default ProjectManagementPanel; 