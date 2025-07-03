import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { 
  Card, 
  Title, 
  Paragraph, 
  Text,
  Chip,
  Button,
  List,
  IconButton,
  Surface
} from 'react-native-paper';
import logger from '../utils/logger';

interface Document {
  id: string;
  name: string;
  type: 'blueprint' | 'specification' | 'safety' | 'manual';
  size: string;
  lastModified: Date;
  url?: string;
  isLocal: boolean;
}

export default function DocumentsScreen() {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'blueprint' | 'specification' | 'safety' | 'manual'>('all');

  const [documents] = useState<Document[]>([
    {
      id: '1',
      name: 'Building Floor Plan - Level 1',
      type: 'blueprint',
      size: '2.5 MB',
      lastModified: new Date('2024-01-15'),
      url: 'https://example.com/blueprint1.pdf',
      isLocal: false
    },
    {
      id: '2',
      name: 'Electrical Wiring Diagram',
      type: 'blueprint',
      size: '1.8 MB',
      lastModified: new Date('2024-01-14'),
      url: 'https://example.com/electrical.pdf',
      isLocal: true
    },
    {
      id: '3',
      name: 'Safety Guidelines',
      type: 'safety',
      size: '0.8 MB',
      lastModified: new Date('2024-01-12'),
      url: 'https://example.com/safety.pdf',
      isLocal: true
    },
    {
      id: '4',
      name: 'Material Specifications',
      type: 'specification',
      size: '1.2 MB',
      lastModified: new Date('2024-01-10'),
      url: 'https://example.com/materials.pdf',
      isLocal: false
    },
    {
      id: '5',
      name: 'Equipment Manual',
      type: 'manual',
      size: '3.1 MB',
      lastModified: new Date('2024-01-08'),
      url: 'https://example.com/manual.pdf',
      isLocal: true
    }
  ]);

  const getFilteredDocuments = () => {
    if (selectedCategory === 'all') return documents;
    return documents.filter(doc => doc.type === selectedCategory);
  };

  const getTypeColor = (type: Document['type']) => {
    switch (type) {
      case 'blueprint': return '#2196F3';
      case 'specification': return '#4CAF50';
      case 'safety': return '#FF5722';
      case 'manual': return '#FF9800';
      default: return '#757575';
    }
  };

  const getTypeIcon = (type: Document['type']) => {
    switch (type) {
      case 'blueprint': return 'floor-plan';
      case 'specification': return 'file-document-outline';
      case 'safety': return 'shield-check';
      case 'manual': return 'book-open';
      default: return 'file';
    }
  };

  const getTypeLabel = (type: Document['type']) => {
    switch (type) {
      case 'blueprint': return 'Blueprint';
      case 'specification': return 'Specification';
      case 'safety': return 'Safety';
      case 'manual': return 'Manual';
      default: return 'Document';
    }
  };

  const handleDocumentOpen = async (document: Document) => {
    if (document.url) {
      try {
        await Linking.openURL(document.url);
      } catch (error) {
        logger.error('Could not open document', { error: error instanceof Error ? error.message : 'Unknown error' }, 'documents');
      }
    }
  };

  const handleDownload = (document: Document) => {
          logger.info('Download document', { documentName: document.name }, 'documents');
  };

  const filteredDocuments = getFilteredDocuments();

  return (
    <View style={styles.container}>
      <Surface style={styles.header} elevation={2}>
        <Title style={styles.headerTitle}>Documents & Blueprints</Title>
        <Paragraph style={styles.headerSubtitle}>
          Access project documents and blueprints
        </Paragraph>
      </Surface>

      <ScrollView style={styles.scrollView}>
        <Card style={styles.filtersCard}>
          <Card.Content>
            <Text style={styles.filtersTitle}>Categories</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.filtersContainer}>
                {[
                  { key: 'all', label: 'All' },
                  { key: 'blueprint', label: 'Blueprints' },
                  { key: 'specification', label: 'Specifications' },
                  { key: 'safety', label: 'Safety' },
                  { key: 'manual', label: 'Manuals' }
                ].map(filter => (
                  <Chip
                    key={filter.key}
                    selected={selectedCategory === filter.key}
                    onPress={() => setSelectedCategory(filter.key as any)}
                    style={[
                      styles.filterChip,
                      selectedCategory === filter.key && styles.selectedFilter
                    ]}
                    textStyle={selectedCategory === filter.key ? styles.selectedFilterText : {}}
                  >
                    {filter.label}
                  </Chip>
                ))}
              </View>
            </ScrollView>
          </Card.Content>
        </Card>

        <View style={styles.documentsContainer}>
          {filteredDocuments.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Card.Content style={styles.emptyContent}>
                <IconButton
                  icon="folder-open-outline"
                  size={60}
                  iconColor="#757575"
                />
                <Text style={styles.emptyTitle}>No documents found</Text>
                <Paragraph style={styles.emptyText}>
                  No documents available in this category
                </Paragraph>
              </Card.Content>
            </Card>
          ) : (
            filteredDocuments.map(document => (
              <Card key={document.id} style={styles.documentCard}>
                <Card.Content>
                  <View style={styles.documentHeader}>
                    <View style={styles.documentInfo}>
                      <IconButton
                        icon={getTypeIcon(document.type)}
                        size={24}
                        iconColor={getTypeColor(document.type)}
                        style={styles.documentIcon}
                      />
                      <View style={styles.documentDetails}>
                        <Text style={styles.documentName}>{document.name}</Text>
                        <View style={styles.documentMeta}>
                          <Chip
                            icon={getTypeIcon(document.type)}
                            style={[styles.typeChip, { backgroundColor: getTypeColor(document.type) }]}
                            textStyle={styles.typeChipText}
                            compact
                          >
                            {getTypeLabel(document.type)}
                          </Chip>
                          <Text style={styles.documentSize}>{document.size}</Text>
                          <Text style={styles.documentDate}>
                            {document.lastModified.toLocaleDateString()}
                          </Text>
                        </View>
                      </View>
                    </View>
                    
                    <View style={styles.documentActions}>
                      {document.isLocal ? (
                        <Chip
                          icon="download"
                          style={styles.localChip}
                          textStyle={styles.localChipText}
                          compact
                        >
                          Downloaded
                        </Chip>
                      ) : (
                        <Button
                          mode="outlined"
                          onPress={() => handleDownload(document)}
                          style={styles.downloadButton}
                          compact
                        >
                          Download
                        </Button>
                      )}
                    </View>
                  </View>
                </Card.Content>
                
                <Card.Actions>
                  <Button
                    mode="contained"
                    onPress={() => handleDocumentOpen(document)}
                    style={styles.openButton}
                    icon="eye"
                  >
                    View Document
                  </Button>
                </Card.Actions>
              </Card>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  filtersCard: {
    marginBottom: 16,
  },
  filtersTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  filtersContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    marginRight: 8,
  },
  selectedFilter: {
    backgroundColor: '#2C3E50',
  },
  selectedFilterText: {
    color: 'white',
  },
  documentsContainer: {
    gap: 12,
  },
  documentCard: {
    marginBottom: 12,
  },
  documentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  documentInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  documentIcon: {
    margin: 0,
    marginRight: 12,
  },
  documentDetails: {
    flex: 1,
  },
  documentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 8,
  },
  documentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  typeChip: {
    height: 24,
  },
  typeChipText: {
    color: 'white',
    fontSize: 12,
  },
  documentSize: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  documentDate: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  documentActions: {
    alignItems: 'flex-end',
  },
  localChip: {
    backgroundColor: '#27ae60',
    height: 28,
  },
  localChipText: {
    color: 'white',
    fontSize: 12,
  },
  downloadButton: {
    borderColor: '#3498db',
  },
  openButton: {
    backgroundColor: '#2C3E50',
    flex: 1,
  },
  emptyCard: {
    marginTop: 40,
  },
  emptyContent: {
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#7f8c8d',
    marginBottom: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: '#7f8c8d',
  },
}); 