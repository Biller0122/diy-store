import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '@/lib/store';
import { C } from '@/lib/colors';

type OrderStatus = 'Хүлээгдэж буй' | 'Хүргэгдлээ' | 'Цуцлагдсан' | 'Хүргэлтэнд гарсан';

interface MockOrder {
  id: string;
  code: string;
  date: string;
  status: OrderStatus;
  total: number;
  items: string[];
}

const MOCK_ORDERS: MockOrder[] = [
  {
    id: '1',
    code: 'DIY-2025-00142',
    date: '2025-05-26',
    status: 'Хүргэгдлээ',
    total: 188000,
    items: ['Perforator Bosch 800W', 'LED Гэрлийн хавтан'],
  },
  {
    id: '2',
    code: 'DIY-2025-00139',
    date: '2025-05-24',
    status: 'Хүлээгдэж буй',
    total: 42000,
    items: ['Цемент М400 50кг'],
  },
  {
    id: '3',
    code: 'DIY-2025-00128',
    date: '2025-05-20',
    status: 'Хүргэлтэнд гарсан',
    total: 84000,
    items: ['PVC Хоолой 110мм', 'Боолт M10x50'],
  },
  {
    id: '4',
    code: 'DIY-2025-00115',
    date: '2025-05-15',
    status: 'Цуцлагдсан',
    total: 68000,
    items: ['Гар дрель 12В'],
  },
  {
    id: '5',
    code: 'DIY-2025-00098',
    date: '2025-05-10',
    status: 'Хүргэгдлээ',
    total: 57500,
    items: ['Будаг цагаан 4л', 'Мод самбар 2x4'],
  },
];

const STATUS_STYLES: Record<OrderStatus, { bg: string; color: string }> = {
  'Хүлээгдэж буй': { bg: 'rgba(255,181,71,0.15)', color: '#FFB547' },
  'Хүргэгдлээ': { bg: 'rgba(0,212,170,0.15)', color: '#00D4AA' },
  'Цуцлагдсан': { bg: 'rgba(255,68,68,0.15)', color: '#FF4444' },
  'Хүргэлтэнд гарсан': { bg: 'rgba(100,130,255,0.15)', color: '#6482FF' },
};

function formatPrice(price: number) {
  return '₮' + price.toLocaleString('mn-MN');
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

function OrderCard({ order, onTrack }: { order: MockOrder; onTrack: () => void }) {
  const statusStyle = STATUS_STYLES[order.status];
  return (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <Text style={styles.orderCode}>{order.code}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
          <Text style={[styles.statusText, { color: statusStyle.color }]}>{order.status}</Text>
        </View>
      </View>
      <Text style={styles.orderDate}>{formatDate(order.date)}</Text>
      <View style={styles.itemsPreview}>
        {order.items.map((item, i) => (
          <Text key={i} style={styles.itemName} numberOfLines={1}>
            • {item}
          </Text>
        ))}
      </View>
      <View style={styles.orderFooter}>
        <Text style={styles.orderTotal}>{formatPrice(order.total)}</Text>
        {order.status === 'Хүргэлтэнд гарсан' && (
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

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Захиалгууд</Text>
        <Text style={styles.headerCount}>{MOCK_ORDERS.length} захиалга</Text>
      </View>
      <FlatList
        data={MOCK_ORDERS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <OrderCard
            order={item}
            onTrack={() => router.push(`/track/${item.id}` as never)}
          />
        )}
      />
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
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  statusText: { fontSize: 11, fontWeight: '700' },
  orderDate: { color: C.textTertiary, fontSize: 12, marginBottom: 10 },
  itemsPreview: { gap: 2, marginBottom: 12 },
  itemName: { color: C.textSub, fontSize: 12 },
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
