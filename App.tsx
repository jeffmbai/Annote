/**
 * Annote - Notes Application with Supabase
 *
 * @format
 */

import React, { useEffect } from 'react';
import {
  StatusBar,
  useColorScheme,
  ActivityIndicator,
  View,
  StyleSheet,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
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
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <AppNavigator />
      <Toast />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});

export default App;
