import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
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

// Mock active delivery for demo
const MOCK_DELIVERY = {
  id: 'del-001',
  orderId: 'ORD-2024-001',
  customerName: 'Болд Баатар',
  customerPhone: '9911 2233',
  dropoffAddress: 'Хан-Уул дүүрэг, 3-р хороо, Зайсан',
  dropoffLat: 47.8864,
  dropoffLng: 106.9057,
  pickupAddress: 'Баянзүрх дүүрэг, DIY Store агуулах',
  pickupLat: 47.9184,
  pickupLng: 106.9572,
  fee: 8500,
  distance: 6.2,
  status: 'HEADING_TO_PICKUP',
};

export default function DeliveryScreen() {
  const { isOnline, activeDelivery } = useDriverStore();
  const delivery = activeDelivery ?? MOCK_DELIVERY;

  if (!isOnline && !activeDelivery) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.offline}>
          <Text style={styles.offlineEmoji}>🔴</Text>
          <Text style={styles.offlineTitle}>Идэвхгүй байна</Text>
          <Text style={styles.offlineSub}>Хүргэлт авахын тулд "Самбар" дээрх товчийг дарж идэвхжүүлнэ үү</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Map */}
      <View style={styles.mapWrap}>
        <MapView
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={{
            latitude: (delivery.pickupLat + delivery.dropoffLat) / 2,
            longitude: (delivery.pickupLng + delivery.dropoffLng) / 2,
            latitudeDelta: 0.06,
            longitudeDelta: 0.06,
          }}
          customMapStyle={darkMapStyle}
        >
          <Marker
            coordinate={{ latitude: delivery.pickupLat, longitude: delivery.pickupLng }}
            title="Авах газар"
          >
            <Text style={styles.markerEmoji}>🏪</Text>
          </Marker>
          <Marker
            coordinate={{ latitude: delivery.dropoffLat, longitude: delivery.dropoffLng }}
            title="Хүргэх газар"
          >
            <Text style={styles.markerEmoji}>📍</Text>
          </Marker>
          <Polyline
            coordinates={[
              { latitude: delivery.pickupLat, longitude: delivery.pickupLng },
              { latitude: delivery.dropoffLat, longitude: delivery.dropoffLng },
            ]}
            strokeColor="#f59e0b"
            strokeWidth={3}
            lineDashPattern={[8, 4]}
          />
        </MapView>
      </View>

      {/* Delivery card */}
      <ScrollView style={styles.sheet} contentContainerStyle={styles.sheetContent}>
        <View style={styles.handle} />

        <View style={styles.statusRow}>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>🚗 Авах газар явж байна</Text>
          </View>
          <Text style={styles.fee}>₮{delivery.fee.toLocaleString()}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>📏 Зай</Text>
          <Text style={styles.infoValue}>{delivery.distance} км</Text>
        </View>

        {/* Pickup */}
        <View style={styles.stop}>
          <View style={[styles.stopDot, { backgroundColor: C.brand }]} />
          <View style={styles.stopInfo}>
            <Text style={styles.stopType}>АВАХ</Text>
            <Text style={styles.stopAddress}>{delivery.pickupAddress}</Text>
          </View>
        </View>

        {/* Line */}
        <View style={styles.stopLine} />

        {/* Dropoff */}
        <View style={styles.stop}>
          <View style={[styles.stopDot, { backgroundColor: C.green }]} />
          <View style={styles.stopInfo}>
            <Text style={styles.stopType}>ХҮРГЭХ</Text>
            <Text style={styles.stopAddress}>{delivery.dropoffAddress}</Text>
            <Text style={styles.customer}>{delivery.customerName} · {delivery.customerPhone}</Text>
          </View>
        </View>

        {/* Action buttons */}
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

  mapWrap: { flex: 1 },
  map: { flex: 1 },
  markerEmoji: { fontSize: 28 },

  sheet: {
    backgroundColor: C.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '55%',
    borderTopWidth: 1,
    borderColor: C.border,
  },
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

const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#1d1d2e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#888899' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1d1d2e' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2a2a3e' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#333355' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#44447a' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0f1520' }] },
];
