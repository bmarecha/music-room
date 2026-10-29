import React, { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { profileService } from './profile.service';
import { VisibilityPicker } from './VisibilityPicker';
import type { VisibilityLevel } from '../../features/profile/profile.types';

interface EditBirthdateProps {
  initialValue: string | null | undefined;
  initialVisibility: VisibilityLevel;
  onSuccess: () => void;
}

export function EditBirthdate({ initialValue, initialVisibility, onSuccess }: EditBirthdateProps) {
  const [date, setDate] = useState<Date | null>(initialValue ? new Date(initialValue) : null);
  // Sur iOS, on n'affiche le spinner que si une date est déjà présente, sinon on attend le clic
  const [showPicker, setShowPicker] = useState(Platform.OS === 'ios' && !!initialValue);
  const [visibility, setVisibility] = useState<VisibilityLevel>(initialVisibility);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!date) return;
    setSaving(true);
    const formattedDate = date.toISOString().split('T')[0];
    try {
      await profileService.update({
        birthdate: formattedDate,
        birthdate_visibility: visibility,
      });
      onSuccess();
    } catch {
    } finally {
      setSaving(false);
    }
  };

  const isoInitial = initialValue ? new Date(initialValue).toISOString().split('T')[0] : '';
  const isoCurrent = date ? date.toISOString().split('T')[0] : '';
  const hasChanges = date !== null && (isoInitial !== isoCurrent || visibility !== initialVisibility);

  // Gestion spécifique pour le Web (Utilisation de l'input natif HTML)
  const handleWebChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value; // Renvoie "YYYY-MM-DD"
    if (val) {
      setDate(new Date(val));
    } else {
      setDate(null);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Date de naissance</Text>

      {/* Rendu spécifique pour la Plateforme WEB */}
      {Platform.OS === 'web' ? (
        <input
          type="date"
          value={isoCurrent}
          max={new Date().toISOString().split('T')[0]}
          onChange={handleWebChange}
          style={webStyles.input}
        />
      ) : (
        /* Rendu pour le Mobile (iOS / Android) */
        <>
          {(!showPicker || Platform.OS !== 'ios') && (
            <Pressable style={styles.pickerTrigger} onPress={() => setShowPicker(true)}>
              <Text style={[styles.pickerTriggerText, !date && styles.placeholderText]}>
                {date ? date.toLocaleDateString('fr-FR') : 'Sélectionner votre date de naissance'}
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

      <VisibilityPicker label="Visibilité de l'âge" value={visibility} onChange={setVisibility} />
      
      <Pressable
        style={[styles.saveBtn, (!hasChanges || saving) && styles.disabled]}
        onPress={handleSave}
        disabled={saving || !hasChanges}
      >
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Enregistrer la date</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#eee', gap: 10, marginBottom: 12 },
  title: { fontSize: 14, fontWeight: '600', color: '#444' },
  pickerTrigger: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, backgroundColor: '#f9f9f9' },
  pickerTriggerText: { fontSize: 15, color: '#111' },
  placeholderText: { color: '#999' },
  saveBtn: { backgroundColor: '#6C47FF', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 4 },
  disabled: { backgroundColor: '#b5a3ff' },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});

// Styles CSS standard pour le composant <input /> Web
const webStyles = {
  input: {
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #ddd',
    backgroundColor: '#f9f9f9',
    fontSize: '15px',
    fontFamily: 'sans-serif',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box' as const,
    placeholderColor: '#999',
  }
};
