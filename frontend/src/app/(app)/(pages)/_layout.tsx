import React from 'react';
import { Stack, router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function PagesLayout() {
  return (
    <Stack
      screenOptions={{
        header: ({ options }) => (
          <View style={styles.headerBar}>
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.backText}>← Retour</Text>
            </Pressable>
            <Text style={styles.headerTitle}>{options.title}</Text>
            <View style={styles.spacer} />
          </View>
        ),
      }}
    >
      <Stack.Screen name="profile" options={{ title: 'Mon Profil' }} />
      <Stack.Screen name="events" options={{ title: 'Événements' }} />
      <Stack.Screen name="playlists" options={{ title: 'Playlists' }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    paddingTop: 50, // Ajustement pour la barre de statut iOS/Android native
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  backButton: { paddingVertical: 4 },
  backText: { color: '#6C47FF', fontSize: 16, fontWeight: '600' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#111' },
  spacer: { width: 60 }, // Équilibre optique face au bouton de retour
});
