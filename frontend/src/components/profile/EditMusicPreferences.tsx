import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { VisibilityPicker } from './VisibilityPicker';
import { profileService, type MusicPreference, type VisibilityLevel } from './profile.service';

interface EditMusicPreferencesProps {
  initialPreferences: MusicPreference[];
  initialVisibility: VisibilityLevel;
  isEditable?: boolean;
  onSuccess: () => void;
}

export function EditMusicPreferences({
  initialPreferences,
  initialVisibility,
  isEditable = true,
  onSuccess,
}: EditMusicPreferencesProps) {
  const [isEditing, setIsEditing] = useState(false);

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

  const normalizeText = (text: string) => {
    return text
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean)
      .join(', ');
  };

  const handleStartEdit = () => {
    setGenres(initialGenresText);
    setArtists(initialArtistsText);
    setVisibility(initialVisibility);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setGenres(initialGenresText);
    setArtists(initialArtistsText);
    setVisibility(initialVisibility);
    setIsEditing(false);
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
      await profileService.update({
        music_preferences_visibility: visibility,
        music_preferences: parsePreferences(),
      });
      setIsEditing(false);
      onSuccess();
    } catch (err) {
      console.error('[EditMusicPreferences] update failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const hasChanges =
    normalizeText(genres) !== normalizeText(initialGenresText) ||
    normalizeText(artists) !== normalizeText(initialArtistsText) ||
    visibility !== initialVisibility;

  const visibilityLabelMap: Record<VisibilityLevel, string> = {
    public: 'Public',
    friends: 'Amis uniquement',
    private: 'Privé',
  };

  const genreList = initialPreferences.filter((p) => p.preference_type === 'genre');
  const artistList = initialPreferences.filter((p) => p.preference_type === 'artist');

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Préférences musicales</Text>
        {isEditable && (
          <View style={styles.headerActions}>
            {isEditing ? (
              <>
                <Pressable style={styles.cancelBtn} onPress={handleCancel} disabled={saving}>
                  <Text style={styles.cancelBtnText}>Annuler</Text>
                </Pressable>
                <Pressable
                  style={[styles.actionBtn, (!hasChanges || saving) && styles.btnDisabled]}
                  onPress={handleSave}
                  disabled={saving || !hasChanges}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.actionBtnText}>Enregistrer</Text>
                  )}
                </Pressable>
              </>
            ) : (
              <Pressable style={styles.actionBtn} onPress={handleStartEdit}>
                <Text style={styles.actionBtnText}>Modifier</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>

      {isEditing ? (
        <>
          <Text style={styles.inputLabel}>Genres préférés (séparés par des virgules)</Text>
          <TextInput
            style={styles.input}
            value={genres}
            onChangeText={setGenres}
            placeholder="Rock, Pop, Techno..."
            placeholderTextColor="#aaa"
            autoCorrect={false}
          />

          <Text style={styles.inputLabel}>Artistes favoris (séparés par des virgules)</Text>
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
        </>
      ) : (
        <View style={styles.contentCol}>
          <View style={styles.prefGroup}>
            <Text style={styles.groupLabel}>Genres :</Text>
            {genreList.length > 0 ? (
              <View style={styles.tagsWrap}>
                {genreList.map((g) => (
                  <View key={g.preference_value} style={styles.tag}>
                    <Text style={styles.tagText}>{g.preference_value}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.placeholderText}>Aucun genre renseigné</Text>
            )}
          </View>

          <View style={styles.prefGroup}>
            <Text style={styles.groupLabel}>Artistes :</Text>
            {artistList.length > 0 ? (
              <View style={styles.tagsWrap}>
                {artistList.map((a) => (
                  <View key={a.preference_value} style={styles.tag}>
                    <Text style={styles.tagText}>{a.preference_value}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.placeholderText}>Aucun artiste renseigné</Text>
            )}
          </View>

          {isEditable && (
            <View style={styles.visibilityBadge}>
              <Text style={styles.visibilityBadgeText}>
                Visibilité : {visibilityLabelMap[initialVisibility]}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    gap: 12,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    backgroundColor: '#6C47FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 75,
  },
  btnDisabled: {
    backgroundColor: '#b5a3ff',
  },
  actionBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  cancelBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelBtnText: {
    color: '#666',
    fontWeight: '500',
    fontSize: 13,
  },
  contentCol: {
    gap: 10,
  },
  prefGroup: {
    gap: 6,
  },
  groupLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    backgroundColor: '#f2f0ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2dcff',
  },
  tagText: {
    color: '#6C47FF',
    fontSize: 13,
    fontWeight: '500',
  },
  placeholderText: {
    color: '#888',
    fontStyle: 'italic',
    fontSize: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
    marginTop: 2,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    color: '#111',
    fontSize: 15,
    backgroundColor: '#fafafa',
  },
  visibilityBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#f2f0ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 4,
  },
  visibilityBadgeText: {
    color: '#6C47FF',
    fontSize: 12,
    fontWeight: '500',
  },
});
