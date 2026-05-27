import React, { useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useSupplierStore } from '@/lib/store';
import { SupplierOrder } from '@/lib/types';

const C = {
  bg: '#08080E',
  card: '#0F0F1A',
  surface: '#161625',
  primary: '#FF4500',
  primaryGlow: 'rgba(255,69,0,0.15)',
  success: '#00D4AA',
  warning: '#FFB547',
  red: '#EF4444',
  border: 'rgba(255,255,255,0.06)',
  text: '#F5F5FF',
  textSub: '#8888AA',
  textTertiary: '#55556A',
};

const MOCK_PENDING_ORDERS: SupplierOrder[] = [
  {
    id: '1',
    code: 'ORD-2025-001',
    state: 'PaymentAuthorized',
    total: 24500_00,
    createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
    shippingAddress: { streetLine1: 'Сүхбаатар дүүрэг, 3-р хороо', city: 'Улаанбаатар' },
    lines: [
      { quantity: 2, productVariant: { name: 'Стандарт', product: { name: 'Нийлүүлэгч багаж' } } },
    ],
  },
  {
    id: '2',
    code: 'ORD-2025-002',
    state: 'PaymentSettled',
    total: 18750_00,
    createdAt: new Date(Date.now() - 22 * 60000).toISOString(),
    shippingAddress: { streetLine1: 'Хан-Уул дүүрэг, 15-р хороо', city: 'Улаанбаатар' },
    lines: [
      { quantity: 3, productVariant: { name: 'Урт', product: { name: 'Боолт M8' } } },
      { quantity: 1, productVariant: { name: 'Үндсэн', product: { name: 'Цахилгаан кабель' } } },
    ],
  },
  {
    id: '3',
    code: 'ORD-2025-003',
    state: 'PaymentAuthorized',
    total: 9200_00,
    createdAt: new Date(Date.now() - 58 * 60000).toISOString(),
    shippingAddress: { streetLine1: 'Баянзүрх дүүрэг, 6-р хороо', city: 'Улаанбаатар' },
    lines: [
      { quantity: 4, productVariant: { name: 'Жижиг', product: { name: 'Будгийн сойз' } } },
    ],
  },
];

function formatPrice(cents: number) {
  return '₮' + (cents / 100).toLocaleString('mn-MN');
}

function getTodayLabel() {
  const now = new Date();
  return `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;
}

function PulsingDot() {
  const anim = useRef(new Animated.Value(1)).current;
  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
    ).start();
  }, []);
  return (
    <Animated.View style={[styles.dot, { opacity: anim }]} />
  );
}

export default function DashboardScreen() {
  const supplier = useSupplierStore((s) => s.supplier);

  const handleAccept = async (code: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert('Амжилттай', `Захиалга #${code} батлагдлаа!`);
  };

  const handleReject = async (code: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert('Цуцлагдлаа', `Захиалга #${code} цуцлагдлаа.`);
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
            <Text style={styles.greeting}>
              Сайн байна уу, {supplier?.firstName ?? 'Нийлүүлэгч'}! 👋
            </Text>
            <Text style={styles.dateText}>{getTodayLabel()}</Text>
          </View>
        </View>

        {/* Stats Row 1 */}
        <View style={styles.row}>
          <View style={[styles.statCard, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.statLabel}>Өнөөдрийн орлого</Text>
            <Text style={styles.statValueOrange}>₮245,000</Text>
            <Text style={styles.statHint}>+12% өчигдрөөс</Text>
          </View>
          <View style={[styles.statCard, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.statLabel}>Хүлээгдэж буй</Text>
            <View style={styles.pendingRow}>
              <Text style={styles.statValueLarge}>4</Text>
              <PulsingDot />
            </View>
            <Text style={styles.statHint}>захиалга</Text>
          </View>
        </View>

        {/* Stats Row 2 */}
        <View style={styles.row}>
          <View style={[styles.statCard, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.statLabel}>Бүтээгдэхүүн</Text>
            <Text style={styles.statValueWhite}>10</Text>
            <Text style={styles.statHint}>8 идэвхтэй</Text>
          </View>
          <View style={[styles.statCard, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.statLabel}>Сарын орлого</Text>
            <Text style={styles.statValueOrange}>₮3,840,000</Text>
            <Text style={styles.statHint}>5-р сар</Text>
          </View>
        </View>

        {/* Pending orders */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Шинэ захиалгууд</Text>
          {MOCK_PENDING_ORDERS.map((order) => (
            <View key={order.id} style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <Text style={styles.orderCode}>#{order.code}</Text>
                <Text style={styles.orderTotal}>{formatPrice(order.total)}</Text>
              </View>
              {order.shippingAddress && (
                <Text style={styles.orderAddress} numberOfLines={1}>
                  📍 {order.shippingAddress.streetLine1}
                </Text>
              )}
              <Text style={styles.orderItems} numberOfLines={1}>
                {order.lines.map((l) => `${l.quantity}x ${l.productVariant.product.name}`).join(' · ')}
              </Text>
              <View style={styles.orderActions}>
                <TouchableOpacity
                  style={styles.acceptBtn}
                  onPress={() => handleAccept(order.code)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.acceptText}>✅ Батлах</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.rejectBtn}
                  onPress={() => handleReject(order.code)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.rejectText}>❌ Цуцлах</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* Quick stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Шуурхай статистик</Text>
          <View style={styles.pillRow}>
            <View style={styles.pill}>
              <Text style={styles.pillValue}>7</Text>
              <Text style={styles.pillLabel}>Өнөөдрийн захиалга</Text>
            </View>
            <View style={styles.pill}>
              <Text style={styles.pillValue}>₮35K</Text>
              <Text style={styles.pillLabel}>Дундаж үнэ</Text>
            </View>
            <View style={styles.pill}>
              <Text style={styles.pillValue}>94%</Text>
              <Text style={styles.pillLabel}>Биелэлт</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  greeting: {
    color: C.text,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  dateText: {
    color: C.textSub,
    fontSize: 13,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  statCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
  },
  statLabel: {
    color: C.textSub,
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
  },
  statValueOrange: {
    color: C.primary,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  statValueLarge: {
    color: C.red,
    fontSize: 28,
    fontWeight: '800',
    marginRight: 8,
  },
  statValueWhite: {
    color: C.text,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  statHint: {
    color: C.textTertiary,
    fontSize: 11,
  },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.red,
  },
  section: {
    marginTop: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    color: C.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    marginTop: 8,
  },
  orderCard: {
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    marginBottom: 10,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  orderCode: {
    color: C.text,
    fontWeight: '700',
    fontSize: 14,
  },
  orderTotal: {
    color: C.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  orderAddress: {
    color: C.textSub,
    fontSize: 12,
    marginBottom: 4,
  },
  orderItems: {
    color: C.textTertiary,
    fontSize: 12,
    marginBottom: 10,
  },
  orderActions: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptBtn: {
    flex: 1,
    backgroundColor: 'rgba(0,212,170,0.12)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,212,170,0.25)',
    paddingVertical: 9,
    alignItems: 'center',
  },
  acceptText: {
    color: C.success,
    fontWeight: '600',
    fontSize: 13,
  },
  rejectBtn: {
    flex: 1,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.22)',
    paddingVertical: 9,
    alignItems: 'center',
  },
  rejectText: {
    color: C.red,
    fontWeight: '600',
    fontSize: 13,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    alignItems: 'center',
  },
  pillValue: {
    color: C.text,
    fontWeight: '800',
    fontSize: 16,
    marginBottom: 4,
  },
  pillLabel: {
    color: C.textTertiary,
    fontSize: 10,
    textAlign: 'center',
  },
});
