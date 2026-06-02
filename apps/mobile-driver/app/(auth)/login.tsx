import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { Toast } from '../../src/components/Toast';
import { useAuthStore } from '../../src/store/auth';
import { colors } from '../../src/theme';

export default function LoginScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('8911 8564');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const { requestLoginOtp, verifyOtp, isLoading, error, devOtp, clearError } = useAuthStore();

  const submit = async () => {
    clearError();
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!otpSent) {
      const sent = await requestLoginOtp(phone);
      if (sent) setOtpSent(true);
      return;
    }
    const ok = await verifyOtp(phone, otp);
    if (ok) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.icon}>
              <Ionicons name="car-sport" size={42} color={colors.primary} />
            </View>
            <Text style={styles.title}>Жолоочийн нэвтрэлт</Text>
            <Text style={styles.subtitle}>Хүргэлтийн данс</Text>
          </View>

          <View style={styles.form}>
            {!otpSent ? (
              <Input label="Утасны дугаар" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            ) : (
              <>
                <Text style={styles.otpInfo}>{phone} дугаарт илгээсэн кодоо оруулна уу</Text>
                <Input label="Баталгаажуулах код" value={otp} onChangeText={(value) => setOtp(value.replace(/\D/g, '').slice(0, 4))} keyboardType="number-pad" />
                {devOtp ? <Text style={styles.devOtp}>Туршилтын OTP: {devOtp}</Text> : null}
              </>
            )}
            <Toast message={error} />
            <Button title={otpSent ? 'Нэвтрэх' : 'Код авах'} loading={isLoading} onPress={submit} style={styles.loginButton} />
            {otpSent ? <Button title="Дугаар солих" variant="ghost" size="md" onPress={() => { setOtpSent(false); setOtp(''); clearError(); }} /> : null}
          </View>

          <TouchableOpacity style={styles.registerLink} onPress={() => router.push('/(auth)/register')}>
            <Text style={styles.registerText}>Жолоочоор бүртгүүлэх</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 },
  header: { alignItems: 'center', marginBottom: 34 },
  icon: {
    width: 86,
    height: 86,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryGlow,
    borderWidth: 1,
    borderColor: 'rgba(255,69,0,0.28)',
    marginBottom: 18,
  },
  title: { color: colors.text, fontSize: 28, fontWeight: '900', textAlign: 'center' },
  subtitle: { color: colors.textSub, fontSize: 13, fontWeight: '800', letterSpacing: 1.1, marginTop: 8, textTransform: 'uppercase' },
  form: { gap: 14 },
  otpInfo: { color: colors.textSub, textAlign: 'center', fontSize: 14, lineHeight: 20 },
  devOtp: { color: colors.textSub, textAlign: 'center', fontSize: 13, fontWeight: '800' },
  loginButton: { marginTop: 4 },
  registerLink: { alignItems: 'center', marginTop: 26 },
  registerText: { color: colors.primary, fontSize: 14, fontWeight: '800' },
});
