import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { C } from '@/lib/colors';

interface CartLine {
  id: string;
  name: string;
  price: number;
  quantity: number;
  supplier: string;
}

const INITIAL_CART: CartLine[] = [
  { id: '1', name: 'Perforator Bosch 800W', price: 145000, quantity: 1, supplier: 'Зочин Буд' },
  { id: '2', name: 'LED Гэрлийн хавтан', price: 15500, quantity: 2, supplier: 'Цахилгаан Хэрэгсэл' },
  { id: '3', name: 'PVC Хоолой 110мм', price: 28000, quantity: 3, supplier: 'Зочин Буд' },
];

function formatPrice(price: number) {
  return '₮' + price.toLocaleString('mn-MN');
}

function groupBySupplier(items: CartLine[]): Record<string, CartLine[]> {
  return items.reduce((acc, item) => {
    if (!acc[item.supplier]) acc[item.supplier] = [];
    acc[item.supplier].push(item);
    return acc;
  }, {} as Record<string, CartLine[]>);
}

export default function CartScreen() {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<CartLine[]>(INITIAL_CART);

  const adjustQty = (id: string, delta: number) => {
    setCartItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item
      )
    );
  };

  const removeItem = (id: string) => {
    Alert.alert('Устгах уу?', 'Энэ бүтээгдэхүүнийг сагснаас хасах уу?', [
      { text: 'Болих', style: 'cancel' },
      {
        text: 'Устгах',
        style: 'destructive',
        onPress: () => setCartItems((prev) => prev.filter((i) => i.id !== id)),
      },
    ]);
  };

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = 5000;
  const total = subtotal + deliveryFee;

  const grouped = groupBySupplier(cartItems);

  if (cartItems.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Сагс</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🛒</Text>
          <Text style={styles.emptyTitle}>Сагс хоосон байна</Text>
          <Text style={styles.emptySubtitle}>Бүтээгдэхүүн нэмж эхлэх</Text>
          <TouchableOpacity
            style={styles.shopBtn}
            onPress={() => router.push('/(tabs)/' as never)}
            activeOpacity={0.85}
          >
            <Text style={styles.shopBtnText}>Дэлгүүрлэх</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Сагс</Text>
        <Text style={styles.headerCount}>{cartItems.length} бараа</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {Object.entries(grouped).map(([supplier, items]) => (
          <View key={supplier} style={styles.supplierGroup}>
            <View style={styles.supplierHeader}>
              <View style={styles.supplierIcon}>
                <Ionicons name="storefront-outline" size={14} color={C.primary} />
              </View>
              <Text style={styles.supplierName}>{supplier}</Text>
              <Text style={styles.supplierCount}>{items.length} бараа</Text>
            </View>

            {items.map((item) => (
              <View key={item.id} style={styles.lineItem}>
                <View style={styles.productImgPlaceholder}>
                  <Ionicons name="cube-outline" size={24} color={C.textTertiary} />
                </View>
                <View style={styles.lineInfo}>
                  <Text style={styles.lineName} numberOfLines={2}>{item.name}</Text>
                  <Text style={styles.linePrice}>{formatPrice(item.price)}</Text>
                  <View style={styles.qtyRow}>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => adjustQty(item.id, -1)}
                    >
                      <Ionicons name="remove" size={16} color={C.text} />
                    </TouchableOpacity>
                    <Text style={styles.qtyText}>{item.quantity}</Text>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => adjustQty(item.id, 1)}
                    >
                      <Ionicons name="add" size={16} color={C.text} />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.lineRight}>
                  <Text style={styles.lineTotal}>{formatPrice(item.price * item.quantity)}</Text>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => removeItem(item.id)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#FF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        ))}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Fixed Bottom Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.priceBreakdown}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Нийт бараа</Text>
            <Text style={styles.priceValue}>{formatPrice(subtotal)}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Хүргэлт</Text>
            <Text style={styles.priceValue}>{formatPrice(deliveryFee)}</Text>
          </View>
          <View style={[styles.priceRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Нийт дүн</Text>
            <Text style={styles.totalValue}>{formatPrice(total)}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.checkoutBtn}
          onPress={() => router.push('/checkout' as never)}
          activeOpacity={0.85}
        >
          <Text style={styles.checkoutBtnText}>Захиалга өгөх</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
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

  scroll: { flex: 1 },
  content: { padding: 16, gap: 16 },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyIcon: { fontSize: 64, marginBottom: 8 },
  emptyTitle: { color: C.text, fontSize: 20, fontWeight: '700' },
  emptySubtitle: { color: C.textSub, fontSize: 14, marginBottom: 24 },
  shopBtn: {
    backgroundColor: C.primary,
    borderRadius: 14,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  shopBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  supplierGroup: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  supplierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: C.surface,
  },
  supplierIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  supplierName: { flex: 1, color: C.text, fontSize: 14, fontWeight: '700' },
  supplierCount: { color: C.textTertiary, fontSize: 12 },

  lineItem: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 10,
    alignItems: 'flex-start',
  },
  productImgPlaceholder: {
    width: 64,
    height: 64,
    backgroundColor: C.surface,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lineInfo: { flex: 1 },
  lineName: { color: C.text, fontSize: 13, fontWeight: '600', marginBottom: 4, lineHeight: 18 },
  linePrice: { color: C.textSub, fontSize: 12, marginBottom: 8 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 0 },
  qtyBtn: {
    width: 30,
    height: 30,
    backgroundColor: C.surface,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  qtyText: {
    color: C.text,
    fontSize: 14,
    fontWeight: '700',
    minWidth: 32,
    textAlign: 'center',
  },
  lineRight: { alignItems: 'flex-end', gap: 8 },
  lineTotal: { color: C.primary, fontSize: 14, fontWeight: '700', fontFamily: 'monospace' },
  deleteBtn: { padding: 4 },

  bottomSpacer: { height: 8 },

  bottomBar: {
    backgroundColor: C.card,
    borderTopWidth: 1,
    borderTopColor: C.border,
    padding: 16,
    paddingBottom: 24,
  },
  priceBreakdown: { gap: 6, marginBottom: 14 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between' },
  priceLabel: { color: C.textSub, fontSize: 13 },
  priceValue: { color: C.text, fontSize: 13 },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 8,
    marginTop: 2,
  },
  totalLabel: { color: C.text, fontSize: 15, fontWeight: '700' },
  totalValue: { color: C.primary, fontSize: 17, fontWeight: '800', fontFamily: 'monospace' },
  checkoutBtn: {
    backgroundColor: C.primary,
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  checkoutBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
