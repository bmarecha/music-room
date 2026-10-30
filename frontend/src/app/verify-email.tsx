import { useState } from 'react';
import { Redirect } from 'expo-router';
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

import { resendVerification, verifyEmail } from '@/api/auth';
import { useAuth } from '@/context/AuthContext';

export default function VerifyEmailScreen() {
  const { user, refreshUser, logout, isLoading, isAuthenticated, isEmailPending } =
    useAuth();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  if (!isEmailPending) {
    return <Redirect href="/(app)" />;
  }

  const handleVerify = async () => {
    if (!token.trim()) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await verifyEmail(token.trim());
      await refreshUser();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Jeton de validation invalide');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError(null);
    setMessage(null);
    try {
      if (user?.email) {
        await resendVerification(user.email);
      }
      setMessage('Un nouvel email de validation a été envoyé');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossible de renvoyer le mail');
    } finally {
      setResending(false);
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
        <Text style={styles.icon}>✉️</Text>
        <Text style={styles.title}>Valide ton adresse email</Text>
        <Text style={styles.subtitle}>
          Un email de validation a été envoyé à :
          {'\n'}
          <Text style={styles.emailHighlight}>{user?.email ?? 'ton adresse email'}</Text>
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Colle ton code ou jeton de validation"
          placeholderTextColor="#888"
          value={token}
          onChangeText={setToken}
          autoCapitalize="none"
          autoCorrect={false}
        />

        {error && <Text style={styles.error}>{error}</Text>}
        {message && <Text style={styles.success}>{message}</Text>}

        <Pressable
          style={[styles.button, styles.primary, (!token.trim() || loading) && styles.disabled]}
          disabled={!token.trim() || loading}
          onPress={handleVerify}
        >
          <Text style={styles.primaryText}>
            {loading ? 'Validation…' : 'Valider mon compte'}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.button, styles.secondary, resending && styles.disabled]}
          disabled={resending}
          onPress={handleResend}
        >
          <Text style={styles.secondaryText}>
            {resending ? 'Envoi en cours…' : 'Renvoyer le lien de validation'}
          </Text>
        </Pressable>

        <View style={styles.footer}>
          <Pressable onPress={logout}>
            <Text style={styles.logoutLink}>Se déconnecter</Text>
          </Pressable>
        </View>
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
  icon: {
    fontSize: 56,
    textAlign: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#111',
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  emailHighlight: {
    fontWeight: '700',
    color: '#111',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111',
  },
  error: { color: '#D93025', fontSize: 14, textAlign: 'center' },
  success: { color: '#188038', fontSize: 14, textAlign: 'center' },
  button: {
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primary: { backgroundColor: '#6C47FF' },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondary: { borderWidth: 1, borderColor: '#ddd' },
  secondaryText: { color: '#111', fontSize: 15, fontWeight: '500' },
  disabled: { opacity: 0.5 },
  footer: {
    alignItems: 'center',
    marginTop: 12,
  },
  logoutLink: { color: '#888', fontSize: 14, textDecorationLine: 'underline' },
});
