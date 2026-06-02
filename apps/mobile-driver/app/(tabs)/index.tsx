import { useEffect, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import OrderRequestModal from '../../components/OrderRequestModal';
import { Badge } from '../../src/components/Badge';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { getDriverDeliveryHistory, getDriverEarnings } from '../../src/api/client';
import { setupDriverNotifications } from '../../src/services/notifications';
import { socketService } from '../../src/services/socket';
import { startLocationTracking, stopLocationTracking } from '../../src/services/location';
import { useAuthStore, VEHICLE_LABEL } from '../../src/store/auth';
import { useDeliveryStore } from '../../src/store/delivery';
import { colors } from '../../src/theme';

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <Card style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Card>
  );
}

function WaitingDots() {
  const [dots, setDots] = useState('');
  useEffect(() => {
    const interval = setInterval(() => setDots((current) => (current.length >= 3 ? '' : `${current}.`)), 420);
    return () => clearInterval(interval);
  }, []);
  return <Text style={styles.toggleSub}>Захиалга хүлээж байна{dots}</Text>;
}

function formatMoney(amount: number) {
  return `₮${Math.round(amount / 100).toLocaleString()}`;
}

export default function DashboardScreen() {
  const router = useRouter();
  const driver = useAuthStore((state) => state.driver);
  const updateOnline = useAuthStore((state) => state.updateOnline);
  const refreshProfile = useAuthStore((state) => state.refreshProfile);
  const activeOrder = useDeliveryStore((state) => state.activeOrder);
  const incomingOrder = useDeliveryStore((state) => state.incomingOrder);
  const isOnline = useDeliveryStore((state) => state.isOnline);
  const setOnline = useDeliveryStore((state) => state.setOnline);
  const setOffline = useDeliveryStore((state) => state.setOffline);
  const setIncomingOrder = useDeliveryStore((state) => state.setIncomingOrder);
  const acceptOrder = useDeliveryStore((state) => state.acceptOrder);
  const rejectOrder = useDeliveryStore((state) => state.rejectOrder);
  const refreshActiveOrder = useDeliveryStore((state) => state.refreshActiveOrder);
  const [recentDeliveries, setRecentDeliveries] = useState<Array<{ id: string; orderNumber: string; date: string; fee: number; route: string }>>([]);
  const [todayStats, setTodayStats] = useState({ deliveries: 0, earned: 0, rating: driver?.rating ?? 5 });
  const pulseScale = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isOnline) return;
    const loop = Animated.loop(
      Animated.parallel([
        Animated.timing(pulseScale, { toValue: 1.4, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulseOpacity, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
      pulseScale.setValue(1);
      pulseOpacity.setValue(1);
    };
  }, [isOnline, pulseOpacity, pulseScale]);

  useEffect(() => {
    if (!driver || !isOnline) return;
    setupDriverNotifications(driver.id).catch(() => {});
    socketService.connect(driver.id, (order) => {
      if (useDeliveryStore.getState().isOnline && !useDeliveryStore.getState().activeOrder) setIncomingOrder(order);
    }, driver);
    startLocationTracking(driver.id, activeOrder?.orderId).catch(() => {});
    return undefined;
  }, [driver, isOnline, activeOrder?.orderId, setIncomingOrder]);

  useEffect(() => {
    if (!driver || !isOnline || activeOrder) return;
    refreshActiveOrder(driver.id).catch(() => {});
  }, [driver, isOnline, activeOrder, refreshActiveOrder]);

  useEffect(() => {
    if (!driver) return;
    refreshProfile().catch(() => {});
    getDriverEarnings(driver.id, 'today')
      .then((result) => {
        const earnings = (result as {
          getDriverEarnings?: { totalDeliveries: number; totalEarned: number; averageRating: number };
        }).getDriverEarnings;
        if (earnings) {
          setTodayStats({
            deliveries: earnings.totalDeliveries,
            earned: earnings.totalEarned,
            rating: earnings.averageRating,
          });
        }
      })
      .catch(() => setTodayStats({ deliveries: 0, earned: 0, rating: driver.rating }));
    getDriverDeliveryHistory(driver.id, 5)
      .then((result) => {
        setRecentDeliveries(result.deliveryHistoryForDriver.slice(0, 5).map((item) => ({
          id: item.id,
          orderNumber: item.orderNumber,
          date: new Date(item.updatedAt).toLocaleDateString('mn-MN'),
          fee: item.finalFee || item.proposedFee || 0,
          route: `${item.pickupStops[0]?.district || item.pickupStops[0]?.address?.split(',')[0]?.trim() || 'Нийлүүлэгч'} → ${item.dropoffAddress.split(',')[0]?.trim() || 'Хэрэглэгч'}`,
        })));
      })
      .catch(() => setRecentDeliveries([]));
  }, [driver?.id, refreshProfile]);

  if (!driver) return null;

  const toggle = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    const next = !isOnline;
    await updateOnline(next);
    if (next) {
      setOnline();
    } else {
      setOffline();
      stopLocationTracking();
      socketService.disconnect();
    }
  };

  const accept = async () => {
    await acceptOrder(driver.id, incomingOrder ?? undefined);
    router.push('/(tabs)/delivery');
  };

  const reject = async () => {
    await rejectOrder(driver.id, incomingOrder ?? undefined);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.hello}>Сайн байна уу,</Text>
            <Text style={styles.name}>{driver.firstName} {driver.lastName}</Text>
          </View>
          <Text style={styles.vehicle}>{VEHICLE_LABEL[driver.vehicleType]} · {driver.vehiclePlate}</Text>
        </View>

        <View style={styles.onlineSection}>
          <View style={styles.powerWrap}>
            {isOnline ? <Animated.View style={[styles.pulseRing, { opacity: pulseOpacity, transform: [{ scale: pulseScale }] }]} /> : null}
            <TouchableOpacity style={[styles.powerButton, isOnline && styles.powerButtonOnline]} activeOpacity={0.86} onPress={toggle}>
              <Ionicons name="power" size={54} color={isOnline ? colors.white : colors.textTertiary} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.toggleTitle, isOnline && styles.toggleTitleOnline]}>{isOnline ? 'Онлайн байна' : 'Офлайн байна'}</Text>
          {isOnline ? <WaitingDots /> : <Text style={styles.toggleSub}>Захиалга авахын тулд онлайн болно уу</Text>}
          <Button title={isOnline ? 'Офлайн болох' : 'Онлайн болох'} variant="ghost" size="md" onPress={toggle} style={styles.onlineButton} />
        </View>

        <View style={styles.statsRow}>
          <StatCard value={String(todayStats.deliveries)} label="Өнөөдөр" />
          <StatCard value={formatMoney(todayStats.earned)} label="Орлого" />
          <StatCard value={`⭐ ${todayStats.rating.toFixed(1)}`} label="Үнэлгээ" />
        </View>

        {activeOrder ? (
          <Card style={styles.activeCard}>
            <Badge label="Идэвхтэй хүргэлт" />
            <Text style={styles.activeOrder}>{activeOrder.orderNumber}</Text>
            <Text style={styles.activeStatus}>{activeOrder.status}</Text>
            <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${((activeOrder.currentStop + 1) / (activeOrder.pickupStops.length + 1)) * 100}%` }]} /></View>
            <Button title="Хүргэлт үзэх" onPress={() => router.push('/(tabs)/delivery')} size="md" />
          </Card>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Сүүлийн хүргэлтүүд</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/earnings')}>
            <Text style={styles.linkText}>Орлого →</Text>
          </TouchableOpacity>
        </View>
        {recentDeliveries.length === 0 ? (
          <Text style={styles.emptyText}>Хүргэлт байхгүй байна</Text>
        ) : (
          recentDeliveries.map((item) => (
            <Card key={item.id} style={styles.deliveryItem}>
              <View style={styles.deliveryMiddle}>
                <Text style={styles.deliveryTitle}>{item.orderNumber}</Text>
                <Text style={styles.deliveryDate}>{item.route} · {item.date}</Text>
              </View>
              <Text style={styles.deliveryAmount}>{formatMoney(item.fee)}</Text>
            </Card>
          ))
        )}
      </ScrollView>

      {incomingOrder && isOnline ? <OrderRequestModal visible request={incomingOrder} onAccept={accept} onReject={reject} /> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 34 },
  header: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 24 },
  hello: { color: colors.textSub, fontSize: 13 },
  name: { color: colors.text, fontSize: 23, fontWeight: '900', marginTop: 2 },
  vehicle: { color: colors.textSub, fontSize: 11, maxWidth: 150, textAlign: 'right' },
  onlineSection: { alignItems: 'center', marginBottom: 24, paddingVertical: 12 },
  powerWrap: { width: 170, height: 170, alignItems: 'center', justifyContent: 'center' },
  pulseRing: { position: 'absolute', width: 140, height: 140, borderRadius: 70, borderWidth: 2, borderColor: colors.success },
  powerButton: { width: 140, height: 140, borderRadius: 70, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)' },
  powerButtonOnline: { backgroundColor: colors.success, borderColor: colors.success },
  toggleTitle: { color: colors.textSub, fontSize: 19, fontWeight: '900', marginTop: 4 },
  toggleTitleOnline: { color: colors.success },
  toggleSub: { color: colors.textTertiary, fontSize: 13, marginTop: 6, minHeight: 20 },
  onlineButton: { marginTop: 14, minWidth: 180 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: { flex: 1, padding: 13, alignItems: 'center' },
  statValue: { color: colors.primary, fontFamily: 'Courier', fontSize: 17, fontWeight: '900', marginBottom: 4 },
  statLabel: { color: colors.textSub, fontSize: 11 },
  activeCard: { padding: 16, marginBottom: 22, borderColor: 'rgba(255,69,0,0.45)' },
  activeOrder: { color: colors.text, fontFamily: 'Courier', fontSize: 15, fontWeight: '800', marginTop: 10 },
  activeStatus: { color: colors.textSub, fontSize: 12, marginTop: 3 },
  progressTrack: { height: 7, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 999, overflow: 'hidden', marginVertical: 14 },
  progressFill: { height: '100%', backgroundColor: colors.primary },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '900', marginBottom: 12 },
  linkText: { color: colors.primary, fontSize: 12, fontWeight: '900' },
  deliveryItem: { flexDirection: 'row', alignItems: 'center', padding: 13, marginBottom: 9 },
  districtBadge: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  districtText: { fontSize: 12, fontWeight: '900' },
  deliveryMiddle: { flex: 1 },
  deliveryTitle: { color: colors.text, fontSize: 14, fontWeight: '800' },
  deliveryDate: { color: colors.textSub, fontSize: 11, marginTop: 2 },
  deliveryAmount: { color: colors.primary, fontFamily: 'Courier', fontSize: 14, fontWeight: '900' },
  emptyText: { color: colors.textSub, textAlign: 'center', paddingVertical: 24 },
});
