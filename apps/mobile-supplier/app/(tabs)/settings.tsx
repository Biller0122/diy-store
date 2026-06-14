import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSupplierStore } from '@/lib/store';
import { UPDATE_SUPPLIER_MUTATION, shopFetch } from '@/lib/api';

const C = {
  bg: '#08080E',
  card: '#0F0F1A',
  surface: '#161625',
  primary: '#FF4500',
  success: '#00D4AA',
  red: '#EF4444',
  border: 'rgba(255,255,255,0.06)',
  text: '#F5F5FF',
  textSub: '#8888AA',
  textTertiary: '#55556A',
};

export default function SettingsScreen() {
  const router = useRouter();
  const supplier = useSupplierStore((s) => s.supplier);
  const token = useSupplierStore((s) => s.token);
  const setSupplier = useSupplierStore((s) => s.setSupplier);
  const logout = useSupplierStore((s) => s.logout);
  const [businessName, setBusinessName] = useState(supplier?.businessName ?? '');
  const [phone, setPhone] = useState(supplier?.phone ?? '');
  const [email, setEmail] = useState(supplier?.email ?? '');
  const [description, setDescription] = useState(supplier?.description ?? '');
  const [address, setAddress] = useState(supplier?.address ?? '');
  const [bankName, setBankName] = useState(supplier?.bankName ?? '');
  const [bankAccount, setBankAccount] = useState(supplier?.bankAccount ?? '');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!supplier?.id) {
      Alert.alert('Алдаа', 'Нийлүүлэгчийн мэдээлэл олдсонгүй');
      return;
    }
    if (businessName.trim().length < 2) {
      Alert.alert('Алдаа', 'Дэлгүүрийн нэр оруулна уу');
      return;
    }
    setSaving(true);
    try {
      const data = await shopFetch<{ updateSupplier: NonNullable<typeof supplier> }>(
        UPDATE_SUPPLIER_MUTATION,
        {
          id: supplier.id,
          input: {
            businessName: businessName.trim(),
            phone: phone.trim(),
            description: description.trim(),
            address: address.trim(),
            bankName: bankName.trim(),
            bankAccount: bankAccount.trim(),
          },
        },
        token,
      );
      setSupplier(data.updateSupplier);
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
      Alert.alert('Хадгалагдлаа', 'Тохиргооны мэдээлэл backend дээр хадгалагдлаа.');
    } catch (error) {
      console.warn('[SettingsScreen] save failed', error instanceof Error ? error.message : error);
      Alert.alert('Хадгалж чадсангүй', error instanceof Error ? error.message : 'Дахин оролдоно уу');
    } finally {
      setSaving(false);
    }
  };

  const signOut = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Тохиргоо</Text>
        <Text style={styles.subtitle}>Дэлгүүрийн мэдээлэл, банк, холбоо барих</Text>

        <Section icon="storefront-outline" title="Дэлгүүрийн мэдээлэл">
          <Field label="Дэлгүүрийн нэр" value={businessName} onChangeText={setBusinessName} />
          <Field label="Тайлбар" value={description} onChangeText={setDescription} multiline placeholder="Дэлгүүрийн тухай товч тайлбар" />
          <Field label="Хаяг" value={address} onChangeText={setAddress} placeholder="Дэлгэрэнгүй хаяг" />
        </Section>

        <Section icon="call-outline" title="Холбоо барих">
          <Field label="Утас" value={phone ?? ''} onChangeText={setPhone} keyboardType="phone-pad" />
          <Field label="Имэйл" value={email} onChangeText={setEmail} keyboardType="email-address" />
        </Section>

        <Section icon="card-outline" title="Банкны мэдээлэл">
          <Field label="Банкны нэр" value={bankName} onChangeText={setBankName} />
          <Field label="Дансны дугаар" value={bankAccount} onChangeText={setBankAccount} keyboardType="number-pad" placeholder="xxxxxxxxxxxxxxxx" />
          <Text style={styles.note}>Сар бүрийн 20-нд тооцоолсон төлбөр шилжүүлнэ.</Text>
        </Section>

        <TouchableOpacity style={[styles.saveBtn, saved && styles.saveBtnDone, saving && styles.disabled]} onPress={save} activeOpacity={0.85} disabled={saving}>
          <Ionicons name={saved ? 'checkmark-circle-outline' : 'save-outline'} size={18} color="#fff" />
          <Text style={styles.saveText}>{saving ? 'Хадгалж байна...' : saved ? 'Хадгалагдлаа' : 'Хадгалах'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={signOut} activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={18} color={C.red} />
          <Text style={styles.logoutText}>Гарах</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ icon, title, children }: { icon: keyof typeof Ionicons.glyphMap; title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon} size={18} color={C.primary} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  multiline,
  placeholder,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  multiline?: boolean;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'number-pad';
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.textArea]}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        placeholder={placeholder}
        placeholderTextColor={C.textTertiary}
        keyboardType={keyboardType}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  content: { padding: 20, paddingBottom: 110 },
  title: { color: C.text, fontSize: 22, fontWeight: '900' },
  subtitle: { color: C.textSub, fontSize: 12, marginTop: 4, marginBottom: 18 },
  section: { backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 16, marginBottom: 14 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { color: C.text, fontSize: 15, fontWeight: '900' },
  field: { marginBottom: 12 },
  label: { color: C.textSub, fontSize: 11, fontWeight: '800', marginBottom: 7 },
  input: { minHeight: 50, borderRadius: 14, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, color: C.text, paddingHorizontal: 14, fontSize: 14 },
  textArea: { minHeight: 94, paddingTop: 14, textAlignVertical: 'top' },
  note: { color: C.textTertiary, fontSize: 11, lineHeight: 16 },
  saveBtn: { height: 54, borderRadius: 16, backgroundColor: C.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 },
  saveBtnDone: { backgroundColor: C.success },
  disabled: { opacity: 0.6 },
  saveText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  logoutBtn: { height: 50, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)', backgroundColor: 'rgba(239,68,68,0.08)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  logoutText: { color: C.red, fontWeight: '900' },
});
