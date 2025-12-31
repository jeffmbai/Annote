import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import Toast from 'react-native-toast-message';
import { useNotesStore } from '../store/notesStore';
import { useAuthStore } from '../store/authStore';
import { Note } from '../store/notesStore';
import { NotesHeader } from '../components/NotesHeader';

interface NotesListScreenProps {
  navigation: any;
}

export const NotesListScreen: React.FC<NotesListScreenProps> = ({
  navigation,
}) => {
  const {
    notes,
    loading,
    error,
    isOnline,
    fetchNotes,
    syncNotes,
    checkNetworkStatus,
  } = useNotesStore();
  const user = useAuthStore(state => state.user);
  const previousOnlineStatus = useRef<boolean | null>(null);

  // Safety check: if no user, don't render (shouldn't happen due to AppNavigator, but just in case)
  if (!user) {
    return null;
  }

  useEffect(() => {
    // Initialize network status
    const initializeNetworkStatus = async () => {
      try {
        await checkNetworkStatus();
        const netInfo = await NetInfo.fetch();
        previousOnlineStatus.current = netInfo.isConnected ?? false;
      } catch (error) {
        console.error('Error initializing network status:', error);
      }
    };

    initializeNetworkStatus();

    // Only fetch notes if user is authenticated - wrap in try-catch to prevent crashes
    if (user) {
      try {
        fetchNotes().catch(err => {
          console.error('Error fetching notes on mount:', err);
        });
      } catch (error) {
        console.error('Error in fetchNotes:', error);
      }
    }

    // Set up network status listener
    const unsubscribe = NetInfo.addEventListener(state => {
      const wasOnline = previousOnlineStatus.current;
      const isNowOnline = state.isConnected ?? false;

      checkNetworkStatus();

      // Show toast only when status actually changes (not on initial load)
      if (wasOnline !== null && wasOnline !== isNowOnline) {
        if (isNowOnline) {
          Toast.show({
            type: 'success',
            text1: 'Back Online',
            text2: 'Your notes are syncing...',
            position: 'top',
            visibilityTime: 3000,
          });
          // Sync notes when coming back online
          syncNotes();
        } else {
          Toast.show({
            type: 'error',
            text1: 'No Internet Connection',
            text2: 'You are offline. Changes will sync when you reconnect.',
            position: 'top',
            visibilityTime: 4000,
          });
        }
      }

      previousOnlineStatus.current = isNowOnline;
    });

    // Hide default header for custom header
    navigation.setOptions({
      headerShown: false,
    });

    return () => {
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, isOnline]);

  const handleNotePress = (note: Note) => {
    navigation.navigate('NoteDetail', { noteId: note.id });
  };

  const handleAddNote = () => {
    navigation.navigate('NoteDetail', { noteId: null });
  };

  const renderNote = ({ item }: { item: Note }) => (
    <TouchableOpacity
      style={styles.noteItem}
      onPress={() => handleNotePress(item)}
    >
      <View style={styles.noteContent}>
        <Text style={styles.noteTitle} numberOfLines={1}>
          {item.title || 'Untitled'}
        </Text>
        <Text style={styles.notePreview} numberOfLines={2}>
          {item.content || 'No content'}
        </Text>
        <Text style={styles.noteDate}>
          {new Date(item.updated_at).toLocaleDateString()}
        </Text>
      </View>
      {!item.synced && (
        <View style={styles.syncIndicator}>
          <Text style={styles.syncText}>⏳</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <NotesHeader isOnline={isOnline} />

        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <FlatList
          data={notes}
          renderItem={renderNote}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={() => {
                checkNetworkStatus();
                if (isOnline) {
                  syncNotes();
                } else {
                  fetchNotes();
                }
              }}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📝</Text>
              <Text style={styles.emptyText}>No notes yet</Text>
              <Text style={styles.emptySubtext}>
                Tap the + button to create your first note
              </Text>
            </View>
          }
        />

        <TouchableOpacity style={styles.fab} onPress={handleAddNote}>
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  errorBanner: {
    backgroundColor: '#ff3b30',
    padding: 12,
  },
  errorText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 14,
  },
  listContent: {
    paddingTop: 16,
    paddingBottom: 80,
  },
  noteItem: {
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  noteContent: {
    flex: 1,
  },
  noteTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
    color: '#000',
  },
  notePreview: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  noteDate: {
    fontSize: 12,
    color: '#999',
  },
  syncIndicator: {
    justifyContent: 'center',
    marginLeft: 8,
  },
  syncText: {
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 120,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
    opacity: 0.3,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  fabText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '300',
  },
});
