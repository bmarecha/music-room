import { getMyProfile, updateMyProfile } from '../../api/auth';

export type VisibilityLevel = 'public' | 'friends' | 'private';

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
  music_preferences: MusicPreference[];
  music_preferences_visibility: VisibilityLevel;
}

export const profileService = {
  fetch: () => getMyProfile(),
  update: (data: Partial<Profile>) => updateMyProfile(data),
};
