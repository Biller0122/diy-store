import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { StatusBadge } from '@/components/StatusBadge';
import { SupplierOrder, TabFilter } from '@/lib/types';
import { SUPPLIER_ORDERS_QUERY, SUPPLIER_ORDER_ACTION_MUTATION, shopFetch } from '@/lib/api';
import { useSupplierStore } from '@/lib/store';

const C = {
  bg: '#08080E',
  card: '#0F0F1A',
  surface: '#161625',
  primary: '#FF4500',
  success: '#00D4AA',
  warning: '#FFB547',
  red: '#EF4444',
  border: 'rgba(255,255,255,0.06)',
  text: '#F5F5FF',
  textSub: '#8888AA',
  textTertiary: '#55556A',
};

const PENDING_ORDERS: SupplierOrder[] = [
  {
    id: 'p1',
    code: 'ORD-2025-001',
    state: 'PaymentAuthorized',
    total: 24500_00,
    createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
    shippingAddress: { streetLine1: 'Сүхбаатар дүүрэг, 3-р хороо', city: 'Улаанбаатар' },
    lines: [
      { quantity: 2, productVariant: { name: 'Стандарт', product: { name: 'Нийлүүлэгч багаж' } } },
      { quantity: 3, productVariant: { name: 'Урт', product: { name: 'Боолт M8' } } },
    ],
  },
  {
    id: 'p2',
    code: 'ORD-2025-002',
    state: 'PaymentSettled',
    total: 18750_00,
    createdAt: new Date(Date.now() - 22 * 60000).toISOString(),
    shippingAddress: { streetLine1: 'Хан-Уул дүүрэг, 15-р хороо', city: 'Улаанбаатар' },
    lines: [
      { quantity: 1, productVariant: { name: 'Үндсэн', product: { name: 'Цахилгаан кабель' } } },
    ],
  },
  {
    id: 'p3',
    code: 'ORD-2025-003',
    state: 'PaymentAuthorized',
    total: 9200_00,
    createdAt: new Date(Date.now() - 58 * 60000).toISOString(),
    shippingAddress: { streetLine1: 'Баянзүрх дүүрэг, 6-р хороо', city: 'Улаанбаатар' },
    lines: [
      { quantity: 4, productVariant: { name: 'Жижиг', product: { name: 'Будгийн сойз' } } },
    ],
  },
  {
    id: 'p4',
    code: 'ORD-2025-004',
    state: 'PaymentSettled',
    total: 34100_00,
    createdAt: new Date(Date.now() - 90 * 60000).toISOString(),
    shippingAddress: { streetLine1: 'Чингэлтэй дүүрэг, 2-р хороо', city: 'Улаанбаатар' },
    lines: [
      { quantity: 2, productVariant: { name: 'Том', product: { name: 'Перфоратор' } } },
    ],
  },
  {
    id: 'p5',
    code: 'ORD-2025-005',
    state: 'PaymentAuthorized',
    total: 7600_00,
    createdAt: new Date(Date.now() - 130 * 60000).toISOString(),
    shippingAddress: { streetLine1: 'Сонгинохайрхан дүүрэг, 19-р хороо', city: 'Улаанбаатар' },
    lines: [
      { quantity: 5, productVariant: { name: 'Стандарт', product: { name: 'Гар хусуур' } } },
    ],
  },
];

const ACTIVE_ORDERS: SupplierOrder[] = [
  {
    id: 'a1',
    code: 'ORD-2025-006',
    state: 'Shipped',
    total: 45000_00,
    createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    shippingAddress: { streetLine1: 'Налайх дүүрэг, 1-р хороо', city: 'Налайх' },
    lines: [
      { quantity: 1, productVariant: { name: 'Аварга', product: { name: 'Цементний уут 50кг' } } },
    ],
  },
  {
    id: 'a2',
    code: 'ORD-2025-007',
    state: 'PartiallyShipped',
    total: 28300_00,
    createdAt: new Date(Date.now() - 5 * 3600000).toISOString(),
    shippingAddress: { streetLine1: 'Багануур дүүрэг', city: 'Багануур' },
    lines: [
      { quantity: 3, productVariant: { name: 'Дунд', product: { name: 'Резин хоолой' } } },
    ],
  },
  {
    id: 'a3',
    code: 'ORD-2025-008',
    state: 'Shipped',
    total: 15900_00,
    createdAt: new Date(Date.now() - 8 * 3600000).toISOString(),
    shippingAddress: { streetLine1: 'Хан-Уул дүүрэг, 11-р хороо', city: 'Улаанбаатар' },
    lines: [
      { quantity: 2, productVariant: { name: 'Стандарт', product: { name: 'Цоолтуур' } } },
    ],
  },
  {
    id: 'a4',
    code: 'ORD-2025-009',
    state: 'PartiallyShipped',
    total: 62000_00,
    createdAt: new Date(Date.now() - 12 * 3600000).toISOString(),
    shippingAddress: { streetLine1: 'Сүхбаатар дүүрэг, 1-р хороо', city: 'Улаанбаатар' },
    lines: [
      { quantity: 4, productVariant: { name: 'Том', product: { name: 'Лакафарба' } } },
    ],
  },
  {
    id: 'a5',
    code: 'ORD-2025-010',
    state: 'Shipped',
    total: 11500_00,
    createdAt: new Date(Date.now() - 18 * 3600000).toISOString(),
    shippingAddress: { streetLine1: 'Баянгол дүүрэг, 5-р хороо', city: 'Улаанбаатар' },
    lines: [
      { quantity: 6, productVariant: { name: 'Хэмжигдэхүй', product: { name: 'Угаагч щётко' } } },
    ],
  },
];

const DONE_ORDERS: SupplierOrder[] = [
  {
    id: 'd1',
    code: 'ORD-2025-011',
    state: 'Delivered',
    total: 39500_00,
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    shippingAddress: { streetLine1: 'Чингэлтэй дүүрэг, 4-р хороо', city: 'Улаанбаатар' },
    lines: [
      { quantity: 2, productVariant: { name: 'Стандарт', product: { name: 'Гагнуурын аппарат' } } },
    ],
  },
  {
    id: 'd2',
    code: 'ORD-2025-012',
    state: 'Delivered',
    total: 16800_00,
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    shippingAddress: { streetLine1: 'Хан-Уул дүүрэг, 7-р хороо', city: 'Улаанбаатар' },
    lines: [
      { quantity: 10, productVariant: { name: 'Богино', product: { name: 'Боолт M6' } } },
    ],
  },
  {
    id: 'd3',
    code: 'ORD-2025-013',
    state: 'Cancelled',
    total: 8900_00,
    createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    shippingAddress: { streetLine1: 'Баянзүрх дүүрэг, 12-р хороо', city: 'Улаанбаатар' },
    lines: [
      { quantity: 1, productVariant: { name: 'Жижиг', product: { name: 'Гар дрель' } } },
    ],
  },
  {
    id: 'd4',
    code: 'ORD-2025-014',
    state: 'Delivered',
    total: 53200_00,
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    shippingAddress: { streetLine1: 'Сонгинохайрхан дүүрэг, 21-р хороо', city: 'Улаанбаатар' },
    lines: [
      { quantity: 3, productVariant: { name: 'Стандарт', product: { name: 'Хэмжих соронзон тасма' } } },
    ],
  },
  {
    id: 'd5',
    code: 'ORD-2025-015',
    state: 'Delivered',
    total: 27400_00,
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    shippingAddress: { streetLine1: 'Баянгол дүүрэг, 18-р хороо', city: 'Улаанбаатар' },
    lines: [
      { quantity: 2, productVariant: { name: 'Хэт том', product: { name: 'Цахилгаан урт кабель' } } },
    ],
  },
];

const TABS: { key: TabFilter; label: string }[] = [
  { key: 'pending', label: 'Хүлээгдэж буй' },
  { key: 'active', label: 'Явж байна' },
  { key: 'done', label: 'Дууссан' },
];

function formatPrice(cents: number) {
  return '₮' + (cents / 100).toLocaleString('mn-MN');
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now.getTime() - then.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Дөнгөж сая';
  if (diffMin < 60) return `${diffMin} минутын өмнө`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} цагийн өмнө`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD} өдрийн өмнө`;
}

export default function OrdersScreen() {
  const token = useSupplierStore((s) => s.token);
  const [activeTab, setActiveTab] = useState<TabFilter>('pending');
  const [liveOrders, setLiveOrders] = useState<SupplierOrder[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncError, setSyncError] = useState('');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    shopFetch<{ supplierOrders: { items: SupplierOrder[] } }>(SUPPLIER_ORDERS_QUERY, { skip: 0, take: 50 })
      .then((data) => {
        if (mounted) {
          setLiveOrders(data.supplierOrders.items);
          setSyncError('');
        }
      })
      .catch((err) => {
        if (mounted) setSyncError(err instanceof Error ? err.message : 'Захиалга татахад алдаа гарлаа');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const orders = liveOrders
    ? liveOrders.filter((order) =>
        activeTab === 'pending'
          ? order.state === 'PaymentAuthorized' || order.state === 'PaymentSettled'
          : activeTab === 'active'
          ? order.state === 'PartiallyShipped' || order.state === 'Shipped' || order.state === 'PartiallyDelivered'
          : order.state === 'Delivered' || order.state === 'Cancelled',
      )
    : [];

  const handleAccept = async (order: SupplierOrder) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await runOrderAction(order, 'ACCEPT', 'Батлагдлаа');
  };

  const handleReject = async (order: SupplierOrder) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await runOrderAction(order, 'REJECT', 'Цуцлагдлаа');
  };

  const handleShip = async (order: SupplierOrder) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await runOrderAction(order, 'SHIP', 'Бэлэн боллоо');
  };

  const runOrderAction = async (order: SupplierOrder, action: 'ACCEPT' | 'REJECT' | 'SHIP', title: string) => {
    try {
      const data = await shopFetch<{
        supplierOrderAction: { success: boolean; message: string; order?: SupplierOrder | null };
      }>(SUPPLIER_ORDER_ACTION_MUTATION, { orderId: order.id, action }, token);
      if (!data.supplierOrderAction.success || !data.supplierOrderAction.order) {
        Alert.alert('Алдаа', data.supplierOrderAction.message);
        return;
      }
      const updated = data.supplierOrderAction.order;
      setLiveOrders((prev) => (prev ?? []).map((item) => (item.id === updated.id ? updated : item)));
      Alert.alert(title, `Захиалга #${order.code} шинэчлэгдлээ.`);
    } catch (err) {
      Alert.alert('Алдаа', err instanceof Error ? err.message : 'Захиалга шинэчлэхэд алдаа гарлаа');
    }
  };

  const isPending = (o: SupplierOrder) =>
    o.state === 'PaymentAuthorized' || o.state === 'PaymentSettled';
  const isActive = (o: SupplierOrder) =>
    o.state === 'PartiallyShipped' || o.state === 'Shipped' || o.state === 'PartiallyDelivered';

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Захиалгууд</Text>
        <View style={styles.countBadge}>
          {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.countText}>{orders.length}</Text>}
        </View>
      </View>

      {syncError ? <Text style={styles.syncError}>{syncError}</Text> : null}

      {/* Filter tabs */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={styles.tabItem}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.75}
          >
            <Text
              style={[
                styles.tabLabel,
                activeTab === tab.key && styles.tabLabelActive,
              ]}
            >
              {tab.label}
            </Text>
            {activeTab === tab.key && <View style={styles.tabUnderline} />}
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {orders.map((order) => (
          <View key={order.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.orderCode}>#{order.code}</Text>
              <StatusBadge status={order.state} />
            </View>

            {order.shippingAddress && (
              <Text style={styles.address} numberOfLines={1}>
                📍 {order.shippingAddress.streetLine1}, {order.shippingAddress.city}
              </Text>
            )}

            <Text style={styles.items} numberOfLines={2}>
              {order.lines
                .map((l) => `${l.quantity}x ${l.productVariant.product.name}`)
                .join(' | ')}
            </Text>

            <View style={styles.footer}>
              <Text style={styles.timeAgo}>{timeAgo(order.createdAt)}</Text>
              <Text style={styles.total}>{formatPrice(order.total)}</Text>
            </View>

            {isPending(order) && (
              <View style={styles.actions}>
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
            )}

            {isActive(order) && (
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.shipBtn}
                  onPress={() => handleShip(order)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.shipText}>📦 Бэлэн боллоо</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  title: {
    color: C.text,
    fontSize: 22,
    fontWeight: '800',
  },
  countBadge: {
    backgroundColor: C.primary,
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  syncError: {
    color: C.red,
    fontSize: 12,
    marginHorizontal: 20,
    marginBottom: 6,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingHorizontal: 20,
    marginTop: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingBottom: 10,
    paddingTop: 4,
    position: 'relative',
  },
  tabLabel: {
    color: C.textTertiary,
    fontSize: 13,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: C.primary,
    fontWeight: '700',
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 8,
    right: 8,
    height: 2,
    backgroundColor: C.primary,
    borderRadius: 2,
  },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderCode: {
    color: C.text,
    fontWeight: '700',
    fontSize: 15,
  },
  address: {
    color: C.textSub,
    fontSize: 13,
    marginBottom: 4,
  },
  items: {
    color: C.textTertiary,
    fontSize: 12,
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeAgo: {
    color: C.textTertiary,
    fontSize: 12,
  },
  total: {
    color: C.text,
    fontWeight: '700',
    fontSize: 15,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
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
  shipBtn: {
    flex: 1,
    backgroundColor: 'rgba(59,130,246,0.12)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.25)',
    paddingVertical: 9,
    alignItems: 'center',
  },
  shipText: {
    color: '#3B82F6',
    fontWeight: '600',
    fontSize: 13,
  },
});
