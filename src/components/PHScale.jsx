import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { C } from '../utils/colors';

export function PHScale({ ph }) {
  return (
    <View style={styles.container}>
      <View style={styles.scaleFill}>
        <View
          style={[styles.segment, { flex: 6, backgroundColor: '#EF4444' }]}
        />
        <View
          style={[styles.segment, { flex: 2, backgroundColor: '#22C55E' }]}
        />
        <View
          style={[styles.segment, { flex: 6, backgroundColor: '#3B82F6' }]}
        />
      </View>
      {ph != null && (
        <View style={[styles.marker, { left: `${(ph / 14) * 100}%` }]} />
      )}
      <View style={styles.labels}>
        {['0', '2', '4', '6', '7', '8', '10', '12', '14'].map(n => (
          <Text key={n} style={styles.tick}>
            {n}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', marginTop: 16 },
  scaleFill: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  segment: {},
  marker: {
    position: 'absolute',
    top: -4,
    width: 4,
    height: 18,
    backgroundColor: C.white,
    borderRadius: 2,
    marginLeft: -2,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  tick: { fontSize: 10, color: C.muted },
});
