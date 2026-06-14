import React, { useEffect, useRef, useState } from 'react';
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
import { type Href, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useSupplierStore } from '@/lib/store';
import { SUPPLIER_ORDERS_QUERY, shopFetch } from '@/lib/api';
import { SupplierOrder } from '@/lib/types';

const route = (href: string) => href as Href;

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
  const router = useRouter();
  const supplier = useSupplierStore((s) => s.supplier);
  const token = useSupplierStore((s) => s.token);
  const [orders, setOrders] = useState<SupplierOrder[]>([]);

  useEffect(() => {
    let mounted = true;
    shopFetch<{ supplierOrders: { items: SupplierOrder[] } }>(SUPPLIER_ORDERS_QUERY, { skip: 0, take: 20 })
      .then((data) => {
        if (mounted) setOrders(data.supplierOrders.items);
      })
      .catch(() => {
        if (mounted) setOrders([]);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const pendingOrders = orders.filter((order) => order.state === 'PaymentAuthorized' || order.state === 'PaymentSettled');
  const todayRevenue = orders
    .filter((order) => new Date(order.createdAt).toDateString() === new Date().toDateString())
    .reduce((sum, order) => sum + order.total, 0);

  const runOrderAction = async (order: SupplierOrder, action: 'ACCEPT' | 'REJECT') => {
    const mutation = `
      mutation SupplierOrderAction($orderId: ID!, $action: String!) {
        supplierOrderAction(orderId: $orderId, action: $action) {
          success
          message
          order { id code state total createdAt shippingAddress { streetLine1 city } lines { quantity productVariant { name product { name } } } }
        }
      }
    `;
    const data = await shopFetch<{
      supplierOrderAction: { success: boolean; message: string; order?: SupplierOrder | null };
    }>(mutation, { orderId: order.id, action }, token);
    if (!data.supplierOrderAction.success || !data.supplierOrderAction.order) {
      throw new Error(data.supplierOrderAction.message);
    }
    setOrders((current) => current.map((item) => (
      item.id === data.supplierOrderAction.order?.id ? data.supplierOrderAction.order : item
    )));
  };

  const handleAccept = async (order: SupplierOrder) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      await runOrderAction(order, 'ACCEPT');
      Alert.alert('Амжилттай', `Захиалга #${order.code} батлагдлаа!`);
    } catch (err) {
      Alert.alert('Алдаа', err instanceof Error ? err.message : 'Захиалга шинэчлэхэд алдаа гарлаа');
    }
  };

  const handleReject = async (order: SupplierOrder) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      await runOrderAction(order, 'REJECT');
      Alert.alert('Цуцлагдлаа', `Захиалга #${order.code} цуцлагдлаа.`);
    } catch (err) {
      Alert.alert('Алдаа', err instanceof Error ? err.message : 'Захиалга шинэчлэхэд алдаа гарлаа');
    }
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
              Сайн байна уу, {supplier?.ownerName ?? 'Нийлүүлэгч'}! 👋
            </Text>
            <Text style={styles.dateText}>{getTodayLabel()}</Text>
          </View>
        </View>

        {/* Stats Row 1 */}
        <View style={styles.row}>
          <View style={[styles.statCard, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.statLabel}>Өнөөдрийн орлого</Text>
            <Text style={styles.statValueOrange}>{formatPrice(todayRevenue)}</Text>
            <Text style={styles.statHint}>real data</Text>
          </View>
          <View style={[styles.statCard, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.statLabel}>Хүлээгдэж буй</Text>
            <View style={styles.pendingRow}>
              <Text style={styles.statValueLarge}>{pendingOrders.length}</Text>
              <PulsingDot />
            </View>
            <Text style={styles.statHint}>захиалга</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ажлын цэс</Text>
          <View style={styles.actionGrid}>
            <ActionTile icon="add-circle-outline" label="Бараа нэмэх" onPress={() => router.push(route('/product/new'))} />
            <ActionTile icon="cube-outline" label="Бараанууд" onPress={() => router.push(route('/(tabs)/products'))} />
            <ActionTile icon="bag-check-outline" label="Захиалга" onPress={() => router.push(route('/(tabs)/orders'))} />
            <ActionTile icon="stats-chart-outline" label="Орлого" onPress={() => router.push(route('/(tabs)/revenue'))} />
            <ActionTile icon="star-outline" label="Сэтгэгдэл" onPress={() => router.push(route('/(tabs)/reviews'))} />
            <ActionTile icon="settings-outline" label="Тохиргоо" onPress={() => router.push(route('/(tabs)/settings'))} />
          </View>
        </View>

        {/* Stats Row 2 */}
        <View style={styles.row}>
          <View style={[styles.statCard, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.statLabel}>Бүтээгдэхүүн</Text>
            <Text style={styles.statValueWhite}>{supplier?.productCount ?? 0}</Text>
            <Text style={styles.statHint}>бодит бүтээгдэхүүн</Text>
          </View>
          <View style={[styles.statCard, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.statLabel}>Сарын орлого</Text>
            <Text style={styles.statValueOrange}>{formatPrice(orders.reduce((sum, order) => sum + order.total, 0))}</Text>
            <Text style={styles.statHint}>нийт татсан захиалга</Text>
          </View>
        </View>

        {/* Pending orders */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Шинэ захиалгууд</Text>
          {pendingOrders.map((order) => (
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
                  onPress={() => handleAccept(order)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.acceptText}>✅ Батлах</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.rejectBtn}
                  onPress={() => handleReject(order)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.rejectText}>❌ Цуцлах</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
          {pendingOrders.length === 0 ? <Text style={styles.emptyText}>Шинэ захиалга байхгүй байна</Text> : null}
        </View>

        {/* Quick stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Шуурхай статистик</Text>
          <View style={styles.pillRow}>
            <View style={styles.pill}>
              <Text style={styles.pillValue}>{orders.length}</Text>
              <Text style={styles.pillLabel}>Өнөөдрийн захиалга</Text>
            </View>
            <View style={styles.pill}>
              <Text style={styles.pillValue}>{formatPrice(orders.length ? Math.round(orders.reduce((sum, order) => sum + order.total, 0) / orders.length) : 0)}</Text>
              <Text style={styles.pillLabel}>Дундаж үнэ</Text>
            </View>
            <View style={styles.pill}>
              <Text style={styles.pillValue}>{orders.length ? Math.round((orders.filter((o) => o.state === 'Delivered').length / orders.length) * 100) : 0}%</Text>
              <Text style={styles.pillLabel}>Биелэлт</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ActionTile({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.actionTile} onPress={onPress} activeOpacity={0.82}>
      <View style={styles.actionIcon}>
        <Ionicons name={icon} size={18} color={C.primary} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
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
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionTile: {
    width: '31%',
    minHeight: 88,
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 12,
    justifyContent: 'space-between',
  },
  actionIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,69,0,0.12)',
  },
  actionLabel: {
    color: C.text,
    fontSize: 12,
    fontWeight: '800',
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
  emptyText: {
    color: C.textSub,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 16,
  },
});
