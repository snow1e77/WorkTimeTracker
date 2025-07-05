import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { TextInput, Button, List, Searchbar, Text, Card } from 'react-native-paper';
import { CountryCode } from 'libphonenumber-js';
import { 
  formatPhoneNumberAsYouType, 
  isValidInternationalPhoneNumber, 
  getPhoneNumberHint,
  POPULAR_COUNTRY_CODES,
  autoDetectUserCountry
} from '../utils/phoneUtils';
import logger from '../utils/logger';

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
  autoDetectCountry?: boolean;
}

interface CountryItem {
  code: CountryCode;
  name: string;
  callingCode: string;
  flag?: string;
}

// Extended list of countries with flags (emojis)
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
  showCountryPicker = true,
  autoDetectCountry = true
}: Props) {
  const [countryPickerVisible, setCountryPickerVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentCountry, setCurrentCountry] = useState<CountryCode>(selectedCountry);
  const [formattedValue, setFormattedValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);
  const [isDetectingCountry, setIsDetectingCountry] = useState(false);
  const hasDetectedCountry = useRef(false);

  // Filter countries by search query with memoization
  const filteredCountries = useMemo(() => {
    return COUNTRIES_WITH_FLAGS.filter(country =>
      country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      country.callingCode.includes(searchQuery) ||
      country.code.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  // Get current country data with memoization
  const currentCountryData = useMemo(() => {
    return COUNTRIES_WITH_FLAGS.find(c => c.code === currentCountry);
  }, [currentCountry]);

  // Memoize hint generation
  const hint = useMemo(() => {
    if (currentCountry) {
      return getPhoneNumberHint(currentCountry);
    }
    return 'Format: +X XXX XXX XXXX';
  }, [currentCountry]);

  // Memoize validation
  const isValid = useMemo(() => {
    return value ? isValidInternationalPhoneNumber(value, currentCountry) : true;
  }, [value, currentCountry]);

  // Auto-detect country on component load
  useEffect(() => {
    if (autoDetectCountry && !isDetectingCountry && !hasDetectedCountry.current) {
      hasDetectedCountry.current = true;
      setIsDetectingCountry(true);
      
      const detectCountry = async () => {
        try {
          const detectedCountry = await autoDetectUserCountry();
          if (detectedCountry) {
            setCurrentCountry(detectedCountry);
            onCountryChange?.(detectedCountry);
          }
        } catch (error) {
          // Silently handle error - fallback to default country
          logger.warn('Country detection failed', { error: error instanceof Error ? error.message : 'Unknown error' });
          setCurrentCountry('US');
          onCountryChange?.('US');
        } finally {
          setIsDetectingCountry(false);
        }
      };
      
      detectCountry();
    }
  }, [autoDetectCountry, isDetectingCountry]);

  useEffect(() => {
    // Format number on change
    if (value !== formattedValue) {
      try {
        const formatted = formatPhoneNumberAsYouType(value, currentCountry);
        setFormattedValue(formatted);
      } catch (error) {
        // If formatting fails, use original value
        logger.warn('Phone formatting failed', { error: error instanceof Error ? error.message : 'Unknown error', value });
        setFormattedValue(value);
      }
    }
  }, [value, currentCountry, formattedValue]);

  const handleCountrySelect = (country: CountryItem) => {
    setCurrentCountry(country.code);
    setCountryPickerVisible(false);
    setSearchQuery('');
    onCountryChange?.(country.code);
    
    // Reformat current number for new country
    if (value) {
      try {
        const newFormatted = formatPhoneNumberAsYouType(value, country.code);
        setFormattedValue(newFormatted);
        onChangeText(newFormatted);
      } catch (error) {
        // If formatting fails, use original value
        logger.warn('Phone formatting failed', { error: error instanceof Error ? error.message : 'Unknown error', value, country: country.code });
        setFormattedValue(value);
        onChangeText(value);
      }
    }
  };

  const handleTextChange = (text: string) => {
    try {
      const formatted = formatPhoneNumberAsYouType(text, currentCountry);
      setFormattedValue(formatted);
      onChangeText(formatted);
    } catch (error) {
      // If formatting fails, use original text
      logger.warn('Phone formatting failed', { error: error instanceof Error ? error.message : 'Unknown error', text, country: currentCountry });
      setFormattedValue(text);
      onChangeText(text);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.phoneInputWrapper}>
        {showCountryPicker ? (
          <TouchableOpacity
            style={[
              styles.countryButton,
              (countryPickerVisible || isFocused) && styles.countryButtonActive,
              error && styles.countryButtonError
            ]}
            onPress={() => setCountryPickerVisible(!countryPickerVisible)}
            disabled={disabled || isDetectingCountry}
            activeOpacity={0.7}
          >
            {isDetectingCountry ? (
              <>
                <Text style={styles.flag}>🔍</Text>
                <Text style={[styles.callingCode, styles.detectingText]}>...</Text>
              </>
            ) : (
              <>
                <Text style={styles.flag}>{currentCountryData?.flag || '🌍'}</Text>
                <Text style={styles.callingCode}>{currentCountryData?.callingCode || '+X'}</Text>
              </>
            )}
          </TouchableOpacity>
        ) : null}
        
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
      
      {isDetectingCountry ? (
        <Text style={styles.detectingHelperText}>🔍 Detecting your country...</Text>
      ) : null}
      
      {(value && !isValid) ? (
        <Text style={styles.helperText}>Invalid phone number</Text>
      ) : null}
      {(!value || isValid) && !isDetectingCountry ? (
        <Text style={styles.hintText}>{hint}</Text>
      ) : null}

      {/* Country Picker */}
      {countryPickerVisible && (
        <Card style={styles.countryPicker}>
          <Card.Content>
            <Text style={styles.pickerTitle}>Select country</Text>
            
            <Searchbar
              placeholder="Search country..."
              onChangeText={setSearchQuery}
              value={searchQuery}
              style={styles.searchBar}
            />
            
            <ScrollView style={styles.countryList} showsVerticalScrollIndicator={true}>
              {filteredCountries.slice(0, 10).map((item) => (
                <List.Item
                  key={item.code}
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
              ))}
            </ScrollView>
            
            <Button
              mode="text"
              onPress={() => setCountryPickerVisible(false)}
              style={styles.closeButton}
            >
              Close
            </Button>
          </Card.Content>
        </Card>
      )}
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
    // Additional styles for input with country selector
  },
  countryPicker: {
    marginTop: 8,
    elevation: 4,
    backgroundColor: 'white',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    color: '#1C1B1F',
  },
  searchBar: {
    marginBottom: 16,
  },
  countryList: {
    maxHeight: 300,
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
    marginTop: 16,
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
  detectingText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6750A4',
    fontStyle: 'italic',
  },
  detectingHelperText: {
    fontSize: 12,
    color: '#6750A4',
    marginTop: 4,
    marginLeft: 16,
    fontStyle: 'italic',
  },
}); 
