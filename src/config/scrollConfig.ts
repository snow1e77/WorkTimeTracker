import { Platform } from 'react-native';

// Оптимальные настройки для ScrollView в iOS симуляторе
export const scrollViewConfig = {
  keyboardShouldPersistTaps: 'handled' as const,
  showsVerticalScrollIndicator: Platform.OS === 'ios',
  bounces: Platform.OS === 'ios',
  scrollEventThrottle: 16,
  // Для лучшей производительности в симуляторе
  removeClippedSubviews: Platform.OS === 'android',
  decelerationRate: Platform.OS === 'ios' ? 'normal' as const : 'fast' as const,
};

// Стили для contentContainerStyle
export const scrollContentStyle = {
  flexGrow: 1,
  paddingBottom: 20,
};

// Настройки для FlatList
export const flatListConfig = {
  keyboardShouldPersistTaps: 'handled' as const,
  showsVerticalScrollIndicator: Platform.OS === 'ios',
  bounces: Platform.OS === 'ios',
  scrollEventThrottle: 16,
  removeClippedSubviews: Platform.OS === 'android',
  // Для лучшей производительности
  getItemLayout: undefined, // Устанавливается в каждом компоненте отдельно
  maxToRenderPerBatch: 10,
  updateCellsBatchingPeriod: 50,
  initialNumToRender: 10,
  windowSize: 21,
};

// Настройки KeyboardAvoidingView для iOS
export const keyboardAvoidingConfig = {
  behavior: Platform.OS === 'ios' ? 'padding' as const : 'height' as const,
  keyboardVerticalOffset: Platform.OS === 'ios' ? 64 : 0,
}; 