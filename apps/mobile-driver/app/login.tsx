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
import { useDriverStore } from '../lib/store';

const C = {
  bg: '#08080E',
  card: '#0F0F1A',
  primary: '#FF4500',
  primaryGlow: 'rgba(255,69,0,0.15)',
  border: 'rgba(255,255,255,0.06)',
  text: '#F5F5FF',
  textSub: '#8888AA',
  textTertiary: '#55556A',
  error: '#FF4444',
};

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  return digits.length > 4 ? `${digits.slice(0, 4)} ${digits.slice(4)}` : digits;
}

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
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);

  const sendLoginCode = useDriverStore((s) => s.sendLoginCode);
  const registerAndSendCode = useDriverStore((s) => s.registerAndSendCode);
  const verifyOtp = useDriverStore((s) => s.verifyOtp);
  const isLoading = useDriverStore((s) => s.isLoading);
  const error = useDriverStore((s) => s.error);
  const clearError = useDriverStore((s) => s.clearError);

  const submitPhone = async () => {
    clearError();
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const ok = mode === 'login'
      ? await sendLoginCode(phone)
      : await registerAndSendCode(ownerName, phone);
    if (ok) {
      setOtp(['', '', '', '']);
      setStep('otp');
    }
  };

  const submitOtp = async (code: string) => {
    clearError();
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const ok = await verifyOtp(phone, code);
    if (ok) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.logoWrap}>
            <Text style={styles.logoEmoji}>🚗</Text>
            <Text style={styles.appName}>DIY Driver</Text>
            <Text style={styles.subtitle}>
              {step === 'phone' ? 'Утасны дугаараар баталгаажиж нэвтэрнэ' : `${formatPhone(phone)} дугаарт код илгээлээ`}
            </Text>
          </View>

          <View style={styles.formCard}>
            {step === 'phone' ? (
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
                  <View style={styles.fieldWrap}>
                    <Text style={styles.label}>Овог нэр</Text>
                    <View style={[styles.inputWrap, nameFocused && styles.inputFocused]}>
                      <Ionicons name="person-outline" size={18} color={nameFocused ? C.primary : C.textTertiary} />
                      <TextInput
                        style={styles.input}
                        value={ownerName}
                        onChangeText={setOwnerName}
                        onFocus={() => setNameFocused(true)}
                        onBlur={() => setNameFocused(false)}
                        placeholder="Батболд"
                        placeholderTextColor={C.textTertiary}
                        editable={!isLoading}
                      />
                    </View>
                  </View>
                ) : null}

                <View style={styles.fieldWrap}>
                  <Text style={styles.label}>Утасны дугаар</Text>
                  <View style={[styles.inputWrap, phoneFocused && styles.inputFocused]}>
                    <Ionicons name="call-outline" size={18} color={phoneFocused ? C.primary : C.textTertiary} />
                    <TextInput
                      style={styles.input}
                      value={formatPhone(phone)}
                      onChangeText={setPhone}
                      onFocus={() => setPhoneFocused(true)}
                      onBlur={() => setPhoneFocused(false)}
                      placeholder="9911 2233"
                      placeholderTextColor={C.textTertiary}
                      keyboardType="number-pad"
                      editable={!isLoading}
                    />
                  </View>
                </View>

                <TouchableOpacity style={[styles.btn, isLoading && styles.btnDisabled]} onPress={submitPhone} disabled={isLoading} activeOpacity={0.85}>
                  {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Код авах</Text>}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.otpTitle}>Баталгаажуулах код</Text>
                <OtpBoxes value={otp} onChange={setOtp} onComplete={submitOtp} />
                <TouchableOpacity style={styles.ghostBtn} onPress={() => setStep('phone')}>
                  <Text style={styles.ghostText}>Утас солих</Text>
                </TouchableOpacity>
                {__DEV__ ? <Text style={styles.devText}>dev code: 1234</Text> : null}
              </>
            )}

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color={C.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.footer}>DIY Store · Жолооч портал</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  kav: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 },
  logoWrap: { alignItems: 'center', marginBottom: 34 },
  logoEmoji: { fontSize: 64, marginBottom: 12 },
  appName: { fontSize: 28, fontWeight: '900', color: C.primary },
  subtitle: { fontSize: 14, color: C.textSub, marginTop: 6, textAlign: 'center' },
  formCard: { backgroundColor: C.card, borderRadius: 24, borderWidth: 1, borderColor: C.border, padding: 22, gap: 16 },
  segment: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 4 },
  segmentBtn: { flex: 1, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  segmentActive: { backgroundColor: C.primary },
  segmentText: { color: C.textSub, fontWeight: '700' },
  segmentTextActive: { color: '#fff' },
  fieldWrap: { gap: 7 },
  label: { fontSize: 12, fontWeight: '600', color: C.textSub },
  inputWrap: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 14,
  },
  inputFocused: { borderColor: C.primary, backgroundColor: C.primaryGlow },
  input: { flex: 1, fontSize: 15, color: C.text, height: '100%' },
  btn: { height: 56, backgroundColor: C.primary, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
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
    gap: 8,
    backgroundColor: 'rgba(255,68,68,0.1)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,68,68,0.25)',
  },
  errorText: { color: C.error, fontSize: 13, flex: 1 },
  footer: { textAlign: 'center', color: C.textSub, fontSize: 12, marginTop: 32 },
});
