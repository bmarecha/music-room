import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { VisibilityLevel } from './profile.service';

interface VisibilityPickerProps {
  label: string;
  value: VisibilityLevel;
  onChange: (value: VisibilityLevel) => void;
}

const OPTIONS: VisibilityLevel[] = ['public', 'friends', 'private'];

export function VisibilityPicker({ label, value, onChange }: VisibilityPickerProps) {
  const getLabel = (opt: VisibilityLevel) => {
    if (opt === 'public') return 'Public';
    if (opt === 'friends') return 'Amis';
    return 'Privé';
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        {OPTIONS.map((option) => {
          const isSelected = option === value;
          return (
            <Pressable
              key={option}
              style={[styles.option, isSelected && styles.selected]}
              onPress={() => onChange(option)}
            >
              <Text style={[styles.optionText, isSelected && styles.selectedText]}>
                {getLabel(option)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6, marginTop: 4 },
  label: { fontSize: 13, fontWeight: '500', color: '#666' },
  row: { flexDirection: 'row', gap: 6 },
  option: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 20, paddingVertical: 6, alignItems: 'center' },
  selected: { backgroundColor: '#6C47FF', borderColor: '#6C47FF' },
  optionText: { fontSize: 13, color: '#444' },
  selectedText: { color: '#fff', fontWeight: '600' },
});
