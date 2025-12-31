import { create } from 'zustand';
import { supabase } from '../config/supabase';
import { getDatabase } from '../db/database';
import NetInfo from '@react-native-community/netinfo';
import { useAuthStore } from './authStore';

export interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  synced?: boolean;
  deleted?: boolean;
}

interface NotesState {
  notes: Note[];
  loading: boolean;
  error: string | null;
  isOnline: boolean;
  fetchNotes: () => Promise<void>;
  createNote: (title: string, content: string) => Promise<Note | null>;
  updateNote: (id: string, title: string, content: string) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  syncNotes: () => Promise<void>;
  checkNetworkStatus: () => Promise<void>;
  clearUserNotes: (userId: string) => Promise<void>;
}

export const useNotesStore = create<NotesState>((set, get) => ({
  notes: [],
  loading: false,
  error: null,
  isOnline: true,

  checkNetworkStatus: async () => {
    const netInfo = await NetInfo.fetch();
    set({ isOnline: netInfo.isConnected ?? false });
  },

  fetchNotes: async () => {
    const { user } = useAuthStore.getState();
    if (!user) {
      set({ notes: [], error: 'User not authenticated' });
      return;
    }

    try {
      set({ loading: true, error: null });
      
      // Ensure database is initialized
      const db = getDatabase();
      if (!db) {
        throw new Error('Database not initialized');
      }
      
      const { isOnline } = get();

      // Always fetch from local database first
      const localNotes = db.execute(
        `SELECT * FROM notes WHERE user_id = ? AND deleted = 0 ORDER BY updated_at DESC`,
        [user.id]
      );

      // Handle different result formats
      let notes: Note[] = [];
      if (localNotes.rows) {
        if (Array.isArray(localNotes.rows)) {
          notes = localNotes.rows;
        } else if (localNotes.rows._array) {
          notes = localNotes.rows._array;
        }
      }
      set({ notes, loading: false });

      // If online, try to sync with Supabase
      if (isOnline) {
        try {
          const { data, error } = await supabase
            .from('notes')
            .select('*')
            .eq('user_id', user.id)
            .eq('deleted', false)
            .order('updated_at', { ascending: false });

          if (error) throw error;

          if (data) {
            // Update local database with server data
            const db = getDatabase();
            db.execute('BEGIN TRANSACTION');
            
            data.forEach((note) => {
              db.execute(
                `INSERT OR REPLACE INTO notes (id, user_id, title, content, created_at, updated_at, synced, deleted)
                 VALUES (?, ?, ?, ?, ?, ?, 1, 0)`,
                [
                  note.id,
                  note.user_id,
                  note.title,
                  note.content || '',
                  note.created_at,
                  note.updated_at,
                ]
              );
            });

            db.execute('COMMIT');

            // Fetch updated notes from local DB
            const updatedNotes = db.execute(
              `SELECT * FROM notes WHERE user_id = ? AND deleted = 0 ORDER BY updated_at DESC`,
              [user.id]
            );

            let syncedNotes: Note[] = [];
            if (updatedNotes.rows) {
              if (Array.isArray(updatedNotes.rows)) {
                syncedNotes = updatedNotes.rows;
              } else if (updatedNotes.rows._array) {
                syncedNotes = updatedNotes.rows._array;
              }
            }
            set({ notes: syncedNotes });
          }
        } catch (syncError) {
          console.error('Error syncing notes:', syncError);
          // Don't set error here, just use local data
        }
      }
    } catch (error: any) {
      console.error('Error fetching notes:', error);
      set({ 
        notes: [],
        error: error?.message || 'Failed to fetch notes',
        loading: false 
      });
    }
  },

  createNote: async (title: string, content: string) => {
    const { user } = useAuthStore.getState();
    if (!user) {
      set({ error: 'User not authenticated' });
      return null;
    }

    try {
      const db = getDatabase();
      const now = new Date().toISOString();
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const { isOnline } = get();

      // Insert into local database
      db.execute(
        `INSERT INTO notes (id, user_id, title, content, created_at, updated_at, synced, deleted)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
        [id, user.id, title, content || '', now, now, isOnline ? 0 : 1]
      );

      const newNote: Note = {
        id,
        user_id: user.id,
        title,
        content: content || '',
        created_at: now,
        updated_at: now,
        synced: isOnline,
        deleted: false,
      };

      // If online, try to sync with Supabase
      if (isOnline) {
        try {
          const { data, error } = await supabase
            .from('notes')
            .insert([{
              id,
              user_id: user.id,
              title,
              content: content || '',
              created_at: now,
              updated_at: now,
            }])
            .select()
            .single();

          if (error) throw error;

          // Update local note as synced
          db.execute(
            `UPDATE notes SET synced = 1 WHERE id = ?`,
            [id]
          );

          newNote.synced = true;
        } catch (syncError) {
          console.error('Error syncing new note:', syncError);
          // Note is saved locally, will sync later
        }
      }

      // Refresh notes list
      await get().fetchNotes();
      return newNote;
    } catch (error: any) {
      console.error('Error creating note:', error);
      set({ error: error.message || 'Failed to create note' });
      return null;
    }
  },

  updateNote: async (id: string, title: string, content: string) => {
    const { user } = useAuthStore.getState();
    if (!user) {
      set({ error: 'User not authenticated' });
      return;
    }

    try {
      const db = getDatabase();
      const now = new Date().toISOString();
      const { isOnline } = get();

      // Update local database
      db.execute(
        `UPDATE notes SET title = ?, content = ?, updated_at = ?, synced = ? WHERE id = ?`,
        [title, content || '', now, isOnline ? 0 : 1, id]
      );

      // If online, try to sync with Supabase
      if (isOnline) {
        try {
          const { error } = await supabase
            .from('notes')
            .update({
              title,
              content: content || '',
              updated_at: now,
            })
            .eq('id', id)
            .eq('user_id', user.id);

          if (error) throw error;

          // Update local note as synced
          db.execute(
            `UPDATE notes SET synced = 1 WHERE id = ?`,
            [id]
          );
        } catch (syncError) {
          console.error('Error syncing note update:', syncError);
          // Note is updated locally, will sync later
        }
      }

      // Refresh notes list
      await get().fetchNotes();
    } catch (error: any) {
      console.error('Error updating note:', error);
      set({ error: error.message || 'Failed to update note' });
    }
  },

  deleteNote: async (id: string) => {
    const { user } = useAuthStore.getState();
    if (!user) {
      set({ error: 'User not authenticated' });
      return;
    }

    try {
      const db = getDatabase();
      const { isOnline } = get();

      // Mark as deleted in local database
      db.execute(
        `UPDATE notes SET deleted = 1, synced = ? WHERE id = ?`,
        [isOnline ? 0 : 1, id]
      );

      // If online, try to delete from Supabase
      if (isOnline) {
        try {
          const { error } = await supabase
            .from('notes')
            .update({ deleted: true })
            .eq('id', id)
            .eq('user_id', user.id);

          if (error) throw error;

          // Update local note as synced
          db.execute(
            `UPDATE notes SET synced = 1 WHERE id = ?`,
            [id]
          );
        } catch (syncError) {
          console.error('Error syncing note deletion:', syncError);
          // Note is deleted locally, will sync later
        }
      }

      // Refresh notes list
      await get().fetchNotes();
    } catch (error: any) {
      console.error('Error deleting note:', error);
      set({ error: error.message || 'Failed to delete note' });
    }
  },

  syncNotes: async () => {
    const { user } = useAuthStore.getState();
    if (!user) return;

    const { isOnline } = get();
    if (!isOnline) {
      set({ error: 'Cannot sync: device is offline' });
      return;
    }

    try {
      set({ loading: true, error: null });
      const db = getDatabase();

      // Get all unsynced notes
      const unsyncedNotes = db.execute(
        `SELECT * FROM notes WHERE user_id = ? AND synced = 0 AND deleted = 0`,
        [user.id]
      );

      let notesToSync: Note[] = [];
      if (unsyncedNotes.rows) {
        if (Array.isArray(unsyncedNotes.rows)) {
          notesToSync = unsyncedNotes.rows;
        } else if (unsyncedNotes.rows._array) {
          notesToSync = unsyncedNotes.rows._array;
        }
      }

      // Get all unsynced deletions
      const unsyncedDeletions = db.execute(
        `SELECT id FROM notes WHERE user_id = ? AND synced = 0 AND deleted = 1`,
        [user.id]
      );

      let deletionsToSync: string[] = [];
      if (unsyncedDeletions.rows) {
        const rows = Array.isArray(unsyncedDeletions.rows) 
          ? unsyncedDeletions.rows 
          : unsyncedDeletions.rows._array || [];
        deletionsToSync = rows.map((row: any) => row.id);
      }

      // Sync new/updated notes
      for (const note of notesToSync) {
        try {
          const { error } = await supabase
            .from('notes')
            .upsert({
              id: note.id,
              user_id: note.user_id,
              title: note.title,
              content: note.content,
              created_at: note.created_at,
              updated_at: note.updated_at,
            }, {
              onConflict: 'id',
            });

          if (error) throw error;

          db.execute(
            `UPDATE notes SET synced = 1 WHERE id = ?`,
            [note.id]
          );
        } catch (error) {
          console.error(`Error syncing note ${note.id}:`, error);
        }
      }

      // Sync deletions
      for (const noteId of deletionsToSync) {
        try {
          const { error } = await supabase
            .from('notes')
            .update({ deleted: true })
            .eq('id', noteId)
            .eq('user_id', user.id);

          if (error) throw error;

          db.execute(
            `UPDATE notes SET synced = 1 WHERE id = ?`,
            [noteId]
          );
        } catch (error) {
          console.error(`Error syncing deletion ${noteId}:`, error);
        }
      }

      // Fetch latest notes from server
      await get().fetchNotes();
      set({ loading: false });
    } catch (error: any) {
      console.error('Error syncing notes:', error);
      set({ 
        error: error.message || 'Failed to sync notes',
        loading: false 
      });
    }
  },

  clearUserNotes: async (userId: string) => {
    try {
      const db = getDatabase();
      // Delete all notes for this user from local database
      db.execute(
        `DELETE FROM notes WHERE user_id = ?`,
        [userId]
      );
      // Clear the notes from state
      set({ notes: [] });
    } catch (error) {
      console.error('Error clearing user notes:', error);
    }
  },
}));

