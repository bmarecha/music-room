import { apiFetch } from './client';

export type User = {
  id: number;
  email: string | null;
  public_name: string;
  bio: string | null;
  birthdate: string | null;
  bio_visibility: 'public' | 'friends' | 'private';
  birthdate_visibility: 'public' | 'friends' | 'private';
  music_preferences_visibility: 'public' | 'friends' | 'private';
  subscription_type: 'free' | 'paid';
  google_id: string | null;
  is_email_validated: boolean;
  created_at: string;
};

export type VisibilityLevel = 'public' | 'friends' | 'private';
export type PreferenceType = 'genre' | 'artist';

export type MusicPreference = {
  preference_type: PreferenceType;
  preference_value: string;
};

export type Profile = {
  id: number;
  public_name: string;
  bio: string | null;
  birthdate: string | null;
  bio_visibility: VisibilityLevel;
  birthdate_visibility: VisibilityLevel;
  music_preferences_visibility: VisibilityLevel;
  music_preferences: MusicPreference[];
};

export type ProfileUpdate = {
  public_name?: string | null;
  bio?: string | null;
  birthdate?: string | null;
  bio_visibility?: VisibilityLevel;
  birthdate_visibility?: VisibilityLevel;
  music_preferences_visibility?: VisibilityLevel;
  music_preferences?: MusicPreference[];
};

export type TokenResponse = {
  access_token: string;
  token_type: string;
  is_email_validated: boolean;
  user: User;
};

export type MessageResponse = {
  message: string;
};

export function login(email: string, password: string): Promise<TokenResponse> {
  return apiFetch<TokenResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function register(
  email: string,
  password: string,
  public_name: string
): Promise<TokenResponse> {
  return apiFetch<TokenResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, public_name }),
  });
}

export function verifyEmail(token: string): Promise<MessageResponse> {
  return apiFetch<MessageResponse>('/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
}

export function resendVerification(email: string): Promise<MessageResponse> {
  return apiFetch<MessageResponse>('/auth/resend-verification', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function forgotPassword(email: string): Promise<MessageResponse> {
  return apiFetch<MessageResponse>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function resetPassword(
  token: string,
  new_password: string
): Promise<MessageResponse> {
  return apiFetch<MessageResponse>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, new_password }),
  });
}

export function googleOAuth(id_token: string): Promise<TokenResponse> {
  return apiFetch<TokenResponse>('/auth/oauth/google', {
    method: 'POST',
    body: JSON.stringify({ id_token }),
  });
}

export function linkGoogleAccount(id_token: string): Promise<User> {
  return apiFetch<User>('/auth/oauth/link/google', {
    method: 'POST',
    body: JSON.stringify({ id_token }),
  });
}

export function getMe(): Promise<User> {
  return apiFetch<User>('/users/me');
}

export function getMyProfile(): Promise<Profile> {
  return apiFetch<Profile>('/users/me/profile');
}

export function updateMyProfile(payload: ProfileUpdate): Promise<Profile> {
  return apiFetch<Profile>('/users/me/profile', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}
