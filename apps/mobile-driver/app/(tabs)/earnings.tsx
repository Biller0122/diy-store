import { View, Text, StyleSheet, ScrollView } from 'react-native';
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

const MOCK_HISTORY = [
  { id: '1', date: 'Өнөөдөр 14:32', address: 'Баянзүрх → Хан-Уул', fee: 8500, km: 6.2 },
  { id: '2', date: 'Өнөөдөр 11:15', address: 'СБД → Баянгол', fee: 5000, km: 3.8 },
  { id: '3', date: 'Өчигдөр 18:44', address: 'Чингэлтэй → Сүхбаатар', fee: 4200, km: 2.9 },
  { id: '4', date: 'Өчигдөр 15:20', address: 'Баянзүрх → СБД', fee: 7800, km: 5.5 },
  { id: '5', date: 'Өчигдөр 10:05', address: 'Налайх → Баянзүрх', fee: 18000, km: 18.1 },
];

function Row({ item }: { item: typeof MOCK_HISTORY[0] }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <Text style={styles.rowEmoji}>📦</Text>
        <View>
          <Text style={styles.rowAddress}>{item.address}</Text>
          <Text style={styles.rowDate}>{item.date} · {item.km} км</Text>
        </View>
      </View>
      <Text style={styles.rowFee}>+₮{item.fee.toLocaleString()}</Text>
    </View>
  );
}

export default function EarningsScreen() {
  const { driver } = useDriverStore();
  if (!driver) return null;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Орлого</Text>

        {/* Summary cards */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Өнөөдөр</Text>
            <Text style={styles.summaryValue}>₮{driver.todayEarnings.toLocaleString()}</Text>
          </View>
          <View style={[styles.summaryCard, { flex: 1.4 }]}>
            <Text style={styles.summaryLabel}>Нийт орлого</Text>
            <Text style={[styles.summaryValue, { color: C.brand }]}>
              ₮{driver.totalEarnings.toLocaleString()}
            </Text>
          </View>
        </View>

        {/* History */}
        <View style={styles.historyCard}>
          <Text style={styles.historyTitle}>Сүүлийн хүргэлтүүд</Text>
          {MOCK_HISTORY.map((item) => (
            <Row key={item.id} item={item} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  content: { padding: 20, paddingBottom: 32 },
  heading: { fontSize: 26, fontWeight: '900', color: C.text, marginBottom: 20 },

  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  summaryCard: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  summaryLabel: { fontSize: 11, color: C.muted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryValue: { fontSize: 22, fontWeight: '900', color: C.green, marginTop: 6 },

  historyCard: {
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  historyTitle: { fontSize: 13, fontWeight: '800', color: C.text, marginBottom: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  rowEmoji: { fontSize: 22 },
  rowAddress: { fontSize: 13, fontWeight: '600', color: C.text },
  rowDate: { fontSize: 11, color: C.muted, marginTop: 2 },
  rowFee: { fontSize: 15, fontWeight: '800', color: C.green },
});
