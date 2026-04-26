// src/theme/index.js

export const lightTheme = {
  dark: false,
  colors: {
    bg: '#F0FDF4',
    surface: '#FFFFFF',
    card: '#FFFFFF',
    cardBorder: '#D1FAE5',
    primary: '#16A34A',
    primaryDark: '#15803D',
    primaryLight: '#86EFAC',
    primaryDim: 'rgba(34,197,94,0.10)',
    accent: '#22C55E',
    accentDim: 'rgba(34,197,94,0.12)',
    blue: '#3B82F6',
    red: '#EF4444',
    yellow: '#F59E0B',
    orange: '#F97316',
    white: '#FFFFFF',
    text: '#0F172A',
    textSub: '#475569',
    muted: '#94A3B8',
    divider: '#E2E8F0',
    inputBg: '#F8FAFC',
    inputBorder: '#CBD5E1',
    online: '#22C55E',
    offline: '#EF4444',
    statusBar: 'dark-content',
    shadow: 'rgba(0,0,0,0.08)',
    overlay: 'rgba(100, 95, 95, 0.45)',
  },
};

export const darkTheme = {
  dark: true,
  colors: {
    bg: '#0A1628',
    surface: '#0F1F35',
    card: '#132236',
    cardBorder: '#1E3A5F',
    primary: '#22C55E',
    primaryDark: '#16A34A',
    primaryLight: '#4ADE80',
    primaryDim: 'rgba(34,197,94,0.12)',
    accent: '#22C55E',
    accentDim: 'rgba(34,197,94,0.12)',
    blue: '#3B82F6',
    red: '#F87171',
    yellow: '#FBBF24',
    orange: '#FB923C',
    white: '#F8FAFC',
    text: '#F1F5F9',
    textSub: '#94A3B8',
    muted: '#4A5568',
    divider: '#1E3A5F',
    inputBg: '#0D1B2E',
    inputBorder: '#2A4A6B',
    online: '#4ADE80',
    offline: '#F87171',
    statusBar: 'light-content',
    shadow: 'rgba(0,0,0,0.4)',
    overlay: 'rgba(0,0,0,0.7)',
  },
};

export const Typography = {
  h1: { fontSize: 30, fontWeight: '900', letterSpacing: -0.5 },
  h2: { fontSize: 24, fontWeight: '800', letterSpacing: -0.3 },
  h3: { fontSize: 19, fontWeight: '700' },
  h4: { fontSize: 16, fontWeight: '700' },
  body: { fontSize: 15, fontWeight: '400', lineHeight: 22 },
  small: { fontSize: 13, fontWeight: '400', lineHeight: 18 },
  xs: { fontSize: 11, fontWeight: '400' },
  label: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  mono: { fontSize: 12, fontFamily: 'monospace' },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  xxl: 40,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 24,
  full: 999,
};

export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 8,
  },
};
