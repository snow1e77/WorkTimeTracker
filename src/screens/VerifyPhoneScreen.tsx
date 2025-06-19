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
      Alert.alert('Error', 'Enter the 6-digit verification code');
      return;
    }

    setLoading(true);
    try {
      // Используем новую систему аутентификации
      const result = await authService.verifyLoginCode(phoneNumber, code);
      
      if (result.success) {
        if (result.user) {
          // Пользователь существовал и вошел
          Alert.alert('Success', 'Welcome!', [
            { text: 'OK', onPress: () => navigation.navigate('Home') }
          ]);
        } else if (result.needsProfile) {
          // Новый пользователь - перенаправляем на создание профиля
          Alert.alert('Verified', 'Now create your profile', [
            { text: 'OK', onPress: () => navigation.navigate('Login') }
          ]);
        }
      } else {
        Alert.alert('Error', result.error || 'Invalid or expired verification code');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while verifying code');
      console.error('Verify code error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    console.log('🔄 VerifyPhoneScreen: Повторная отправка кода');
    console.log('📱 Номер телефона:', phoneNumber);
    
    setResendLoading(true);
    try {
      const result = await authService.sendLoginCode(phoneNumber);
      
      if (result.success) {
        console.log('✅ Код отправлен повторно');
        Alert.alert('Success', 'Verification code sent again');
        setTimeLeft(60);
        setCanResend(false);
        startTimer();
      } else {
        console.log('❌ Не удалось отправить код повторно');
        Alert.alert('Error', result.error || 'Failed to resend code');
      }
    } catch (error) {
      console.error('❌ Ошибка повторной отправки:', error);
      Alert.alert('Error', 'An error occurred while sending code');
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
      ? 'Registration Verification'
      : 'Password Recovery';
  };

  const getDescription = () => {
    return type === 'registration'
      ? 'Enter the code sent to your phone number to complete registration'
      : 'Enter the code sent to your phone number to recover your password';
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
              label="Verification Code"
              value={code}
              onChangeText={(text) => setCode(text.replace(/\D/g, '').slice(0, 6))}
              keyboardType="numeric"
              mode="outlined"
              style={styles.input}
              placeholder="Verification code"
              maxLength={6}
              textAlign="center"
              autoFocus={true}
            />
            <HelperText type="info" visible={true}>
              Enter the 6-digit code from SMS
            </HelperText>

            <Button
              mode="contained"
              onPress={handleVerifyCode}
              loading={loading}
              disabled={loading || code.length !== 6}
              style={styles.button}
            >
              Verify
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
                  {resendLoading ? 'Sending...' : 'Resend Code'}
                </Button>
              ) : (
                <Text style={styles.timerText}>
                  Resend in {formatTime(timeLeft)}
                </Text>
              )}
            </View>

            <View style={styles.linkContainer}>
              <Button
                mode="text"
                onPress={() => navigation.goBack()}
                style={styles.link}
              >
                Change phone number
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