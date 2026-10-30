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

import { forgotPassword } from '@/api/auth';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = email.trim().length > 0 && !loading;

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await forgotPassword(email.trim());
      setMessage(res.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la demande');
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
        <Text style={styles.title}>Mot de passe oublié</Text>
        <Text style={styles.subtitle}>
          Saisis ton adresse email pour recevoir un lien de réinitialisation
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#888"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
        />

        {error && <Text style={styles.error}>{error}</Text>}
        {message && <Text style={styles.success}>{message}</Text>}

        <Pressable
          style={[styles.button, styles.primary, !canSubmit && styles.disabled]}
          disabled={!canSubmit}
          onPress={handleSubmit}
        >
          <Text style={styles.primaryText}>
            {loading ? 'Envoi en cours…' : 'Envoyer les instructions'}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.button, styles.secondary]}
          onPress={() => router.push('/reset-password')}
        >
          <Text style={styles.secondaryText}>
            J&apos;ai déjà un jeton de réinitialisation
          </Text>
        </Pressable>

        <View style={styles.footer}>
          <Pressable onPress={() => router.replace('/login')}>
            <Text style={styles.link}>← Retour à la connexion</Text>
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
  link: { color: '#6C47FF', fontWeight: '600' },
});
