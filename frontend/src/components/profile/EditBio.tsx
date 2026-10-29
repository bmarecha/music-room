import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { profileService } from './profile.service';
import { VisibilityPicker } from './VisibilityPicker';
import type { VisibilityLevel } from '../../features/profile/profile.types';

interface EditBioProps {
  initialValue: string;
  initialVisibility: VisibilityLevel;
  onSuccess: () => void;
}

export function EditBio({ initialValue, initialVisibility, onSuccess }: EditBioProps) {
  const [bio, setBio] = useState(initialValue);
  const [visibility, setVisibility] = useState<VisibilityLevel>(initialVisibility);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await profileService.update({
        bio: bio.trim() || null,
        bio_visibility: visibility,
      });
      onSuccess();
    } catch {
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = bio !== initialValue || visibility !== initialVisibility;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Biographie</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={bio}
        onChangeText={setBio}
        multiline
        placeholder="Racontez votre histoire..."
        placeholderTextColor="#aaa"
      />
      <VisibilityPicker label="Visibilité de la bio" value={visibility} onChange={setVisibility} />
      <Pressable
        style={[styles.saveBtn, !hasChanges && styles.disabled]}
        onPress={handleSave}
        disabled={saving || !hasChanges}
      >
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Enregistrer la bio</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#eee', gap: 10, marginBottom: 12 },
  title: { fontSize: 14, fontWeight: '600', color: '#444' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, color: '#111', fontSize: 15 },
  multiline: { minHeight: 70, textAlignVertical: 'top' },
  saveBtn: { backgroundColor: '#6C47FF', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 4 },
  disabled: { backgroundColor: '#b5a3ff' },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
