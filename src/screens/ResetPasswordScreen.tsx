import React, { useState } from 'react';
import { View, StyleSheet, Alert, Keyboard, TouchableWithoutFeedback, ScrollView } from 'react-native';
import { Text, TextInput, Button, Card, Title, HelperText } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CountryCode } from 'libphonenumber-js';
import { RootStackParamList } from '../types';
import { AuthService } from '../services/AuthService';
import { 
  getCleanInternationalPhoneNumber, 
  isValidInternationalPhoneNumber, 
  formatInternationalPhoneNumber 
} from '../utils/phoneUtils';
import InternationalPhoneInput from '../components/InternationalPhoneInput';

type ResetPasswordScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ResetPassword'>;

export default function ResetPasswordScreen() {
  const navigation = useNavigation<ResetPasswordScreenNavigationProp>();
  const authService = AuthService.getInstance();

  const [step, setStep] = useState<'phone' | 'verify' | 'newPassword'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>('US');
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSendCode = async () => {
    if (!isValidInternationalPhoneNumber(phoneNumber, selectedCountry)) {
      Alert.alert('Error', 'Enter a valid phone number');
      return;
    }

    const cleanPhone = getCleanInternationalPhoneNumber(phoneNumber, selectedCountry);

    setLoading(true);
    try {
      const sent = await authService.sendVerificationCode(cleanPhone, 'password_reset');
      
      if (sent) {
        Alert.alert('Success', 'Recovery code sent to your phone number');
        setStep('verify');
      } else {
        Alert.alert('Error', 'Failed to send recovery code');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while sending code');
      console.error('Send reset code error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      Alert.alert('Error', 'Enter a 6-digit verification code');
      return;
    }

    setLoading(true);
    try {
      const cleanPhone = getCleanInternationalPhoneNumber(phoneNumber, selectedCountry);
      const isValid = await authService.verifyCode(cleanPhone, verificationCode, 'password_reset');
      
      if (isValid) {
        setStep('newPassword');
      } else {
        Alert.alert('Error', 'Invalid or expired verification code');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while verifying code');
      console.error('Verify reset code error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const cleanPhone = getCleanInternationalPhoneNumber(phoneNumber, selectedCountry);
      const result = await authService.resetPassword({
        phoneNumber: cleanPhone,
        newPassword,
        verificationCode
      });

      if (result.success) {
        Alert.alert('Success', 'Password changed successfully!', [
          { text: 'OK', onPress: () => navigation.navigate('Login') }
        ]);
      } else {
        Alert.alert('Error', result.error || 'Error resetting password');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while resetting password');
      console.error('Reset password error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = () => {
    if (newPassword.length === 0) return '';
    if (newPassword.length < 6) return 'Weak';
    if (newPassword.length < 8) return 'Medium';
    if (newPassword.length >= 8 && /[A-Z]/.test(newPassword) && /[0-9]/.test(newPassword)) return 'Strong';
    return 'Medium';
  };

  const getPasswordStrengthColor = () => {
    const strength = getPasswordStrength();
    switch (strength) {
      case 'Weak': return '#f44336';
      case 'Medium': return '#ff9800';
      case 'Strong': return '#4caf50';
      default: return '#999';
    }
  };

  const renderPhoneStep = () => (
    <>
      <Title style={styles.title}>Reset Password</Title>
      
      <Text style={styles.description}>
        Enter the phone number associated with your account
      </Text>

      <InternationalPhoneInput
        label="Phone number"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        onCountryChange={setSelectedCountry}
        selectedCountry={selectedCountry}
        placeholder="Enter phone number"
        autoFocus={true}
      />

      <Button
        mode="contained"
        onPress={handleSendCode}
        loading={loading}
        disabled={loading}
        style={styles.button}
      >
        Send Code
      </Button>
    </>
  );

  const renderVerifyStep = () => (
    <>
      <Title style={styles.title}>Enter Code</Title>
      
      <Text style={styles.description}>
        Enter the recovery code sent to:
      </Text>

      <Text style={styles.phoneNumber}>
        {formatInternationalPhoneNumber(phoneNumber, selectedCountry)}
      </Text>
      
      <TextInput
        label="Verification code"
        value={verificationCode}
        onChangeText={(text) => setVerificationCode(text.replace(/\D/g, '').slice(0, 6))}
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
        disabled={loading || verificationCode.length !== 6}
        style={styles.button}
      >
        Verify Code
      </Button>

      <Button
        mode="text"
        onPress={() => setStep('phone')}
        style={styles.link}
      >
        Change phone number
      </Button>
    </>
  );

  const renderNewPasswordStep = () => (
    <>
      <Title style={styles.title}>New Password</Title>
      
      <Text style={styles.description}>
        Create a new password for your account
      </Text>

      <TextInput
        label="New password"
        value={newPassword}
        onChangeText={setNewPassword}
        secureTextEntry={!showPassword}
        mode="outlined"
        style={styles.input}
        placeholder="Enter new password"
        autoFocus={true}
        right={
          <TextInput.Icon 
            icon={showPassword ? "eye-off" : "eye"} 
            onPress={() => setShowPassword(!showPassword)}
          />
        }
      />
      {newPassword.length > 0 && (
        <HelperText type="info" visible={true} style={{ color: getPasswordStrengthColor() }}>
          Password strength: {getPasswordStrength()}
        </HelperText>
      )}

      <TextInput
        label="Confirm password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry={!showConfirmPassword}
        mode="outlined"
        style={styles.input}
        placeholder="Confirm new password"
        right={
          <TextInput.Icon 
            icon={showConfirmPassword ? "eye-off" : "eye"} 
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
          />
        }
      />

      <Button
        mode="contained"
        onPress={handleResetPassword}
        loading={loading}
        disabled={loading}
        style={styles.button}
      >
        Change Password
      </Button>

      <Button
        mode="text"
        onPress={() => setStep('verify')}
        style={styles.link}
      >
        Back to verification
      </Button>
    </>
  );

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <Card style={styles.card}>
          <Card.Content>
            {step === 'phone' && renderPhoneStep()}
            {step === 'verify' && renderVerifyStep()}
            {step === 'newPassword' && renderNewPasswordStep()}

            <View style={styles.linkContainer}>
              <Button
                mode="text"
                onPress={() => navigation.navigate('Login')}
                style={styles.link}
              >
                Back to Login
              </Button>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    justifyContent: 'center',
    padding: 20,
    minHeight: '100%',
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
    marginVertical: 8,
  },
}); 