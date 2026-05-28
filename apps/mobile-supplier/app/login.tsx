import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useSupplierStore } from '@/lib/store';

const C = {
  bg: '#08080E',
  card: '#0F0F1A',
  primary: '#FF4500',
  primaryGlow: 'rgba(255,69,0,0.15)',
  red: '#EF4444',
  border: 'rgba(255,255,255,0.06)',
  text: '#F5F5FF',
  textSub: '#8888AA',
  textTertiary: '#55556A',
};

function OtpBoxes({
  value,
  onChange,
  onComplete,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  onComplete: (otp: string) => void;
}) {
  const refs = useRef<Array<TextInput | null>>([]);

  const setDigit = (index: number, text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 4).split('');
    const next = [...value];

    if (digits.length > 1) {
      for (let i = 0; i < 4; i += 1) next[i] = digits[i] ?? '';
      onChange(next);
      refs.current[Math.min(digits.length, 4) - 1]?.focus();
      if (digits.length >= 4) onComplete(next.join(''));
      return;
    }

    next[index] = digits[0] ?? '';
    onChange(next);
    if (digits[0] && index < 3) refs.current[index + 1]?.focus();
    if (next.every(Boolean)) onComplete(next.join(''));
  };

  return (
    <View style={styles.otpRow}>
      {value.map((digit, index) => (
        <TextInput
          key={index}
          ref={(node) => {
            refs.current[index] = node;
          }}
          value={digit}
          onChangeText={(text) => setDigit(index, text)}
          onKeyPress={({ nativeEvent }) => {
            if (nativeEvent.key === 'Backspace' && !value[index] && index > 0) {
              refs.current[index - 1]?.focus();
            }
          }}
          keyboardType="number-pad"
          maxLength={4}
          selectTextOnFocus
          style={styles.otpInput}
        />
      ))}
    </View>
  );
}

export default function LoginScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [emailFocused, setEmailFocused] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);

  const sendLoginCode = useSupplierStore((s) => s.sendLoginCode);
  const registerAndSendCode = useSupplierStore((s) => s.registerAndSendCode);
  const verifyEmailOtp = useSupplierStore((s) => s.verifyEmailOtp);
  const isLoading = useSupplierStore((s) => s.isLoading);
  const error = useSupplierStore((s) => s.error);
  const clearError = useSupplierStore((s) => s.clearError);

  const submitEmail = async () => {
    clearError();
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const ok = mode === 'login'
      ? await sendLoginCode(email)
      : await registerAndSendCode(ownerName, email);
    if (ok) {
      setOtp(['', '', '', '']);
      setStep('otp');
    }
  };

  const submitOtp = async (code: string) => {
    clearError();
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const ok = await verifyEmailOtp(email, code);
    if (ok) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <Text style={styles.emoji}>🏪</Text>
            <Text style={styles.title}>DIY Нийлүүлэгч</Text>
            <Text style={styles.subtitle}>
              {step === 'email' ? 'И-мэйлээр баталгаажиж нэвтэрнэ' : `${email.trim().toLowerCase()} хаягт код илгээлээ`}
            </Text>
          </View>

          <View style={styles.formCard}>
            {step === 'email' ? (
              <>
                <View style={styles.segment}>
                  <TouchableOpacity
                    style={[styles.segmentBtn, mode === 'login' && styles.segmentActive]}
                    onPress={() => {
                      setMode('login');
                      clearError();
                    }}
                  >
                    <Text style={[styles.segmentText, mode === 'login' && styles.segmentTextActive]}>Нэвтрэх</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.segmentBtn, mode === 'register' && styles.segmentActive]}
                    onPress={() => {
                      setMode('register');
                      clearError();
                    }}
                  >
                    <Text style={[styles.segmentText, mode === 'register' && styles.segmentTextActive]}>Бүртгүүлэх</Text>
                  </TouchableOpacity>
                </View>

                {mode === 'register' ? (
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Овог нэр</Text>
                    <View style={[styles.inputWrap, nameFocused && styles.inputWrapFocused]}>
                      <Ionicons name="person-outline" size={18} color={nameFocused ? C.primary : C.textTertiary} />
                      <TextInput
                        style={styles.input}
                        value={ownerName}
                        onChangeText={setOwnerName}
                        placeholder="Батболд"
                        placeholderTextColor={C.textTertiary}
                        onFocus={() => setNameFocused(true)}
                        onBlur={() => setNameFocused(false)}
                      />
                    </View>
                  </View>
                ) : null}

                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>И-мэйл хаяг</Text>
                  <View style={[styles.inputWrap, emailFocused && styles.inputWrapFocused]}>
                    <Ionicons name="mail-outline" size={18} color={emailFocused ? C.primary : C.textTertiary} />
                    <TextInput
                      style={styles.input}
                      value={email}
                      onChangeText={setEmail}
                      placeholder="supplier@example.com"
                      placeholderTextColor={C.textTertiary}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      onFocus={() => setEmailFocused(true)}
                      onBlur={() => setEmailFocused(false)}
                    />
                  </View>
                </View>

                <TouchableOpacity style={styles.loginBtn} onPress={submitEmail} disabled={isLoading} activeOpacity={0.85}>
                  {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginBtnText}>Код авах</Text>}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.otpTitle}>Баталгаажуулах код</Text>
                <OtpBoxes value={otp} onChange={setOtp} onComplete={submitOtp} />
                <TouchableOpacity style={styles.ghostBtn} onPress={() => setStep('email')}>
                  <Text style={styles.ghostText}>И-мэйл солих</Text>
                </TouchableOpacity>
                {__DEV__ ? <Text style={styles.devText}>dev code: 1234</Text> : null}
              </>
            )}

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={15} color={C.red} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.footer}>DIY Store · Нийлүүлэгч портал v1.0</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
  hero: { alignItems: 'center', marginBottom: 36 },
  emoji: { fontSize: 64, marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', color: C.primary, marginBottom: 6 },
  subtitle: { fontSize: 15, color: C.textSub, textAlign: 'center' },
  formCard: { backgroundColor: C.card, borderRadius: 24, borderWidth: 1, borderColor: C.border, padding: 22, gap: 16 },
  segment: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 4 },
  segmentBtn: { flex: 1, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  segmentActive: { backgroundColor: C.primary },
  segmentText: { color: C.textSub, fontWeight: '700' },
  segmentTextActive: { color: '#fff' },
  fieldGroup: { gap: 7 },
  label: { color: C.textSub, fontSize: 13, fontWeight: '500' },
  inputWrap: {
    height: 56,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
  },
  inputWrapFocused: { borderColor: C.primary, backgroundColor: C.primaryGlow },
  input: { flex: 1, color: C.text, fontSize: 15 },
  loginBtn: { height: 56, backgroundColor: C.primary, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  loginBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  otpTitle: { color: C.text, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  otpRow: { flexDirection: 'row', justifyContent: 'center', gap: 10 },
  otpInput: {
    width: 56,
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    color: C.text,
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  ghostBtn: { height: 46, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  ghostText: { color: C.textSub, fontWeight: '700' },
  devText: { color: C.textTertiary, textAlign: 'center', fontSize: 11 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: { color: C.red, fontSize: 13, flex: 1 },
  footer: { textAlign: 'center', color: C.textTertiary, fontSize: 12, marginTop: 32 },
});
