// Renders driver login and coordinates biometric, password, and OTP authentication flows.
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { Toast } from '../../src/components/Toast';
import { useAuthStore } from '../../src/store/auth';
import { colors } from '../../src/theme';
import { authenticate, checkSupport, enableBiometric, getBiometricDriverId, getBiometricToken, isBiometricEnabled } from '../../hooks/useBiometric';
import { saveToken } from '../../services/auth';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('8911 8564');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [showPasswordLogin, setShowPasswordLogin] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const { login, loginWithToken, requestLoginOtp, verifyOtp, isLoading, error, devOtp, clearError } = useAuthStore();

  const refreshBiometricAvailability = async () => {
    const supported = await checkSupport();
    const enabled = await isBiometricEnabled();
    const token = await getBiometricToken();
    const driverId = await getBiometricDriverId();
    setBiometricAvailable(supported && enabled && !!token && !!driverId);
  };

  const runBiometricLogin = async () => {
    clearError();
    const result = await authenticate();
    if (!result.success) {
      return;
    }

    const token = await getBiometricToken();
    const driverId = await getBiometricDriverId();
    if (!token || !driverId) {
      await refreshBiometricAvailability();
      Alert.alert('Face ID идэвхгүй байна', 'Кодоор нэвтэрсний дараа Face ID-г дахин идэвхжүүлнэ үү');
      return;
    }

    const ok = await loginWithToken(token, driverId);
    if (ok) {
      router.replace('/(tabs)');
    } else {
      Alert.alert('Face ID нэвтрэлт амжилтгүй', useAuthStore.getState().error ?? 'Кодоор нэвтэрч дахин идэвхжүүлнэ үү');
    }
  };

  useEffect(() => {
    refreshBiometricAvailability().catch(() => setBiometricAvailable(false));
  }, []);

  const offerBiometric = async (token: string, onDone: () => void) => {
    await saveToken(token);
    const driverId = useAuthStore.getState().driver?.id;
    const supported = await checkSupport();
    if (!supported || !driverId) {
      onDone();
      return;
    }

    Alert.alert(
      'Face ID идэвхжүүлэх үү?',
      'Дараагийн нэвтрэлтэд Face ID ашиглах уу?',
      [
        { text: 'Болих', style: 'cancel', onPress: onDone },
        {
          text: 'Тийм',
          onPress: async () => {
            await enableBiometric(token, driverId);
            await refreshBiometricAvailability();
            onDone();
          },
        },
      ],
    );
  };

  const submitPassword = async () => {
    clearError();
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const ok = await login(email, password);
    if (!ok) return;

    const token = useAuthStore.getState().token;
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (token) {
      await offerBiometric(token, () => router.replace('/(tabs)'));
      return;
    }
    router.replace('/(tabs)');
  };

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
      const token = useAuthStore.getState().token;
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (token) {
        await offerBiometric(token, () => router.replace('/(tabs)'));
        return;
      }
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
            {showPasswordLogin ? (
              <>
                <Input label="И-мэйл" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
                <Input label="Нууц үг" value={password} onChangeText={setPassword} secureTextEntry passwordToggle />
                <Toast message={error} />
                <Button title="Нэвтрэх" loading={isLoading} onPress={submitPassword} style={styles.loginButton} />
                {biometricAvailable ? <Button title="Face ID-аар нэвтрэх" variant="ghost" size="md" icon="finger-print" onPress={runBiometricLogin} /> : null}
                <Button title="Утасны кодоор нэвтрэх" variant="ghost" size="md" onPress={() => { setShowPasswordLogin(false); clearError(); }} />
              </>
            ) : !otpSent ? (
              <Input label="Утасны дугаар" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            ) : (
              <>
                <Text style={styles.otpInfo}>{phone} дугаарт илгээсэн кодоо оруулна уу</Text>
                <Input label="Баталгаажуулах код" value={otp} onChangeText={(value) => setOtp(value.replace(/\D/g, '').slice(0, 4))} keyboardType="number-pad" />
                {devOtp ? <Text style={styles.devOtp}>Туршилтын OTP: {devOtp}</Text> : null}
              </>
            )}
            {!showPasswordLogin ? (
              <>
                <Toast message={error} />
                {biometricAvailable ? <Button title="Face ID-аар нэвтрэх" variant="ghost" size="md" icon="finger-print" onPress={runBiometricLogin} /> : null}
                <Button title={otpSent ? 'Нэвтрэх' : 'Код авах'} loading={isLoading} onPress={submit} style={styles.loginButton} />
                {otpSent ? <Button title="Дугаар солих" variant="ghost" size="md" onPress={() => { setOtpSent(false); setOtp(''); clearError(); }} /> : null}
              </>
            ) : null}
            {!showPasswordLogin ? <Button title="Нууц үгээр нэвтрэх" variant="ghost" size="md" onPress={() => { setShowPasswordLogin(true); clearError(); }} /> : null}
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
