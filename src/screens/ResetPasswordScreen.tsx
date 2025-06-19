import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, Card, Title } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';

type ResetPasswordScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ResetPassword'>;

export default function ResetPasswordScreen() {
  const navigation = useNavigation<ResetPasswordScreenNavigationProp>();

  const handleGoToLogin = () => {
    navigation.navigate('Login');
  };

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.title}>Reset Password</Title>
          
          <Text style={styles.description}>
            Passwords are no longer used! Sign in now happens through SMS codes.
          </Text>

          <Text style={styles.steps}>
            To access your account:
            {'\n'}• Enter your phone number
            {'\n'}• Receive a new SMS code
            {'\n'}• Sign in to the system
          </Text>

          <Button
            mode="contained"
            onPress={handleGoToLogin}
            style={styles.button}
          >
            Go to Sign In
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