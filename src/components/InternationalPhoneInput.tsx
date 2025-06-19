import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Modal, FlatList, TouchableOpacity } from 'react-native';
import { TextInput, Button, List, Searchbar, Text, Portal, Surface } from 'react-native-paper';
import { CountryCode } from 'libphonenumber-js';
import { 
  formatPhoneNumberAsYouType, 
  isValidInternationalPhoneNumber, 
  getPhoneNumberHint,
  POPULAR_COUNTRY_CODES 
} from '../utils/phoneUtils';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  onCountryChange?: (countryCode: CountryCode) => void;
  label?: string;
  placeholder?: string;
  error?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  selectedCountry?: CountryCode;
  mode?: 'outlined' | 'flat';
  showCountryPicker?: boolean;
}

interface CountryItem {
  code: CountryCode;
  name: string;
  callingCode: string;
  flag?: string;
}

// Расширенный список стран с флагами (эмодзи)
const COUNTRIES_WITH_FLAGS: CountryItem[] = [
  { code: 'US', name: 'United States', callingCode: '+1', flag: '🇺🇸' },
  { code: 'CA', name: 'Canada', callingCode: '+1', flag: '🇨🇦' },
  { code: 'GB', name: 'United Kingdom', callingCode: '+44', flag: '🇬🇧' },
  { code: 'DE', name: 'Germany', callingCode: '+49', flag: '🇩🇪' },
  { code: 'FR', name: 'France', callingCode: '+33', flag: '🇫🇷' },
  { code: 'ES', name: 'Spain', callingCode: '+34', flag: '🇪🇸' },
  { code: 'IT', name: 'Italy', callingCode: '+39', flag: '🇮🇹' },
  { code: 'RU', name: 'Russia', callingCode: '+7', flag: '🇷🇺' },
  { code: 'CN', name: 'China', callingCode: '+86', flag: '🇨🇳' },
  { code: 'JP', name: 'Japan', callingCode: '+81', flag: '🇯🇵' },
  { code: 'KR', name: 'South Korea', callingCode: '+82', flag: '🇰🇷' },
  { code: 'AU', name: 'Australia', callingCode: '+61', flag: '🇦🇺' },
  { code: 'IN', name: 'India', callingCode: '+91', flag: '🇮🇳' },
  { code: 'BR', name: 'Brazil', callingCode: '+55', flag: '🇧🇷' },
  { code: 'MX', name: 'Mexico', callingCode: '+52', flag: '🇲🇽' },
  { code: 'SE', name: 'Sweden', callingCode: '+46', flag: '🇸🇪' },
  { code: 'NO', name: 'Norway', callingCode: '+47', flag: '🇳🇴' },
  { code: 'FI', name: 'Finland', callingCode: '+358', flag: '🇫🇮' },
  { code: 'DK', name: 'Denmark', callingCode: '+45', flag: '🇩🇰' },
  { code: 'NL', name: 'Netherlands', callingCode: '+31', flag: '🇳🇱' },
  { code: 'BE', name: 'Belgium', callingCode: '+32', flag: '🇧🇪' },
  { code: 'CH', name: 'Switzerland', callingCode: '+41', flag: '🇨🇭' },
  { code: 'AT', name: 'Austria', callingCode: '+43', flag: '🇦🇹' },
  { code: 'PL', name: 'Poland', callingCode: '+48', flag: '🇵🇱' },
  { code: 'CZ', name: 'Czech Republic', callingCode: '+420', flag: '🇨🇿' },
  { code: 'UA', name: 'Ukraine', callingCode: '+380', flag: '🇺🇦' },
  { code: 'AR', name: 'Argentina', callingCode: '+54', flag: '🇦🇷' },
  { code: 'CL', name: 'Chile', callingCode: '+56', flag: '🇨🇱' },
  { code: 'CO', name: 'Colombia', callingCode: '+57', flag: '🇨🇴' },
  { code: 'PE', name: 'Peru', callingCode: '+51', flag: '🇵🇪' },
  { code: 'AE', name: 'United Arab Emirates', callingCode: '+971', flag: '🇦🇪' },
  { code: 'SA', name: 'Saudi Arabia', callingCode: '+966', flag: '🇸🇦' },
  { code: 'ZA', name: 'South Africa', callingCode: '+27', flag: '🇿🇦' },
  { code: 'EG', name: 'Egypt', callingCode: '+20', flag: '🇪🇬' },
  { code: 'IL', name: 'Israel', callingCode: '+972', flag: '🇮🇱' },
  { code: 'TR', name: 'Turkey', callingCode: '+90', flag: '🇹🇷' },
  { code: 'SG', name: 'Singapore', callingCode: '+65', flag: '🇸🇬' },
  { code: 'HK', name: 'Hong Kong', callingCode: '+852', flag: '🇭🇰' },
  { code: 'TW', name: 'Taiwan', callingCode: '+886', flag: '🇹🇼' },
  { code: 'TH', name: 'Thailand', callingCode: '+66', flag: '🇹🇭' },
  { code: 'MY', name: 'Malaysia', callingCode: '+60', flag: '🇲🇾' },
  { code: 'ID', name: 'Indonesia', callingCode: '+62', flag: '🇮🇩' },
  { code: 'PH', name: 'Philippines', callingCode: '+63', flag: '🇵🇭' },
  { code: 'VN', name: 'Vietnam', callingCode: '+84', flag: '🇻🇳' },
  { code: 'NZ', name: 'New Zealand', callingCode: '+64', flag: '🇳🇿' },
];

export default function InternationalPhoneInput({
  value,
  onChangeText,
  onCountryChange,
  label = 'Phone number',
  placeholder = 'Enter phone number',
  error = false,
  disabled = false,
  autoFocus = false,
  selectedCountry = 'US',
  mode = 'outlined',
  showCountryPicker = true
}: Props) {
  const [countryPickerVisible, setCountryPickerVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentCountry, setCurrentCountry] = useState<CountryCode>(selectedCountry);
  const [formattedValue, setFormattedValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);

  // Фильтрация стран по поисковому запросу
  const filteredCountries = COUNTRIES_WITH_FLAGS.filter(country =>
    country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    country.callingCode.includes(searchQuery) ||
    country.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Получение текущей страны
  const currentCountryData = COUNTRIES_WITH_FLAGS.find(c => c.code === currentCountry);

  useEffect(() => {
    // Форматирование номера при изменении
    if (value !== formattedValue) {
      const formatted = formatPhoneNumberAsYouType(value, currentCountry);
      setFormattedValue(formatted);
    }
  }, [value, currentCountry]);

  const handleCountrySelect = (country: CountryItem) => {
    setCurrentCountry(country.code);
    setCountryPickerVisible(false);
    setSearchQuery('');
    onCountryChange?.(country.code);
    
    // Переформатируем текущий номер для новой страны
    if (value) {
      const newFormatted = formatPhoneNumberAsYouType(value, country.code);
      setFormattedValue(newFormatted);
      onChangeText(newFormatted);
    }
  };

  const handleTextChange = (text: string) => {
    const formatted = formatPhoneNumberAsYouType(text, currentCountry);
    setFormattedValue(formatted);
    onChangeText(formatted);
  };

  const renderCountryItem = ({ item }: { item: CountryItem }) => (
    <List.Item
      title={item.name}
      description={item.callingCode}
      left={() => (
        <View style={styles.flagContainer}>
          <Text style={styles.flag}>{item.flag}</Text>
        </View>
      )}
      onPress={() => handleCountrySelect(item)}
      style={styles.countryItem}
    />
  );

  const getHint = () => {
    if (currentCountry) {
      return getPhoneNumberHint(currentCountry);
    }
    return 'Format: +X XXX XXX XXXX';
  };

  const isValid = value ? isValidInternationalPhoneNumber(value, currentCountry) : true;

  return (
    <View style={styles.container}>
      <View style={styles.phoneInputWrapper}>
        {showCountryPicker && (
          <TouchableOpacity
            style={[
              styles.countryButton,
              (countryPickerVisible || isFocused) && styles.countryButtonActive,
              error && styles.countryButtonError
            ]}
            onPress={() => setCountryPickerVisible(true)}
            disabled={disabled}
            activeOpacity={0.7}
          >
            <Text style={styles.flag}>{currentCountryData?.flag || '🌍'}</Text>
            <Text style={styles.callingCode}>{currentCountryData?.callingCode || '+X'}</Text>
          </TouchableOpacity>
        )}
        
        <TextInput
          label={label}
          value={formattedValue}
          onChangeText={handleTextChange}
          placeholder={placeholder}
          keyboardType="phone-pad"
          mode={mode}
          error={error || (!isValid && value.length > 0)}
          disabled={disabled}
          autoFocus={autoFocus}
          style={[styles.phoneInput, showCountryPicker && styles.phoneInputWithCountry]}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
      </View>
      
      {(value && !isValid) && (
        <Text style={styles.helperText}>Invalid phone number</Text>
      )}
      {(!value || isValid) && (
        <Text style={styles.hintText}>{getHint()}</Text>
      )}

      <Portal>
        <Modal
          visible={countryPickerVisible}
          onDismiss={() => setCountryPickerVisible(false)}
        >
          <View style={styles.modalContainer}>
            <Surface style={styles.modalSurface}>
            <Text style={styles.modalTitle}>Select country</Text>
            
            <Searchbar
              placeholder="Search country..."
              onChangeText={setSearchQuery}
              value={searchQuery}
              style={styles.searchBar}
            />
            
            <FlatList
              data={filteredCountries}
              renderItem={renderCountryItem}
              keyExtractor={item => item.code}
              style={styles.countryList}
              showsVerticalScrollIndicator={true}
            />
            
            <Button
              mode="text"
              onPress={() => setCountryPickerVisible(false)}
              style={styles.closeButton}
            >
              Close
            </Button>
          </Surface>
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  phoneInputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  countryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 16,
    borderRadius: 4,
    marginRight: 8,
    minWidth: 75,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#79747E',
    marginTop: 8,
  },
  countryButtonActive: {
    borderColor: '#6750A4',
    borderWidth: 2,
  },
  countryButtonError: {
    borderColor: '#B3261E',
    borderWidth: 2,
  },
  flag: {
    fontSize: 16,
    marginRight: 3,
  },
  callingCode: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1C1B1F',
  },
  phoneInput: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  phoneInputWithCountry: {
    // Дополнительные стили для поля с селектором страны
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalSurface: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    maxHeight: '80%',
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#1C1B1F',
  },
  searchBar: {
    marginBottom: 16,
  },
  countryList: {
    maxHeight: 400,
  },
  countryItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E7E0EC',
  },
  flagContainer: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    marginTop: 20,
  },
  helperText: {
    fontSize: 12,
    color: '#B3261E',
    marginTop: 4,
    marginLeft: 16,
  },
  hintText: {
    fontSize: 12,
    color: '#49454F',
    marginTop: 4,
    marginLeft: 16,
  },
}); 