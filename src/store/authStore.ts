import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../config/supabase';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: false,
  initialized: false,

  initialize: async () => {
    try {
      set({ loading: true });
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        set({ 
          user: session.user, 
          session,
          initialized: true,
          loading: false 
        });
      } else {
        set({ 
          user: null, 
          session: null,
          initialized: true,
          loading: false 
        });
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange((_event, session) => {
        set({ 
          user: session?.user ?? null, 
          session: session ?? null 
        });
      });
    } catch (error) {
      console.error('Error initializing auth:', error);
      set({ 
        user: null, 
        session: null,
        initialized: true,
        loading: false 
      });
    }
  },

  signUp: async (email: string, password: string) => {
    try {
      set({ loading: true });
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        set({ loading: false });
        return { error };
      }

      set({ 
        user: data.user, 
        session: data.session,
        loading: false 
      });
      return { error: null };
    } catch (error) {
      set({ loading: false });
      return { error };
    }
  },

  signIn: async (email: string, password: string) => {
    try {
      set({ loading: true });
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        set({ loading: false });
        return { error };
      }

      set({ 
        user: data.user, 
        session: data.session,
        loading: false 
      });
      return { error: null };
    } catch (error) {
      set({ loading: false });
      return { error };
    }
  },

  signOut: async () => {
    try {
      set({ loading: true });
      const currentUser = useAuthStore.getState().user;
      
      // Clear user's notes from local database before signing out
      if (currentUser) {
        const { useNotesStore } = await import('./notesStore');
        await useNotesStore.getState().clearUserNotes(currentUser.id);
      }
      
      await supabase.auth.signOut();
      set({ 
        user: null, 
        session: null,
        loading: false 
      });
    } catch (error) {
      console.error('Error signing out:', error);
      set({ loading: false });
    }
  },
}));

