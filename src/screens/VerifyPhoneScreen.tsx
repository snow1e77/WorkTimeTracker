import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Alert, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { Text, TextInput, Button, Card, Title, HelperText } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import { AuthService } from '../services/AuthService';
import { formatInternationalPhoneNumber } from '../utils/phoneUtils';

type VerifyPhoneScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'VerifyPhone'>;
type VerifyPhoneScreenRouteProp = RouteProp<RootStackParamList, 'VerifyPhone'>;

export default function VerifyPhoneScreen() {
  const navigation = useNavigation<VerifyPhoneScreenNavigationProp>();
  const route = useRoute<VerifyPhoneScreenRouteProp>();
  const authService = AuthService.getInstance();

  const { phoneNumber, type } = route.params;

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    startTimer();

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const startTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleVerifyCode = async () => {
    if (!code || code.length !== 6) {
      Alert.alert('Ошибка', 'Введите 6-значный код подтверждения');
      return;
    }

    setLoading(true);
    try {
      const isValid = await authService.verifyCode(phoneNumber, code, type);
      
      if (isValid) {
        if (type === 'registration') {
          // For registration, complete the user creation process
          Alert.alert('Успех', 'Номер телефона подтвержден!', [
            { text: 'OK', onPress: () => navigation.navigate('Login') }
          ]);
        } else if (type === 'password_reset') {
          // Navigate to password reset screen
          Alert.alert('Успех', 'Код подтвержден! Теперь создайте новый пароль.', [
            { text: 'OK', onPress: () => navigation.navigate('ResetPassword') }
          ]);
        }
      } else {
        Alert.alert('Ошибка', 'Неверный или истёкший код подтверждения');
      }
    } catch (error) {
      Alert.alert('Ошибка', 'Произошла ошибка при проверке кода');
      console.error('Verify code error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    console.log('🔄 VerifyPhoneScreen: Starting resend code process');
    console.log('📱 Phone number:', phoneNumber);
    console.log('🔧 Type:', type);
    
    setResendLoading(true);
    try {
      const sent = await authService.sendVerificationCode(phoneNumber, type);
      
      if (sent) {
        console.log('✅ Code resent successfully');
        Alert.alert('Успех', 'Код подтверждения отправлен повторно');
        setTimeLeft(60);
        setCanResend(false);
        startTimer(); // Перезапускаем таймер
      } else {
        console.log('❌ Failed to resend code');
        Alert.alert('Ошибка', 'Не удалось отправить код повторно. Проверьте ваш номер телефона и интернет-соединение.');
      }
    } catch (error) {
      console.error('❌ Resend code error:', error);
      Alert.alert('Ошибка', 'Произошла ошибка при отправке кода. Попробуйте позже.');
    } finally {
      setResendLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTitle = () => {
    return type === 'registration' 
      ? 'Подтверждение регистрации'
      : 'Восстановление пароля';
  };

  const getDescription = () => {
    return type === 'registration'
      ? 'Введите код, отправленный на ваш номер телефона для завершения регистрации'
      : 'Введите код, отправленный на ваш номер телефона для восстановления пароля';
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.title}>{getTitle()}</Title>
            
            <Text style={styles.description}>
              {getDescription()}
            </Text>

            <Text style={styles.phoneNumber}>
              {formatInternationalPhoneNumber(phoneNumber)}
            </Text>
            
            <TextInput
              label="Код подтверждения"
              value={code}
              onChangeText={(text) => setCode(text.replace(/\D/g, '').slice(0, 6))}
              keyboardType="numeric"
              mode="outlined"
              style={styles.input}
              placeholder="Код подтверждения"
              maxLength={6}
              textAlign="center"
              autoFocus={true}
            />
            <HelperText type="info" visible={true}>
              Введите 6-значный код из SMS
            </HelperText>

            <Button
              mode="contained"
              onPress={handleVerifyCode}
              loading={loading}
              disabled={loading || code.length !== 6}
              style={styles.button}
            >
              Подтвердить
            </Button>

            <View style={styles.resendContainer}>
              {canResend ? (
                <Button
                  mode="text"
                  onPress={handleResendCode}
                  loading={resendLoading}
                  disabled={resendLoading}
                  style={styles.resendButton}
                >
                  {resendLoading ? 'Отправка...' : 'Отправить код повторно'}
                </Button>
              ) : (
                <Text style={styles.timerText}>
                  Повторная отправка через {formatTime(timeLeft)}
                </Text>
              )}
            </View>

            <View style={styles.linkContainer}>
              <Button
                mode="text"
                onPress={() => navigation.goBack()}
                style={styles.link}
              >
                Изменить номер телефона
              </Button>
            </View>
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
    fontSize: 24,
    textAlign: 'center',
  },
  button: {
    marginTop: 24,
    paddingVertical: 8,
  },
  resendContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  resendButton: {
    marginVertical: 8,
  },
  timerText: {
    color: '#666',
    fontSize: 14,
    marginVertical: 8,
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