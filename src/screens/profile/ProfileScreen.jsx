// src/screens/profile/ProfileScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useDispatch, useSelector } from 'react-redux';
import { logoutUser, toggleTheme } from '../../store/actions';
import useTheme from '../../hooks/useTheme';
import { Spacing, Radius, Shadow, Typography } from '../../theme';

const STATS = [
  { label: 'Tests Done', value: '127', icon: 'test-tube', color: '#22C55E' },
  { label: 'Reports', value: '34', icon: 'file-chart', color: '#3B82F6' },
  { label: 'Fields', value: '8', icon: 'map-marker', color: '#F59E0B' },
  // {
  //   label: 'Days Active',
  //   value: '42',
  //   icon: 'calendar-check',
  //   color: '#A78BFA',
  // },
];

const APP_SETTINGS = [
  {
    key: 'darkMode',
    icon: 'theme-light-dark',
    label: 'Dark Theme',
    sub: 'Switch between light and dark',
    toggle: true,
  },
  // {
  //   key: 'notifs',
  //   icon: 'bell-outline',
  //   label: 'Notifications',
  //   sub: 'Alerts and reminders',
  //   toggle: true,
  // },
  // {
  //   key: 'location',
  //   icon: 'map-marker-outline',
  //   label: 'Auto Location',
  //   sub: 'Use GPS for field mapping',
  //   toggle: true,
  // },
  {
    key: 'bluetooth',
    icon: 'bluetooth',
    label: 'Bluetooth',
    sub: 'Auto-connect to devices',
    toggle: false,
  },
];

const ACCOUNT_ITEMS = [
  // {
  //   icon: 'account-edit-outline',
  //   label: 'Edit Profile',
  //   sub: 'Update your information',
  //   action: 'edit',
  // },
  // {
  //   icon: 'lock-reset',
  //   label: 'Change Password',
  //   sub: 'Update your password',
  //   action: 'pass',
  // },
  // { icon: 'translate', label: 'Language', sub: 'English', action: 'lang' },
  {
    icon: 'help-circle-outline',
    label: 'Help & Support',
    sub: 'FAQs and contact',
    action: 'help',
  },
  // {
  //   icon: 'information-outline',
  //   label: 'About Arkashine',
  //   sub: 'Version 1.0.0',
  //   action: 'about',
  // },
];

export default function ProfileScreen({ navigation }) {
  const dispatch = useDispatch();
  const theme = useTheme();
  const T = theme.colors;
  const user = useSelector(s => s.auth.user);
  const isDark = useSelector(s => s.theme.isDark);

  const [toggles, setToggles] = useState({
    notifs: true,
    location: true,
    bluetooth: false,
  });

  const initials = (user?.name || user?.username || 'U')
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleToggle = key => {
    if (key === 'darkMode') {
      dispatch(toggleTheme());
      return;
    }
    setToggles(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => {
          dispatch(logoutUser());
          navigation.replace('LoginScreen');
        },
      },
    ]);
  };

  const getToggleVal = key => (key === 'darkMode' ? isDark : toggles[key]);

  return (
    <SafeAreaView style={[s.bg, { backgroundColor: T.bg }]}>
      <StatusBar barStyle={T.statusBar} backgroundColor={T.bg} />

      {/* Header */}
      <View style={[s.header, { borderBottomColor: T.divider }]}>
        <Text style={[Typography.h3, { color: T.text }]}>Profile</Text>
        <TouchableOpacity
          style={[
            s.settingsBtn,
            { backgroundColor: T.card, borderColor: T.cardBorder },
          ]}
        >
          <MaterialCommunityIcons
            name="cog-outline"
            size={20}
            color={T.primary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* ── Profile Hero ── */}
        <View
          style={[
            s.profileHero,
            { backgroundColor: T.card, borderColor: T.cardBorder },
          ]}
        >
          {/* Avatar */}
          <View style={s.avatarWrap}>
            <View style={[s.avatar, { backgroundColor: T.primary }]}>
              <Text style={s.avatarText}>{initials}</Text>
            </View>
            <View
              style={[
                s.avatarBadge,
                { backgroundColor: T.online, borderColor: T.surface },
              ]}
            />
            <TouchableOpacity
              style={[
                s.editAvatar,
                { backgroundColor: T.surface, borderColor: T.cardBorder },
              ]}
            >
              <MaterialCommunityIcons
                name="camera-outline"
                size={14}
                color={T.primary}
              />
            </TouchableOpacity>
          </View>

          {/* Name + role */}
          <Text style={[s.profileName, { color: T.text }]}>
            {user?.name || user?.username || 'User'}
          </Text>
          <Text style={[s.profileRole, { color: T.muted }]}>
            Agricultural Technician
          </Text>
          <View
            style={[
              s.emailChip,
              { backgroundColor: T.primaryDim, borderColor: T.primary + '40' },
            ]}
          >
            <MaterialCommunityIcons
              name="email-outline"
              size={12}
              color={T.primary}
            />
            <Text style={[s.emailText, { color: T.primary }]}>
              {user?.email ||
                user?.username + '@soilenz.in' ||
                'user@soilenz.in'}
            </Text>
          </View>
        </View>

        {/* ── Stats row ── */}
        <View style={s.statsRow}>
          {STATS.map(st => (
            <View
              key={st.label}
              style={[
                s.statCard,
                { backgroundColor: T.card, borderColor: T.cardBorder },
                Shadow.sm,
              ]}
            >
              <View style={[s.statIcon, { backgroundColor: st.color + '18' }]}>
                <MaterialCommunityIcons
                  name={st.icon}
                  size={18}
                  color={st.color}
                />
              </View>
              <Text style={[s.statVal, { color: T.text }]}>{st.value}</Text>
              <Text style={[s.statLabel, { color: T.muted }]}>{st.label}</Text>
            </View>
          ))}
        </View>

        {/* ── App Settings ── */}
        <Text style={[s.groupTitle, { color: T.muted }]}>App Settings</Text>
        <View
          style={[
            s.settingsCard,
            { backgroundColor: T.card, borderColor: T.cardBorder },
            Shadow.sm,
          ]}
        >
          {APP_SETTINGS.map((item, i) => (
            <View key={item.key}>
              <View
                style={[
                  s.settingRow,
                  i < APP_SETTINGS.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: T.divider,
                  },
                ]}
              >
                <View
                  style={[s.settingIconBox, { backgroundColor: T.primaryDim }]}
                >
                  <MaterialCommunityIcons
                    name={item.icon}
                    size={18}
                    color={T.primary}
                  />
                </View>
                <View style={s.settingInfo}>
                  <Text style={[s.settingLabel, { color: T.text }]}>
                    {item.label}
                  </Text>
                  <Text style={[s.settingSub, { color: T.muted }]}>
                    {item.sub}
                  </Text>
                </View>
                {item.toggle && (
                  <Switch
                    value={getToggleVal(item.key)}
                    onValueChange={() => handleToggle(item.key)}
                    trackColor={{ false: T.divider, true: T.primary + '60' }}
                    thumbColor={getToggleVal(item.key) ? T.primary : T.muted}
                    style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
                  />
                )}
              </View>
            </View>
          ))}
        </View>

        {/* ── Account Items ── */}
        <Text style={[s.groupTitle, { color: T.muted }]}>Account</Text>
        <View
          style={[
            s.settingsCard,
            { backgroundColor: T.card, borderColor: T.cardBorder },
            Shadow.sm,
          ]}
        >
          {ACCOUNT_ITEMS.map((item, i) => (
            <TouchableOpacity
              key={item.action}
              style={[
                s.settingRow,
                i < ACCOUNT_ITEMS.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: T.divider,
                },
              ]}
              activeOpacity={0.75}
            >
              <View
                style={[s.settingIconBox, { backgroundColor: T.primaryDim }]}
              >
                <MaterialCommunityIcons
                  name={item.icon}
                  size={18}
                  color={T.primary}
                />
              </View>
              <View style={s.settingInfo}>
                <Text style={[s.settingLabel, { color: T.text }]}>
                  {item.label}
                </Text>
                <Text style={[s.settingSub, { color: T.muted }]}>
                  {item.sub}
                </Text>
              </View>
              <MaterialCommunityIcons
                name="chevron-right"
                size={18}
                color={T.muted}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* ── App info ── */}
        <View
          style={[
            s.appInfoCard,
            { backgroundColor: T.card, borderColor: T.cardBorder },
          ]}
        >
          <View
            style={[
              s.appLogoWrap,
              { backgroundColor: T.primaryDim, borderColor: T.primary },
            ]}
          >
            <MaterialCommunityIcons name="leaf" size={24} color={T.primary} />
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={[s.appName, { color: T.text }]}>ARKASHINE</Text>
            <Text style={[s.appVer, { color: T.muted }]}>
              Version 1.0.0 · Agriculture Intelligence
            </Text>
          </View>
        </View>

        {/* ── Logout ── */}
        <TouchableOpacity
          style={[
            s.logoutBtn,
            { backgroundColor: T.red + '15', borderColor: T.red + '50' },
          ]}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="logout-variant"
            size={20}
            color={T.red}
          />
          <Text style={[s.logoutText, { color: T.red }]}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={[s.footer, { color: T.muted }]}>
          © 2026 Arkashine · Agricultural Intelligence Platform
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  settingsBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileHero: {
    margin: Spacing.lg,
    borderRadius: 20,
    borderWidth: 1,
    padding: Spacing.lg,
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarWrap: { position: 'relative', marginBottom: 14 },
  avatar: {
    width: 86,
    height: 86,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: '900' },
  avatarBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  editAvatar: {
    position: 'absolute',
    bottom: -4,
    left: -4,
    width: 28,
    height: 28,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: { fontSize: 22, fontWeight: '900', marginBottom: 4 },
  profileRole: { fontSize: 13, marginBottom: 10 },
  emailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  emailText: { fontSize: 12, fontWeight: '600' },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: 8,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: 10,
    alignItems: 'center',
    gap: 4,
  },
  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statVal: { fontSize: 18, fontWeight: '900' },
  statLabel: { fontSize: 10, fontWeight: '600', textAlign: 'center' },
  groupTitle: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    paddingHorizontal: Spacing.lg,
    marginBottom: 10,
  },
  settingsCard: {
    marginHorizontal: Spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 20,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  settingIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingInfo: { flex: 1 },
  settingLabel: { fontSize: 14, fontWeight: '700' },
  settingSub: { fontSize: 12, marginTop: 1 },
  appInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  appLogoWrap: {
    width: 48,
    height: 48,
    borderRadius: 15,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appName: { fontSize: 16, fontWeight: '900' },
  appVer: { fontSize: 12, marginTop: 2 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginHorizontal: Spacing.lg,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    marginBottom: 16,
  },
  logoutText: { fontSize: 15, fontWeight: '800' },
  footer: { textAlign: 'center', fontSize: 11, paddingBottom: 20 },
});
