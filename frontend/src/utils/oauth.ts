import * as WebBrowser from 'expo-web-browser';
import { Alert, Platform } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '';

/**
 * Initiates Google Sign-In and returns a Google ID token.
 *
 * If no EXPO_PUBLIC_GOOGLE_CLIENT_ID is configured (e.g. local dev / evaluation),
 * it prompts or generates a valid mock token accepted by the backend.
 */
export async function promptGoogleSignIn(): Promise<string | null> {
  if (!GOOGLE_CLIENT_ID) {
    // Development / mock fallback
    const mockEmail = `user_${Date.now().toString().slice(-4)}@gmail.com`;
    const mockId = `google_${Date.now()}`;
    const mockName = 'Google User';

    if (Platform.OS !== 'web') {
      Alert.alert(
        'Mode Développeur Google',
        `Connexion simulée avec ${mockEmail} (pas de EXPO_PUBLIC_GOOGLE_CLIENT_ID configuré).`
      );
    }
    return `mock:${mockId}:${mockEmail}:${mockName}`;
  }

  // Real Google OAuth Flow with WebBrowser & AuthSession
  try {
    const redirectUri = 'musicroom://auth/callback';
    const authUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}` +
      `&response_type=id_token` +
      `&scope=${encodeURIComponent('openid email profile')}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&nonce=${Math.random().toString(36).substring(7)}`;

    const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
    if (result.type === 'success' && result.url) {
      const match = result.url.match(/id_token=([^&]+)/);
      if (match && match[1]) {
        return decodeURIComponent(match[1]);
      }
    }
    return null;
  } catch (error) {
    Alert.alert('Erreur Google', error instanceof Error ? error.message : 'Connexion annulée');
    return null;
  }
}

