import React, { useState } from 'react';
import {
  SafeAreaView,
  StatusBar,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  View,
  StyleSheet,
} from 'react-native';
import { C } from '../utils/colors';
import { useBLE } from '../contexts/BLEContext';

export function LoginScreen({ navigation }) {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const { bleState } = useBLE();

  const proceed = () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter your name');
      return;
    }
    if (!mobile.trim()) {
      Alert.alert('Required', 'Please enter your mobile number');
      return;
    }
    navigation.navigate('Scan', {
      user: { name: name.trim(), mobile: mobile.trim() },
    });
  };

  return (
    <SafeAreaView style={styles.bg}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.heading}>Enter User Details</Text>
        <Text style={styles.sub}>Required to begin soil testing</Text>

        {bleState !== 'PoweredOn' && (
          <View style={styles.warning}>
            <Text style={styles.warningText}>
              Bluetooth is {bleState === 'PoweredOff' ? 'OFF' : 'unavailable'} —
              please enable it
            </Text>
          </View>
        )}

        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your name"
          placeholderTextColor={C.muted}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />

        <Text style={styles.label}>Mobile Number</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter mobile number"
          placeholderTextColor={C.muted}
          value={mobile}
          onChangeText={setMobile}
          keyboardType="phone-pad"
          maxLength={15}
        />

        <TouchableOpacity style={styles.btn} onPress={proceed}>
          <Text style={styles.btnText}>Continue to Device Scan</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: C.bg },
  container: { padding: 24, paddingTop: 40 },
  heading: { fontSize: 26, fontWeight: '800', color: C.white, marginBottom: 6 },
  sub: { fontSize: 14, color: C.muted, marginBottom: 28 },
  warning: {
    backgroundColor: '#7C2D12',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  warningText: { color: '#FCA5A5', fontSize: 13 },
  label: {
    fontSize: 13,
    color: C.muted,
    marginBottom: 6,
    marginTop: 4,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: C.white,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: C.border,
  },
  btn: {
    backgroundColor: C.accent,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  btnText: { color: '#000', fontSize: 16, fontWeight: '800' },
});
