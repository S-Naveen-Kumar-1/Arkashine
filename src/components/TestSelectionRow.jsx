// src/components/TestSelectionRow.jsx
//
// One compact row of the test-flow "who / which device" header — shared by
// ActiveFarmerBanner and ActiveDeviceBanner so both look identical:
//   (icon)  LABEL
//           Value or placeholder                  [Select / Change]
//
// Props:
//   icon, color   icon name and accent colour
//   label         small uppercase caption ("Farmer · optional")
//   value         selected value; placeholder shown (muted) when empty
//   placeholder
//   required      amber attention state — nothing chosen yet but needed
//   actionLabel   pill text; omit for a read-only row
//   onPress       whole row is tappable when given

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Radius, Spacing } from '../theme';
import useTheme from '../hooks/useTheme';

export default function TestSelectionRow({
  icon,
  color,
  label,
  value,
  placeholder,
  required = false,
  actionLabel,
  onPress,
}) {
  const T = useTheme().colors;
  const BORDER = T.cardBorder ?? T.border;
  const Wrapper = onPress ? TouchableOpacity : View;

  return (
    <Wrapper
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        s.row,
        {
          backgroundColor: required ? color + '10' : T.card,
          borderColor: required ? color + '88' : BORDER,
          borderLeftColor: color,
        },
      ]}
    >
      <View style={[s.iconWrap, { backgroundColor: color + '1A' }]}>
        <Icon name={icon} size={18} color={color} />
      </View>

      <View style={s.text}>
        <Text style={[s.label, { color: required ? color : T.muted }]} numberOfLines={1}>
          {label}
        </Text>
        {value ? (
          <Text style={[s.value, { color: T.text }]} numberOfLines={1}>
            {value}
          </Text>
        ) : (
          <Text style={[s.placeholder, { color: T.muted }]} numberOfLines={1}>
            {placeholder}
          </Text>
        )}
      </View>

      {actionLabel ? (
        <View style={[s.pill, { backgroundColor: color + '18' }]}>
          <Text style={[s.pillTxt, { color }]}>{actionLabel}</Text>
        </View>
      ) : null}
    </Wrapper>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: Spacing.lg,
    marginVertical: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderLeftWidth: 3,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, minWidth: 0 },
  label: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  value: { fontSize: 14, fontWeight: '700', marginTop: 1 },
  placeholder: { fontSize: 13, fontWeight: '500', marginTop: 1 },
  pill: {
    borderRadius: Radius.full ?? 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  pillTxt: { fontSize: 12, fontWeight: '800' },
});
