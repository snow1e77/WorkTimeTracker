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
            Sign in and registration now happen on one screen using SMS codes.
          </Text>

          <Text style={styles.steps}>
            How it works:
            {'\n'}• Enter your phone number
            {'\n'}• Receive an SMS code  
            {'\n'}• If you have an account - sign in
            {'\n'}• If not - create your profile
          </Text>

          <Button
            mode="contained"
            onPress={handleGoToLogin}
            style={styles.button}
          >
            Continue
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
    marginBottom: 16,
    fontSize: 24,
    fontWeight: 'bold',
  },
  description: {
    textAlign: 'center',
    marginBottom: 24,
    color: '#666',
    fontSize: 16,
    lineHeight: 24,
  },
  steps: {
    marginBottom: 32,
    color: '#555',
    fontSize: 16,
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  button: {
    paddingVertical: 8,
  },
}); 