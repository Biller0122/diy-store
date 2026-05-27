import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDriverStore } from '../../lib/store';

const C = {
  bg: '#0f0f1a',
  card: '#1a1a2e',
  brand: '#f59e0b',
  green: '#22c55e',
  border: '#2a2a40',
  text: '#f0f0f5',
  muted: '#8888aa',
};

function StatCard({ emoji, label, value }: { emoji: string; label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statEmoji}>{emoji}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function formatMnt(amount: number) {
  return `₮${(amount / 1000).toFixed(0)}к`;
}

export default function DashboardScreen() {
  const { driver, isOnline, toggleOnline, logout } = useDriverStore();

  if (!driver) return null;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Сайн байна уу,</Text>
            <Text style={styles.name}>{driver.firstName} {driver.lastName}</Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Гарах</Text>
          </TouchableOpacity>
        </View>

        {/* Online toggle */}
        <View style={[styles.card, styles.onlineCard, isOnline && styles.onlineCardActive]}>
          <View style={styles.onlineLeft}>
            <View style={[styles.dot, { backgroundColor: isOnline ? C.green : '#666' }]} />
            <View>
              <Text style={styles.onlineLabel}>
                {isOnline ? 'Идэвхтэй' : 'Идэвхгүй'}
              </Text>
              <Text style={styles.onlineSub}>
                {isOnline ? 'Хүргэлт авах боломжтой' : 'Хүргэлт аваагүй байна'}
              </Text>
            </View>
          </View>
          <Switch
            value={isOnline}
            onValueChange={toggleOnline}
            trackColor={{ false: '#333', true: '#22c55e40' }}
            thumbColor={isOnline ? C.green : '#555'}
            ios_backgroundColor="#333"
          />
        </View>

        {/* Vehicle info */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Тээврийн хэрэгсэл</Text>
          <View style={styles.vehicleRow}>
            <Text style={styles.vehicleIcon}>🏍️</Text>
            <View>
              <Text style={styles.vehicleModel}>{driver.vehicleModel}</Text>
              <Text style={styles.vehiclePlate}>{driver.vehiclePlate}</Text>
            </View>
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingText}>⭐ {driver.rating.toFixed(1)}</Text>
            </View>
          </View>
        </View>

        {/* Stats */}
        <Text style={styles.sectionHeading}>Статистик</Text>
        <View style={styles.statsGrid}>
          <StatCard emoji="📦" label="Нийт хүргэлт" value={String(driver.totalDeliveries)} />
          <StatCard emoji="💰" label="Өнөөдрийн орлого" value={formatMnt(driver.todayEarnings)} />
          <StatCard emoji="🏆" label="Нийт орлого" value={formatMnt(driver.totalEarnings)} />
          <StatCard emoji="⭐" label="Үнэлгээ" value={driver.rating.toFixed(1)} />
        </View>

        {/* Active delivery hint */}
        {isOnline && (
          <View style={[styles.card, styles.waitCard]}>
            <Text style={styles.waitEmoji}>🔍</Text>
            <Text style={styles.waitTitle}>Хүргэлт хүлээж байна...</Text>
            <Text style={styles.waitSub}>Таны ойролцоох захиалга ирэхийг хүлээж байна</Text>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 32 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  greeting: { fontSize: 13, color: C.muted },
  name: { fontSize: 22, fontWeight: '900', color: C.text, marginTop: 2 },
  logoutBtn: { padding: 8, borderRadius: 10, backgroundColor: '#2a2a40' },
  logoutText: { color: C.muted, fontSize: 13 },

  card: {
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
  },

  onlineCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  onlineCardActive: { borderColor: '#22c55e40', backgroundColor: '#0f2a1a' },
  onlineLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  onlineLabel: { fontSize: 16, fontWeight: '800', color: C.text },
  onlineSub: { fontSize: 12, color: C.muted, marginTop: 2 },

  sectionTitle: { fontSize: 11, color: C.muted, fontWeight: '700', letterSpacing: 1, marginBottom: 12, textTransform: 'uppercase' },
  vehicleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  vehicleIcon: { fontSize: 32 },
  vehicleModel: { fontSize: 15, fontWeight: '700', color: C.text },
  vehiclePlate: { fontSize: 13, color: C.muted, marginTop: 2 },
  ratingBadge: { marginLeft: 'auto', backgroundColor: '#f59e0b20', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  ratingText: { color: C.brand, fontWeight: '700', fontSize: 14 },

  sectionHeading: { fontSize: 15, fontWeight: '800', color: C.text, marginBottom: 12, marginTop: 4 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  statEmoji: { fontSize: 24, marginBottom: 6 },
  statValue: { fontSize: 20, fontWeight: '900', color: C.text },
  statLabel: { fontSize: 11, color: C.muted, marginTop: 4, textAlign: 'center' },

  waitCard: { alignItems: 'center', paddingVertical: 28, borderStyle: 'dashed' },
  waitEmoji: { fontSize: 36, marginBottom: 10 },
  waitTitle: { fontSize: 16, fontWeight: '800', color: C.text },
  waitSub: { fontSize: 13, color: C.muted, marginTop: 6, textAlign: 'center' },
});
