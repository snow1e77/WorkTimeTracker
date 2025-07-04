import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Switch, ActivityIndicator } from 'react-native';
import { Card, Button, TextInput, DataTable, Dialog, Portal } from 'react-native-paper';
import logger from '../utils/logger';

interface AdminLimits {
  id: string;
  adminId: string;
  companyName: string;
  maxUsers: number;
  maxSites: number;
  maxProjects: number;
  canExportExcel: boolean;
  canManageUsers: boolean;
  canManageSites: boolean;
  canViewReports: boolean;
  canChatWithWorkers: boolean;
  validFrom: Date;
  validTo?: Date;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface AdminLimitsData extends AdminLimits {
  adminName: string;
  adminPhone: string;
}

interface CreateAdminLimitsRequest {
  adminId: string;
  companyName: string;
  maxUsers: number;
  maxSites: number;
  maxProjects: number;
  canExportExcel?: boolean;
  canManageUsers?: boolean;
  canManageSites?: boolean;
  canViewReports?: boolean;
  canChatWithWorkers?: boolean;
  validFrom?: Date;
  validTo?: Date;
}

interface AdminLimitsPanelProps {
  currentUserRole: string;
  currentUserId: string;
  isSuperAdmin: boolean;
}

export const AdminLimitsPanel: React.FC<AdminLimitsPanelProps> = ({
  currentUserRole,
  currentUserId,
  isSuperAdmin
}) => {
  const [adminLimits, setAdminLimits] = useState<AdminLimitsData[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminLimitsData | null>(null);
  const [formData, setFormData] = useState<CreateAdminLimitsRequest>({
    adminId: '',
    companyName: '',
    maxUsers: 10,
    maxSites: 5,
    maxProjects: 3,
    canExportExcel: true,
    canManageUsers: true,
    canManageSites: true,
    canViewReports: true,
    canChatWithWorkers: true
  });

  const [filters, setFilters] = useState({
    isActive: true,
    companyName: '',
    page: 1,
    limit: 20
  });

  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv'>('xlsx');

  useEffect(() => {
    loadAdminLimits();
  }, [filters]);

  const loadAdminLimits = async () => {
    if (!isSuperAdmin) return;

    try {
      setLoading(true);
      const response = await fetch('/api/admin-limits/all?' + new URLSearchParams({
        page: filters.page.toString(),
        limit: filters.limit.toString(),
        isActive: filters.isActive.toString(),
        ...(filters.companyName && { companyName: filters.companyName })
      }), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const result = await response.json();
      
      if (result.success) {
        setAdminLimits(result.data);
      } else {
        Alert.alert('Ошибка', result.message || 'Не удалось загрузить данные');
      }
    } catch (error) {
      logger.error('Failed to load admin limits', { error: error instanceof Error ? error.message : 'Unknown error' }, 'admin');
      Alert.alert('Ошибка', 'Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  };

  const createAdminLimits = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin-limits/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();
      
      if (result.success) {
        Alert.alert('Успех', 'Лимиты админа успешно созданы');
        setShowCreateDialog(false);
        resetForm();
        loadAdminLimits();
      } else {
        Alert.alert('Ошибка', result.message || 'Не удалось создать лимиты');
      }
    } catch (error) {
      logger.error('Failed to create admin limits', { error: error instanceof Error ? error.message : 'Unknown error' }, 'admin');
      Alert.alert('Ошибка', 'Не удалось создать лимиты');
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin-limits/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          type: 'detailed',
          format: exportFormat,
          includeCharts: true,
          includeSummary: true
        })
      });

      const result = await response.json();
      
      if (result.success) {
        // Создаем и загружаем файл
        const blob = new Blob([result.data], { 
          type: exportFormat === 'csv' ? 'text/csv' : 'application/json' 
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        Alert.alert('Успех', 'Данные успешно экспортированы');
        setShowExportDialog(false);
      } else {
        Alert.alert('Ошибка', result.message || 'Не удалось экспортировать данные');
      }
    } catch (error) {
      logger.error('Failed to export admin limits', { error: error instanceof Error ? error.message : 'Unknown error' }, 'admin');
      Alert.alert('Ошибка', 'Не удалось экспортировать данные');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      adminId: '',
      companyName: '',
      maxUsers: 10,
      maxSites: 5,
      maxProjects: 3,
      canExportExcel: true,
      canManageUsers: true,
      canManageSites: true,
      canViewReports: true,
      canChatWithWorkers: true
    });
  };

  if (!isSuperAdmin) {
    return (
      <View style={styles.container}>
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.noAccessText}>
              У вас нет прав доступа к управлению лимитами админов
            </Text>
          </Card.Content>
        </Card>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Card style={styles.headerCard}>
          <Card.Content>
            <Text style={styles.title}>Управление лимитами админов</Text>
            <View style={styles.actionButtons}>
              <Button
                mode="contained"
                onPress={() => setShowCreateDialog(true)}
                style={styles.actionButton}
                icon="plus"
              >
                Создать лимиты
              </Button>
              <Button
                mode="outlined"
                onPress={() => setShowExportDialog(true)}
                style={styles.actionButton}
                icon="download"
              >
                Экспорт
              </Button>
              <Button
                mode="outlined"
                onPress={loadAdminLimits}
                style={styles.actionButton}
                icon="refresh"
              >
                Обновить
              </Button>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.filtersCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Фильтры</Text>
            <View style={styles.filtersRow}>
              <View style={styles.filterItem}>
                <Text>Только активные:</Text>
                <Switch
                  value={filters.isActive}
                  onValueChange={(value) => setFilters({ ...filters, isActive: value })}
                />
              </View>
              <TextInput
                label="Компания"
                value={filters.companyName}
                onChangeText={(text) => setFilters({ ...filters, companyName: text })}
                style={styles.filterInput}
                placeholder="Фильтр по названию компании"
              />
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.tableCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Список админов с лимитами</Text>
            {loading ? (
              <ActivityIndicator size="large" style={styles.loader} />
            ) : (
              <DataTable>
                <DataTable.Header>
                  <DataTable.Title>Имя</DataTable.Title>
                  <DataTable.Title>Компания</DataTable.Title>
                  <DataTable.Title numeric>Пользователи</DataTable.Title>
                  <DataTable.Title numeric>Объекты</DataTable.Title>
                </DataTable.Header>

                {adminLimits.map((admin) => (
                  <DataTable.Row key={admin.id}>
                    <DataTable.Cell>{admin.adminName}</DataTable.Cell>
                    <DataTable.Cell>{admin.companyName}</DataTable.Cell>
                    <DataTable.Cell numeric>{admin.maxUsers}</DataTable.Cell>
                    <DataTable.Cell numeric>{admin.maxSites}</DataTable.Cell>
                  </DataTable.Row>
                ))}
              </DataTable>
            )}
          </Card.Content>
        </Card>
      </ScrollView>

      <Portal>
        <Dialog visible={showCreateDialog} onDismiss={() => setShowCreateDialog(false)}>
          <Dialog.Title>Создание лимитов админа</Dialog.Title>
          <Dialog.ScrollArea>
            <ScrollView>
              <TextInput
                label="ID Админа"
                value={formData.adminId}
                onChangeText={(text) => setFormData({ ...formData, adminId: text })}
                style={styles.dialogInput}
                placeholder="Введите ID админа"
              />
              <TextInput
                label="Название компании"
                value={formData.companyName}
                onChangeText={(text) => setFormData({ ...formData, companyName: text })}
                style={styles.dialogInput}
                placeholder="Введите название компании"
              />
              <TextInput
                label="Максимум пользователей"
                value={formData.maxUsers.toString()}
                onChangeText={(text) => setFormData({ ...formData, maxUsers: parseInt(text) || 0 })}
                style={styles.dialogInput}
                keyboardType="numeric"
              />
              <TextInput
                label="Максимум объектов"
                value={formData.maxSites.toString()}
                onChangeText={(text) => setFormData({ ...formData, maxSites: parseInt(text) || 0 })}
                style={styles.dialogInput}
                keyboardType="numeric"
              />

              <Text style={styles.permissionsTitle}>Разрешения:</Text>
              
              <View style={styles.permissionRow}>
                <Text>Экспорт в Excel:</Text>
                <Switch
                  value={formData.canExportExcel}
                  onValueChange={(value) => setFormData({ ...formData, canExportExcel: value })}
                />
              </View>

              <View style={styles.permissionRow}>
                <Text>Управление пользователями:</Text>
                <Switch
                  value={formData.canManageUsers}
                  onValueChange={(value) => setFormData({ ...formData, canManageUsers: value })}
                />
              </View>
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setShowCreateDialog(false)}>Отмена</Button>
            <Button mode="contained" onPress={createAdminLimits} loading={loading}>
              Создать
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Portal>
        <Dialog visible={showExportDialog} onDismiss={() => setShowExportDialog(false)}>
          <Dialog.Title>Экспорт данных</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.sectionTitle}>Формат:</Text>
            <Button
              mode={exportFormat === 'xlsx' ? 'contained' : 'outlined'}
              onPress={() => setExportFormat('xlsx')}
              style={styles.formatButton}
            >
              Excel (XLSX)
            </Button>
            <Button
              mode={exportFormat === 'csv' ? 'contained' : 'outlined'}
              onPress={() => setExportFormat('csv')}
              style={styles.formatButton}
            >
              CSV
            </Button>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowExportDialog(false)}>Отмена</Button>
            <Button mode="contained" onPress={exportToExcel} loading={loading}>
              Экспортировать
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  headerCard: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    marginRight: 8,
    marginBottom: 8,
  },
  filtersCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
  },
  filterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterInput: {
    minWidth: 200,
  },
  tableCard: {
    marginBottom: 16,
  },
  loader: {
    marginVertical: 32,
  },
  dialogInput: {
    marginBottom: 16,
  },
  permissionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  permissionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  formatButton: {
    marginBottom: 8,
  },
  noAccessText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginVertical: 32,
  },
  card: {
    margin: 16,
  },
});

export default AdminLimitsPanel;
