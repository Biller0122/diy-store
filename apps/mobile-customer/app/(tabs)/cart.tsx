import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { C } from '@/lib/colors';
import { SupplierCartItem, useAppStore } from '@/lib/store';
import {
  shopFetch,
  ACTIVE_ORDER_QUERY,
  ADJUST_LINE_MUTATION,
  REMOVE_LINE_MUTATION,
} from '@/lib/api';

interface OrderLine {
  id: string;
  quantity: number;
  linePriceWithTax: number;
  productVariant: {
    id: string;
    name: string;
    priceWithTax: number;
    product: {
      name: string;
      slug: string;
      featuredAsset: { preview: string } | null;
    };
  };
}

interface ActiveOrder {
  id: string;
  code: string;
  state: string;
  subTotal: number;
  total: number;
  lines: OrderLine[];
}

function formatPrice(price: number) {
  return '₮' + Math.round(price / 100).toLocaleString('mn-MN');
}

function formatMajorPrice(price: number) {
  return '₮' + Math.round(price).toLocaleString('mn-MN');
}

function CartLineRow({
  line,
  onAdjust,
  onRemove,
}: {
  line: OrderLine;
  onAdjust: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <View style={styles.lineRow}>
      {line.productVariant.product.featuredAsset?.preview ? (
        <Image
          source={{ uri: line.productVariant.product.featuredAsset.preview }}
          style={styles.lineImage}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.lineImage}>
          <Ionicons name="cube-outline" size={28} color={C.textTertiary} />
        </View>
      )}
      <View style={styles.lineInfo}>
        <Text style={styles.lineName} numberOfLines={2}>
          {line.productVariant.product.name}
        </Text>
        <Text style={styles.lineVariant} numberOfLines={1}>
          {line.productVariant.name}
        </Text>
        <Text style={styles.linePrice}>{formatPrice(line.linePriceWithTax)}</Text>
      </View>
      <View style={styles.lineActions}>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => {
            Alert.alert('Устгах уу?', `${line.productVariant.product.name} сагснаас хасах уу?`, [
              { text: 'Болих', style: 'cancel' },
              { text: 'Устгах', style: 'destructive', onPress: () => onRemove(line.id) },
            ]);
          }}
        >
          <Ionicons name="trash-outline" size={15} color="#FF4444" />
        </TouchableOpacity>
        <View style={styles.qtyRow}>
          <TouchableOpacity
            style={styles.qtyBtn}
            onPress={() => onAdjust(line.id, line.quantity - 1)}
            disabled={line.quantity <= 1}
          >
            <Ionicons name="remove" size={16} color={line.quantity <= 1 ? C.textTertiary : C.text} />
          </TouchableOpacity>
          <Text style={styles.qtyText}>{line.quantity}</Text>
          <TouchableOpacity style={styles.qtyBtn} onPress={() => onAdjust(line.id, line.quantity + 1)}>
            <Ionicons name="add" size={16} color={C.text} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function SupplierLineRow({
  item,
  onAdjust,
  onRemove,
}: {
  item: SupplierCartItem;
  onAdjust: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <View style={styles.lineRow}>
      {item.image ? (
        <Image source={{ uri: item.image }} style={styles.lineImage} resizeMode="cover" />
      ) : (
        <View style={styles.lineImage}>
          <Ionicons name="cube-outline" size={28} color={C.textTertiary} />
        </View>
      )}
      <View style={styles.lineInfo}>
        <Text style={styles.lineName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.lineVariant} numberOfLines={1}>{item.supplierName}</Text>
        <Text style={styles.linePrice}>{formatMajorPrice(item.price * item.qty)}</Text>
      </View>
      <View style={styles.lineActions}>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => onRemove(item.id)}
        >
          <Ionicons name="trash-outline" size={15} color="#FF4444" />
        </TouchableOpacity>
        <View style={styles.qtyRow}>
          <TouchableOpacity
            style={styles.qtyBtn}
            onPress={() => onAdjust(item.id, item.qty - 1)}
            disabled={item.qty <= 1}
          >
            <Ionicons name="remove" size={16} color={item.qty <= 1 ? C.textTertiary : C.text} />
          </TouchableOpacity>
          <Text style={styles.qtyText}>{item.qty}</Text>
          <TouchableOpacity style={styles.qtyBtn} onPress={() => onAdjust(item.id, item.qty + 1)}>
            <Ionicons name="add" size={16} color={C.text} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default function CartScreen() {
  const router = useRouter();
  const { customer, supplierCart, setCartCount, updateSupplierCartQty, removeSupplierCartItem } = useAppStore();
  const [order, setOrder] = useState<ActiveOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);

  const fetchCart = useCallback(async () => {
    try {
      const data = await shopFetch<{ activeOrder: ActiveOrder | null }>(ACTIVE_ORDER_QUERY);
      const o = data.activeOrder;
      setOrder(o);
      setCartCount(o ? o.lines.reduce((s, l) => s + l.quantity, 0) : 0);
    } catch {
      // keep previous state on network error
    } finally {
      setLoading(false);
    }
  }, [setCartCount]);

  useEffect(() => {
    if (customer) {
      fetchCart();
    } else {
      setLoading(false);
    }
  }, [customer, fetchCart]);

  const handleAdjust = async (lineId: string, qty: number) => {
    if (qty < 1) return;
    setMutating(true);
    try {
      await shopFetch(ADJUST_LINE_MUTATION, { orderLineId: lineId, quantity: qty });
      await fetchCart();
    } catch (e) {
      Alert.alert('Алдаа', e instanceof Error ? e.message : 'Тоо өөрчлөх боломжгүй');
    } finally {
      setMutating(false);
    }
  };

  const handleRemove = async (lineId: string) => {
    setMutating(true);
    try {
      await shopFetch(REMOVE_LINE_MUTATION, { orderLineId: lineId });
      await fetchCart();
    } catch (e) {
      Alert.alert('Алдаа', e instanceof Error ? e.message : 'Устгах боломжгүй');
    } finally {
      setMutating(false);
    }
  };

  if (!customer && supplierCart.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Сагс</Text>
        </View>
        <View style={styles.emptyBox}>
          <Text style={styles.emptyIcon}>🛒</Text>
          <Text style={styles.emptyTitle}>Нэвтэрнэ үү</Text>
          <Text style={styles.emptySub}>Сагсаа харахын тулд нэвтэрнэ үү</Text>
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => router.push('/(tabs)/account' as never)}
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
          <Text style={styles.headerTitle}>Сагс</Text>
        </View>
        <View style={styles.emptyBox}>
          <ActivityIndicator color={C.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  const isEmpty = (!order || order.lines.length === 0) && supplierCart.length === 0;

  if (isEmpty) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Сагс</Text>
        </View>
        <View style={styles.emptyBox}>
          <Text style={styles.emptyIcon}>🛒</Text>
          <Text style={styles.emptyTitle}>Сагс хоосон байна</Text>
          <Text style={styles.emptySub}>Бүтээгдэхүүн нэмж эхлэцгээе</Text>
          <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/(tabs)/' as never)}>
            <Text style={styles.loginBtnText}>Дэлгүүр үзэх</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const vendureSubtotal = order?.subTotal ?? 0;
  const supplierSubtotal = supplierCart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const subtotal = vendureSubtotal + supplierSubtotal * 100;
  const shippingAmt = order ? order.total - order.subTotal : 0;
  const total = (order?.total ?? 0) + supplierSubtotal * 100;
  const rows = [
    ...(order?.lines ?? []).map((line) => ({ type: 'order' as const, line })),
    ...supplierCart.map((item) => ({ type: 'supplier' as const, item })),
  ];

  return (
    <View style={styles.flex}>
      <SafeAreaView style={{ backgroundColor: C.bg }} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Сагс</Text>
          <Text style={styles.headerCount}>{rows.length} бараа</Text>
        </View>
      </SafeAreaView>

      {mutating && (
        <View style={styles.mutatingBanner}>
          <ActivityIndicator color={C.primary} size="small" />
          <Text style={styles.mutatingText}>Шинэчилж байна...</Text>
        </View>
      )}

      <FlatList
        data={rows}
        keyExtractor={(item) => item.type === 'order' ? item.line.id : item.item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          item.type === 'order'
            ? <CartLineRow line={item.line} onAdjust={handleAdjust} onRemove={handleRemove} />
            : (
              <SupplierLineRow
                item={item.item}
                onAdjust={updateSupplierCartQty}
                onRemove={removeSupplierCartItem}
              />
            )
        )}
        ListFooterComponent={
          <View style={styles.summary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Дэд нийт</Text>
              <Text style={styles.summaryValue}>{formatPrice(subtotal)}</Text>
            </View>
            {shippingAmt > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Хүргэлт</Text>
                <Text style={styles.summaryValue}>{formatPrice(shippingAmt)}</Text>
              </View>
            )}
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Нийт дүн</Text>
              <Text style={styles.totalValue}>{formatPrice(total)}</Text>
            </View>
          </View>
        }
      />

      <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
        <View style={styles.bottomInner}>
          <View>
            <Text style={styles.bottomLabel}>Нийт</Text>
            <Text style={styles.bottomTotal}>{formatPrice(total)}</Text>
          </View>
          <TouchableOpacity
            style={styles.checkoutBtn}
            onPress={() => router.push('/checkout' as never)}
            activeOpacity={0.85}
          >
            <Text style={styles.checkoutBtnText}>Захиалах</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: C.bg },
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

  emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 32 },
  emptyIcon: { fontSize: 56, marginBottom: 8 },
  emptyTitle: { color: C.text, fontSize: 18, fontWeight: '700' },
  emptySub: { color: C.textSub, fontSize: 14, textAlign: 'center', marginBottom: 16 },
  loginBtn: {
    backgroundColor: C.primary,
    borderRadius: 14,
    paddingHorizontal: 36,
    paddingVertical: 13,
  },
  loginBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  mutatingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 6,
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  mutatingText: { color: C.textSub, fontSize: 12 },

  listContent: { padding: 16, gap: 12 },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 12,
    gap: 12,
  },
  lineImage: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lineInfo: { flex: 1, gap: 3 },
  lineName: { color: C.text, fontSize: 13, fontWeight: '600', lineHeight: 18 },
  lineVariant: { color: C.textSub, fontSize: 11 },
  linePrice: { color: C.primary, fontSize: 14, fontWeight: '700', fontFamily: 'monospace', marginTop: 2 },
  lineActions: { alignItems: 'flex-end', gap: 8 },
  deleteBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,68,68,0.1)',
    borderRadius: 8,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  qtyBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  qtyText: { color: C.text, fontSize: 13, fontWeight: '700', minWidth: 28, textAlign: 'center' },

  summary: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    gap: 10,
    marginBottom: 8,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { color: C.textSub, fontSize: 14 },
  summaryValue: { color: C.text, fontSize: 14 },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 10,
    marginTop: 4,
  },
  totalLabel: { color: C.text, fontSize: 16, fontWeight: '700' },
  totalValue: { color: C.primary, fontSize: 18, fontWeight: '800', fontFamily: 'monospace' },

  bottomBar: {
    backgroundColor: C.card,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  bottomInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  bottomLabel: { color: C.textTertiary, fontSize: 11, marginBottom: 2 },
  bottomTotal: { color: C.primary, fontSize: 20, fontWeight: '800', fontFamily: 'monospace' },
  checkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.primary,
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  checkoutBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
