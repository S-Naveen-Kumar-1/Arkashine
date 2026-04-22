import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { C } from '../utils/colors';

export function ReadingCard({ label, value, unit, color, children }) {
  return (
    <View style={[styles.card, { borderColor: color }]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color }]}>{value}</Text>
      {unit && <Text style={styles.unit}>{unit}</Text>}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 14,
    backgroundColor: C.card,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    color: C.muted,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  value: { fontSize: 64, fontWeight: '900', lineHeight: 72 },
  unit: { fontSize: 14, color: C.muted, marginTop: 2 },
});
