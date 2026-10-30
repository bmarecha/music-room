import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { VisibilityPicker } from './VisibilityPicker';
import { profileService, type VisibilityLevel } from './profile.service';

interface EditBioProps {
  initialValue: string;
  initialVisibility: VisibilityLevel;
  isEditable?: boolean;
  onSuccess: () => void;
}

export function EditBio({
  initialValue,
  initialVisibility,
  isEditable = true,
  onSuccess,
}: EditBioProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [bio, setBio] = useState(initialValue);
  const [visibility, setVisibility] = useState<VisibilityLevel>(initialVisibility);
  const [saving, setSaving] = useState(false);

  const handleStartEdit = () => {
    setBio(initialValue);
    setVisibility(initialVisibility);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setBio(initialValue);
    setVisibility(initialVisibility);
    setIsEditing(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await profileService.update({
        bio: bio.trim() || null,
        bio_visibility: visibility,
      });
      setIsEditing(false);
      onSuccess();
    } catch (err) {
      console.error('[EditBio] update failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = bio.trim() !== initialValue.trim() || visibility !== initialVisibility;

  const visibilityLabelMap: Record<VisibilityLevel, string> = {
    public: 'Public',
    friends: 'Amis uniquement',
    private: 'Privé',
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Biographie</Text>
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
          <TextInput
            style={[styles.input, styles.multiline]}
            value={bio}
            onChangeText={setBio}
            multiline
            placeholder="Racontez votre histoire..."
            placeholderTextColor="#aaa"
          />
          <VisibilityPicker
            label="Visibilité de la bio"
            value={visibility}
            onChange={setVisibility}
          />
        </>
      ) : (
        <View style={styles.contentCol}>
          <Text style={[styles.readOnlyText, !initialValue && styles.placeholderText]}>
            {initialValue || 'Aucune biographie renseignée'}
          </Text>
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
    gap: 8,
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
  multiline: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  readOnlyText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  placeholderText: {
    color: '#888',
    fontStyle: 'italic',
  },
  visibilityBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#f2f0ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  visibilityBadgeText: {
    color: '#6C47FF',
    fontSize: 12,
    fontWeight: '500',
  },
});
