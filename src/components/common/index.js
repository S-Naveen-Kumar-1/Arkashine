// src/components/common/index.js
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { Radius, Shadow, Typography } from '../../theme';

import Svg, { Circle } from 'react-native-svg';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
// ── AppButton ─────────────────────────────────────────────────────────────────
export function AppButton({
  label,
  onPress,
  color,
  textColor,
  outlined,
  disabled,
  loading,
  style,
  size = 'md',
  icon,
}) {
  const height = size === 'lg' ? 56 : size === 'sm' ? 38 : 48;
  const fontSize = size === 'lg' ? 17 : size === 'sm' ? 13 : 15;
  const bg = outlined ? 'transparent' : color || '#22C55E';
  const txt = textColor || (outlined ? color || '#22C55E' : '#fff');
  const border = outlined
    ? { borderWidth: 1.5, borderColor: color || '#22C55E' }
    : {};

  return (
    <TouchableOpacity
      style={[
        c.btn,
        { backgroundColor: bg, height },
        border,
        disabled && c.btnDisabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={txt} size="small" />
      ) : (
        <>
          {icon ? (
            <Text style={{ fontSize: 18, marginRight: 8 }}>{icon}</Text>
          ) : null}
          <Text style={[c.btnText, { color: txt, fontSize }]}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────
export function Card({ children, style, theme }) {
  const bg = theme?.colors?.card || '#132236';
  const border = theme?.colors?.cardBorder || '#1E3A5F';
  return (
    <View
      style={[
        c.card,
        { backgroundColor: bg, borderColor: border },
        Shadow.sm,
        style,
      ]}
    >
      {children}
    </View>
  );
}

// ── LabeledInput ──────────────────────────────────────────────────────────────
export function LabeledInput({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  theme,
  icon,
  error,
}) {
  const T = theme?.colors || {};
  return (
    <View style={c.inputWrap}>
      {label ? (
        <Text style={[c.inputLabel, { color: T.muted }]}>{label}</Text>
      ) : null}
      <View
        style={[
          c.inputRow,
          {
            backgroundColor: T.inputBg || '#0D1B2E',
            borderColor: error ? '#EF4444' : T.inputBorder || '#2A4A6B',
          },
        ]}
      >
        {icon ? <Text style={c.inputIcon}>{icon}</Text> : null}
        <TextInput
          style={[c.input, { color: T.text || '#F1F5F9', flex: 1 }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={T.muted}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType || 'default'}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
      {error ? <Text style={c.inputError}>{error}</Text> : null}
    </View>
  );
}

// ── StatusBadge ───────────────────────────────────────────────────────────────
export function StatusBadge({ label, color, small }) {
  return (
    <View
      style={[
        c.badge,
        {
          backgroundColor: color + '22',
          borderColor: color,
          padding: small ? 3 : 5,
        },
      ]}
    >
      <Text style={[c.badgeText, { color, fontSize: small ? 10 : 12 }]}>
        {label}
      </Text>
    </View>
  );
}

// ── NutrientCard ──────────────────────────────────────────────────────────────
export function NutrientCard({ label, value, unit, status, icon, theme }) {
  const T = theme?.colors || {};
  return (
    <View
      style={[
        c.nutriCard,
        { backgroundColor: T.card, borderColor: T.cardBorder },
        Shadow.sm,
      ]}
    >
      <Text style={c.nutriIcon}>{icon}</Text>
      <Text style={[c.nutriLabel, { color: T.textSub }]}>{label}</Text>
      <Text style={[c.nutriValue, { color: T.text }]}>
        {value != null ? value : '--'}
        <Text style={[c.nutriUnit, { color: T.muted }]}> {unit}</Text>
      </Text>
      {status && (
        <StatusBadge label={status.label} color={status.color} small />
      )}
    </View>
  );
}

// ── SectionHeader ─────────────────────────────────────────────────────────────
export function SectionHeader({ title, subtitle, theme, center }) {
  const T = theme?.colors || {};
  return (
    <View style={[c.secHeader, center && { alignItems: 'center' }]}>
      <Text style={[Typography.h3, { color: T.text }]}>{title}</Text>
      {subtitle ? (
        <Text style={[c.secSub, { color: T.textSub }]}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

// ── ProgressRing ──────────────────────────────────────────────────────────────

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function ProgressRing({
  size = 200,
  progress = 0,
  total = 100,
  color = '#22C55E',
  bg = '#E5E7EB',
  strokeWidth = 12,
  children,
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const pct = Math.min(Math.max(progress / total, 0), 1);
  const animated = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animated, {
      toValue: pct,
      duration: 500,
      easing: Easing.out(Easing.ease),
    }).start();
  }, [pct]);

  const strokeDashoffset = animated.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Svg width={size} height={size}>
        {/* Background circle */}
        <Circle
          stroke={bg}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />

        {/* Animated progress */}
        <AnimatedCircle
          stroke={color}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>

      {/* Center content */}
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        {children}
      </View>
    </View>
  );
}

// ── DayCard — for recommendations ────────────────────────────────────────────
export function DayCard({ day, action, qty, type, icon, theme }) {
  const T = theme?.colors || {};
  const typeColors = {
    fertilizer: '#22C55E',
    water: '#3B82F6',
    check: '#F59E0B',
    spray: '#A78BFA',
    amendment: '#F97316',
  };
  const tColor = typeColors[type] || '#94A3B8';
  return (
    <View
      style={[
        c.dayCard,
        {
          backgroundColor: T.card,
          borderColor: T.cardBorder,
          borderLeftColor: tColor,
        },
      ]}
    >
      <View style={[c.dayBadge, { backgroundColor: tColor + '22' }]}>
        <Text style={[c.dayNum, { color: tColor }]}>Day {day}</Text>
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={[c.dayAction, { color: T.text }]}>
          {icon} {action}
        </Text>
        <Text style={[c.dayQty, { color: T.textSub }]}>{qty}</Text>
      </View>
    </View>
  );
}

// ── TopBar ────────────────────────────────────────────────────────────────────
export function TopBar({ title, onBack, rightIcon, onRight, theme, onHome }) {
  const T = theme?.colors || {};

  // decide left action
  const leftAction = onHome || onBack;

  return (
    <View
      style={[
        c.topBar,
        {
          borderBottomColor: T.divider,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
      ]}
    >
      {/* LEFT */}
      <View style={{ width: 40, alignItems: 'flex-start' }}>
        {leftAction && (
          <TouchableOpacity onPress={leftAction} style={c.topBarBtn}>
            {onHome ? (
              <Icon name="home-outline" size={22} color={T.primary} />
            ) : (
              <Text style={{ color: T.primary, fontSize: 22 }}>←</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* TITLE */}
      <Text style={[Typography.h4, { color: T.text }]} numberOfLines={1}>
        {title}
      </Text>

      {/* RIGHT */}
      <View style={{ width: 40, alignItems: 'flex-end' }}>
        {onRight && (
          <TouchableOpacity onPress={onRight} style={c.topBarBtn}>
            <Icon
              name={rightIcon || 'dots-vertical'}
              size={22}
              color={T.text}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ── Dropdown ──────────────────────────────────────────────────────────────────
export function Dropdown({ label, options, value, onSelect, theme }) {
  const T = theme?.colors || {};
  const [open, setOpen] = React.useState(false);
  return (
    <View style={c.inputWrap}>
      {label ? (
        <Text style={[c.inputLabel, { color: T.muted }]}>{label}</Text>
      ) : null}
      <TouchableOpacity
        style={[
          c.inputRow,
          {
            backgroundColor: T.inputBg,
            borderColor: T.inputBorder,
            justifyContent: 'space-between',
          },
        ]}
        onPress={() => setOpen(!open)}
      >
        <Text style={{ color: value ? T.text : T.muted, fontSize: 15 }}>
          {value || `Select ${label}`}
        </Text>
        <Text style={{ color: T.muted }}>{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {open && (
        <View
          style={[
            c.dropList,
            { backgroundColor: T.card, borderColor: T.cardBorder },
          ]}
        >
          {options.map(opt => (
            <TouchableOpacity
              key={opt}
              style={[c.dropItem, { borderBottomColor: T.divider }]}
              onPress={() => {
                onSelect(opt);
                setOpen(false);
              }}
            >
              <Text
                style={{
                  color: value === opt ? T.primary : T.text,
                  fontSize: 15,
                }}
              >
                {opt}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const c = StyleSheet.create({
  btn: {
    borderRadius: Radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { fontWeight: '800', letterSpacing: 0.3 },
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  inputWrap: { marginBottom: 14 },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    height: 50,
  },
  inputIcon: { fontSize: 18, marginRight: 10 },
  input: { fontSize: 15, height: 50 },
  inputError: { fontSize: 11, color: '#EF4444', marginTop: 4 },
  badge: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
  },
  badgeText: { fontWeight: '800', letterSpacing: 0.3 },
  nutriCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    minWidth: 100,
    margin: 5,
  },
  nutriIcon: { fontSize: 26, marginBottom: 6 },
  nutriLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  nutriValue: { fontSize: 22, fontWeight: '900', marginBottom: 6 },
  nutriUnit: { fontSize: 12, fontWeight: '400' },
  secHeader: { marginBottom: 14 },
  secSub: { fontSize: 14, marginTop: 4 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  topBarBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropList: {
    borderRadius: Radius.md,
    borderWidth: 1,
    maxHeight: 200,
    marginTop: 4,
    overflow: 'hidden',
  },
  dropItem: { padding: 14, borderBottomWidth: 1 },
  dayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: 12,
    marginBottom: 10,
  },
  dayBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 60,
    alignItems: 'center',
  },
  dayNum: { fontSize: 12, fontWeight: '800' },
  dayAction: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  dayQty: { fontSize: 13 },
});
