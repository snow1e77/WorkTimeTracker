import React, { useState } from 'react';
import { View, StyleSheet, Keyboard, TouchableWithoutFeedback, ScrollView, KeyboardAvoidingView, Platform, Image } from 'react-native';
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
import { t } from '../constants/localization';
import { scrollViewConfig, keyboardAvoidingConfig } from '../config/scrollConfig';

type LoginScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

export default function LoginScreen() {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const authService = AuthService.getInstance();

  const [step, setStep] = useState<'phone' | 'register' | 'restricted'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>('US');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [needsRegistration, setNeedsRegistration] = useState(false);

  const validatePhoneNumber = () => {
    if (!isValidInternationalPhoneNumber(phoneNumber, selectedCountry)) {
      setError(t('AUTH.ENTER_VALID_PHONE'));
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
      console.log('Login attempt:', cleanPhone);
      
      const result = await authService.login(cleanPhone);
      console.log('Login result:', result);

      if (result.success && result.user) {
        // Successful login - navigation will happen automatically via App.tsx
        // navigation.navigate('Home'); // Removed to prevent race condition
      } else if (result.needsContact) {
        // User not found - show restricted screen
        setStep('restricted');
      } else if (result.error?.includes(t('VALIDATION.PRE_REGISTERED'))) {
        // Need to create profile
        setNeedsRegistration(true);
        setStep('register');
      } else {
        setError(result.error || t('VALIDATION.LOGIN_ERROR'));
      }
    } catch (error) {
      console.log('Login error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An error occurred during login';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!name.trim()) {
      setError(t('VALIDATION.ENTER_FULL_NAME'));
      return;
    }

    if (name.trim().length < 2) {
      setError(t('VALIDATION.NAME_MIN_LENGTH'));
      return;
    }

    setLoading(true);
    setError('');
    try {
      const cleanPhone = getCleanInternationalPhoneNumber(phoneNumber, selectedCountry);
      const result = await authService.register(cleanPhone, name.trim());

      if (result.success && result.user) {
        // Successful registration - navigation will happen automatically via App.tsx
        // navigation.navigate('Home'); // Removed to prevent race condition
      } else {
        setError(result.error || t('VALIDATION.REGISTRATION_ERROR'));
      }
    } catch (error) {
      setError(t('VALIDATION.REGISTRATION_ERROR_OCCURRED'));
    } finally {
      setLoading(false);
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
        loading={loading}
        disabled={loading}
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
        loading={loading}
        disabled={loading}
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
