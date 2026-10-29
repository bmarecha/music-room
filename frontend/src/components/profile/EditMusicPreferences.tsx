import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { VisibilityPicker } from './VisibilityPicker';
import { type VisibilityLevel, profileService, type MusicPreference } from './profile.service';

interface EditMusicPreferencesProps {
  initialPreferences: MusicPreference[];
  initialVisibility: VisibilityLevel;
  onSuccess: () => void;
}

export function EditMusicPreferences({ initialPreferences, initialVisibility, onSuccess }: EditMusicPreferencesProps) {
  const initialGenresText = initialPreferences
    .filter((p) => p.preference_type === 'genre')
    .map((p) => p.preference_value)
    .join(', ');

  const initialArtistsText = initialPreferences
    .filter((p) => p.preference_type === 'artist')
    .map((p) => p.preference_value)
    .join(', ');

  const [genres, setGenres] = useState(initialGenresText);
  const [artists, setArtists] = useState(initialArtistsText);
  const [visibility, setVisibility] = useState<VisibilityLevel>(initialVisibility);
  const [saving, setSaving] = useState(false);

  // Nettoie une chaîne de caractères en enlevant les espaces, virgules en trop au début/fin
  const normalizeText = (text: string) => {
    return text
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean)
      .join(', ');
  };

  const parsePreferences = (): MusicPreference[] => {
    const list: MusicPreference[] = [];
    
    genres.split(',').forEach((val) => {
      const clean = val.trim();
      if (clean) list.push({ preference_type: 'genre', preference_value: clean });
    });

    artists.split(',').forEach((val) => {
      const clean = val.trim();
      if (clean) list.push({ preference_type: 'artist', preference_value: clean });
    });

    return list;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await profileApi.updateProfile({
        music_preferences_visibility: visibility,
        music_preferences: parsePreferences(),
      });
      onSuccess();
    } catch {
      // Gérer l'erreur
    } finally {
      setSaving(false);
    }
  };

  // Comparaison basée sur le texte normalisé pour éviter les faux positifs ("Rock," vs "Rock")
  const hasChanges = 
    normalizeText(genres) !== normalizeText(initialGenresText) || 
    normalizeText(artists) !== normalizeText(initialArtistsText) || 
    visibility !== initialVisibility;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Préférences musicales</Text>
      
      <Text style={styles.inputLabel}>Genres préférés</Text>
      <TextInput
        style={styles.input}
        value={genres}
        onChangeText={setGenres}
        placeholder="Rock, Pop, Techno..."
        placeholderTextColor="#aaa"
        autoCorrect={false}
      />

      <Text style={styles.inputLabel}>Artistes favoris</Text>
      <TextInput
        style={styles.input}
        value={artists}
        onChangeText={setArtists}
        placeholder="Daft Punk, Justice..."
        placeholderTextColor="#aaa"
        autoCorrect={false}
      />

      <VisibilityPicker 
        label="Visibilité des préférences" 
        value={visibility} 
        onChange={setVisibility} 
      />

      <Pressable
        style={[styles.saveBtn, !hasChanges && styles.disabled]}
        onPress={handleSave}
        disabled={saving || !hasChanges}
      >
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Enregistrer la musique</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#eee', gap: 10, marginBottom: 12 },
  title: { fontSize: 16, fontWeight: 'bold', color: '#111', marginBottom: 4 },
  inputLabel: { fontSize: 13, fontWeight: '500', color: '#666', marginTop: 4 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, color: '#111', fontSize: 15 },
  saveBtn: { backgroundColor: '#6C47FF', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  disabled: { backgroundColor: '#b5a3ff' },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
