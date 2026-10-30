import {
  acceptFriendInvite,
  deleteFriend,
  deleteFriendInvite,
  getMyFriends,
  getMyInvites,
  getMyProfile,
  getUserFriends,
  getUserProfile,
  sendFriendInvite,
  updateMyProfile,
  type Friend,
  type FriendInvite,
  type MusicPreference,
  type Profile,
  type ProfileUpdate,
  type VisibilityLevel,
} from '@/api/auth';

export type { Friend, FriendInvite, MusicPreference, Profile, ProfileUpdate, VisibilityLevel };

export const profileService = {
  fetch: () => getMyProfile(),
  fetchUser: (userId: number) => getUserProfile(userId),
  update: (data: ProfileUpdate) => updateMyProfile(data),
  getMyFriends: () => getMyFriends(),
  getUserFriends: (userId: number) => getUserFriends(userId),
  deleteFriend: (friendId: number) => deleteFriend(friendId),
  getInvites: () => getMyInvites(),
  sendInvite: (publicName: string) => sendFriendInvite(publicName),
  acceptInvite: (otherUserId: number) => acceptFriendInvite(otherUserId),
  deleteInvite: (otherUserId: number) => deleteFriendInvite(otherUserId),
};
