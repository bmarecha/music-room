import React, { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { VisibilityPicker } from './VisibilityPicker';
import { profileService, type VisibilityLevel } from './profile.service';

interface EditBirthdateProps {
  initialValue: string | null | undefined;
  initialVisibility: VisibilityLevel;
  isEditable?: boolean;
  onSuccess: () => void;
}

export function EditBirthdate({
  initialValue,
  initialVisibility,
  isEditable = true,
  onSuccess,
}: EditBirthdateProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [date, setDate] = useState<Date | null>(initialValue ? new Date(initialValue) : null);
  const [showPicker, setShowPicker] = useState(Platform.OS === 'ios' && !!initialValue);
  const [visibility, setVisibility] = useState<VisibilityLevel>(initialVisibility);
  const [saving, setSaving] = useState(false);

  const handleStartEdit = () => {
    setDate(initialValue ? new Date(initialValue) : null);
    setVisibility(initialVisibility);
    setShowPicker(Platform.OS === 'ios' && !!initialValue);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setDate(initialValue ? new Date(initialValue) : null);
    setVisibility(initialVisibility);
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!date) return;
    setSaving(true);
    const formattedDate = date.toISOString().split('T')[0];
    try {
      await profileService.update({
        birthdate: formattedDate,
        birthdate_visibility: visibility,
      });
      setIsEditing(false);
      onSuccess();
    } catch (err) {
      console.error('[EditBirthdate] update failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const isoInitial = initialValue ? new Date(initialValue).toISOString().split('T')[0] : '';
  const isoCurrent = date ? date.toISOString().split('T')[0] : '';
  const hasChanges =
    date !== null && (isoInitial !== isoCurrent || visibility !== initialVisibility);

  const handleWebChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val) {
      setDate(new Date(val));
    } else {
      setDate(null);
    }
  };

  const visibilityLabelMap: Record<VisibilityLevel, string> = {
    public: 'Public',
    friends: 'Amis uniquement',
    private: 'Privé',
  };

  const formattedDisplayDate = initialValue
    ? new Date(initialValue).toLocaleDateString('fr-FR')
    : 'Non renseignée';

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Date de naissance</Text>
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
          {Platform.OS === 'web' ? (
            <input
              type="date"
              value={isoCurrent}
              max={new Date().toISOString().split('T')[0]}
              onChange={handleWebChange}
              style={webStyles.input}
            />
          ) : (
            <>
              {(!showPicker || Platform.OS !== 'ios') && (
                <Pressable style={styles.pickerTrigger} onPress={() => setShowPicker(true)}>
                  <Text style={[styles.pickerTriggerText, !date && styles.placeholderText]}>
                    {date
                      ? date.toLocaleDateString('fr-FR')
                      : 'Sélectionner votre date de naissance'}
                  </Text>
                </Pressable>
              )}

              {showPicker && (
                <DateTimePicker
                  value={date || new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  maximumDate={new Date()}
                  onChange={(event, selectedDate) => {
                    if (Platform.OS !== 'ios') setShowPicker(false);
                    if (event.type === 'set' && selectedDate) {
                      setDate(selectedDate);
                    } else if (Platform.OS === 'ios' && selectedDate) {
                      setDate(selectedDate);
                    }
                  }}
                />
              )}
            </>
          )}

          <VisibilityPicker
            label="Visibilité de la date de naissance"
            value={visibility}
            onChange={setVisibility}
          />
        </>
      ) : (
        <View style={styles.contentCol}>
          <Text style={[styles.readOnlyText, !initialValue && styles.placeholderText]}>
            {formattedDisplayDate}
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
  pickerTrigger: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fafafa',
  },
  pickerTriggerText: {
    fontSize: 15,
    color: '#111',
  },
  placeholderText: {
    color: '#888',
    fontStyle: 'italic',
  },
  readOnlyText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
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

const webStyles = {
  input: {
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #ddd',
    backgroundColor: '#fafafa',
    fontSize: '15px',
    fontFamily: 'sans-serif',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box' as const,
    color: '#111',
  },
};
