import React from 'react';

import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';

import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import useTheme from '../hooks/useTheme';
import { Radius, Spacing } from '../theme';

export default function ConnectionFailedModal({ visible, message, onPress }) {
  const theme = useTheme();

  const T = theme.colors;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={s.overlay}>
        <View
          style={[
            s.card,
            {
              backgroundColor: T.card,
              borderColor: T.border,
            },
          ]}
        >
          <View
            style={[
              s.iconWrap,
              {
                backgroundColor: 'rgba(239,68,68,0.12)',
              },
            ]}
          >
            <Icon name="bluetooth-off" size={34} color="#EF4444" />
          </View>

          <Text
            style={[
              s.title,
              {
                color: T.text,
              },
            ]}
          >
            Device Connection Failed
          </Text>

          <Text
            style={[
              s.message,
              {
                color: T.muted,
              },
            ]}
          >
            {message || 'Connection to device was lost.'}
          </Text>

          <TouchableOpacity
            activeOpacity={0.85}
            style={[
              s.btn,
              {
                backgroundColor: T.primary,
              },
            ]}
            onPress={onPress}
          >
            <Text style={s.btnText}>Go To Device Scan</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },

  card: {
    width: '100%',
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.xl,
    alignItems: 'center',
  },

  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },

  title: {
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },

  message: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: Spacing.sm,
    lineHeight: 22,
  },

  btn: {
    width: '100%',
    height: 52,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xl,
  },

  btnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
});
