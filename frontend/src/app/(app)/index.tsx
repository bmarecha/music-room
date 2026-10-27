import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { linkGoogleAccount } from '../../api/auth';
import { useAuth } from '../../context/AuthContext';
import { promptGoogleSignIn } from '../../utils/oauth';

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

  const handleLinkGoogle = async () => {
    try {
      const idToken = await promptGoogleSignIn();
      if (idToken) {
        await linkGoogleAccount(idToken);
        await refreshUser();
        Alert.alert('Succès', 'Ton compte Google a été associé avec succès !');
      }
    } catch (e) {
      Alert.alert(
        'Association impossible',
        e instanceof Error ? e.message : 'Erreur inconnue'
      );
    }
  };

  return (
    <SafeAreaView style={styles.flex}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Bonjour 👋</Text>
          <Text style={styles.name}>{user?.public_name ?? 'Utilisateur'}</Text>
          {user?.email && <Text style={styles.email}>{user.email}</Text>}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Statut du compte</Text>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, styles.badgeSuccess]}>
              <Text style={styles.badgeText}>✓ Email validé</Text>
            </View>
            <View style={[styles.badge, styles.badgeNeutral]}>
              <Text style={styles.badgeText}>
                Plan: {user?.subscription_type?.toUpperCase() ?? 'FREE'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Réseaux sociaux</Text>
          {user?.google_id ? (
            <View style={styles.linkedRow}>
              <Text style={styles.linkedText}>✓ Compte Google associé</Text>
            </View>
          ) : (
            <Pressable style={styles.linkButton} onPress={handleLinkGoogle}>
              <Text style={styles.linkButtonText}>Associer mon compte Google</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.actions}>
          <Pressable
            style={[styles.button, styles.secondary]}
            onPress={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? (
              <ActivityIndicator color="#111" />
            ) : (
              <Text style={styles.secondaryText}>Actualiser le profil</Text>
            )}
          </Pressable>

          <Pressable style={[styles.button, styles.danger]} onPress={logout}>
            <Text style={styles.dangerText}>Se déconnecter</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#f7f7f9' },
  container: { padding: 20, gap: 16 },
  header: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  greeting: { fontSize: 16, color: '#666' },
  name: { fontSize: 26, fontWeight: 'bold', color: '#111', marginTop: 4 },
  email: { fontSize: 14, color: '#888', marginTop: 2 },
  card: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    gap: 12,
  },
  cardTitle: { fontSize: 17, fontWeight: '600', color: '#111' },
  badgeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeSuccess: { backgroundColor: '#E6F4EA' },
  badgeNeutral: { backgroundColor: '#F1F3F4' },
  badgeText: { fontSize: 13, fontWeight: '500', color: '#111' },
  linkedRow: {
    paddingVertical: 8,
  },
  linkedText: { color: '#188038', fontSize: 15, fontWeight: '500' },
  linkButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  linkButtonText: { fontSize: 15, fontWeight: '500', color: '#111' },
  actions: { marginTop: 12, gap: 10 },
  button: {
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondary: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  secondaryText: { color: '#111', fontSize: 16, fontWeight: '500' },
  danger: {
    backgroundColor: '#FCE8E6',
  },
  dangerText: { color: '#C5221F', fontSize: 16, fontWeight: '600' },
});
