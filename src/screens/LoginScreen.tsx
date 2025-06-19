import React, { useState } from 'react';
import { View, StyleSheet, Alert, Keyboard, TouchableWithoutFeedback } from 'react-native';
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

  const [step, setStep] = useState<'phone' | 'code' | 'profile'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>('US');
  const [smsCode, setSmsCode] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [userExists, setUserExists] = useState(false);

  const validatePhoneNumber = () => {
    if (!isValidInternationalPhoneNumber(phoneNumber, selectedCountry)) {
      Alert.alert('Error', 'Enter a valid phone number');
      return false;
    }
    return true;
  };

  const handleSendCode = async () => {
    if (!validatePhoneNumber()) return;

    setLoading(true);
    try {
      const cleanPhone = getCleanInternationalPhoneNumber(phoneNumber, selectedCountry);
      const result = await authService.sendLoginCode(cleanPhone);

      if (result.success) {
        setUserExists(result.userExists);
        setStep('code');
        Alert.alert(
          'Code Sent', 
          `SMS code sent to ${cleanPhone}. ${result.userExists ? 'Sign in to your account.' : 'Create your profile.'}`
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to send code');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while sending code');
      console.error('Send code error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!smsCode || smsCode.length !== 6) {
      Alert.alert('Error', 'Enter the 6-digit code from SMS');
      return;
    }

    setLoading(true);
    try {
      const cleanPhone = getCleanInternationalPhoneNumber(phoneNumber, selectedCountry);
      const result = await authService.verifyLoginCode(cleanPhone, smsCode);

      if (result.success) {
        if (result.user) {
          // Пользователь существовал и вошел в систему
          Alert.alert('Welcome!', `Hello, ${result.user.name}!`, [
            { text: 'OK', onPress: () => navigation.navigate('Home') }
          ]);
        } else if (result.needsProfile) {
          // Новый пользователь - нужно создать профиль
          setStep('profile');
        }
      } else {
        Alert.alert('Error', result.error || 'Invalid code');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while verifying code');
      console.error('Verify code error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProfile = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your full name');
      return;
    }

    if (name.trim().length < 2) {
      Alert.alert('Error', 'Name must be at least 2 characters long');
      return;
    }

    setLoading(true);
    try {
      const cleanPhone = getCleanInternationalPhoneNumber(phoneNumber, selectedCountry);
      const result = await authService.createUserProfile(cleanPhone, name.trim(), smsCode);

      if (result.success && result.user) {
        Alert.alert('Registration Complete!', `Welcome, ${result.user.name}!`, [
          { text: 'OK', onPress: () => navigation.navigate('Home') }
        ]);
      } else {
        Alert.alert('Error', result.error || 'Failed to create profile');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while creating profile');
      console.error('Create profile error:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderPhoneStep = () => (
    <>
      <Title style={styles.title}>Sign In</Title>
      
      <Text style={styles.description}>
        Enter your phone number to receive an SMS code
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
        Get Code
      </Button>
    </>
  );

  const renderCodeStep = () => (
    <>
      <Title style={styles.title}>
        {userExists ? 'Sign In' : 'Phone Verification'}
      </Title>
      
      <Text style={styles.description}>
        {userExists 
          ? 'Enter the SMS code to sign in to your account'
          : 'Enter the SMS code to verify your phone number'
        }
      </Text>

      <Text style={styles.phoneNumber}>
        {getCleanInternationalPhoneNumber(phoneNumber, selectedCountry)}
      </Text>
      
      <TextInput
        label="SMS Code"
        value={smsCode}
        onChangeText={(text) => setSmsCode(text.replace(/\D/g, '').slice(0, 6))}
        keyboardType="numeric"
        mode="outlined"
        style={styles.input}
        placeholder="Enter SMS code"
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
        disabled={loading || smsCode.length !== 6}
        style={styles.button}
      >
        {userExists ? 'Sign In' : 'Verify'}
      </Button>

      <View style={styles.linkContainer}>
        <Button
          mode="text"
          onPress={() => setStep('phone')}
          style={styles.link}
        >
          Change phone number
        </Button>
      </View>
    </>
  );

  const renderProfileStep = () => (
    <>
      <Title style={styles.title}>Create Profile</Title>
      
      <Text style={styles.description}>
        Welcome! Enter your full name to complete registration
      </Text>

      <TextInput
        label="Full name"
        value={name}
        onChangeText={setName}
        mode="outlined"
        style={styles.input}
        placeholder="Enter your full name"
        autoCapitalize="words"
        autoFocus={true}
      />

      <Button
        mode="contained"
        onPress={handleCreateProfile}
        loading={loading}
        disabled={loading || !name.trim()}
        style={styles.button}
      >
        Create Profile
      </Button>
    </>
  );

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <Card style={styles.card}>
          <Card.Content>
            {step === 'phone' ? renderPhoneStep() : null}
            {step === 'code' ? renderCodeStep() : null}
            {step === 'profile' ? renderProfileStep() : null}
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
    marginBottom: 16,
    fontSize: 18,
    fontWeight: 'bold',
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
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  link: {
    marginLeft: -8,
  },
}); 