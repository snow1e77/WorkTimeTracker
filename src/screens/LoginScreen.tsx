import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  TextInput as RNTextInput,
} from 'react-native';
import { Text, Button, HelperText } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { AuthService } from '../services/AuthService';
import { useAuth } from '../contexts/AuthContext';
import {
  getCleanInternationalPhoneNumberSafe,
  isValidInternationalPhoneNumber,
} from '../utils/phoneUtils';
import { t } from '../constants/localization';
import { scrollViewConfig } from '../config/scrollConfig';
import logger from '../utils/logger';

type LoginScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Login'
>;

export default function LoginScreen() {
  const _navigation = useNavigation<LoginScreenNavigationProp>();
  const authService = AuthService.getInstance();
  const { login: _login, register: _register } = useAuth();

  const [step, setStep] = useState<'phone' | 'register' | 'restricted'>(
    'phone'
  );
  const [phoneNumber, setPhoneNumber] = useState('');
  const [name, setName] = useState('');
  const [_loading, _setLoading] = useState(false);
  const [error, setError] = useState('');
  const [_needsRegistration, _setNeedsRegistration] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const phoneInputRef = useRef<any>(null);

  // Устанавливаем фокус при загрузке экрана
  useEffect(() => {
    if (step === 'phone' && !showRegister) {
      setTimeout(() => {
        phoneInputRef.current?.focus();
      }, 100);
    }
  }, [step, showRegister]);

  const validatePhoneNumber = () => {
    try {
      if (!phoneNumber || phoneNumber.trim() === '') {
        setError(t('AUTH.ENTER_VALID_PHONE'));
        return false;
      }

      // Добавляем +46 если номер не начинается с +
      const fullPhoneNumber = phoneNumber.startsWith('+')
        ? phoneNumber
        : `+46${phoneNumber}`;

      if (!isValidInternationalPhoneNumber(fullPhoneNumber, 'SE')) {
        setError(t('AUTH.ENTER_VALID_PHONE'));
        return false;
      }

      setError('');
      return true;
    } catch (error) {
      console.warn('Phone validation failed:', error);
      setError(t('AUTH.ENTER_VALID_PHONE'));
      return false;
    }
  };

  const handleLogin = async () => {
    if (!validatePhoneNumber()) return;

    setIsLoading(true);
    setError('');

    try {
      // Добавляем +46 если номер не начинается с +
      const fullPhoneNumber = phoneNumber.startsWith('+')
        ? phoneNumber
        : `+46${phoneNumber}`;
      const cleanPhoneNumber = getCleanInternationalPhoneNumberSafe(
        fullPhoneNumber,
        'SE'
      );

      const result = await authService.login(cleanPhoneNumber);

      if (result.success) {
        // Логин успешен, состояние обновится через AuthContext
        logger.info('Login successful', { phone: cleanPhoneNumber });
      } else if (result.needsContact) {
        setStep('restricted');
      } else if (
        result.error?.includes('не найден') ||
        result.error?.includes('not found')
      ) {
        setShowRegister(true);
      } else {
        setError(result.error || t('AUTH.LOGIN_FAILED'));
      }
    } catch (error) {
      logger.error('Login failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      setError(t('AUTH.LOGIN_FAILED'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!name.trim()) {
      setError(t('VALIDATION.ENTER_FULL_NAME'));
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Добавляем +46 если номер не начинается с +
      const fullPhoneNumber = phoneNumber.startsWith('+')
        ? phoneNumber
        : `+46${phoneNumber}`;
      const cleanPhoneNumber = getCleanInternationalPhoneNumberSafe(
        fullPhoneNumber,
        'SE'
      );

      const result = await authService.register(cleanPhoneNumber, name.trim());

      if (result.success) {
        // Регистрация успешна, состояние обновится через AuthContext
        logger.info('Registration successful', { phone: cleanPhoneNumber });
      } else {
        setError(result.error || t('AUTH.REGISTRATION_FAILED'));
      }
    } catch (error) {
      logger.error('Registration failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      setError(t('AUTH.REGISTRATION_FAILED'));
    } finally {
      setIsLoading(false);
    }
  };

  const renderPhoneStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.heroImageContainer}>
        <Image
          source={require('../../assets/login.png')}
          style={styles.heroImage}
          resizeMode="cover"
        />
      </View>

      <View style={styles.contentContainer}>
        <Text style={styles.welcomeTitle}>
          Hi!{'\n'}Enter your phone{'\n'}number to log in:
        </Text>

        <View style={styles.phoneInputContainer}>
          <View style={styles.countryCodeContainer}>
            <Text style={styles.countryCodeText}>+46</Text>
          </View>

          <View style={styles.phoneInputWrapper}>
            <RNTextInput
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              style={styles.phoneInputInner}
              placeholder="12 345 67 89"
              placeholderTextColor="#999"
              keyboardType="phone-pad"
              ref={phoneInputRef}
              autoCorrect={false}
              autoComplete="off"
              autoCapitalize="none"
              onFocus={() => logger.debug('Phone input focused')}
              onBlur={() => logger.debug('Phone input blurred')}
            />
          </View>
        </View>

        {error ? (
          <HelperText type="error" visible={true} style={styles.errorText}>
            {error}
          </HelperText>
        ) : null}

        <Button
          mode="contained"
          onPress={handleLogin}
          loading={isLoading}
          disabled={isLoading}
          style={styles.loginButton}
          labelStyle={styles.loginButtonText}
        >
          Log in
        </Button>
      </View>
    </View>
  );

  const renderRegisterStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.contentContainer}>
        <Text style={styles.welcomeTitle}>{t('AUTH.CREATE_PROFILE')}</Text>

        <Text style={styles.description}>{t('AUTH.PROFILE_DESCRIPTION')}</Text>

        <Text style={styles.phoneNumber}>
          {getCleanInternationalPhoneNumberSafe(phoneNumber, 'SE')}
        </Text>

        <RNTextInput
          value={name}
          onChangeText={setName}
          style={styles.input}
          placeholder={t('VALIDATION.ENTER_FULL_NAME')}
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
          style={styles.loginButton}
          labelStyle={styles.loginButtonText}
        >
          {t('AUTH.CREATE_ACCOUNT')}
        </Button>

        <Button
          mode="text"
          onPress={() => setShowRegister(false)}
          style={styles.backButton}
        >
          {t('COMMON.BACK')}
        </Button>
      </View>
    </View>
  );

  const renderRestrictedStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.logoContainer}>
        <Image
          source={require('../../assets/restricted.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <Text style={styles.welcomeTitle}>
        Contact the site manager to register your phone number.
      </Text>

      <Text style={styles.description}>
        Your phone number is not registered in the system. Please contact your
        site manager to get access.
      </Text>

      <Button
        mode="outlined"
        onPress={() => setStep('phone')}
        style={styles.backButton}
      >
        Try Another Number
      </Button>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        {...scrollViewConfig}
      >
        {step === 'phone' && !showRegister && renderPhoneStep()}
        {step === 'phone' && showRegister && renderRegisterStep()}
        {step === 'register' && renderRegisterStep()}
        {step === 'restricted' && renderRestrictedStep()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
  },
  stepContainer: {
    flex: 1,
  },
  heroImageContainer: {
    position: 'absolute',
    top: 138,
    left: 1,
    width: 374,
    height: 374,
    borderRadius: 0,
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 38,
    paddingTop: 546,
    alignItems: 'center',
  },
  welcomeTitle: {
    fontFamily: 'Poppins-Regular',
    fontSize: 20,
    lineHeight: 22,
    letterSpacing: -1,
    textAlign: 'center',
    color: '#000000',
    marginBottom: 32,
    width: 298,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  countryCodeContainer: {
    backgroundColor: '#E1F4FF',
    borderRadius: 100,
    paddingHorizontal: 16,
    paddingVertical: 13,
    marginRight: 12,
    minWidth: 60,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  countryCodeText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 15,
    letterSpacing: -1,
    color: '#000000',
  },
  phoneInputWrapper: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 13,
    backgroundColor: '#F8F9FA',
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  phoneInputInner: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
  },
  loginButton: {
    backgroundColor: '#E1F4FF',
    borderRadius: 100,
    width: 297,
    height: 46,
    justifyContent: 'center',
    marginTop: 20,
    elevation: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  loginButtonText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 15,
    letterSpacing: -0.5,
    color: '#000000',
  },
  errorText: {
    alignSelf: 'flex-start',
    marginLeft: 16,
    color: '#FF6B6B',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 100,
    marginBottom: 40,
  },
  logo: {
    width: 120,
    height: 120,
  },
  description: {
    fontFamily: 'Poppins-Light',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    color: '#666666',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  phoneNumber: {
    fontFamily: 'Poppins-Medium',
    fontSize: 18,
    color: '#000000',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    width: '100%',
  },
  input: {
    width: '100%',
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    marginTop: 16,
    borderColor: '#E1F4FF',
  },
});
