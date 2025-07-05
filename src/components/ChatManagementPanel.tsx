import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Alert,
  Image,
  Dimensions,
  Platform,
  TouchableOpacity,
} from 'react-native';
import {
  Card,
  Text,
  Button,
  TextInput,
  List,
  Chip,
  Modal,
  Portal,
  IconButton,
  Divider,
  Dialog,
  Paragraph
} from 'react-native-paper';
import { Chat, ChatMessage, DailyTask } from '../types';
import { WebDatabaseService } from '../services/WebDatabaseService';
import logger from '../utils/logger';

const { width: screenWidth } = Dimensions.get('window');

interface ChatManagementPanelProps {
  visible: boolean;
  onClose: () => void;
}

export default function ChatManagementPanel({ visible, onClose }: ChatManagementPanelProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [newTask, setNewTask] = useState('');
  const [loading, setLoading] = useState(false);
  const [taskDialogVisible, setTaskDialogVisible] = useState(false);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const webDbService = WebDatabaseService.getInstance();

  useEffect(() => {
    if (visible) {
      loadChats();
    }
  }, [visible]);

  useEffect(() => {
    if (selectedChat) {
      loadMessages();
      // Set up polling for new messages
      const interval = setInterval(loadMessages, 5000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [selectedChat]);

  const loadChats = async () => {
    try {
      setLoading(true);
      const response = await webDbService.getForemanChats();
      
      if (response.success && response.data) {
        setChats(response.data);
      }
    } catch (error) {
      if (Platform.OS === 'web') {
        alert('Failed to load chats');
      } else {
        Alert.alert('Error', 'Failed to load chats');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    if (!selectedChat) return;

    try {
      const response = await webDbService.getChatMessages(selectedChat.id);
      if (response.success && response.data) {
        setMessages(response.data);
      }
    } catch (error) {
      logger.error('Failed to load chat messages', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        chatId: selectedChat?.id 
      }, 'chat');
    }
  };

  const sendMessage = async () => {
    if (!selectedChat || !newMessage.trim()) return;

    try {
      const response = await webDbService.sendMessage({
        chatId: selectedChat.id,
        messageType: 'text',
        content: newMessage.trim()
      });

      if (response.success) {
        setNewMessage('');
        await loadMessages();
        await loadChats(); // Refresh chat list to update last message
      } else {
        const errorMsg = response.error || 'Failed to send message';
        if (Platform.OS === 'web') {
          alert(errorMsg);
        } else {
          Alert.alert('Error', errorMsg);
        }
      }
    } catch (error) {
      if (Platform.OS === 'web') {
        alert('Failed to send message');
      } else {
        Alert.alert('Error', 'Failed to send message');
      }
    }
  };

  const assignTask = async () => {
    if (!selectedChat || !newTask.trim()) return;

    try {
      const response = await webDbService.assignTask({
        chatId: selectedChat.id,
        taskDescription: newTask.trim()
      });

      if (response.success) {
        setNewTask('');
        setTaskDialogVisible(false);
        await loadMessages();
        await loadChats();
        
        const successMsg = 'Task assigned successfully';
        if (Platform.OS === 'web') {
          alert(successMsg);
        } else {
          Alert.alert('Success', successMsg);
        }
      } else {
        const errorMsg = response.error || 'Failed to assign task';
        if (Platform.OS === 'web') {
          alert(errorMsg);
        } else {
          Alert.alert('Error', errorMsg);
        }
      }
    } catch (error) {
      if (Platform.OS === 'web') {
        alert('Failed to assign task');
      } else {
        Alert.alert('Error', 'Failed to assign task');
      }
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

  const getLastPhotoStatus = (chat: Chat) => {
    if (!chat.lastPhotoTime) return 'No photos';
    
    const timeDiff = Date.now() - new Date(chat.lastPhotoTime).getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    
    if (hoursDiff > 2) {
      return `⚠️ ${Math.floor(hoursDiff)}h ago`;
    } else if (hoursDiff > 1) {
      return `⏰ ${Math.floor(hoursDiff)}h ago`;
    } else {
      return '✅ Recent';
    }
  };

  const renderChatItem = ({ item }: { item: Chat }) => (
    <Card 
      style={[styles.chatItem, selectedChat?.id === item.id && styles.selectedChat]}
      onPress={() => setSelectedChat(item)}
    >
      <Card.Content>
        <View style={styles.chatHeader}>
          <Text style={styles.workerName}>{item.workerName}</Text>
          {item.unreadCount > 0 && (
            <Chip style={styles.unreadChip}>{item.unreadCount}</Chip>
          )}
        </View>
        
        {item.currentTask && (
          <Text style={styles.currentTask} numberOfLines={1}>
            📋 {item.currentTask}
          </Text>
        )}
        
        {item.lastMessage && (
          <Text style={styles.lastMessage} numberOfLines={2}>
            {item.lastMessage.content}
          </Text>
        )}
        
        <View style={styles.chatFooter}>
          <Text style={styles.photoStatus}>
            {getLastPhotoStatus(item)}
          </Text>
          {item.lastMessage && (
            <Text style={styles.lastMessageTime}>
              {formatTime(item.lastMessage.timestamp)}
            </Text>
          )}
        </View>
      </Card.Content>
    </Card>
  );

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isFromForeman = item.senderRole === 'admin';
    
    return (
      <View style={[styles.messageContainer, isFromForeman ? styles.foremanMessage : styles.workerMessage]}>
        <Card style={[styles.messageCard, isFromForeman ? styles.foremanMessageCard : styles.workerMessageCard]}>
          <Card.Content style={styles.messageContent}>
            <View style={styles.messageHeader}>
              <Text style={styles.senderName}>{item.senderName}</Text>
              <Text style={styles.messageTime}>{formatTime(item.timestamp)}</Text>
            </View>
            
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
                      if (Platform.OS === 'web') {
                        window.open(url, '_blank');
                      }
                    }}
                    style={styles.locationButton}
                  >
                    View Location
                  </Button>
                )}
              </View>
            )}
          </Card.Content>
        </Card>
      </View>
    );
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onClose}
        contentContainerStyle={styles.modal}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Chat Management</Text>
            <IconButton icon="close" onPress={onClose} />
          </View>
          
          <View style={styles.content}>
            {/* Chat List */}
            <View style={styles.chatList}>
              <Text style={styles.sectionTitle}>Workers</Text>
              {loading ? (
                <Text>Loading chats...</Text>
              ) : (
                <FlatList
                  data={chats}
                  renderItem={renderChatItem}
                  keyExtractor={(item) => item.id}
                  style={styles.chatFlatList}
                />
              )}
            </View>
            
            {/* Chat Detail */}
            {selectedChat ? (
              <View style={styles.chatDetail}>
                <View style={styles.chatDetailHeader}>
                  <Text style={styles.chatDetailTitle}>
                    Chat with {selectedChat.workerName}
                  </Text>
                  <Button
                    mode="contained"
                    icon="clipboard-plus"
                    onPress={() => setTaskDialogVisible(true)}
                    style={styles.assignTaskButton}
                  >
                    Assign Task
                  </Button>
                </View>
                
                <Divider />
                
                {/* Messages */}
                <FlatList
                  data={messages}
                  renderItem={renderMessage}
                  keyExtractor={(item) => item.id}
                  style={styles.messagesList}
                  inverted
                />
                
                <Divider />
                
                {/* Input */}
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.messageInput}
                    value={newMessage}
                    onChangeText={setNewMessage}
                    placeholder="Type a message..."
                    multiline
                    maxLength={500}
                  />
                  <Button
                    mode="contained"
                    onPress={sendMessage}
                    disabled={!newMessage.trim()}
                    style={styles.sendButton}
                  >
                    Send
                  </Button>
                </View>
              </View>
            ) : (
              <View style={styles.noSelection}>
                <Text>Select a worker to start chatting</Text>
              </View>
            )}
          </View>
        </View>
        
        {/* Task Assignment Dialog */}
        <Dialog visible={taskDialogVisible} onDismiss={() => setTaskDialogVisible(false)}>
          <Dialog.Title>Assign Daily Task</Dialog.Title>
          <Dialog.Content>
            <Paragraph>
              Assign a task to {selectedChat?.workerName} for today:
            </Paragraph>
            <TextInput
              value={newTask}
              onChangeText={setNewTask}
              placeholder="Enter task description..."
              multiline
              numberOfLines={3}
              maxLength={500}
              style={styles.taskInput}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setTaskDialogVisible(false)}>Cancel</Button>
            <Button onPress={assignTask} disabled={!newTask.trim()}>
              Assign Task
            </Button>
          </Dialog.Actions>
        </Dialog>
        
        {/* Image Modal */}
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
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    flex: 1,
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 8,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
  },
  chatList: {
    width: 300,
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  chatFlatList: {
    flex: 1,
  },
  chatItem: {
    marginBottom: 8,
    cursor: 'pointer',
  },
  selectedChat: {
    backgroundColor: '#e3f2fd',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  workerName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  unreadChip: {
    backgroundColor: '#f44336',
  },
  currentTask: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontStyle: 'italic',
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  chatFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  photoStatus: {
    fontSize: 12,
    color: '#666',
  },
  lastMessageTime: {
    fontSize: 12,
    color: '#999',
  },
  chatDetail: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  chatDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  chatDetailTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  assignTaskButton: {
    backgroundColor: '#ff9800',
  },
  messagesList: {
    flex: 1,
    padding: 16,
  },
  messageContainer: {
    marginVertical: 4,
  },
  foremanMessage: {
    alignItems: 'flex-end',
  },
  workerMessage: {
    alignItems: 'flex-start',
  },
  messageCard: {
    maxWidth: '80%',
  },
  foremanMessageCard: {
    backgroundColor: '#dcf8c6',
  },
  workerMessageCard: {
    backgroundColor: '#ffffff',
  },
  messageContent: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  senderName: {
    fontWeight: 'bold',
    fontSize: 12,
    color: '#666',
  },
  messageTime: {
    fontSize: 11,
    color: '#999',
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
    fontSize: 14,
  },
  imageContainer: {
    marginVertical: 8,
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
    marginBottom: 8,
    cursor: 'pointer',
  },
  locationButton: {
    alignSelf: 'flex-start',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'flex-end',
  },
  messageInput: {
    flex: 1,
    marginRight: 8,
    backgroundColor: '#f5f5f5',
  },
  sendButton: {
    alignSelf: 'flex-end',
  },
  noSelection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskInput: {
    marginTop: 16,
    backgroundColor: '#f5f5f5',
  },
  imageModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: '90%',
    height: '80%',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
}); 
