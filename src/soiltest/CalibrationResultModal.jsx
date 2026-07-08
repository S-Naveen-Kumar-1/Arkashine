// src/screens/test/CalibrationResultModal.js

import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AppButton } from '../components/common';
import { Spacing, Radius, Shadow, Typography } from '../theme';

// Adjust these if you know the real semantic meaning of the 4 saved values
// (e.g. ['Slope', 'Intercept', 'Dark Ref', 'Gain'])
const VALUE_LABELS = ['Value 1', 'Value 2', 'Value 3', 'Value 4'];

export default function CalibrationResultModal({
  visible,
  entry, // { nutrient, point, saved, values, error, savedAt }
  pointMeta, // { label, icon } for entry.point
  nextTarget, // { nutrient, point } | null
  onClose,
  onRecalibrate,
  onNext,
  theme,
}) {
  const T = theme.colors;
  if (!entry) return null;

  const isError = !entry.saved;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={s.backdrop}>
        <View
          style={[
            s.card,
            { backgroundColor: T.bg, borderColor: T.cardBorder },
            Shadow.lg,
          ]}
        >
          <TouchableOpacity style={s.closeBtn} onPress={onClose} hitSlop={10}>
            <Icon name="close" size={20} color={T.muted} />
          </TouchableOpacity>

          <View
            style={[
              s.iconWrap,
              {
                backgroundColor: isError
                  ? T.red + '15'
                  : (T.success || '#22C55E') + '15',
              },
            ]}
          >
            <Icon
              name={isError ? 'alert-circle' : 'check-circle'}
              size={40}
              color={isError ? T.red : T.success || '#22C55E'}
            />
          </View>

          <Text style={[Typography.h4, { color: T.text, textAlign: 'center' }]}>
            {entry.nutrient} · {pointMeta?.label ?? entry.point}
          </Text>
          <Text
            style={[
              s.statusLine,
              { color: isError ? T.red : T.success || '#22C55E' },
            ]}
          >
            {isError ? 'Calibration failed' : 'Saved successfully'}
          </Text>

          {isError ? (
            <View
              style={[
                s.errorBox,
                { backgroundColor: T.red + '10', borderColor: T.red + '40' },
              ]}
            >
              <Text style={[s.errorText, { color: T.red }]}>
                {entry.error ?? 'Unknown error from device.'}
              </Text>
            </View>
          ) : (
            <View style={[s.valuesGrid]}>
              {(entry.values ?? []).map((v, i) => (
                <View
                  key={i}
                  style={[
                    s.valueCell,
                    { backgroundColor: T.card, borderColor: T.cardBorder },
                  ]}
                >
                  <Text style={[s.valueLabel, { color: T.textSub }]}>
                    {VALUE_LABELS[i] ?? `Value ${i + 1}`}
                  </Text>
                  <Text style={[s.valueNum, { color: T.text }]}>
                    {Number(v).toFixed(4)}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <View style={s.actionsRow}>
            <AppButton
              label={isError ? 'Retry' : 'Recalibrate'}
              onPress={onRecalibrate}
              color={T.muted}
              textColor={T.muted}
              outlined
              style={{ flex: 1 }}
            />
            <AppButton
              label={
                isError
                  ? 'Close'
                  : nextTarget
                  ? `Next: ${
                      nextTarget.nutrient
                    } ${nextTarget.point.toUpperCase()}`
                  : 'All Done'
              }
              onPress={isError ? onClose : onNext}
              color={T.primary}
              textColor="#fff"
              style={{ flex: 1.4 }}
            />
          </View>

          {!isError && (
            <Text style={[s.hint, { color: T.muted }]}>
              {nextTarget
                ? 'You can also close and pick a different nutrient/point manually.'
                : 'Every nutrient and point is calibrated. 🎉'}
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  closeBtn: { position: 'absolute', top: 12, right: 12, padding: 4, zIndex: 1 },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statusLine: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
    marginBottom: 14,
  },
  errorBox: {
    width: '100%',
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: 12,
    marginBottom: 6,
  },
  errorText: { fontSize: 12, lineHeight: 18 },
  valuesGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  valueCell: {
    width: '48%',
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  valueLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  valueNum: { fontSize: 15, fontWeight: '800', marginTop: 2 },
  actionsRow: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 10 },
  hint: { fontSize: 11, textAlign: 'center', marginTop: 10, lineHeight: 15 },
});
