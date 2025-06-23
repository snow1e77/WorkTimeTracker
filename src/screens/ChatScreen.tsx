import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  Dimensions,
  Linking,
  TouchableOpacity
} from 'react-native';
import {
  TextInput,
  Button,
  Card,
  Text,
  Chip,
  IconButton,
  Portal,
  Modal,
  Divider
} from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';
import { Chat, ChatMessage, DailyTask } from '../types';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { ApiDatabaseService } from '../services/ApiDatabaseService';

const { width: screenWidth } = Dimensions.get('window');

export default function ChatScreen() {
  const { user } = useAuth();
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [todaysTask, setTodaysTask] = useState<DailyTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  const flatListRef = useRef<FlatList>(null);
  const apiService = ApiDatabaseService.getInstance();

  useEffect(() => {
    loadChat();
    // Set up polling for new messages
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadChat = async () => {
    try {
      setLoading(true);
      const response = await apiService.getWorkerChat();
      
      if (response.success && response.data) {
        setChat(response.data);
        await loadMessages();
        await loadTodaysTask(response.data.id);
      }
    } catch (error) {
      console.error('Error loading chat:', error);
      Alert.alert('Error', 'Failed to load chat');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    if (!chat) return;
    
    try {
      const response = await apiService.getChatMessages(chat.id);
      if (response.success && response.data) {
        setMessages(response.data);
        // Scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const loadTodaysTask = async (chatId: string) => {
    try {
      const response = await apiService.getTodaysTask(chatId);
      if (response.success && response.data) {
        setTodaysTask(response.data);
      }
    } catch (error) {
      console.error('Error loading today\'s task:', error);
    }
  };

  const sendMessage = async (messageType: 'text' | 'photo', content: string, photoUri?: string, location?: { latitude: number; longitude: number }) => {
    if (!chat || sending) return;

    try {
      setSending(true);
      
      const messageData = {
        chatId: chat.id,
        messageType,
        content,
        photoUri,
        latitude: location?.latitude,
        longitude: location?.longitude
      };

      const response = await apiService.sendMessage(messageData);
      
      if (response.success) {
        setNewMessage('');
        await loadMessages();
      } else {
        Alert.alert('Error', response.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleSendText = () => {
    if (newMessage.trim()) {
      sendMessage('text', newMessage.trim());
    }
  };

  const handleSendPhoto = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'We need camera roll permissions to send photos');
        return;
      }

      const locationPermission = await Location.requestForegroundPermissionsAsync();
      if (locationPermission.status !== 'granted') {
        Alert.alert('Permission needed', 'We need location permissions to send photos with location');
        return;
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({});

      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        const currentTime = new Date().toLocaleTimeString();
        
        await sendMessage(
          'photo',
          `📷 Work photo taken at ${currentTime}`,
          imageUri,
          {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude
          }
        );
      }
    } catch (error) {
      console.error('Error sending photo:', error);
      Alert.alert('Error', 'Failed to send photo');
    }
  };

  const handleTakePhoto = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'We need camera permissions to take photos');
        return;
      }

      const locationPermission = await Location.requestForegroundPermissionsAsync();
      if (locationPermission.status !== 'granted') {
        Alert.alert('Permission needed', 'We need location permissions to send photos with location');
        return;
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({});

      // Take photo
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        const currentTime = new Date().toLocaleTimeString();
        
        await sendMessage(
          'photo',
          `📷 Work photo taken at ${currentTime}`,
          imageUri,
          {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude
          }
        );
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const openImageModal = (imageUri: string) => {
    setSelectedImage(imageUri);
    setImageModalVisible(true);
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString();
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isOwnMessage = item.senderId === user?.id;
    
    return (
      <View style={[styles.messageContainer, isOwnMessage ? styles.ownMessage : styles.otherMessage]}>
        <Card style={[styles.messageCard, isOwnMessage ? styles.ownMessageCard : styles.otherMessageCard]}>
          <Card.Content style={styles.messageContent}>
            {!isOwnMessage && (
              <Text style={styles.senderName}>{item.senderName}</Text>
            )}
            
            {item.messageType === 'task' && (
              <Chip icon="clipboard-text" style={styles.taskChip}>
                Task
              </Chip>
            )}
            
            {item.messageType === 'photo' && (
              <Chip icon="camera" style={styles.photoChip}>
                Photo
              </Chip>
            )}
            
            <Text style={styles.messageText}>{item.content}</Text>
            
            {item.photoUri && (
              <View style={styles.imageContainer}>
                <TouchableOpacity onPress={() => openImageModal(item.photoUri!)}>
                  <Image 
                    source={{ uri: item.photoUri }} 
                    style={styles.messageImage}
                  />
                </TouchableOpacity>
                {item.latitude && item.longitude && (
                  <Button
                    mode="text"
                    icon="map-marker"
                    onPress={() => {
                      const url = `https://maps.google.com/?q=${item.latitude},${item.longitude}`;
                      Linking.openURL(url);
                    }}
                    style={styles.locationButton}
                  >
                    View Location
                  </Button>
                )}
              </View>
            )}
            
            <Text style={styles.messageTime}>{formatTime(item.timestamp)}</Text>
          </Card.Content>
        </Card>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading chat...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Today's Task Section */}
      {todaysTask && (
        <Card style={styles.taskCard}>
          <Card.Content>
            <View style={styles.taskHeader}>
              <Chip icon="clipboard-text" style={styles.taskHeaderChip}>
                Today's Task
              </Chip>
            </View>
            <Text style={styles.taskDescription}>{todaysTask.taskDescription}</Text>
            <Text style={styles.taskDate}>
              Assigned: {formatDate(todaysTask.assignedDate)}
            </Text>
          </Card.Content>
        </Card>
      )}

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        style={styles.messagesList}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      <Divider />

      {/* Input Section */}
      <View style={styles.inputContainer}>
        <View style={styles.photoButtons}>
          <IconButton
            icon="camera"
            mode="contained"
            onPress={handleTakePhoto}
            style={styles.photoButton}
          />
          <IconButton
            icon="image"
            mode="contained"
            onPress={handleSendPhoto}
            style={styles.photoButton}
          />
        </View>
        
        <View style={styles.textInputContainer}>
          <TextInput
            style={styles.textInput}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type a message..."
            multiline
            maxLength={500}
          />
          <IconButton
            icon="send"
            mode="contained"
            onPress={handleSendText}
            disabled={!newMessage.trim() || sending}
            style={styles.sendButton}
          />
        </View>
      </View>

      {/* Image Modal */}
      <Portal>
        <Modal
          visible={imageModalVisible}
          onDismiss={() => setImageModalVisible(false)}
          contentContainerStyle={styles.imageModal}
        >
          {selectedImage && (
            <Image
              source={{ uri: selectedImage }}
              style={styles.fullScreenImage}
              resizeMode="contain"
            />
          )}
          <IconButton
            icon="close"
            mode="contained"
            onPress={() => setImageModalVisible(false)}
            style={styles.closeButton}
          />
        </Modal>
      </Portal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskCard: {
    margin: 16,
    backgroundColor: '#e3f2fd',
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  taskHeaderChip: {
    backgroundColor: '#1976d2',
  },
  taskDescription: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  taskDate: {
    fontSize: 12,
    color: '#666',
  },
  messagesList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  messageContainer: {
    marginVertical: 4,
  },
  ownMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  messageCard: {
    maxWidth: screenWidth * 0.8,
  },
  ownMessageCard: {
    backgroundColor: '#dcf8c6',
  },
  otherMessageCard: {
    backgroundColor: '#ffffff',
  },
  messageContent: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  senderName: {
    fontWeight: 'bold',
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  taskChip: {
    backgroundColor: '#ff9800',
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  photoChip: {
    backgroundColor: '#4caf50',
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  messageText: {
    fontSize: 16,
    marginBottom: 4,
  },
  messageTime: {
    fontSize: 11,
    color: '#666',
    textAlign: 'right',
  },
  imageContainer: {
    marginVertical: 8,
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
    marginBottom: 8,
  },
  locationButton: {
    alignSelf: 'flex-start',
  },
  inputContainer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  photoButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
  },
  photoButton: {
    marginHorizontal: 8,
  },
  textInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    marginRight: 8,
    backgroundColor: '#f5f5f5',
  },
  sendButton: {
    alignSelf: 'flex-end',
  },
  imageModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: screenWidth,
    height: '80%',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
}); 