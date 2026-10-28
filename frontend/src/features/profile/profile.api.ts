import { getMyProfile, updateMyProfile } from '../../api/auth';
import type { Profile, UpdateProfileInput } from './profile.types';

export const profileApi = {
  fetchProfile: async (): Promise<Profile> => {
    return await getMyProfile();
  },

  updateProfile: async (data: UpdateProfileInput): Promise<Profile> => {
    return await updateMyProfile(data);
  },
};
