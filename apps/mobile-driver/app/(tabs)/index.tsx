import { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useDriverStore } from '../../lib/store';
import OrderRequestModal from '../../components/OrderRequestModal';

const C = {
  bg: '#08080E',
  card: '#0F0F1A',
  surface: '#161625',
  primary: '#FF4500',
  primaryGlow: 'rgba(255,69,0,0.15)',
  success: '#00D4AA',
  warning: '#FFB547',
  border: 'rgba(255,255,255,0.06)',
  text: '#F5F5FF',
  textSub: '#8888AA',
  textTertiary: '#55556A',
};

const MOCK_RECENT = [
  { id: '1', address: 'Баянзүрх → Хан-Уул', fee: 8500, time: '14:32', done: true },
  { id: '2', address: 'СБД → Баянгол', fee: 5000, time: '11:15', done: true },
  { id: '3', address: 'Чингэлтэй → Сүхбаатар', fee: 4200, time: '09:05', done: true },
];

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function DashboardScreen() {
  const { driver, isOnline, toggleOnline, activeDelivery, pendingRequest, acceptDelivery, rejectDelivery } = useDriverStore();

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (isOnline) {
      pulseLoop.current = Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.15,
              duration: 750,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 750,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(pulseOpacity, {
              toValue: 0,
              duration: 1500,
              useNativeDriver: true,
            }),
            Animated.timing(pulseOpacity, {
              toValue: 1,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
        ]),
      );
      pulseLoop.current.start();
    } else {
      pulseLoop.current?.stop();
      pulseAnim.setValue(1);
      pulseOpacity.setValue(1);
    }
    return () => pulseLoop.current?.stop();
  }, [isOnline]);

  if (!driver) return null;

  const handleToggle = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    toggleOnline();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Сайн байна уу,</Text>
            <Text style={styles.name}>{driver.firstName} {driver.lastName}</Text>
          </View>
          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={14} color="#FFB547" />
            <Text style={styles.ratingText}>{driver.rating}</Text>
          </View>
        </View>

        {/* Online toggle */}
        <View style={styles.onlineSection}>
          <View style={styles.pulseContainer}>
            {isOnline && (
              <Animated.View
                style={[
                  styles.pulseRing,
                  {
                    transform: [{ scale: pulseAnim }],
                    opacity: pulseOpacity,
                  },
                ]}
              />
            )}
            <TouchableOpacity
              style={[styles.toggleBtn, isOnline && styles.toggleBtnOnline]}
              onPress={handleToggle}
              activeOpacity={0.85}
            >
              <Ionicons
                name={isOnline ? 'flash' : 'power-outline'}
                size={40}
                color={isOnline ? '#fff' : C.textTertiary}
              />
            </TouchableOpacity>
          </View>
          <Text style={[styles.toggleLabel, isOnline && styles.toggleLabelOnline]}>
            {isOnline ? 'Онлайн' : 'Офлайн'}
          </Text>
          <Text style={styles.toggleSub}>
            {isOnline ? 'Хүргэлт авах боломжтой' : 'Товчийг дарж идэвхжүүлнэ үү'}
          </Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatCard label="Хүргэлт" value={String(driver.totalDeliveries)} />
          <StatCard label="Орлого" value={`₮${driver.todayEarnings.toLocaleString()}`} />
          <StatCard label="Үнэлгээ" value={`${driver.rating}⭐`} />
        </View>

        {/* Recent deliveries */}
        <Text style={styles.sectionTitle}>Сүүлийн хүргэлтүүд</Text>

        {activeDelivery ? (
          <View style={styles.deliveryItem}>
            <View style={[styles.deliveryDot, { backgroundColor: C.warning }]} />
            <View style={styles.deliveryInfo}>
              <Text style={styles.deliveryAddress}>{activeDelivery.pickupAddress} → {activeDelivery.dropoffAddress}</Text>
              <Text style={styles.deliverySub}>Идэвхтэй · {activeDelivery.status}</Text>
            </View>
            <Text style={styles.deliveryFee}>₮{activeDelivery.fee.toLocaleString()}</Text>
          </View>
        ) : (
          MOCK_RECENT.map((item) => (
            <View key={item.id} style={styles.deliveryItem}>
              <View style={[styles.deliveryDot, { backgroundColor: C.success }]} />
              <View style={styles.deliveryInfo}>
                <Text style={styles.deliveryAddress}>{item.address}</Text>
                <Text style={styles.deliverySub}>{item.time} · Дууссан</Text>
              </View>
              <Text style={styles.deliveryFee}>₮{item.fee.toLocaleString()}</Text>
            </View>
          ))
        )}
      </ScrollView>

      {pendingRequest && (
        <OrderRequestModal
          visible={!!pendingRequest}
          request={pendingRequest}
          onAccept={() => acceptDelivery(pendingRequest)}
          onReject={rejectDelivery}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 32 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  greeting: { fontSize: 13, color: C.textSub },
  name: { fontSize: 22, fontWeight: '900', color: C.text, marginTop: 2 },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,181,71,0.12)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  ratingText: { color: '#FFB547', fontWeight: '800', fontSize: 14 },

  onlineSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  pulseContainer: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  pulseRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: C.success,
  },
  toggleBtn: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: C.surface,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleBtnOnline: {
    backgroundColor: C.success,
    borderColor: C.success,
  },
  toggleLabel: {
    fontSize: 18,
    fontWeight: '800',
    color: C.textSub,
  },
  toggleLabelOnline: {
    color: C.success,
  },
  toggleSub: {
    fontSize: 13,
    color: C.textTertiary,
    marginTop: 4,
  },

  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 28,
  },
  statCard: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '900',
    color: C.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: C.textSub,
    textAlign: 'center',
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: C.text,
    marginBottom: 12,
  },
  deliveryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  deliveryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  deliveryInfo: { flex: 1 },
  deliveryAddress: {
    fontSize: 13,
    fontWeight: '600',
    color: C.text,
  },
  deliverySub: {
    fontSize: 11,
    color: C.textSub,
    marginTop: 2,
  },
  deliveryFee: {
    fontSize: 14,
    fontWeight: '800',
    color: C.success,
  },
});
