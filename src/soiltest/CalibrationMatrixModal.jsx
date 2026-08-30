// src/screens/test/CalibrationMatrixModal.js

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Spacing, Radius, Typography } from '../theme';

const VALUE_LABELS = ['Value 1', 'Value 2', 'Value 3', 'Value 4'];

export default function CalibrationMatrixModal({
  visible,
  nutrients = [], // NUTRIENTS
  points = [], // POINTS
  completedSet = new Set(),
  cachedValues = {},
  storedChannels = null,
  allChannels = [
    'A',
    'B',
    'C',
    'D',
    'E',
    'F',
    'G',
    'H',
    'I',
    'J',
    'K',
    'L',
    'R',
    'S',
    'T',
    'U',
    'V',
    'W',
    'UVA',
    'UVB',
    'UVC',
  ],
  wavelengths = {},
  onClose,
  onSelectCell, // (nutrientKey, pointKey) => void
  theme,
}) {
  const T = theme.colors;
  const [activeTab, setActiveTab] = useState('matrix'); // 'matrix' | 'channels'
  const [selectedCell, setSelectedCell] = useState(null); // { nutrient, point }

  const totalCells = nutrients.length * points.length;
  const doneCells = nutrients.reduce(
    (acc, n) =>
      acc + points.filter(p => completedSet.has(`${n.key}:${p.key}`)).length,
    0,
  );

  const cellKey = selectedCell
    ? `${selectedCell.nutrient}:${selectedCell.point}`
    : null;
  const isSelectedDone = cellKey ? completedSet.has(cellKey) : false;
  const cellData = cellKey ? cachedValues[cellKey] : null;

  const rawValues = Array.isArray(cellData) ? cellData : cellData?.values;
  const savedAt = cellData?.savedAt;

  const chanData = storedChannels?.channels || {};
  const chanTimestamp = storedChannels?.savedAt;
  const activeChanCount = Object.keys(chanData).filter(
    k => chanData[k] != null,
  ).length;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[s.root, { backgroundColor: T.bg }]}>
        {/* Header */}
        <View style={[s.header, { borderBottomColor: T.cardBorder }]}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name="database-check" size={20} color={T.primary} />
              <Text style={[Typography.h4, { color: T.text }]}>
                Storage Overview
              </Text>
            </View>
            <Text style={[s.headerSub, { color: T.textSub }]}>
              {doneCells}/{totalCells} calibrated · Local Storage Synced 💾
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={10}>
            <Icon name="close" size={24} color={T.muted} />
          </TouchableOpacity>
        </View>

        {/* Tab Selector */}
        <View style={[s.tabContainer, { backgroundColor: T.card }]}>
          <TouchableOpacity
            style={[
              s.tabBtn,
              activeTab === 'matrix' && [
                s.tabBtnActive,
                { backgroundColor: T.primary },
              ],
            ]}
            onPress={() => setActiveTab('matrix')}
          >
            <Icon
              name="grid"
              size={16}
              color={activeTab === 'matrix' ? '#fff' : T.muted}
            />
            <Text
              style={[
                s.tabTxt,
                { color: activeTab === 'matrix' ? '#fff' : T.textSub },
              ]}
            >
              Calibrated Values ({doneCells})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              s.tabBtn,
              activeTab === 'channels' && [
                s.tabBtnActive,
                { backgroundColor: T.primary },
              ],
            ]}
            onPress={() => setActiveTab('channels')}
          >
            <Icon
              name="sine-wave"
              size={16}
              color={activeTab === 'channels' ? '#fff' : T.muted}
            />
            <Text
              style={[
                s.tabTxt,
                { color: activeTab === 'channels' ? '#fff' : T.textSub },
              ]}
            >
              Stored Channels ({activeChanCount}/21)
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={s.scroll}>
          {activeTab === 'matrix' ? (
            <>
              {/* Column headers */}
              <View style={s.row}>
                <View style={s.nutHeadCell} />
                {points.map(p => (
                  <View key={p.key} style={s.colHeadCell}>
                    <Text style={[s.colHeadTxt, { color: T.textSub }]}>
                      {p.label}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Rows */}
              {nutrients.map(n => (
                <View key={n.key} style={s.row}>
                  <View
                    style={[
                      s.nutHeadCell,
                      { backgroundColor: T.card, borderColor: T.cardBorder },
                    ]}
                  >
                    <Text style={[s.nutHeadTxt, { color: T.text }]}>
                      {n.key}
                    </Text>
                  </View>
                  {points.map(p => {
                    const done = completedSet.has(`${n.key}:${p.key}`);
                    const isSelected =
                      selectedCell?.nutrient === n.key &&
                      selectedCell?.point === p.key;

                    return (
                      <TouchableOpacity
                        key={p.key}
                        style={[
                          s.cell,
                          {
                            backgroundColor: isSelected
                              ? T.primary + '33'
                              : done
                              ? (T.success || '#22C55E') + '20'
                              : T.card,
                            borderColor: isSelected
                              ? T.primary
                              : done
                              ? T.success || '#22C55E'
                              : T.cardBorder,
                            borderWidth: isSelected ? 2 : 1,
                          },
                        ]}
                        onPress={() =>
                          setSelectedCell({ nutrient: n.key, point: p.key })
                        }
                      >
                        {done ? (
                          <Icon
                            name="check-bold"
                            size={16}
                            color={T.success || '#22C55E'}
                          />
                        ) : (
                          <View
                            style={[s.dot, { backgroundColor: T.cardBorder }]}
                          />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}

              {/* Selected Cell Preview Panel */}
              {selectedCell ? (
                <View
                  style={[
                    s.detailCard,
                    { backgroundColor: T.card, borderColor: T.primary },
                  ]}
                >
                  <View style={s.detailHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Icon
                        name={isSelectedDone ? 'check-circle' : 'circle-outline'}
                        size={18}
                        color={
                          isSelectedDone
                            ? T.success || '#22C55E'
                            : T.muted
                        }
                      />
                      <Text style={[Typography.h4, { color: T.text }]}>
                        {selectedCell.nutrient} ·{' '}
                        {selectedCell.point.toUpperCase()}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[s.jumpBtn, { backgroundColor: T.primary }]}
                      onPress={() => {
                        onSelectCell(
                          selectedCell.nutrient,
                          selectedCell.point,
                        );
                      }}
                    >
                      <Text style={s.jumpBtnTxt}>Select for Test</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={[s.detailStatus, { color: T.textSub }]}>
                    Status:{' '}
                    {isSelectedDone
                      ? 'Calibrated & Saved in Local Storage'
                      : 'Not Calibrated Yet'}
                  </Text>

                  {savedAt && (
                    <Text style={[s.detailTime, { color: T.muted }]}>
                      Saved: {new Date(savedAt).toLocaleString()}
                    </Text>
                  )}

                  {rawValues && Array.isArray(rawValues) ? (
                    <View style={s.valGrid}>
                      {rawValues.map((v, i) => (
                        <View
                          key={i}
                          style={[
                            s.valBox,
                            {
                              backgroundColor: T.bg,
                              borderColor: T.cardBorder,
                            },
                          ]}
                        >
                          <Text style={[s.valLabel, { color: T.textSub }]}>
                            {VALUE_LABELS[i] ?? `Val ${i + 1}`}
                          </Text>
                          <Text style={[s.valNum, { color: T.text }]}>
                            {Number(v).toFixed(4)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : isSelectedDone ? (
                    <Text style={[s.noValText, { color: T.muted }]}>
                      Calibrated on device (values stored).
                    </Text>
                  ) : null}
                </View>
              ) : (
                <Text style={[s.selectHint, { color: T.muted }]}>
                  Tap any cell in the grid above to view stored calibration values.
                </Text>
              )}
            </>
          ) : (
            /* Tab 2: Stored Channels Overview */
            <View>
              <View style={s.chanHeaderRow}>
                <View>
                  <Text style={[Typography.h4, { color: T.text }]}>
                    21 Spectral Channels
                  </Text>
                  <Text style={[s.chanSub, { color: T.textSub }]}>
                    {activeChanCount > 0
                      ? `${activeChanCount}/21 channels active`
                      : 'No channels recorded yet'}
                  </Text>
                </View>
                {chanTimestamp && (
                  <Text style={[s.chanTime, { color: T.muted }]}>
                    Saved: {new Date(chanTimestamp).toLocaleTimeString()}
                  </Text>
                )}
              </View>

              <View style={s.channelGrid}>
                {allChannels.map(ch => {
                  const val = chanData[ch];
                  const hasVal = val != null;
                  const nm = wavelengths[ch];

                  return (
                    <View
                      key={ch}
                      style={[
                        s.channelCell,
                        {
                          backgroundColor: hasVal ? T.primary + '15' : T.card,
                          borderColor: hasVal
                            ? T.primary + '66'
                            : T.cardBorder,
                        },
                      ]}
                    >
                      <View style={s.cellTopRow}>
                        <Text
                          style={[
                            s.chKeyText,
                            { color: hasVal ? T.primary : T.muted },
                          ]}
                        >
                          {ch}
                        </Text>
                        {nm && (
                          <Text style={[s.nmText, { color: T.muted }]}>
                            {nm}nm
                          </Text>
                        )}
                      </View>
                      <Text
                        style={[
                          s.chValText,
                          { color: hasVal ? T.text : T.muted },
                        ]}
                        numberOfLines={1}
                      >
                        {hasVal ? Number(val).toFixed(2) : '—'}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </ScrollView>

        <Text style={[s.footHint, { color: T.muted }]}>
          💾 Calibration and spectral channel data are stored in mobile local storage.
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
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  headerSub: { fontSize: 12, marginTop: 2 },
  tabContainer: {
    flexDirection: 'row',
    margin: Spacing.md,
    borderRadius: Radius.md,
    padding: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: Radius.sm,
    gap: 6,
  },
  tabBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  tabTxt: { fontSize: 12, fontWeight: '700' },
  scroll: { paddingHorizontal: Spacing.lg, paddingBottom: 30 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  nutHeadCell: {
    width: 48,
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

  detailCard: {
    marginTop: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    padding: Spacing.md,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  jumpBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.sm,
  },
  jumpBtnTxt: { color: '#fff', fontSize: 11, fontWeight: '700' },
  detailStatus: { fontSize: 12, fontWeight: '600' },
  detailTime: { fontSize: 11, marginTop: 2, fontStyle: 'italic' },
  valGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: Spacing.sm,
  },
  valBox: {
    flex: 1,
    minWidth: '22%',
    padding: 8,
    borderRadius: Radius.sm,
    borderWidth: 1,
    alignItems: 'center',
  },
  valLabel: { fontSize: 10, fontWeight: '700' },
  valNum: { fontSize: 12, fontWeight: '800', marginTop: 2 },
  noValText: { fontSize: 12, marginTop: 6, fontStyle: 'italic' },
  selectHint: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: Spacing.md,
    fontStyle: 'italic',
  },

  chanHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  chanSub: { fontSize: 12, marginTop: 2 },
  chanTime: { fontSize: 11, fontStyle: 'italic' },
  channelGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  channelCell: {
    width: '31%',
    borderRadius: Radius.sm,
    borderWidth: 1,
    padding: 8,
  },
  cellTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chKeyText: { fontSize: 13, fontWeight: '900' },
  nmText: { fontSize: 9 },
  chValText: { fontSize: 12, fontWeight: '800', marginTop: 4 },

  footHint: {
    fontSize: 11,
    textAlign: 'center',
    padding: Spacing.md,
    lineHeight: 15,
  },
});