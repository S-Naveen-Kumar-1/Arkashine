// src/components/SearchFilterBar.jsx
//
// The app's one search box + filter chip row. Every list screen uses this
// instead of its own copy, so search and filters look and behave the same
// everywhere (Reports, Products, Farmers, payments, FAQ, pickers…).
//
// Collapsed by default: just a search icon and a filter icon (beside the
// optional label). Tapping search opens the box with the keyboard up; its ✕
// clears and collapses it again. Tapping filter opens the chip row. While a
// filter other than the first ("All") is applied the filter icon shows a
// dot and a removable chip names it, so a hidden filter is never a surprise.
//
// Either half is optional:
//   search only  → pass query/onQueryChange, no filters
//   chips only   → pass filters/activeFilter/onFilterChange, no onQueryChange
//
// Props:
//   query, onQueryChange, placeholder   search box (clear button built in)
//   collapsible     false keeps the search box always open — for pickers,
//                   where searching is the whole point (default true)
//   inputRef        ref for the TextInput (e.g. to focus it on open)
//   label           text shown left of the icons (e.g. a section title)
//   filters         [{ key, label, count?, color?, icon? }]
//                   count shows as a badge when > 0; color tints the chip
//                   when selected (defaults to the theme primary)
//   activeFilter    key of the selected chip
//   onFilterChange  (key) => void
//   chipsInset      horizontal padding of the chip row, so it can scroll
//                   edge-to-edge on screens without side padding
//   style           outer container style (spacing is left to the screen)

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Radius, Spacing } from '../theme';
import useTheme from '../hooks/useTheme';

export default function SearchFilterBar({
  query,
  onQueryChange,
  placeholder = 'Search…',
  collapsible = true,
  inputRef,
  label,
  filters,
  activeFilter,
  onFilterChange,
  chipsInset = 0,
  style,
}) {
  const T = useTheme().colors;
  const BORDER = T.cardBorder ?? T.border ?? '#E2E8F0';
  const MUTED = T.muted ?? T.textSub;

  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const hasSearch = !!onQueryChange;
  const hasFilters = filters?.length > 0;
  // A search with text in it stays open even if the user never tapped it.
  const showBar = hasSearch && (!collapsible || searchOpen || !!query);
  // The first filter is the "show everything" one (All / All devices…).
  const filtered = hasFilters && activeFilter !== filters[0].key;
  const activeLabel = filtered
    ? filters.find(f => f.key === activeFilter)?.label
    : null;

  const closeSearch = () => {
    onQueryChange('');
    setSearchOpen(false);
  };

  const iconBtn = (name, onPress, on, dot) => (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={8}
      style={[s.iconBtn, { backgroundColor: on ? T.primary + '18' : 'transparent' }]}
    >
      <Icon name={name} size={20} color={on ? T.primary : MUTED} />
      {dot ? <View style={[s.dot, { backgroundColor: T.primary }]} /> : null}
    </TouchableOpacity>
  );

  const filterButton = iconBtn(
    open ? 'filter-variant-remove' : 'filter-variant',
    () => setOpen(o => !o),
    open || filtered,
    filtered,
  );

  const showHeader = !!label || !showBar;

  return (
    <View style={[s.root, style]}>
      {showHeader ? (
        <View style={s.header}>
          <Text style={[s.label, { color: T.textSub ?? MUTED }]} numberOfLines={1}>
            {label ?? ''}
          </Text>
          {hasSearch && !showBar
            ? iconBtn('magnify', () => setSearchOpen(true), false, false)
            : null}
          {hasFilters && !showBar ? filterButton : null}
        </View>
      ) : null}

      {showBar ? (
        <View
          style={[
            s.searchBar,
            { backgroundColor: T.inputBg ?? T.card, borderColor: BORDER },
          ]}
        >
          <Icon name="magnify" size={20} color={MUTED} />
          <TextInput
            ref={inputRef}
            style={[s.searchInput, { color: T.text }]}
            placeholder={placeholder}
            placeholderTextColor={MUTED}
            value={query}
            onChangeText={onQueryChange}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus={collapsible && searchOpen}
          />
          {collapsible || query ? (
            <TouchableOpacity
              onPress={collapsible ? closeSearch : () => onQueryChange('')}
              hitSlop={8}
            >
              <Icon name="close-circle" size={17} color={MUTED} />
            </TouchableOpacity>
          ) : null}
          {hasFilters ? filterButton : null}
        </View>
      ) : null}

      {/* Filter closed: a one-line reminder of the applied filter, tap to clear */}
      {hasFilters && !open && filtered ? (
        <TouchableOpacity
          onPress={() => onFilterChange?.(filters[0].key)}
          style={[s.chip, s.appliedChip, { borderColor: T.primary, backgroundColor: T.primary + '14' }]}
        >
          <Text style={[s.chipTxt, { color: T.primary }]} numberOfLines={1}>
            {activeLabel}
          </Text>
          <Icon name="close" size={14} color={T.primary} />
        </TouchableOpacity>
      ) : null}

      {hasFilters && open ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          style={chipsInset ? { marginHorizontal: -chipsInset } : null}
          contentContainerStyle={[s.chipRow, { paddingHorizontal: chipsInset }]}
        >
          {filters.map(f => {
            const active = f.key === activeFilter;
            const color = f.color ?? T.primary;
            const fg = active ? '#fff' : T.text;
            return (
              <TouchableOpacity
                key={String(f.key)}
                onPress={() => onFilterChange?.(f.key)}
                activeOpacity={0.75}
                style={[
                  s.chip,
                  {
                    backgroundColor: active ? color : T.card,
                    borderColor: active ? color : BORDER,
                  },
                ]}
              >
                {f.icon ? (
                  <Icon name={f.icon} size={14} color={active ? '#fff' : color} />
                ) : null}
                <Text style={[s.chipTxt, { color: fg }]} numberOfLines={1}>
                  {f.label}
                </Text>
                {f.count > 0 ? (
                  <View
                    style={[
                      s.badge,
                      {
                        backgroundColor: active
                          ? 'rgba(255,255,255,0.25)'
                          : color + '20',
                      },
                    ]}
                  >
                    <Text style={[s.badgeTxt, { color: active ? '#fff' : color }]}>
                      {f.count}
                    </Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  root: { gap: Spacing.sm },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 0 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  label: {
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  appliedChip: { alignSelf: 'flex-start' },
  chipRow: { gap: Spacing.sm, alignItems: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: Radius.full ?? 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipTxt: { fontSize: 12, fontWeight: '700' },
  badge: {
    minWidth: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    alignItems: 'center',
  },
  badgeTxt: { fontSize: 10, fontWeight: '800' },
});
