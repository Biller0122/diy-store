import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useDriverStore } from '../../lib/store';

const C = {
  bg: '#08080E',
  card: '#0F0F1A',
  surface: '#161625',
  primary: '#FF4500',
  success: '#00D4AA',
  warning: '#FFB547',
  border: 'rgba(255,255,255,0.06)',
  text: '#F5F5FF',
  textSub: '#8888AA',
  textTertiary: '#55556A',
};

const VEHICLE_TYPE_LABEL: Record<string, string> = {
  MOTORCYCLE: 'Мотоцикл',
  CAR: 'Машин',
  VAN: 'Ван',
};

function StarRating({ rating }: { rating: number }) {
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons
          key={i}
          name={
            i <= fullStars
              ? 'star'
              : i === fullStars + 1 && hasHalf
              ? 'star-half'
              : 'star-outline'
          }
          size={20}
          color="#FFB547"
        />
      ))}
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={18} color={C.textSub} />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const { driver, logout } = useDriverStore();

  if (!driver) return null;

  const initials = `${driver.firstName.charAt(0)}${driver.lastName.charAt(0)}`.toUpperCase();

  const handleLogout = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Гарах', 'Та гарахдаа итгэлтэй байна уу?', [
      { text: 'Болих', style: 'cancel' },
      {
        text: 'Гарах',
        style: 'destructive',
        onPress: () => logout(),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>Профайл</Text>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.fullName}>{driver.firstName} {driver.lastName}</Text>
          <Text style={styles.email}>{driver.emailAddress}</Text>
          <View style={styles.ratingRow}>
            <StarRating rating={driver.rating} />
            <Text style={styles.ratingNum}>{driver.rating.toFixed(1)}</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{driver.totalDeliveries}</Text>
            <Text style={styles.statLabel}>Хүргэлт</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={styles.statValue}>₮{(driver.totalEarnings / 1000000).toFixed(1)}M</Text>
            <Text style={styles.statLabel}>Нийт орлого</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{driver.rating.toFixed(1)}</Text>
            <Text style={styles.statLabel}>Үнэлгээ</Text>
          </View>
        </View>

        {/* Vehicle info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Тээврийн хэрэгсэл</Text>
          <View style={styles.card}>
            <InfoRow icon="car-outline" label="Загвар" value={driver.vehicleModel} />
            <View style={styles.rowDivider} />
            <InfoRow icon="document-text-outline" label="Улсын дугаар" value={driver.vehiclePlate} />
            <View style={styles.rowDivider} />
            <InfoRow
              icon="bicycle-outline"
              label="Төрөл"
              value={VEHICLE_TYPE_LABEL[driver.vehicleType] ?? driver.vehicleType}
            />
          </View>
        </View>

        {/* Personal info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Хувийн мэдээлэл</Text>
          <View style={styles.card}>
            <InfoRow icon="mail-outline" label="И-мэйл" value={driver.emailAddress} />
            {driver.phone ? (
              <>
                <View style={styles.rowDivider} />
                <InfoRow icon="call-outline" label="Утас" value={driver.phone} />
              </>
            ) : null}
          </View>
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Тохиргоо</Text>
          <View style={styles.card}>
            {(
              [
                { icon: 'notifications-outline' as const, label: 'Мэдэгдэл' },
                { icon: 'lock-closed-outline' as const, label: 'Нууц үг солих' },
                { icon: 'help-circle-outline' as const, label: 'Тусламж' },
              ] as const
            ).map(({ icon, label }) => (
              <TouchableOpacity
                key={label}
                style={styles.settingRow}
                onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                activeOpacity={0.7}
              >
                <Ionicons name={icon} size={20} color={C.textSub} />
                <Text style={styles.settingLabel}>{label}</Text>
                <Ionicons name="chevron-forward" size={16} color={C.textTertiary} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={20} color="#FF4444" />
          <Text style={styles.logoutText}>Гарах</Text>
        </TouchableOpacity>

        <Text style={styles.version}>DIY Driver v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  content: { padding: 20, paddingBottom: 40 },
  heading: { fontSize: 26, fontWeight: '900', color: C.text, marginBottom: 24 },

  avatarSection: { alignItems: 'center', marginBottom: 24 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 28, fontWeight: '900', color: '#fff' },
  fullName: { fontSize: 20, fontWeight: '800', color: C.text, marginBottom: 4 },
  email: { fontSize: 13, color: C.textSub, marginBottom: 10 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ratingNum: { fontSize: 16, fontWeight: '800', color: '#FFB547' },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: C.border,
  },
  statCard: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '900', color: C.primary, marginBottom: 4 },
  statLabel: { fontSize: 10, color: C.textSub, textAlign: 'center' },
  statDivider: { width: 1, backgroundColor: C.border, marginHorizontal: 4 },

  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: C.textSub,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 11, color: C.textSub, marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: '600', color: C.text },
  rowDivider: { height: 1, backgroundColor: C.border, marginLeft: 62 },

  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  settingLabel: { flex: 1, fontSize: 15, color: C.text },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,68,68,0.3)',
    marginBottom: 16,
  },
  logoutText: { fontSize: 16, fontWeight: '700', color: '#FF4444' },
  version: { textAlign: 'center', fontSize: 12, color: C.textTertiary },
});
