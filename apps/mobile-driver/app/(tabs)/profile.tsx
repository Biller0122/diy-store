import { useEffect, useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Badge } from '../../src/components/Badge';
import { Card } from '../../src/components/Card';
import { StarRating } from '../../src/components/StarRating';
import { SUPPORT_PHONE } from '../../src/config/contact';
import { getDriverDeliveryHistory } from '../../src/api/client';
import { stopLocationTracking } from '../../src/services/location';
import { socketService } from '../../src/services/socket';
import { useAuthStore, VEHICLE_LABEL } from '../../src/store/auth';
import { useDeliveryStore } from '../../src/store/delivery';
import { colors } from '../../src/theme';

function statusMeta(status?: string) {
  if (status === 'SUSPENDED') return { label: 'Түдгэлзүүлсэн', tone: 'error' as const };
  if (status === 'ACTIVE') return { label: 'Идэвхтэй жолооч', tone: 'success' as const };
  return { label: 'Хянагдаж байна', tone: 'warning' as const };
}

function SettingRow({ icon, label, onPress, right }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; onPress?: () => void; right?: React.ReactNode }) {
  return (
    <TouchableOpacity style={styles.settingRow} onPress={onPress} activeOpacity={0.75}>
      <Ionicons name={icon} size={20} color={colors.textSub} />
      <Text style={styles.settingLabel}>{label}</Text>
      {right ?? <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />}
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const driver = useAuthStore((state) => state.driver);
  const logout = useAuthStore((state) => state.logout);
  const setOffline = useDeliveryStore((state) => state.setOffline);
  const [notifications, setNotifications] = useState(true);
  const [profileStats, setProfileStats] = useState({ deliveries: 0, earned: 0 });

  useEffect(() => {
    if (!driver) return;
    getDriverDeliveryHistory(driver.id, 100)
      .then((result) => {
        const completed = result.deliveryHistoryForDriver.filter((item) => item.status === 'COMPLETED');
        setProfileStats({
          deliveries: completed.length,
          earned: completed.reduce((sum, item) => sum + (item.finalFee || item.proposedFee || 0), 0),
        });
      })
      .catch(() => setProfileStats({ deliveries: 0, earned: 0 }));
  }, [driver?.id]);

  if (!driver) return null;

  const meta = statusMeta(driver.status);
  const initials = `${driver.firstName.charAt(0)}${driver.lastName.charAt(0)}`.toUpperCase();

  const confirmLogout = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Гарах', 'Та гарахдаа итгэлтэй байна уу?', [
      { text: 'Болих', style: 'cancel' },
      {
        text: 'Гарах',
        style: 'destructive',
        onPress: () => {
          stopLocationTracking();
          socketService.disconnect();
          setOffline();
          logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>{driver.firstName} {driver.lastName}</Text>
          <Text style={styles.email}>{driver.emailAddress}</Text>
          <Text style={styles.member}>Хамтарсан: {driver.createdAt ? new Date(driver.createdAt).getFullYear() : 2025} оноос</Text>
          <Badge label={meta.label} tone={meta.tone} />
        </View>

        <Card style={styles.ratingCard}>
          <StarRating rating={driver.rating} size={24} />
          <Text style={styles.ratingText}>{driver.rating.toFixed(1)} / 5.0 ({profileStats.deliveries} хүргэлт)</Text>
        </Card>

        <Card style={styles.vehicleCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.sectionTitle}>Тээврийн хэрэгсэл</Text>
          </View>
          <Text style={styles.infoLine}>🚗 {VEHICLE_LABEL[driver.vehicleType]} · {driver.vehicleModel}</Text>
          <Text style={styles.infoLine}>🔢 {driver.vehiclePlate}</Text>
        </Card>

        <View style={styles.statsRow}>
          <Card style={styles.miniCard}><Text style={styles.miniValue}>{profileStats.deliveries}</Text><Text style={styles.miniLabel}>Нийт хүргэлт</Text></Card>
          <Card style={styles.miniCard}><Text style={styles.miniValue}>{formatMoney(profileStats.earned)}</Text><Text style={styles.miniLabel}>Нийт орлого</Text></Card>
          <Card style={styles.miniCard}><Text style={styles.miniValue}>{driver.createdAt ? new Date(driver.createdAt).getFullYear() : '—'}</Text><Text style={styles.miniLabel}>Элссэн он</Text></Card>
        </View>

        <Card style={styles.menu}>
          <SettingRow icon="notifications-outline" label="Мэдэгдэл тохиргоо" right={<Switch value={notifications} onValueChange={setNotifications} trackColor={{ true: colors.primary, false: colors.surface }} />} />
          <SettingRow icon="moon-outline" label="Dark mode" right={<Text style={styles.infoOnly}>үргэлж асаалттай</Text>} />
          <SettingRow icon="call-outline" label="Тусламж холбоо барих" onPress={() => Linking.openURL(`tel:${SUPPORT_PHONE}`)} />
          <SettingRow icon="document-text-outline" label="Үйлчилгээний нөхцөл" onPress={() => Linking.openURL('https://diystore.mn/terms')} />
          <TouchableOpacity style={styles.logoutRow} onPress={confirmLogout}>
            <Ionicons name="log-out-outline" size={20} color={colors.error} />
            <Text style={styles.logoutText}>Гарах</Text>
          </TouchableOpacity>
        </Card>
      </ScrollView>

    </SafeAreaView>
  );
}

function formatMoney(amount: number) {
  return `₮${Math.round(amount / 100).toLocaleString()}`;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 40 },
  profileHeader: { alignItems: 'center', marginBottom: 18 },
  avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: colors.primaryGlow, borderWidth: 3, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  avatarText: { color: colors.primary, fontSize: 34, fontWeight: '900' },
  name: { color: colors.text, fontSize: 23, fontWeight: '900' },
  email: { color: colors.textSub, fontSize: 13, marginTop: 4 },
  member: { color: colors.textTertiary, fontSize: 12, marginTop: 4, marginBottom: 10 },
  ratingCard: { padding: 16, alignItems: 'center', gap: 8, marginBottom: 14 },
  ratingText: { color: colors.warning, fontSize: 14, fontWeight: '800' },
  vehicleCard: { padding: 16, marginBottom: 14 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '900' },
  infoLine: { color: colors.text, fontSize: 14, lineHeight: 23 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  miniCard: { flex: 1, padding: 12, alignItems: 'center' },
  miniValue: { color: colors.primary, fontFamily: 'Courier', fontSize: 15, fontWeight: '900', textAlign: 'center' },
  miniLabel: { color: colors.textSub, fontSize: 10, marginTop: 5, textAlign: 'center' },
  menu: { overflow: 'hidden' },
  settingRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  settingLabel: { color: colors.text, fontSize: 14, flex: 1, fontWeight: '700' },
  infoOnly: { color: colors.textTertiary, fontSize: 11 },
  logoutRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14 },
  logoutText: { color: colors.error, fontSize: 15, fontWeight: '900' },
});
