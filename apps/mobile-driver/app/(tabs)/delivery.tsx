import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
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

type DeliveryStatus = 'PENDING' | 'PICKED_UP' | 'DELIVERED';

const STATUS_CONFIG: Record<DeliveryStatus, { label: string; color: string; icon: React.ComponentProps<typeof Ionicons>['name'] }> = {
  PENDING: { label: 'Авах газар явж байна', color: C.warning, icon: 'navigate' },
  PICKED_UP: { label: 'Хүргэж байна', color: C.primary, icon: 'bicycle' },
  DELIVERED: { label: 'Хүргэсэн', color: C.success, icon: 'checkmark-circle' },
};

const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#08080e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#888899' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#050510' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
];

export default function DeliveryScreen() {
  const { activeDelivery, completeDelivery } = useDriverStore();
  const [status, setStatus] = useState<DeliveryStatus>('PENDING');

  if (!activeDelivery) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.empty}>
          <Ionicons name="bicycle-outline" size={64} color={C.textTertiary} />
          <Text style={styles.emptyTitle}>Идэвхтэй хүргэлт алга</Text>
          <Text style={styles.emptySub}>Самбар дээр онлайн болж хүргэлт хүлээн авна уу</Text>
        </View>
      </SafeAreaView>
    );
  }

  const cfg = STATUS_CONFIG[status];

  const nextStep = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (status === 'PENDING') {
      setStatus('PICKED_UP');
    } else if (status === 'PICKED_UP') {
      setStatus('DELIVERED');
    } else if (status === 'DELIVERED') {
      completeDelivery();
      setStatus('PENDING');
    }
  };

  const callCustomer = () => {
    Linking.openURL(`tel:${activeDelivery.customerPhone}`);
  };

  const midLat = (activeDelivery.pickupLat + activeDelivery.dropoffLat) / 2;
  const midLng = (activeDelivery.pickupLng + activeDelivery.dropoffLng) / 2;

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          latitude: midLat,
          longitude: midLng,
          latitudeDelta: 0.07,
          longitudeDelta: 0.07,
        }}
        customMapStyle={DARK_MAP_STYLE}
      >
        <Marker
          coordinate={{ latitude: activeDelivery.pickupLat, longitude: activeDelivery.pickupLng }}
          title="Авах газар"
          pinColor="#FF4500"
        />
        <Marker
          coordinate={{ latitude: activeDelivery.dropoffLat, longitude: activeDelivery.dropoffLng }}
          title="Хүргэх газар"
          pinColor="#00D4AA"
        />
      </MapView>

      {/* Bottom sheet */}
      <ScrollView
        style={styles.sheet}
        contentContainerStyle={styles.sheetContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.handle} />

        {/* Status */}
        <View style={[styles.statusBadge, { backgroundColor: cfg.color + '20', borderColor: cfg.color + '40' }]}>
          <Ionicons name={cfg.icon} size={16} color={cfg.color} />
          <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>

        {/* Customer */}
        <View style={styles.customerRow}>
          <View style={styles.customerAvatar}>
            <Text style={styles.customerAvatarText}>
              {activeDelivery.customerName.charAt(0)}
            </Text>
          </View>
          <View style={styles.customerInfo}>
            <Text style={styles.customerName}>{activeDelivery.customerName}</Text>
            <Text style={styles.customerPhone}>{activeDelivery.customerPhone}</Text>
          </View>
          <TouchableOpacity style={styles.callBtn} onPress={callCustomer} activeOpacity={0.8}>
            <Ionicons name="call" size={20} color={C.success} />
          </TouchableOpacity>
        </View>

        {/* Meta */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Зай</Text>
            <Text style={styles.metaValue}>{activeDelivery.distance} км</Text>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Хугацаа</Text>
            <Text style={styles.metaValue}>~{activeDelivery.estimatedMinutes} мин</Text>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Хөлс</Text>
            <Text style={[styles.metaValue, { color: C.primary }]}>₮{activeDelivery.fee.toLocaleString()}</Text>
          </View>
        </View>

        {/* Stops */}
        <View style={styles.stopsCard}>
          <View style={styles.stopRow}>
            <View style={[styles.stopDot, { backgroundColor: C.primary }]} />
            <View style={styles.stopInfo}>
              <Text style={styles.stopLabel}>АВАХ</Text>
              <Text style={styles.stopAddress}>{activeDelivery.pickupAddress}</Text>
            </View>
          </View>
          <View style={styles.stopConnector} />
          <View style={styles.stopRow}>
            <View style={[styles.stopDot, { backgroundColor: C.success }]} />
            <View style={styles.stopInfo}>
              <Text style={styles.stopLabel}>ХҮРГЭХ</Text>
              <Text style={styles.stopAddress}>{activeDelivery.dropoffAddress}</Text>
            </View>
          </View>
        </View>

        {/* Action button */}
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: status === 'DELIVERED' ? C.success : cfg.color }]}
          onPress={nextStep}
          activeOpacity={0.85}
        >
          <Ionicons
            name={status === 'DELIVERED' ? 'checkmark-done-circle' : status === 'PICKED_UP' ? 'checkmark-circle' : 'navigate'}
            size={22}
            color="#fff"
          />
          <Text style={styles.actionBtnText}>
            {status === 'PENDING' ? 'Авлаа — Хүргэж байна' : status === 'PICKED_UP' ? 'Хүргэлт дууссан' : 'Дуусгах'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: { flex: 1, backgroundColor: C.bg },
  map: { flex: 1 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: C.text, marginTop: 16, marginBottom: 8 },
  emptySub: { fontSize: 14, color: C.textSub, textAlign: 'center', lineHeight: 22 },

  sheet: {
    backgroundColor: C.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '50%',
    borderTopWidth: 1,
    borderColor: C.border,
  },
  sheetContent: { padding: 20, paddingBottom: 36 },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
  },
  statusText: { fontSize: 13, fontWeight: '700' },

  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 12,
  },
  customerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerAvatarText: { color: '#fff', fontWeight: '800', fontSize: 18 },
  customerInfo: { flex: 1 },
  customerName: { fontSize: 15, fontWeight: '700', color: C.text },
  customerPhone: { fontSize: 12, color: C.textSub, marginTop: 2 },
  callBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,212,170,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  metaRow: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  metaItem: { flex: 1, alignItems: 'center' },
  metaLabel: { fontSize: 11, color: C.textSub, marginBottom: 4 },
  metaValue: { fontSize: 14, fontWeight: '700', color: C.text },
  metaDivider: { width: 1, backgroundColor: C.border },

  stopsCard: {
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  stopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  stopDot: { width: 12, height: 12, borderRadius: 6, marginTop: 3 },
  stopConnector: { width: 2, height: 12, backgroundColor: C.border, marginLeft: 5, marginVertical: 4 },
  stopInfo: { flex: 1 },
  stopLabel: { fontSize: 10, fontWeight: '800', color: C.textSub, letterSpacing: 0.8 },
  stopAddress: { fontSize: 13, fontWeight: '600', color: C.text, marginTop: 2 },

  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 56,
    borderRadius: 16,
  },
  actionBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
