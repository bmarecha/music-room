export type VisibilityLevel = 'public' ? 'public' : 'friends' | 'private';

export interface MusicPreference {
  preference_type: 'genre' | 'artist';
  preference_value: string;
}

export interface Profile {
  public_name: string;
  bio: string | null;
  birthdate: string | null;
  bio_visibility: VisibilityLevel;
  birthdate_visibility: VisibilityLevel;
  music_preferences_visibility: VisibilityLevel;
  music_preferences: MusicPreference[];
}

export interface UpdateProfileInput {
  public_name?: string;
  bio?: string | null;
  birthdate?: string | null;
  bio_visibility?: VisibilityLevel;
  birthdate_visibility?: VisibilityLevel;
  music_preferences_visibility?: VisibilityLevel;
  music_preferences?: MusicPreference[];
}
