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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error, clearError } = useAuthStore();

  const submit = async () => {
    clearError();
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const ok = await login(email, password);
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
            <Input label="И-мэйл" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
            <Input label="Нууц үг" value={password} onChangeText={setPassword} secureTextEntry passwordToggle />
            <Toast message={error} />
            <Button title="Нэвтрэх" loading={isLoading} onPress={submit} style={styles.loginButton} />
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
  loginButton: { marginTop: 4 },
  registerLink: { alignItems: 'center', marginTop: 26 },
  registerText: { color: colors.primary, fontSize: 14, fontWeight: '800' },
});
