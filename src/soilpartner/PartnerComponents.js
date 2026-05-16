// src/screens/partner/PartnerComponents.js
// ─────────────────────────────────────────────────────────────────────────────
// REUSABLE UI COMPONENTS — used across all Soil Partner screens
// Import: import { Field, SectionCard, CheckRow, ... } from './PartnerComponents';
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import {
  Animated,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Radius, Shadow, Spacing, Typography } from '../theme';
import {
  INDIA_STATES,
  FARMER_STATUSES,
  SAMPLE_LIFECYCLE,
} from './partnerConstants';

const { width: SW } = Dimensions.get('window');

// ─────────────────────────────────────────────────────────────────────────────
// SECTION CARD
// ─────────────────────────────────────────────────────────────────────────────
export function SectionCard({ children, T, style }) {
  return (
    <View
      style={[
        sc.card,
        { backgroundColor: T.card, borderColor: T.cardBorder },
        Shadow.sm,
        style,
      ]}
    >
      {children}
    </View>
  );
}
const sc = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION TITLE ROW
// ─────────────────────────────────────────────────────────────────────────────
export function SecTitle({ title, action, onAction, T }) {
  return (
    <View style={stt.row}>
      <Text style={[stt.title, { color: T.text }]}>{title}</Text>
      {action ? (
        <TouchableOpacity onPress={onAction} activeOpacity={0.75}>
          <Text style={[stt.action, { color: T.primary }]}>{action}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
const stt = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 4,
  },
  title: { fontSize: 16, fontWeight: '800' },
  action: { fontSize: 13, fontWeight: '700' },
});

// ─────────────────────────────────────────────────────────────────────────────
// STEP HEADER (icon + title + subtitle)
// ─────────────────────────────────────────────────────────────────────────────
export function StepHeader({ icon, title, subtitle, T }) {
  return (
    <View style={sph.wrap}>
      <View
        style={[
          sph.iconWrap,
          { backgroundColor: T.primaryDim, borderColor: T.primary + '44' },
        ]}
      >
        <Text style={sph.icon}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[sph.title, { color: T.text }]}>{title}</Text>
        {subtitle ? (
          <Text style={[sph.sub, { color: T.muted }]}>{subtitle}</Text>
        ) : null}
      </View>
    </View>
  );
}
const sph = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: Spacing.lg,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 26 },
  title: { fontSize: 20, fontWeight: '900', letterSpacing: -0.3 },
  sub: { fontSize: 13, marginTop: 3 },
});

// ─────────────────────────────────────────────────────────────────────────────
// TEXT FIELD
// ─────────────────────────────────────────────────────────────────────────────
export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  maxLength,
  secureTextEntry = false,
  multiline = false,
  required = false,
  hint,
  editable = true,
  T,
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={fi.wrap}>
      <View style={fi.labelRow}>
        <Text style={[fi.label, { color: T.textSub }]}>{label}</Text>
        {required && <Text style={[fi.req, { color: T.red }]}> *</Text>}
      </View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={T.muted}
        keyboardType={keyboardType}
        maxLength={maxLength}
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
        editable={editable}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[
          fi.input,
          {
            backgroundColor: editable ? T.inputBg : T.surface,
            borderColor: focused ? T.primary : T.inputBorder,
            color: T.text,
            height: multiline ? 90 : 48,
            textAlignVertical: multiline ? 'top' : 'center',
            paddingTop: multiline ? 12 : 0,
          },
        ]}
      />
      {hint ? <Text style={[fi.hint, { color: T.muted }]}>{hint}</Text> : null}
    </View>
  );
}
const fi = StyleSheet.create({
  wrap: { marginBottom: Spacing.md },
  labelRow: { flexDirection: 'row', marginBottom: 6 },
  label: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  req: { fontSize: 12, fontWeight: '700' },
  input: {
    borderRadius: Radius.md,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    fontSize: 15,
    fontWeight: '500',
  },
  hint: { fontSize: 11, marginTop: 4, lineHeight: 16 },
});

// ─────────────────────────────────────────────────────────────────────────────
// STATE PICKER
// ─────────────────────────────────────────────────────────────────────────────
export function StatePicker({ value, onSelect, T }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ marginBottom: Spacing.md }}>
      <View style={fi.labelRow}>
        <Text style={[fi.label, { color: T.textSub }]}>State</Text>
        <Text style={[fi.req, { color: T.red }]}> *</Text>
      </View>
      <TouchableOpacity
        onPress={() => setOpen(o => !o)}
        activeOpacity={0.8}
        style={[
          fi.input,
          {
            backgroundColor: T.inputBg,
            borderColor: value ? T.primary : T.inputBorder,
            justifyContent: 'center',
            paddingHorizontal: 14,
          },
        ]}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              color: value ? T.text : T.muted,
              fontSize: 15,
              fontWeight: '500',
            }}
          >
            {value || 'Select state…'}
          </Text>
          <Text style={{ color: T.muted, fontSize: 12 }}>
            {open ? '▲' : '▼'}
          </Text>
        </View>
      </TouchableOpacity>
      {open && (
        <View
          style={[
            spk.list,
            { backgroundColor: T.card, borderColor: T.cardBorder },
            Shadow.md,
          ]}
        >
          <ScrollView
            style={{ maxHeight: 240 }}
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
          >
            {INDIA_STATES.map(s => (
              <TouchableOpacity
                key={s}
                onPress={() => {
                  onSelect(s);
                  setOpen(false);
                }}
                style={[spk.item, { borderBottomColor: T.divider }]}
              >
                <Text
                  style={[
                    spk.itemTxt,
                    { color: s === value ? T.primary : T.text },
                  ]}
                >
                  {s}
                </Text>
                {s === value ? (
                  <Text style={{ color: T.primary, fontSize: 14 }}>✓</Text>
                ) : null}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}
const spk = StyleSheet.create({
  list: {
    borderRadius: Radius.md,
    borderWidth: 1.5,
    marginTop: 4,
    overflow: 'hidden',
    zIndex: 999,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: 1,
  },
  itemTxt: { fontSize: 14, fontWeight: '500' },
});

// ─────────────────────────────────────────────────────────────────────────────
// GENERIC PICKER (for crop, season, etc.)
// ─────────────────────────────────────────────────────────────────────────────
export function OptionPicker({ label, value, options, onSelect, required, T }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ marginBottom: Spacing.md, zIndex: open ? 100 : 1 }}>
      <View style={fi.labelRow}>
        <Text style={[fi.label, { color: T.textSub }]}>{label}</Text>
        {required && <Text style={[fi.req, { color: T.red }]}> *</Text>}
      </View>
      <TouchableOpacity
        onPress={() => setOpen(o => !o)}
        activeOpacity={0.8}
        style={[
          fi.input,
          {
            backgroundColor: T.inputBg,
            borderColor: value ? T.primary : T.inputBorder,
            justifyContent: 'center',
            paddingHorizontal: 14,
          },
        ]}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              color: value ? T.text : T.muted,
              fontSize: 15,
              fontWeight: '500',
            }}
          >
            {value || `Select ${label}…`}
          </Text>
          <Text style={{ color: T.muted, fontSize: 12 }}>
            {open ? '▲' : '▼'}
          </Text>
        </View>
      </TouchableOpacity>
      {open && (
        <View
          style={[
            spk.list,
            { backgroundColor: T.card, borderColor: T.cardBorder },
            Shadow.md,
          ]}
        >
          <ScrollView
            style={{ maxHeight: 200 }}
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
          >
            {options.map(opt => (
              <TouchableOpacity
                key={opt}
                onPress={() => {
                  onSelect(opt);
                  setOpen(false);
                }}
                style={[spk.item, { borderBottomColor: T.divider }]}
              >
                <Text
                  style={[
                    spk.itemTxt,
                    { color: opt === value ? T.primary : T.text },
                  ]}
                >
                  {opt}
                </Text>
                {opt === value ? (
                  <Text style={{ color: T.primary }}>✓</Text>
                ) : null}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CHECKBOX ROW
// ─────────────────────────────────────────────────────────────────────────────
export function CheckRow({ label, icon, checked, onToggle, T }) {
  return (
    <TouchableOpacity
      onPress={onToggle}
      activeOpacity={0.75}
      style={[
        cr.row,
        {
          backgroundColor: checked ? T.primaryDim : T.surface,
          borderColor: checked ? T.primary : T.cardBorder,
        },
      ]}
    >
      <View
        style={[
          cr.box,
          {
            backgroundColor: checked ? T.primary : 'transparent',
            borderColor: checked ? T.primary : T.muted,
          },
        ]}
      >
        {checked ? <Text style={cr.tick}>✓</Text> : null}
      </View>
      {icon ? <Text style={cr.iconTxt}>{icon}</Text> : null}
      <Text style={[cr.label, { color: checked ? T.primary : T.text }]}>
        {label}
      </Text>
      {checked ? (
        <View style={[cr.badge, { backgroundColor: T.primary + '22' }]}>
          <Text style={[cr.badgeTxt, { color: T.primary }]}>Done</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}
const cr = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 10,
  },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tick: { color: '#fff', fontSize: 12, fontWeight: '900' },
  iconTxt: { fontSize: 18 },
  label: { flex: 1, fontSize: 14, fontWeight: '600' },
  badge: {
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeTxt: { fontSize: 11, fontWeight: '800' },
});

// ─────────────────────────────────────────────────────────────────────────────
// TAG PILL (for village tags)
// ─────────────────────────────────────────────────────────────────────────────
export function TagPill({ label, onRemove, T }) {
  return (
    <View
      style={[
        tp.pill,
        { backgroundColor: T.primaryDim, borderColor: T.primary + '55' },
      ]}
    >
      <Text style={[tp.label, { color: T.primary }]}>{label}</Text>
      {onRemove ? (
        <TouchableOpacity
          onPress={onRemove}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[tp.x, { color: T.primary }]}>✕</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
const tp = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  label: { fontSize: 13, fontWeight: '700' },
  x: { fontSize: 10, fontWeight: '900' },
});

// ─────────────────────────────────────────────────────────────────────────────
// STATUS BADGE
// ─────────────────────────────────────────────────────────────────────────────
export function StatusBadge({ statusKey, T }) {
  const meta = FARMER_STATUSES.find(s => s.key === statusKey) ?? {
    label: statusKey,
    color: T.muted,
    icon: '•',
  };
  return (
    <View style={[sb.wrap, { backgroundColor: meta.color + '22' }]}>
      <Text style={sb.icon}>{meta.icon}</Text>
      <Text style={[sb.label, { color: meta.color }]}>{meta.label}</Text>
    </View>
  );
}
const sb = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  icon: { fontSize: 11 },
  label: { fontSize: 11, fontWeight: '800' },
});

// ─────────────────────────────────────────────────────────────────────────────
// SAMPLE LIFECYCLE STEPPER
// ─────────────────────────────────────────────────────────────────────────────
export function SampleStepper({ currentStatus, T }) {
  const currentIdx = SAMPLE_LIFECYCLE.findIndex(s => s.key === currentStatus);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={sl.wrap}>
        {SAMPLE_LIFECYCLE.map((step, i) => {
          const done = i < currentIdx;
          const active = i === currentIdx;
          const pending = i > currentIdx;
          const color = done || active ? T.primary : T.muted;
          return (
            <React.Fragment key={step.key}>
              <View style={sl.step}>
                <View
                  style={[
                    sl.dot,
                    {
                      backgroundColor: done
                        ? T.primary
                        : active
                        ? T.primaryDim
                        : T.surface,
                      borderColor: done || active ? T.primary : T.cardBorder,
                      borderWidth: active ? 3 : 1.5,
                    },
                  ]}
                >
                  {done ? <Text style={sl.dotTick}>✓</Text> : null}
                  {active ? (
                    <Text style={sl.dotActive}>{step.icon}</Text>
                  ) : null}
                  {pending ? <Text style={sl.dotPending}>{i + 1}</Text> : null}
                </View>
                <Text style={[sl.label, { color }]} numberOfLines={2}>
                  {step.label}
                </Text>
              </View>
              {i < SAMPLE_LIFECYCLE.length - 1 && (
                <View
                  style={[
                    sl.line,
                    { backgroundColor: done ? T.primary : T.cardBorder },
                  ]}
                />
              )}
            </React.Fragment>
          );
        })}
      </View>
    </ScrollView>
  );
}
const sl = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  step: { alignItems: 'center', width: 70 },
  dot: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  dotTick: { color: '#fff', fontSize: 14, fontWeight: '900' },
  dotActive: { fontSize: 16 },
  dotPending: { fontSize: 12, color: '#64748B', fontWeight: '700' },
  label: {
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 14,
  },
  line: { width: 24, height: 2, marginTop: 19, borderRadius: 1 },
});

// ─────────────────────────────────────────────────────────────────────────────
// KPI METRIC CARD
// ─────────────────────────────────────────────────────────────────────────────
export function KPIMetricCard({ icon, value, label, color, T }) {
  return (
    <View
      style={[
        km.card,
        { backgroundColor: T.card, borderColor: T.cardBorder },
        Shadow.sm,
      ]}
    >
      <Text style={km.icon}>{icon}</Text>
      <Text style={[km.value, { color: color ?? T.primary }]}>{value}</Text>
      <Text style={[km.label, { color: T.muted }]}>{label}</Text>
    </View>
  );
}
const km = StyleSheet.create({
  card: {
    flex: 1,
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 1.5,
    paddingVertical: 14,
    paddingHorizontal: 6,
    gap: 4,
  },
  icon: { fontSize: 22 },
  value: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  label: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    textAlign: 'center',
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// ANIMATED PROGRESS BAR
// ─────────────────────────────────────────────────────────────────────────────
export function ProgressBar({ pct, color, T, height = 8 }) {
  return (
    <View
      style={[
        pb.track,
        { backgroundColor: T.divider, height, borderRadius: height / 2 },
      ]}
    >
      <View
        style={[
          pb.fill,
          {
            width: `${Math.min(pct * 100, 100)}%`,
            backgroundColor: color,
            height,
            borderRadius: height / 2,
          },
        ]}
      />
    </View>
  );
}
const pb = StyleSheet.create({
  track: { overflow: 'hidden' },
  fill: {},
});

// ─────────────────────────────────────────────────────────────────────────────
// REVIEW ROW (for confirmation screens)
// ─────────────────────────────────────────────────────────────────────────────
export function ReviewRow({ label, value, T }) {
  return (
    <View style={[rvr.row, { borderBottomColor: T.divider }]}>
      <Text style={[rvr.label, { color: T.muted }]}>{label}</Text>
      <Text style={[rvr.value, { color: T.text }]} numberOfLines={3}>
        {value || '—'}
      </Text>
    </View>
  );
}
const rvr = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 11,
    borderBottomWidth: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    flex: 1,
  },
  value: { fontSize: 14, fontWeight: '600', flex: 2, textAlign: 'right' },
});

// ─────────────────────────────────────────────────────────────────────────────
// INFO BANNER
// ─────────────────────────────────────────────────────────────────────────────
export function InfoBanner({ icon, text, color, T }) {
  return (
    <View
      style={[
        ib.wrap,
        { backgroundColor: color + '18', borderColor: color + '44' },
      ]}
    >
      <Text style={ib.icon}>{icon}</Text>
      <Text style={[ib.text, { color }]}>{text}</Text>
    </View>
  );
}
const ib = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: Spacing.md,
  },
  icon: { fontSize: 18 },
  text: { flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 19 },
});

// ─────────────────────────────────────────────────────────────────────────────
// PERIOD TAB SWITCHER (Today / Week / Month)
// ─────────────────────────────────────────────────────────────────────────────
export function PeriodTabs({ value, onChange, options, T }) {
  return (
    <View
      style={[
        pt.wrap,
        { backgroundColor: T.surface, borderColor: T.cardBorder },
      ]}
    >
      {options.map(opt => (
        <TouchableOpacity
          key={opt.key}
          onPress={() => onChange(opt.key)}
          activeOpacity={0.75}
          style={[pt.tab, value === opt.key && { backgroundColor: T.primary }]}
        >
          <Text
            style={[pt.txt, { color: value === opt.key ? '#fff' : T.muted }]}
          >
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
const pt = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    borderRadius: Radius.md,
    borderWidth: 1.5,
    overflow: 'hidden',
    marginBottom: 12,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  txt: { fontSize: 12, fontWeight: '700' },
});

// ─────────────────────────────────────────────────────────────────────────────
// STEP PROGRESS INDICATOR
// ─────────────────────────────────────────────────────────────────────────────
export function StepProgress({ current, total, T }) {
  return (
    <View style={spg.wrap}>
      {Array.from({ length: total }).map((_, i) => {
        const done = i + 1 < current;
        const active = i + 1 === current;
        return (
          <React.Fragment key={i}>
            <View
              style={[
                spg.dot,
                {
                  backgroundColor: done || active ? T.primary : T.cardBorder,
                  borderColor: active ? T.primaryLight : 'transparent',
                  width: active ? 32 : 24,
                },
              ]}
            >
              {done ? (
                <Text style={spg.checkTxt}>✓</Text>
              ) : (
                <Text
                  style={[spg.numTxt, { color: active ? '#fff' : T.muted }]}
                >
                  {i + 1}
                </Text>
              )}
            </View>
            {i < total - 1 && (
              <View
                style={[
                  spg.line,
                  { backgroundColor: done ? T.primary : T.cardBorder },
                ]}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}
const spg = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.md,
  },
  dot: {
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 24,
  },
  line: { flex: 1, height: 2, maxWidth: 24 },
  checkTxt: { color: '#fff', fontSize: 11, fontWeight: '900' },
  numTxt: { fontSize: 11, fontWeight: '800' },
});

// ─────────────────────────────────────────────────────────────────────────────
// EMPTY STATE
// ─────────────────────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, subtitle, T }) {
  return (
    <View style={es.wrap}>
      <Text style={es.icon}>{icon}</Text>
      <Text style={[es.title, { color: T.text }]}>{title}</Text>
      {subtitle ? (
        <Text style={[es.sub, { color: T.muted }]}>{subtitle}</Text>
      ) : null}
    </View>
  );
}
const es = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  icon: { fontSize: 40, marginBottom: 4 },
  title: { fontSize: 16, fontWeight: '800', textAlign: 'center' },
  sub: { fontSize: 13, textAlign: 'center', lineHeight: 19, maxWidth: 260 },
});

// ─────────────────────────────────────────────────────────────────────────────
// BOTTOM NAV BAR (for onboarding)
// ─────────────────────────────────────────────────────────────────────────────
export function BottomNavBar({
  step,
  totalSteps,
  onBack,
  onNext,
  nextLabel,
  loading,
  T,
}) {
  return (
    <View
      style={[
        bn.wrap,
        { backgroundColor: T.card, borderTopColor: T.cardBorder },
      ]}
    >
      {step > 1 ? (
        <TouchableOpacity
          onPress={onBack}
          activeOpacity={0.75}
          style={[
            bn.btnBack,
            { borderColor: T.cardBorder, backgroundColor: T.surface },
          ]}
        >
          <Text style={[bn.backTxt, { color: T.textSub }]}>← Back</Text>
        </TouchableOpacity>
      ) : null}
      <TouchableOpacity
        onPress={onNext}
        disabled={loading}
        activeOpacity={0.85}
        style={[
          bn.btnNext,
          { backgroundColor: T.primary, flex: step > 1 ? 2 : 1 },
          loading && { opacity: 0.6 },
        ]}
      >
        <Text style={bn.nextTxt}>
          {loading
            ? 'Please wait…'
            : nextLabel ?? (step === totalSteps ? '🎉 Submit' : 'Next →')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
const bn = StyleSheet.create({
  wrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 10,
    padding: Spacing.md,
    paddingBottom: Spacing.lg,
    borderTopWidth: 1.5,
  },
  btnBack: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  backTxt: { fontSize: 14, fontWeight: '700' },
  btnNext: {
    paddingVertical: 14,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextTxt: { color: '#fff', fontSize: 14, fontWeight: '800' },
});
