import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, Card, Title } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';

type RegisterScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Register'>;

export default function RegisterScreen() {
  const navigation = useNavigation<RegisterScreenNavigationProp>();

  const handleGoToLogin = () => {
    navigation.navigate('Login');
  };

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.title}>Welcome!</Title>
          
          <Text style={styles.description}>
            User registration is now only done through administrators.
          </Text>

          <Text style={styles.steps}>
            How it works:
            {'\n'}• Administrator or supervisor adds your phone number to the system
            {'\n'}• You receive a notification about being added
            {'\n'}• Simply enter your phone number to login
            {'\n'}• On first login, create your profile
          </Text>

          <Text style={styles.contactInfo}>
            If you don't have access to the system, contact your supervisor or team leader.
          </Text>

          <Button
            mode="contained"
            onPress={handleGoToLogin}
            style={styles.button}
          >
            Try to login
          </Button>
        </Card.Content>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  card: {
    borderRadius: 8,
    elevation: 4,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
    fontSize: 24,
    fontWeight: 'bold',
  },
  description: {
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
    fontSize: 16,
  },
  steps: {
    textAlign: 'left',
    marginBottom: 20,
    color: '#333',
    fontSize: 15,
    lineHeight: 22,
  },
  contactInfo: {
    textAlign: 'center',
    marginBottom: 30,
    color: '#2196F3',
    fontSize: 16,
    fontWeight: '500',
    backgroundColor: '#E3F2FD',
    padding: 15,
    borderRadius: 8,
  },
  button: {
    paddingVertical: 8,
  },
}); 