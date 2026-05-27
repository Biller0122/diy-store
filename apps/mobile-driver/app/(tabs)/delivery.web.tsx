import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
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

const MOCK_DELIVERY = {
  pickupAddress: 'Баянзүрх дүүрэг, DIY Store агуулах',
  dropoffAddress: 'Хан-Уул дүүрэг, 3-р хороо, Зайсан',
  customerName: 'Болд Баатар',
  customerPhone: '9911 2233',
  fee: 8500,
  distance: 6.2,
};

export default function DeliveryScreen() {
  const { isOnline } = useDriverStore();

  if (!isOnline) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.offline}>
          <Text style={styles.offlineEmoji}>🔴</Text>
          <Text style={styles.offlineTitle}>Идэвхгүй байна</Text>
          <Text style={styles.offlineSub}>
            Хүргэлт авахын тулд "Самбар" дээрх товчийг дарж идэвхжүүлнэ үү
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Map placeholder for web */}
      <View style={styles.mapPlaceholder}>
        <Text style={styles.mapEmoji}>🗺️</Text>
        <Text style={styles.mapText}>Газрын зураг</Text>
        <Text style={styles.mapSub}>(Мобайл апп дээр бодит зураг харагдана)</Text>
      </View>

      <ScrollView style={styles.sheet} contentContainerStyle={styles.sheetContent}>
        <View style={styles.handle} />

        <View style={styles.statusRow}>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>🚗 Авах газар явж байна</Text>
          </View>
          <Text style={styles.fee}>₮{MOCK_DELIVERY.fee.toLocaleString()}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>📏 Зай</Text>
          <Text style={styles.infoValue}>{MOCK_DELIVERY.distance} км</Text>
        </View>

        <View style={styles.stop}>
          <View style={[styles.stopDot, { backgroundColor: C.brand }]} />
          <View style={styles.stopInfo}>
            <Text style={styles.stopType}>АВАХ</Text>
            <Text style={styles.stopAddress}>{MOCK_DELIVERY.pickupAddress}</Text>
          </View>
        </View>
        <View style={styles.stopLine} />
        <View style={styles.stop}>
          <View style={[styles.stopDot, { backgroundColor: C.green }]} />
          <View style={styles.stopInfo}>
            <Text style={styles.stopType}>ХҮРГЭХ</Text>
            <Text style={styles.stopAddress}>{MOCK_DELIVERY.dropoffAddress}</Text>
            <Text style={styles.customer}>{MOCK_DELIVERY.customerName} · {MOCK_DELIVERY.customerPhone}</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.btnPrimary} activeOpacity={0.8}>
            <Text style={styles.btnPrimaryText}>✅ Авлаа</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnSecondary} activeOpacity={0.8}>
            <Text style={styles.btnSecondaryText}>❌ Татгалзах</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  offline: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  offlineEmoji: { fontSize: 48, marginBottom: 16 },
  offlineTitle: { fontSize: 22, fontWeight: '900', color: C.text, marginBottom: 8 },
  offlineSub: { fontSize: 14, color: C.muted, textAlign: 'center', lineHeight: 22 },

  mapPlaceholder: {
    flex: 1,
    backgroundColor: '#131325',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  mapEmoji: { fontSize: 48, marginBottom: 8 },
  mapText: { fontSize: 18, fontWeight: '700', color: C.muted },
  mapSub: { fontSize: 12, color: '#555577', marginTop: 6 },

  sheet: { backgroundColor: C.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '60%', borderTopWidth: 1, borderColor: C.border },
  sheetContent: { padding: 20, paddingBottom: 32 },
  handle: { width: 40, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },

  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  statusBadge: { backgroundColor: '#f59e0b20', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  statusText: { color: C.brand, fontWeight: '700', fontSize: 13 },
  fee: { fontSize: 22, fontWeight: '900', color: C.green },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  infoLabel: { fontSize: 13, color: C.muted },
  infoValue: { fontSize: 13, fontWeight: '700', color: C.text },

  stop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  stopDot: { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
  stopInfo: { flex: 1 },
  stopType: { fontSize: 10, fontWeight: '800', color: C.muted, letterSpacing: 1 },
  stopAddress: { fontSize: 14, fontWeight: '600', color: C.text, marginTop: 2 },
  customer: { fontSize: 12, color: C.muted, marginTop: 4 },
  stopLine: { width: 2, height: 16, backgroundColor: C.border, marginLeft: 5, marginVertical: 4 },

  actions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  btnPrimary: { flex: 1, backgroundColor: C.green, borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  btnPrimaryText: { color: '#000', fontWeight: '800', fontSize: 15 },
  btnSecondary: { flex: 1, backgroundColor: C.card, borderRadius: 16, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  btnSecondaryText: { color: C.muted, fontWeight: '700', fontSize: 15 },
});
