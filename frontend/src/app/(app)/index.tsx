import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { type Href, router } from 'expo-router';

export default function HomeScreen() {
  const { user, logout, refreshUser } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshUser();
    } finally {
      setRefreshing(false);
    }
  };

  const shortcuts = [
    { title: 'Mon Profil', route: '/profile', icon: '👤' },
    { title: 'Événements', route: '/events', icon: '📅' },
    { title: 'Playlists', route: '/playlists', icon: '🎵' },
    { title: 'Amis', route: '/friends', icon: '👥' },
  ];

  return (
    <SafeAreaView style={styles.flex}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Bonjour 👋</Text>
          <Text style={styles.name}>{user?.public_name ?? 'Utilisateur'}</Text>
          {user?.email && <Text style={styles.email}>{user.email}</Text>}
        </View>

        <View style={styles.grid}>
          {shortcuts.map((item) => (
            <Pressable
              key={item.route}
              style={styles.menuCard}
              onPress={() => router.push(item.route as Href)}
            >
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <Text style={styles.menuText}>{item.title}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.footerActions}>
          <Pressable style={styles.secondaryBtn} onPress={handleRefresh} disabled={refreshing}>
            {refreshing ? (
              <ActivityIndicator color="#111" />
            ) : (
              <Text style={styles.secondaryBtnText}>Actualiser</Text>
            )}
          </Pressable>

          <Pressable style={styles.dangerBtn} onPress={logout}>
            <Text style={styles.dangerBtnText}>Se déconnecter</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#f7f7f9' },
  container: { padding: 20, gap: 20 },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  greeting: { fontSize: 16, color: '#666' },
  name: { fontSize: 26, fontWeight: 'bold', color: '#111', marginTop: 4 },
  email: { fontSize: 14, color: '#888', marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  menuCard: {
    backgroundColor: '#fff',
    width: '48%',
    aspectRatio: 1.1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  menuIcon: { fontSize: 28 },
  menuText: { fontSize: 15, fontWeight: '600', color: '#111' },
  footerActions: { marginTop: 10, gap: 10 },
  secondaryBtn: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryBtnText: { color: '#111', fontSize: 15, fontWeight: '500' },
  dangerBtn: { backgroundColor: '#FCE8E6', padding: 14, borderRadius: 8, alignItems: 'center' },
  dangerBtnText: { color: '#C5221F', fontSize: 15, fontWeight: '600' },
});
