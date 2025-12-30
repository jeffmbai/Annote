/**
 * Annote - Notes Application with Supabase
 *
 * @format
 */

import './global.css';
import React, { useEffect } from 'react';
import {
  StatusBar,
  useColorScheme,
  ActivityIndicator,
  View,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation/AppNavigator';
import { useAuthStore } from './src/store/authStore';
import { getDatabase } from './src/db/database';

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const { initialize, initialized } = useAuthStore();

  useEffect(() => {
    // Initialize database
    getDatabase();
    // Initialize auth
    initialize();
  }, [initialize]);

  if (!initialized) {
    return (
      <SafeAreaProvider>
        <View className="flex-1 justify-center items-center bg-white">
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <AppNavigator />
    </SafeAreaProvider>
  );
}

export default App;
