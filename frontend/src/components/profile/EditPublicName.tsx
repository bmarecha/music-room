import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { profileService } from './profile.service';

interface EditPublicNameProps {
  initialValue: string;
  isEditable?: boolean;
  onSuccess: () => void;
}

export function EditPublicName({
  initialValue,
  isEditable = true,
  onSuccess,
}: EditPublicNameProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(initialValue);
  const [saving, setSaving] = useState(false);

  const handleStartEdit = () => {
    setValue(initialValue);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setValue(initialValue);
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!value.trim() || value.trim() === initialValue) return;
    setSaving(true);
    try {
      await profileService.update({ public_name: value.trim() });
      setIsEditing(false);
      onSuccess();
    } catch (err) {
      console.error('[EditPublicName] update failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = value.trim() !== initialValue && value.trim().length > 0;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Nom public</Text>
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
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={setValue}
          autoCorrect={false}
          placeholder="Votre nom public"
          placeholderTextColor="#aaa"
        />
      ) : (
        <Text style={styles.readOnlyText}>{initialValue || 'Non renseigné'}</Text>
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
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    color: '#111',
    fontSize: 15,
    backgroundColor: '#fafafa',
  },
  readOnlyText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
});
