import { useState } from 'react';
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

import { login } from '../api/auth';

type Props = {
  onLoggedIn?: (accessToken: string) => void;
  onGoogleLogin?: () => void;
  onForgotPassword?: () => void;
  onGoToRegister?: () => void;
};

export default function LoginScreen({
  onLoggedIn,
  onGoogleLogin,
  onForgotPassword,
  onGoToRegister,
}: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !loading;

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const { access_token } = await login(email.trim(), password);
      onLoggedIn?.(access_token);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Connexion impossible');
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
        <Text style={styles.title}>Music Room</Text>
        <Text style={styles.subtitle}>Connecte-toi pour rejoindre la fête</Text>

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
        <TextInput
          style={styles.input}
          placeholder="Mot de passe"
          placeholderTextColor="#888"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="password"
          textContentType="password"
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable onPress={onForgotPassword} style={styles.forgot}>
          <Text style={styles.link}>Mot de passe oublié ?</Text>
        </Pressable>

        <Pressable
          style={[styles.button, styles.primary, !canSubmit && styles.disabled]}
          disabled={!canSubmit}
          onPress={handleLogin}
        >
          <Text style={styles.primaryText}>
            {loading ? 'Connexion…' : 'Se connecter'}
          </Text>
        </Pressable>

        <View style={styles.separator}>
          <View style={styles.line} />
          <Text style={styles.separatorText}>ou</Text>
          <View style={styles.line} />
        </View>

        <Pressable style={[styles.button, styles.social]} onPress={onGoogleLogin}>
          <Text style={styles.socialText}>Continuer avec Google</Text>
        </Pressable>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Pas encore de compte ? </Text>
          <Pressable onPress={onGoToRegister}>
            <Text style={styles.link}>Créer un compte</Text>
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
    gap: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  error: { color: '#D93025' },
  forgot: { alignSelf: 'flex-end' },
  link: { color: '#6C47FF', fontWeight: '600' },
  button: {
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primary: { backgroundColor: '#6C47FF' },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  disabled: { opacity: 0.5 },
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 4,
  },
  line: { flex: 1, height: 1, backgroundColor: '#ddd' },
  separatorText: { color: '#888' },
  social: { borderWidth: 1, borderColor: '#ffffff' },
  socialText: { fontSize: 16, fontWeight: '500' },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  footerText: { color: '#666' },
});
