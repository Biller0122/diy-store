import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { Toast } from '../../src/components/Toast';
import { useAuthStore, VEHICLE_LABEL } from '../../src/store/auth';
import { Driver } from '../../src/api/client';
import { colors } from '../../src/theme';

type Step = 1 | 2 | 3;

const vehicleTypes: Driver['vehicleType'][] = ['MOTORCYCLE', 'CAR', 'VAN', 'TRUCK'];
const PLATE_RE = /^([А-ЯӨҮA-Z]{2}-?\d{4}[А-ЯӨҮA-Z]{2}|\d{4}[А-ЯӨҮA-Z]{3})$/;

export default function RegisterScreen() {
  const router = useRouter();
  const { register, isLoading, error, clearError } = useAuthStore();
  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [vehicleType, setVehicleType] = useState<Driver['vehicleType']>('MOTORCYCLE');
  const [plate, setPlate] = useState('');
  const [model, setModel] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validStep1 = useMemo(() => name.trim().length >= 2 && /\S+@\S+\.\S+/.test(email) && /^[6789]\d{7}$/.test(phone.replace(/\D/g, '')) && password.length >= 8 && password === confirm, [name, email, phone, password, confirm]);

  const next = async () => {
    clearError();
    const nextErrors: Record<string, string> = {};
    if (name.trim().length < 2) nextErrors.name = 'Овог нэрээ оруулна уу';
    if (!/\S+@\S+\.\S+/.test(email)) nextErrors.email = 'И-мэйл хаягаа зөв оруулна уу';
    if (!/^[6789]\d{7}$/.test(phone.replace(/\D/g, ''))) nextErrors.phone = 'Утасны дугаар 8 оронтой, 6/7/8/9-өөр эхлэх ёстой';
    if (password.length < 8) nextErrors.password = 'Нууц үг хамгийн багадаа 8 тэмдэгт байна';
    if (password !== confirm) nextErrors.confirm = 'Нууц үг таарахгүй байна';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep(2);
  };

  const submit = async () => {
    clearError();
    const nextErrors: Record<string, string> = {};
    const normalizedPlate = plate.replace(/\s/g, '').toUpperCase();
    if (!PLATE_RE.test(normalizedPlate)) nextErrors.plate = 'Улсын дугаарын формат буруу байна (ж: УБ-1234АА эсвэл 1234УБА)';
    if (model.trim().length < 2) nextErrors.model = 'Машины загвараа оруулна уу';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    const ok = await register({ ownerName: name, email, password, phone, vehicleType, vehiclePlate: normalizedPlate, vehicleModel: model.trim() });
    if (ok) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStep(3);
    }
  };

  if (step === 3) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.successWrap}>
          <View style={styles.checkCircle}>
            <Ionicons name="checkmark" size={54} color={colors.white} />
          </View>
          <Text style={styles.title}>Бүртгэл илгээгдлээ!</Text>
          <Text style={styles.successText}>Манай баг 24 цагийн дотор холбогдох болно</Text>
          <Button title="Нэвтрэх хуудас руу" onPress={() => router.replace('/(auth)/login')} style={styles.successButton} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>{step === 1 ? 'Жолоочоор бүртгүүлэх' : 'Тээврийн хэрэгслийн мэдээлэл'}</Text>
            <Text style={styles.subtitle}>Алхам {step}/2</Text>
          </View>

          {step === 1 ? (
            <View style={styles.form}>
              <Input label="Овог нэр*" value={name} onChangeText={setName} error={errors.name} />
              <Input label="И-мэйл*" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" error={errors.email} />
              <Input label="Утасны дугаар*" value={phone} onChangeText={setPhone} keyboardType="phone-pad" error={errors.phone} />
              <Input label="Нууц үг*" value={password} onChangeText={setPassword} secureTextEntry passwordToggle error={errors.password} />
              <Input label="Нууц үг давтах*" value={confirm} onChangeText={setConfirm} secureTextEntry passwordToggle error={errors.confirm} />
              <Button title="Үргэлжлүүлэх" onPress={next} disabled={!validStep1} />
            </View>
          ) : (
            <View style={styles.form}>
              <Text style={styles.fieldLabel}>Тээврийн хэрэгслийн төрөл</Text>
              <View style={styles.vehicleGrid}>
                {vehicleTypes.map((type) => (
                  <TouchableOpacity key={type} style={[styles.vehiclePill, vehicleType === type && styles.vehiclePillActive]} onPress={() => setVehicleType(type)}>
                    <Text style={[styles.vehicleText, vehicleType === type && styles.vehicleTextActive]}>{VEHICLE_LABEL[type]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Input label="Улсын дугаар*" value={plate} onChangeText={(value) => setPlate(value.toUpperCase())} placeholder="УБ-1234АА" error={errors.plate} />
              <Input label="Машины загвар*" value={model} onChangeText={setModel} placeholder="Toyota Prius" error={errors.model} />
              <Toast message={error} />
              <Button title="Бүртгүүлэх" loading={isLoading} onPress={submit} />
              <Button title="Буцах" variant="ghost" size="md" onPress={() => setStep(1)} />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 },
  header: { marginBottom: 24 },
  title: { color: colors.text, fontSize: 28, fontWeight: '900', textAlign: 'center' },
  subtitle: { color: colors.textSub, fontSize: 13, textAlign: 'center', marginTop: 8, fontWeight: '700' },
  form: { gap: 14 },
  fieldLabel: { color: colors.textSub, fontSize: 12, fontWeight: '800' },
  vehicleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  vehiclePill: { width: '48%', height: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 14, borderWidth: 1, borderColor: colors.borderHover, backgroundColor: 'rgba(255,255,255,0.04)' },
  vehiclePillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  vehicleText: { color: colors.textSub, fontWeight: '800' },
  vehicleTextActive: { color: colors.white },
  successWrap: { flex: 1, justifyContent: 'center', padding: 28, alignItems: 'center' },
  checkCircle: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  successText: { color: colors.textSub, textAlign: 'center', fontSize: 16, lineHeight: 24, marginTop: 12 },
  successButton: { marginTop: 32, alignSelf: 'stretch' },
});
