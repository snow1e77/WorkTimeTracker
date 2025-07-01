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
          <Title style={styles.title}>Добро пожаловать!</Title>
          
          <Text style={styles.description}>
            Теперь регистрация пользователей происходит только через администраторов.
          </Text>

          <Text style={styles.steps}>
            Как это работает:
            {'\n'}• Администратор или прораб добавляет ваш номер телефона в систему
            {'\n'}• Вы получаете уведомление о добавлении
            {'\n'}• Просто введите номер телефона для входа
            {'\n'}• При первом входе создайте свой профиль
          </Text>

          <Text style={styles.contactInfo}>
            Если у вас нет доступа к системе, обратитесь к вашему прорабу или бригадиру.
          </Text>

          <Button
            mode="contained"
            onPress={handleGoToLogin}
            style={styles.button}
          >
            Попробовать войти
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