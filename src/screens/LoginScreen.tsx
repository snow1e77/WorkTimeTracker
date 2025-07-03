import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Keyboard, TouchableWithoutFeedback, ScrollView, KeyboardAvoidingView, Platform, Image, Alert, ActivityIndicator } from 'react-native';
import { Text, TextInput, Button, Card, Title, HelperText } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CountryCode } from 'libphonenumber-js';
import { RootStackParamList } from '../types';
import { AuthService } from '../services/AuthService';
import { useAuth } from '../contexts/AuthContext';
import { 
  getCleanInternationalPhoneNumber, 
  isValidInternationalPhoneNumber,
  getCleanPhoneNumber
} from '../utils/phoneUtils';
import InternationalPhoneInput from '../components/InternationalPhoneInput';
import { t } from '../constants/localization';
import { scrollViewConfig, keyboardAvoidingConfig } from '../config/scrollConfig';
import logger from '../utils/logger';

type LoginScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

export default function LoginScreen() {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const authService = AuthService.getInstance();
  const { login, register } = useAuth();

  const [step, setStep] = useState<'phone' | 'register' | 'restricted'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>('US');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [needsRegistration, setNeedsRegistration] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const validatePhoneNumber = () => {
    if (!isValidInternationalPhoneNumber(phoneNumber, selectedCountry)) {
      setError(t('AUTH.ENTER_VALID_PHONE'));
      return false;
    }
    setError('');
    return true;
  };

  const handleLogin = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert('Ошибка', 'Введите номер телефона');
      return;
    }

    setIsLoading(true);
    try {
      const cleanPhone = getCleanPhoneNumber(phoneNumber);
      logger.auth('Starting login for phone', { phoneNumber: cleanPhone });
      
      const result = await login(cleanPhone);
      logger.auth('Login result from context', { success: result.success, needsContact: result.needsContact });
      
      if (result.success) {
        logger.auth('Login successful, waiting for state update');
        // Состояние должно обновиться автоматически через useEffect в AuthContext
        logger.auth('Navigation should happen automatically');
      } else if (result.needsContact) {
        logger.auth('User needs contact - showing restricted screen');
        // @ts-ignore
        navigation.navigate('RestrictedAccess');
      } else if (result.error?.includes('не найден') || result.error?.includes('not found')) {
        logger.auth('User needs registration');
        setShowRegister(true);
      } else {
        logger.auth('Login failed with error', { error: result.error });
        Alert.alert('Ошибка входа', result.error || 'Неизвестная ошибка');
      }
    } catch (error) {
      logger.error('Login exception occurred', { error: error instanceof Error ? error.message : 'Unknown error' }, 'auth');
      Alert.alert('Ошибка', 'Произошла ошибка при входе');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!phoneNumber.trim() || !name.trim()) {
      Alert.alert('Ошибка', 'Заполните все поля');
      return;
    }

    setIsLoading(true);
    try {
      const cleanPhone = getCleanPhoneNumber(phoneNumber);
      logger.auth('Starting registration for phone', { phoneNumber: cleanPhone });
      
      const result = await register(cleanPhone, name.trim());
      logger.auth('Registration result from context', { success: result.success });
      
      if (result.success) {
        logger.auth('Registration successful, waiting for state update');
        // Состояние должно обновиться автоматически через useEffect в AuthContext
        logger.auth('Navigation should happen automatically');
      } else {
        logger.auth('Registration failed with error', { error: result.error });
        Alert.alert('Ошибка регистрации', result.error || 'Неизвестная ошибка');
      }
    } catch (error) {
      logger.error('Registration exception occurred', { error: error instanceof Error ? error.message : 'Unknown error' }, 'auth');
      Alert.alert('Ошибка', 'Произошла ошибка при регистрации');
    } finally {
      setIsLoading(false);
    }
  };

  const renderPhoneStep = () => (
    <>
      <View style={styles.logoContainer}>
        <Image
          source={require('../../assets/login.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
      
      <Title style={styles.title}>Welcome to Work Time Tracker</Title>
      
      <Text style={styles.description}>
        Please enter your phone number to access the system
      </Text>

      <InternationalPhoneInput
        label={t('AUTH.PHONE_NUMBER')}
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        onCountryChange={setSelectedCountry}
        selectedCountry={selectedCountry}
        placeholder={t('AUTH.ENTER_PHONE')}
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
        loading={isLoading}
        disabled={isLoading}
        style={styles.button}
      >
        {t('AUTH.LOGIN')}
      </Button>
    </>
  );

  const renderRegisterStep = () => (
    <>
      <Title style={styles.title}>{t('AUTH.CREATE_PROFILE')}</Title>
      
      <Text style={styles.description}>
        {t('AUTH.PROFILE_DESCRIPTION')}
      </Text>

      <Text style={styles.phoneNumber}>
        {getCleanInternationalPhoneNumber(phoneNumber, selectedCountry)}
      </Text>
      
      <TextInput
        label={t('AUTH.FULL_NAME')}
        value={name}
        onChangeText={setName}
        mode="outlined"
        style={styles.input}
        placeholder={t('VALIDATION.ENTER_FULL_NAME')}
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
        loading={isLoading}
        disabled={isLoading}
        style={styles.button}
      >
        {t('AUTH.CREATE_PROFILE')}
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
          {t('AUTH.CHANGE_PHONE')}
        </Button>
      </View>
    </>
  );

  const renderRestrictedStep = () => (
    <>
      <View style={styles.logoContainer}>
        <Image
          source={require('../../assets/restricted.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
      
      <Title style={styles.title}>Access Restricted</Title>
      
      <Text style={styles.description}>
        Please contact your supervisor to register your account in the system
      </Text>

      <Button
        mode="contained"
        onPress={() => {
          setStep('phone');
          setPhoneNumber('');
          setError('');
        }}
        style={styles.button}
      >
        Try Another Number
      </Button>
    </>
  );

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          <ScrollView 
            {...scrollViewConfig}
            contentContainerStyle={styles.scrollContent}
          >
            <Card style={styles.card}>
              <Card.Content style={styles.cardContent}>
                {step === 'phone' && renderPhoneStep()}
                {step === 'register' && renderRegisterStep()}
                {step === 'restricted' && renderRestrictedStep()}
              </Card.Content>
            </Card>
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    borderRadius: 8,
    elevation: 4,
  },
  cardContent: {
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    width: 100,
    height: 100,
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
