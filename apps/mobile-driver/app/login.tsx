import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useDriverStore } from '../lib/store';

const C = {
  bg: '#08080E',
  card: '#0F0F1A',
  surface: '#161625',
  primary: '#FF4500',
  border: 'rgba(255,255,255,0.08)',
  borderFocus: 'rgba(255,69,0,0.5)',
  text: '#F5F5FF',
  textSub: '#8888AA',
  error: '#FF4444',
};

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading, error, clearError } = useDriverStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [pwdFocused, setPwdFocused] = useState(false);

  const handleLogin = async () => {
    clearError();
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const success = await login(email.trim(), password);
    if (success) {
      router.replace('/(tabs)');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={styles.logoWrap}>
            <Text style={styles.logoEmoji}>🚗</Text>
            <Text style={styles.appName}>DIY Driver</Text>
            <Text style={styles.subtitle}>Жолооч нэвтрэх</Text>
          </View>

          {/* Error */}
          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color={C.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Email */}
          <View style={styles.fieldWrap}>
            <Text style={styles.label}>И-мэйл</Text>
            <TextInput
              style={[
                styles.input,
                emailFocused && styles.inputFocused,
              ]}
              value={email}
              onChangeText={setEmail}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
              placeholder="example@mail.com"
              placeholderTextColor={C.textSub}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
          </View>

          {/* Password */}
          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Нууц үг</Text>
            <View style={[styles.pwdWrap, pwdFocused && styles.inputFocused]}>
              <TextInput
                style={styles.pwdInput}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setPwdFocused(true)}
                onBlur={() => setPwdFocused(false)}
                placeholder="••••••••"
                placeholderTextColor={C.textSub}
                secureTextEntry={!showPwd}
                editable={!isLoading}
                onSubmitEditing={handleLogin}
                returnKeyType="done"
              />
              <TouchableOpacity
                onPress={() => setShowPwd((v) => !v)}
                style={styles.eyeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={showPwd ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={C.textSub}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Login button */}
          <TouchableOpacity
            style={[styles.btn, isLoading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.btnText}>Нэвтрэх</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.footer}>DIY Store · Жолооч портал</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  kav: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },

  logoWrap: { alignItems: 'center', marginBottom: 40 },
  logoEmoji: { fontSize: 64, marginBottom: 12 },
  appName: {
    fontSize: 28,
    fontWeight: '900',
    color: C.primary,
    letterSpacing: -0.5,
  },
  subtitle: { fontSize: 14, color: C.textSub, marginTop: 6 },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,68,68,0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,68,68,0.25)',
  },
  errorText: { color: C.error, fontSize: 13, flex: 1 },

  fieldWrap: { marginBottom: 16 },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: C.textSub,
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  input: {
    height: 56,
    backgroundColor: C.card,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    color: C.text,
    borderWidth: 1,
    borderColor: C.border,
  },
  inputFocused: {
    borderColor: C.borderFocus,
  },
  pwdWrap: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 16,
  },
  pwdInput: {
    flex: 1,
    fontSize: 15,
    color: C.text,
    height: '100%',
  },
  eyeBtn: { padding: 4 },

  btn: {
    height: 56,
    backgroundColor: C.primary,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  footer: {
    textAlign: 'center',
    color: C.textSub,
    fontSize: 12,
    marginTop: 32,
  },
});
