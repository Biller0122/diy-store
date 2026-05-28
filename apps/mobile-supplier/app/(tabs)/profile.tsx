import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSupplierStore } from '@/lib/store';

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
};

export default function ProfileScreen() {
  const router = useRouter();
  const supplier = useSupplierStore((s) => s.supplier);
  const logout = useSupplierStore((s) => s.logout);

  const initials = (supplier?.ownerName || 'Нийлүүлэгч')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  const handleLogout = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await logout();
    router.replace('/login');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Профайл</Text>

        <View style={styles.card}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials || 'Н'}</Text>
          </View>
          <Text style={styles.name}>{supplier?.businessName || supplier?.ownerName || 'Нийлүүлэгч'}</Text>
          <Text style={styles.sub}>{supplier?.email || 'И-мэйл бүртгэлгүй'}</Text>
          <View style={styles.badge}>
            <Ionicons name="checkmark-circle" size={16} color={C.success} />
            <Text style={styles.badgeText}>{supplier?.status || 'ACTIVE'}</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <InfoRow icon="person-outline" label="Эзэмшигч" value={supplier?.ownerName || '-'} />
          <InfoRow icon="call-outline" label="Утас" value={supplier?.phone || '-'} />
          <InfoRow icon="cube-outline" label="Бараа" value={`${supplier?.productCount ?? 0}`} />
          <InfoRow icon="star-outline" label="Үнэлгээ" value={`${supplier?.rating ?? 5}`} />
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={20} color={C.red} />
          <Text style={styles.logoutText}>Гарах</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={18} color={C.primary} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  content: { padding: 20, paddingBottom: 120 },
  title: { color: C.text, fontSize: 28, fontWeight: '900', marginBottom: 18 },
  card: {
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: C.border,
    padding: 22,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,69,0,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,69,0,0.28)',
  },
  avatarText: { color: C.primary, fontSize: 24, fontWeight: '900' },
  name: { color: C.text, fontSize: 20, fontWeight: '900', marginTop: 14, textAlign: 'center' },
  sub: { color: C.textSub, fontSize: 13, marginTop: 6 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: 'rgba(0,212,170,0.1)',
  },
  badgeText: { color: C.success, fontSize: 12, fontWeight: '800' },
  infoCard: {
    backgroundColor: C.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    marginTop: 16,
    gap: 8,
  },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 46 },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.surface,
    marginRight: 10,
  },
  rowLabel: { color: C.textSub, flex: 1 },
  rowValue: { color: C.text, fontWeight: '800' },
  logoutBtn: {
    height: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 18,
  },
  logoutText: { color: C.red, fontSize: 15, fontWeight: '900' },
});
