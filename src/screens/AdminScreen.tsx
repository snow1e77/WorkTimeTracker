import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

const AdminScreen: React.FC = () => {
  const navigation = useNavigation();

  const adminOptions = [
    {
      title: 'Site Management',
      description: 'Create and edit construction sites',
      screen: 'SiteManagement',
      icon: '🏗️',
    },
    {
      title: 'Work Reports',
      description: 'View employee working hours',
      screen: 'WorkReports',
      icon: '📊',
    },
    {
      title: 'User Management',
      description: 'Add and manage employees',
      screen: 'UserManagement',
      icon: '👥',
    },
    {
      title: 'Violations',
      description: 'View and manage violations',
      screen: 'ViolationsReport',
      icon: '⚠️',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Foreman Panel</Text>
          <Text style={styles.subtitle}>Project and personnel management</Text>
        </View>

        <View style={styles.optionsContainer}>
          {adminOptions.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={styles.optionCard}
              onPress={() => navigation.navigate(option.screen as never)}
            >
              <View style={styles.optionIcon}>
                <Text style={styles.iconText}>{option.icon}</Text>
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>{option.title}</Text>
                <Text style={styles.optionDescription}>{option.description}</Text>
              </View>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    marginBottom: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  optionsContainer: {
    gap: 15,
  },
  optionCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  optionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  iconText: {
    fontSize: 24,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  arrow: {
    fontSize: 24,
    color: '#bdc3c7',
    marginLeft: 10,
  },
});

export default AdminScreen; 