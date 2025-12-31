import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNotesStore } from '../store/notesStore';
import { Note } from '../store/notesStore';
import { DeleteNoteModal } from '../components/DeleteNoteModal';
import { AlertModal } from '../components/AlertModal';

interface NoteDetailScreenProps {
  navigation: any;
  route: {
    params: {
      noteId: string | null;
    };
  };
}

export const NoteDetailScreen: React.FC<NoteDetailScreenProps> = ({
  navigation,
  route,
}) => {
  const { noteId } = route.params;
  const { notes, createNote, updateNote, deleteNote, loading } =
    useNotesStore();

  const existingNote = noteId ? notes.find(n => n.id === noteId) : null;
  const [title, setTitle] = useState(existingNote?.title || '');
  const [content, setContent] = useState(existingNote?.content || '');
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [alertModal, setAlertModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
  }>({
    visible: false,
    title: '',
    message: '',
  });

  useEffect(() => {
    if (existingNote) {
      setTitle(existingNote.title);
      setContent(existingNote.content || '');
    }
  }, [existingNote]);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerRight}>
          {noteId && (
            <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={handleSave}
            style={styles.saveButton}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#007AFF" size="small" />
            ) : (
              <Text style={styles.saveText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, noteId, saving, title, content]);

  const handleSave = async () => {
    if (!title.trim()) {
      setAlertModal({
        visible: true,
        title: 'Error',
        message: 'Please enter a title',
      });
      return;
    }

    setSaving(true);
    try {
      if (noteId) {
        await updateNote(noteId, title.trim(), content.trim());
      } else {
        await createNote(title.trim(), content.trim());
      }
      navigation.goBack();
    } catch (error) {
      setAlertModal({
        visible: true,
        title: 'Error',
        message: 'Failed to save note',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCloseAlert = () => {
    setAlertModal({ visible: false, title: '', message: '' });
  };

  const handleDelete = () => {
    if (!noteId) return;
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!noteId) return;
    setShowDeleteModal(false);
    await deleteNote(noteId);
    navigation.goBack();
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
  };

  return (
    <>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <ScrollView
            style={styles.container}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <TextInput
              style={styles.titleInput}
              placeholder="Title"
              placeholderTextColor="#999"
              value={title}
              onChangeText={setTitle}
            />
            <TextInput
              style={styles.contentInput}
              placeholder="Start writing..."
              placeholderTextColor="#999"
              value={content}
              onChangeText={setContent}
              multiline
              textAlignVertical="top"
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <DeleteNoteModal
        visible={showDeleteModal}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        noteTitle={title || existingNote?.title}
      />

      <AlertModal
        visible={alertModal.visible}
        title={alertModal.title}
        message={alertModal.message}
        onClose={handleCloseAlert}
      />
    </>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardView: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  saveButton: {
    padding: 8,
    marginLeft: 8,
  },
  saveText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    padding: 8,
  },
  deleteText: {
    color: '#ff3b30',
    fontSize: 16,
  },
  titleInput: {
    fontSize: 24,
    fontWeight: '600',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    color: '#000',
  },
  contentInput: {
    fontSize: 16,
    padding: 16,
    minHeight: 400,
    color: '#000',
  },
});
