import React, { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, View } from 'react-native';
import { profileService, type Profile } from '../../../components/profile/profile.service';
import { useAuth } from '../../../context/AuthContext';
import { EditPublicName } from '../../../components/profile/EditPublicName';
import { EditBio } from '../../../components/profile/EditBio';
import { EditBirthdate } from '../../../components/profile/EditBirthdate';
import { EditMusicPreferences } from '../../../components/profile/EditMusicPreferences';

export default function ProfileScreen() {
  const { refreshUser } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfileData = async () => {
    try {
      const data = await profileService.fetch();
      setProfile(data);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfileData();
  }, []);

  const handleMutationSuccess = async () => {
    await refreshUser(); // Met à jour le contexte global
    await loadProfileData(); // Synchronise les données du composant
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6C47FF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.flex}>
      <ScrollView contentContainerStyle={styles.container}>
        {profile && (
          <>
            <EditPublicName initialValue={profile.public_name} onSuccess={handleMutationSuccess} />
            <EditBio initialValue={profile.bio ?? ''} initialVisibility={profile.bio_visibility} onSuccess={handleMutationSuccess} />
            <EditBirthdate initialValue={profile.birthdate ?? ''} initialVisibility={profile.birthdate_visibility} onSuccess={handleMutationSuccess} />
            <EditMusicPreferences 
              initialPreferences={profile.music_preferences} 
              initialVisibility={profile.music_preferences_visibility} 
              onSuccess={handleMutationSuccess} 
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#f7f7f9' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { padding: 16 },
});
