import { useState } from 'react';
import { router } from 'expo-router';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { resetPassword } from '@/api/auth';

export default function ResetPasswordScreen() {
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    token.trim().length > 0 &&
    newPassword.length >= 6 &&
    newPassword === confirmPassword &&
    !loading;

  const handleReset = async () => {
    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await resetPassword(token.trim(), newPassword);
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Échec de la réinitialisation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Nouveau mot de passe</Text>
        <Text style={styles.subtitle}>
          Saisis ton jeton de réinitialisation et choisis ton nouveau mot de passe
        </Text>

        {success ? (
          <View style={styles.successBox}>
            <Text style={styles.successTitle}>Mot de passe réinitialisé !</Text>
            <Text style={styles.successSubtitle}>
              Tu peux maintenant te connecter avec ton nouveau mot de passe.
            </Text>
            <Pressable style={[styles.button, styles.primary]} onPress={() => router.replace('/login')}>
              <Text style={styles.primaryText}>Se connecter</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <TextInput
              style={styles.input}
              placeholder="Jeton de réinitialisation"
              placeholderTextColor="#888"
              value={token}
              onChangeText={setToken}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TextInput
              style={styles.input}
              placeholder="Nouveau mot de passe (6 car. min)"
              placeholderTextColor="#888"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              autoCapitalize="none"
              textContentType="newPassword"
            />

            <TextInput
              style={styles.input}
              placeholder="Confirmer le nouveau mot de passe"
              placeholderTextColor="#888"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
              textContentType="newPassword"
            />

            {error && <Text style={styles.error}>{error}</Text>}

            <Pressable
              style={[styles.button, styles.primary, !canSubmit && styles.disabled]}
              disabled={!canSubmit}
              onPress={handleReset}
            >
              <Text style={styles.primaryText}>
                {loading ? 'Modification…' : 'Changer le mot de passe'}
              </Text>
            </Pressable>

            <View style={styles.footer}>
              <Pressable onPress={() => router.replace('/login')}>
                <Text style={styles.link}>← Retour à la connexion</Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#ffffff' },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#111',
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111',
  },
  error: { color: '#D93025', fontSize: 14, textAlign: 'center' },
  button: {
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primary: { backgroundColor: '#6C47FF' },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  disabled: { opacity: 0.5 },
  successBox: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 20,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#188038',
  },
  successSubtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
  },
  footer: {
    alignItems: 'center',
    marginTop: 12,
  },
  link: { color: '#6C47FF', fontWeight: '600' },
});
