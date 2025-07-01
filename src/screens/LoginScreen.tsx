import React, { useState } from 'react';
import { View, StyleSheet, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { Text, TextInput, Button, Card, Title, HelperText } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CountryCode } from 'libphonenumber-js';
import { RootStackParamList } from '../types';
import { AuthService } from '../services/AuthService';
import { 
  getCleanInternationalPhoneNumber, 
  isValidInternationalPhoneNumber 
} from '../utils/phoneUtils';
import InternationalPhoneInput from '../components/InternationalPhoneInput';

type LoginScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

export default function LoginScreen() {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const authService = AuthService.getInstance();

  const [step, setStep] = useState<'phone' | 'register'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>('US');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [needsRegistration, setNeedsRegistration] = useState(false);

  const validatePhoneNumber = () => {
    if (!isValidInternationalPhoneNumber(phoneNumber, selectedCountry)) {
      setError('Введите корректный номер телефона');
      return false;
    }
    setError('');
    return true;
  };

  const handleLogin = async () => {
    if (!validatePhoneNumber()) return;

    setLoading(true);
    setError('');
    try {
      const cleanPhone = getCleanInternationalPhoneNumber(phoneNumber, selectedCountry);
      console.log('Попытка входа:', cleanPhone);
      
      const result = await authService.login(cleanPhone);
      console.log('Результат входа:', result);

      if (result.success && result.user) {
        // Успешный вход
        navigation.navigate('Home');
      } else if (result.needsContact) {
        // Пользователь не найден - нужно обратиться к бригадиру
        setError(result.error || 'Ваш номер телефона не найден в системе. Обратитесь к прорабу или бригадиру для добавления в базу данных.');
      } else if (result.error?.includes('предварительно зарегистрированы')) {
        // Нужно создать профиль
        setNeedsRegistration(true);
        setStep('register');
      } else {
        setError(result.error || 'Ошибка входа в систему');
      }
    } catch (error) {
      console.log('Ошибка входа:', error);
      const errorMessage = error instanceof Error ? error.message : 'Произошла ошибка при входе';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!name.trim()) {
      setError('Пожалуйста, введите ваше полное имя');
      return;
    }

    if (name.trim().length < 2) {
      setError('Имя должно содержать минимум 2 символа');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const cleanPhone = getCleanInternationalPhoneNumber(phoneNumber, selectedCountry);
      const result = await authService.register(cleanPhone, name.trim());

      if (result.success && result.user) {
        navigation.navigate('Home');
      } else {
        setError(result.error || 'Ошибка регистрации');
      }
    } catch (error) {
      setError('Произошла ошибка при регистрации');
    } finally {
      setLoading(false);
    }
  };

  const renderPhoneStep = () => (
    <>
      <Title style={styles.title}>Вход в систему</Title>
      
      <Text style={styles.description}>
        Введите номер телефона для входа в систему
      </Text>

      <InternationalPhoneInput
        label="Номер телефона"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        onCountryChange={setSelectedCountry}
        selectedCountry={selectedCountry}
        placeholder="Введите номер телефона"
        autoFocus={true}
        autoDetectCountry={true}
        error={!!error}
      />

      {error ? (
        <HelperText type="error" visible={true}>
          {error}
        </HelperText>
      ) : null}

      <Button
        mode="contained"
        onPress={handleLogin}
        loading={loading}
        disabled={loading}
        style={styles.button}
      >
        Войти
      </Button>
    </>
  );

  const renderRegisterStep = () => (
    <>
      <Title style={styles.title}>Создание профиля</Title>
      
      <Text style={styles.description}>
        Вы предварительно зарегистрированы. Создайте свой профиль.
      </Text>

      <Text style={styles.phoneNumber}>
        {getCleanInternationalPhoneNumber(phoneNumber, selectedCountry)}
      </Text>
      
      <TextInput
        label="Полное имя"
        value={name}
        onChangeText={setName}
        mode="outlined"
        style={styles.input}
        placeholder="Введите ваше полное имя"
        autoFocus={true}
        error={!!error}
      />

      {error ? (
        <HelperText type="error" visible={true}>
          {error}
        </HelperText>
      ) : null}

      <Button
        mode="contained"
        onPress={handleRegister}
        loading={loading}
        disabled={loading}
        style={styles.button}
      >
        Создать профиль
      </Button>

      <View style={styles.linkContainer}>
        <Button
          mode="text"
          onPress={() => {
            setStep('phone');
            setNeedsRegistration(false);
            setName('');
            setError('');
          }}
          style={styles.link}
        >
          Изменить номер телефона
        </Button>
      </View>
    </>
  );

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <Card style={styles.card}>
          <Card.Content>
            {step === 'phone' ? renderPhoneStep() : renderRegisterStep()}
          </Card.Content>
        </Card>
      </View>
    </TouchableWithoutFeedback>
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
    marginBottom: 24,
    color: '#666',
    fontSize: 16,
  },
  phoneNumber: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#2196F3',
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 24,
    paddingVertical: 8,
  },
  linkContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  link: {
    marginVertical: 5,
  },
}); 
