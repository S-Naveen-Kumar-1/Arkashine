// src/screens/test/CalibrationMatrixModal.js

import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Spacing, Radius, Typography } from '../theme';

export default function CalibrationMatrixModal({
  visible,
  nutrients,   // NUTRIENTS
  points,      // POINTS
  completedSet,
  onClose,
  onSelectCell, // (nutrientKey, pointKey) => void
  theme,
}) {
  const T = theme.colors;
  const totalCells = nutrients.length * points.length;
  const doneCells = nutrients.reduce(
    (acc, n) => acc + points.filter(p => completedSet.has(`${n.key}:${p.key}`)).length,
    0,
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[s.root, { backgroundColor: T.bg }]}>
        <View style={[s.header, { borderBottomColor: T.cardBorder }]}>
          <View>
            <Text style={[Typography.h4, { color: T.text }]}>Calibration Overview</Text>
            <Text style={[s.headerSub, { color: T.textSub }]}>
              {doneCells}/{totalCells} points calibrated
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={10}>
            <Icon name="close" size={24} color={T.muted} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={s.scroll}>
          {/* column headers */}
          <View style={s.row}>
            <View style={s.nutHeadCell} />
            {points.map(p => (
              <View key={p.key} style={s.colHeadCell}>
                <Text style={[s.colHeadTxt, { color: T.textSub }]}>{p.label}</Text>
              </View>
            ))}
          </View>

          {nutrients.map(n => (
            <View key={n.key} style={s.row}>
              <View style={[s.nutHeadCell, { backgroundColor: T.card, borderColor: T.cardBorder }]}>
                <Text style={[s.nutHeadTxt, { color: T.text }]}>{n.key}</Text>
              </View>
              {points.map(p => {
                const done = completedSet.has(`${n.key}:${p.key}`);
                return (
                  <TouchableOpacity
                    key={p.key}
                    style={[
                      s.cell,
                      {
                        backgroundColor: done ? (T.success || '#22C55E') + '20' : T.card,
                        borderColor: done ? T.success || '#22C55E' : T.cardBorder,
                      },
                    ]}
                    onPress={() => onSelectCell(n.key, p.key)}
                  >
                    {done ? (
                      <Icon name="check-bold" size={16} color={T.success || '#22C55E'} />
                    ) : (
                      <View style={[s.dot, { backgroundColor: T.cardBorder }]} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </ScrollView>

        <Text style={[s.footHint, { color: T.muted }]}>
          Tap any cell to jump there — you'll confirm before recalibrating an already-done point.
        </Text>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
  },
  headerSub: { fontSize: 12, marginTop: 2 },
  scroll: { padding: Spacing.lg, paddingBottom: 40 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  nutHeadCell: {
    width: 56,
    height: 36,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  nutHeadTxt: { fontSize: 12, fontWeight: '800' },
  colHeadCell: { flex: 1, alignItems: 'center', marginHorizontal: 3 },
  colHeadTxt: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  cell: {
    flex: 1,
    height: 36,
    borderRadius: Radius.sm,
    borderWidth: 1,
    marginHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  footHint: { fontSize: 11, textAlign: 'center', padding: Spacing.md, lineHeight: 15 },
});