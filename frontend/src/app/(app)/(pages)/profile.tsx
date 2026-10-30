import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import {
  profileService,
  type Friend,
  type FriendInvite,
  type Profile,
} from '@/components/profile/profile.service';
import { useAuth } from '@/context/AuthContext';
import { EditPublicName } from '@/components/profile/EditPublicName';
import { EditBio } from '@/components/profile/EditBio';
import { EditBirthdate } from '@/components/profile/EditBirthdate';
import { EditMusicPreferences } from '@/components/profile/EditMusicPreferences';
import { FriendsSection } from '@/components/profile/FriendsSection';
import { FriendInvitesSection } from '@/components/profile/FriendInvitesSection';

export default function ProfileScreen() {
  const { user: currentUser, refreshUser } = useAuth();
  const { userId } = useLocalSearchParams<{ userId?: string }>();

  const isOwnProfile =
    !userId || (currentUser !== null && String(currentUser.id) === String(userId));

  const [profile, setProfile] = useState<Profile | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [invites, setInvites] = useState<FriendInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadProfileData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      if (isOwnProfile) {
        const [profileData, friendsData, invitesData] = await Promise.all([
          profileService.fetch(),
          profileService.getMyFriends(),
          profileService.getInvites(),
        ]);
        setProfile(profileData);
        setFriends(friendsData);
        setInvites(invitesData);
      } else {
        const targetId = Number(userId);
        const [profileData, friendsData] = await Promise.all([
          profileService.fetchUser(targetId),
          profileService.getUserFriends(targetId),
        ]);
        setProfile(profileData);
        setFriends(friendsData);
        setInvites([]);
      }
    } catch (err) {
      console.error('[ProfileScreen] failed to load profile data:', err);
      setLoadError('Impossible de charger le profil.');
    } finally {
      setLoading(false);
    }
  }, [isOwnProfile, userId]);

  useEffect(() => {
    loadProfileData();
  }, [loadProfileData]);

  const handleMutationSuccess = async () => {
    if (isOwnProfile) {
      await refreshUser();
    }
    await loadProfileData();
  };

  const screenTitle = isOwnProfile
    ? 'Mon Profil'
    : profile
      ? `Profil de ${profile.public_name}`
      : 'Profil';

  if (loading) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: screenTitle }} />
        <ActivityIndicator size="large" color="#6C47FF" />
      </View>
    );
  }

  if (loadError || !profile) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: screenTitle }} />
        <Text style={styles.errorText}>
          {loadError || 'Profil introuvable.'}
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.flex}>
      <Stack.Screen options={{ title: screenTitle }} />
      <ScrollView contentContainerStyle={styles.container}>
        <EditPublicName
          initialValue={profile.public_name}
          isEditable={isOwnProfile}
          onSuccess={handleMutationSuccess}
        />
        <EditBio
          initialValue={profile.bio ?? ''}
          initialVisibility={profile.bio_visibility}
          isEditable={isOwnProfile}
          onSuccess={handleMutationSuccess}
        />
        <EditBirthdate
          initialValue={profile.birthdate ?? ''}
          initialVisibility={profile.birthdate_visibility}
          isEditable={isOwnProfile}
          onSuccess={handleMutationSuccess}
        />
        <EditMusicPreferences
          initialPreferences={profile.music_preferences}
          initialVisibility={profile.music_preferences_visibility}
          isEditable={isOwnProfile}
          onSuccess={handleMutationSuccess}
        />
        <FriendsSection
          friends={friends}
          initialVisibility={profile.friends_visibility}
          isEditable={isOwnProfile}
          onSuccess={handleMutationSuccess}
        />
        {isOwnProfile && (
          <FriendInvitesSection
            invites={invites}
            onSuccess={handleMutationSuccess}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#f7f7f9' },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f7f7f9',
  },
  container: { padding: 16, paddingBottom: 32 },
  errorText: {
    color: '#ff4d4f',
    fontSize: 15,
    fontWeight: '500',
  },
});
