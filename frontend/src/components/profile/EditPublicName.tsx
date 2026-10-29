import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { profileService } from './profile.service';

interface EditPublicNameProps {
  initialValue: string;
  onSuccess: () => void;
}

export function EditPublicName({ initialValue, onSuccess }: EditPublicNameProps) {
  const [value, setValue] = useState(initialValue);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!value.trim() || value.trim() === initialValue) return;
    setSaving(true);
    try {
      await profileService.update({ public_name: value.trim() });
      onSuccess();
    } catch {
      // Gérer l'erreur au besoin
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = value.trim() !== initialValue && value.trim().length > 0;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Nom public</Text>
      <View style={styles.row}>
        <TextInput style={styles.input} value={value} onChangeText={setValue} autoCorrect={false} placeholder="Votre nom public" placeholderTextColor="#aaa" />
        <Pressable
          style={[styles.btn, !hasChanges && styles.btnDisabled]}
          onPress={handleSave}
          disabled={saving || !hasChanges}
        >
          {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnText}>OK</Text>}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#eee', gap: 10, marginBottom: 12 },
  title: { fontSize: 14, fontWeight: '600', color: '#444' },
  row: { flexDirection: 'row', gap: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, color: '#111', fontSize: 15 },
  btn: { backgroundColor: '#6C47FF', paddingHorizontal: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center', minWidth: 50 },
  btnDisabled: { backgroundColor: '#b5a3ff' },
  btnText: { color: '#fff', fontWeight: 'bold' },
});
