import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '@/lib/store';
import { C } from '@/lib/colors';
import { shopFetch, MY_ORDERS_QUERY } from '@/lib/api';

interface ApiOrder {
  id: string;
  code: string;
  state: string;
  total: number;
  createdAt: string;
  lines: { productVariant: { product: { name: string } } }[];
}

const STATE_MAP: Record<string, { label: string; bg: string; color: string }> = {
  AddingItems: { label: 'Сагсанд', bg: 'rgba(136,136,170,0.15)', color: '#8888AA' },
  ArrangingPayment: { label: 'Төлбөр хийх', bg: 'rgba(255,181,71,0.15)', color: '#FFB547' },
  PaymentAuthorized: { label: 'Хүлээгдэж буй', bg: 'rgba(255,181,71,0.15)', color: '#FFB547' },
  PaymentSettled: { label: 'Баталгаажсан', bg: 'rgba(100,130,255,0.15)', color: '#6482FF' },
  Shipped: { label: 'Хүргэлтэнд гарсан', bg: 'rgba(100,130,255,0.15)', color: '#6482FF' },
  Delivered: { label: 'Хүргэгдлээ', bg: 'rgba(0,212,170,0.15)', color: '#00D4AA' },
  Cancelled: { label: 'Цуцлагдсан', bg: 'rgba(255,68,68,0.15)', color: '#FF4444' },
  Modifying: { label: 'Өөрчлөгдөж байна', bg: 'rgba(255,181,71,0.15)', color: '#FFB547' },
};

function getStateInfo(state: string) {
  return STATE_MAP[state] ?? { label: state, bg: 'rgba(136,136,170,0.15)', color: '#8888AA' };
}

function formatPrice(price: number) {
  return '₮' + Math.round(price / 100).toLocaleString('mn-MN');
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

function OrderCard({ order, onTrack }: { order: ApiOrder; onTrack: () => void }) {
  const info = getStateInfo(order.state);
  const items = order.lines.map((l) => l.productVariant.product.name);

  return (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <Text style={styles.orderCode}>{order.code}</Text>
        <View style={[styles.statusBadge, { backgroundColor: info.bg }]}>
          <Text style={[styles.statusText, { color: info.color }]}>{info.label}</Text>
        </View>
      </View>
      <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
      <View style={styles.itemsPreview}>
        {items.slice(0, 3).map((name, i) => (
          <Text key={i} style={styles.itemName} numberOfLines={1}>
            • {name}
          </Text>
        ))}
        {items.length > 3 && (
          <Text style={styles.moreItems}>+ {items.length - 3} бараа</Text>
        )}
      </View>
      <View style={styles.orderFooter}>
        <Text style={styles.orderTotal}>{formatPrice(order.total)}</Text>
        {(order.state === 'Shipped' || order.state === 'PaymentSettled') && (
          <TouchableOpacity style={styles.trackBtn} onPress={onTrack}>
            <Ionicons name="location-outline" size={14} color={C.primary} />
            <Text style={styles.trackBtnText}>Мөрдөх</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default function OrdersScreen() {
  const router = useRouter();
  const customer = useAppStore((s) => s.customer);
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      const data = await shopFetch<{ orders: { items: ApiOrder[] } }>(MY_ORDERS_QUERY);
      setOrders(data.orders?.items ?? []);
    } catch {
      // keep previous state
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (customer) fetchOrders();
    else setLoading(false);
  }, [customer, fetchOrders]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  if (!customer) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Захиалгууд</Text>
        </View>
        <View style={styles.loginPrompt}>
          <Text style={styles.loginIcon}>📦</Text>
          <Text style={styles.loginTitle}>Нэвтэрнэ үү</Text>
          <Text style={styles.loginSubtitle}>Захиалгуудаа харахын тулд нэвтэрнэ үү</Text>
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => router.push('/(tabs)/account' as never)}
            activeOpacity={0.85}
          >
            <Text style={styles.loginBtnText}>Нэвтрэх</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Захиалгууд</Text>
        </View>
        <View style={styles.loginPrompt}>
          <ActivityIndicator color={C.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Захиалгууд</Text>
        <Text style={styles.headerCount}>{orders.length} захиалга</Text>
      </View>
      {orders.length === 0 ? (
        <View style={styles.loginPrompt}>
          <Text style={styles.loginIcon}>📦</Text>
          <Text style={styles.loginTitle}>Захиалга байхгүй</Text>
          <Text style={styles.loginSubtitle}>Та одоогоор захиалга хийгээгүй байна</Text>
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => router.push('/(tabs)/' as never)}
            activeOpacity={0.85}
          >
            <Text style={styles.loginBtnText}>Дэлгүүр үзэх</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={C.primary}
            />
          }
          renderItem={({ item }) => (
            <OrderCard
              order={item}
              onTrack={() => router.push(`/track/${item.id}` as never)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerTitle: { color: C.text, fontSize: 22, fontWeight: '800' },
  headerCount: { color: C.textSub, fontSize: 13 },

  loginPrompt: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
  loginIcon: { fontSize: 56, marginBottom: 8 },
  loginTitle: { color: C.text, fontSize: 20, fontWeight: '700' },
  loginSubtitle: { color: C.textSub, fontSize: 14, textAlign: 'center', marginBottom: 20 },
  loginBtn: {
    backgroundColor: C.primary,
    borderRadius: 14,
    paddingHorizontal: 40,
    paddingVertical: 14,
  },
  loginBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  listContent: { padding: 16, gap: 12 },
  orderCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  orderCode: { color: C.text, fontSize: 14, fontWeight: '700', fontFamily: 'monospace' },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: '700' },
  orderDate: { color: C.textTertiary, fontSize: 12, marginBottom: 10 },
  itemsPreview: { gap: 2, marginBottom: 12 },
  itemName: { color: C.textSub, fontSize: 12 },
  moreItems: { color: C.textTertiary, fontSize: 11, fontStyle: 'italic' },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 10,
  },
  orderTotal: { color: C.primary, fontSize: 16, fontWeight: '800', fontFamily: 'monospace' },
  trackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: C.primary,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  trackBtnText: { color: C.primary, fontSize: 12, fontWeight: '600' },
});
