import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { useDriverStore } from '../lib/store';

export default function LoginScreen() {
  const { login, isLoading, error, clearError } = useDriverStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  const handleLogin = async () => {
    clearError();
    if (!email.trim() || !password) {
      Alert.alert('Анхааруулга', 'И-мэйл болон нууц үгээ оруулна уу');
      return;
    }
    await login(email.trim(), password);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        {/* Logo */}
        <View style={styles.logoWrap}>
          <Text style={styles.logoEmoji}>🚗</Text>
          <Text style={styles.title}>DIY Driver</Text>
          <Text style={styles.subtitle}>Жолооч апп</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Нэвтрэх</Text>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.field}>
            <Text style={styles.label}>И-мэйл хаяг</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="example@mail.com"
              placeholderTextColor="#666"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Нууц үг</Text>
            <View style={styles.pwdRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#666"
                secureTextEntry={!showPwd}
                editable={!isLoading}
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity
                onPress={() => setShowPwd((v) => !v)}
                style={styles.eyeBtn}
              >
                <Text style={styles.eyeText}>{showPwd ? '🙈' : '👁'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.btn, isLoading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Нэвтрэх</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>DIY Store · Жолооч портал</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const C = {
  bg: '#0f0f1a',
  card: '#1a1a2e',
  brand: '#f59e0b',
  input: '#252538',
  border: '#2a2a40',
  text: '#f0f0f5',
  muted: '#8888aa',
  error: '#ef4444',
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  logoWrap: { alignItems: 'center', marginBottom: 32 },
  logoEmoji: { fontSize: 56, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '900', color: C.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: C.muted, marginTop: 4 },
  card: {
    backgroundColor: C.card,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: C.border,
  },
  cardTitle: { fontSize: 20, fontWeight: '800', color: C.text, marginBottom: 20 },
  errorBox: {
    backgroundColor: '#ef444420',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ef444440',
  },
  errorText: { color: C.error, fontSize: 13 },
  field: { marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '600', color: C.muted, marginBottom: 8 },
  input: {
    backgroundColor: C.input,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: C.text,
    borderWidth: 1,
    borderColor: C.border,
  },
  pwdRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyeBtn: { padding: 14 },
  eyeText: { fontSize: 18 },
  btn: {
    backgroundColor: C.brand,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#000', fontWeight: '800', fontSize: 16 },
  footer: { textAlign: 'center', color: C.muted, fontSize: 12, marginTop: 24 },
});
