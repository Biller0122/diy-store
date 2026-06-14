import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SupplierProduct } from '@/lib/types';
import { SUPPLIER_PRODUCTS_QUERY, UPDATE_SUPPLIER_PRODUCT_MUTATION, shopFetch } from '@/lib/api';
import { useSupplierStore } from '@/lib/store';

const C = {
  bg: '#08080E',
  card: '#0F0F1A',
  surface: '#161625',
  primary: '#FF4500',
  success: '#00D4AA',
  red: '#EF4444',
  border: 'rgba(255,255,255,0.06)',
  text: '#F5F5FF',
  textSub: '#8888AA',
  textTertiary: '#55556A',
};

function formatPrice(cents: number) {
  return '₮' + Math.round(cents / 100).toLocaleString('mn-MN');
}

export default function ProductsScreen() {
  const router = useRouter();
  const supplier = useSupplierStore((s) => s.supplier);
  const token = useSupplierStore((s) => s.token);
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<SupplierProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await shopFetch<{ supplierProducts: { items: SupplierProduct[] } }>(
        SUPPLIER_PRODUCTS_QUERY,
        { supplierId: supplier?.id },
      );
      setProducts(data.supplierProducts.items);
    } catch (err) {
      setProducts([]);
      setError(err instanceof Error ? err.message : 'Бараа татахад алдаа гарлаа');
    } finally {
      setLoading(false);
    }
  }, [supplier?.id]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  useFocusEffect(
    useCallback(() => {
      void loadProducts();
    }, [loadProducts]),
  );

  const filtered = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  const toggleEnabled = async (product: SupplierProduct) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const enabled = !product.enabled;
    setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, enabled } : p)));
    try {
      await shopFetch(UPDATE_SUPPLIER_PRODUCT_MUTATION, { id: product.id, input: { enabled } }, token);
    } catch (err) {
      console.error('supplier product toggle failed', err);
      setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, enabled: product.enabled } : p)));
      Alert.alert('Алдаа', 'Барааны төлөв хадгалагдсангүй. Дахин оролдоно уу.');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Бүтээгдэхүүн</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/product/new')} activeOpacity={0.85}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={16} color={C.textTertiary} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Бүтээгдэхүүн хайх..."
          placeholderTextColor={C.textTertiary}
        />
        {loading ? <ActivityIndicator size="small" color={C.primary} /> : null}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {filtered.length === 0 && !loading ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{error ? 'Бараа ачаалж чадсангүй' : 'Бүтээгдэхүүн олдсонгүй'}</Text>
          </View>
        ) : null}

        {filtered.map((product, index) => {
          const inStock = product.stock > 0;
          const color = ['#FF4500', '#00D4AA', '#3B82F6', '#FFB547'][index % 4];
          return (
            <TouchableOpacity
              key={product.id}
              style={styles.row}
              onPress={() => router.push({ pathname: '/product/[id]', params: { id: product.id } })}
              activeOpacity={0.75}
            >
              <View style={[styles.imgPlaceholder, { backgroundColor: color + '22' }]}>
                {product.image ? (
                  <Image source={{ uri: product.image }} style={styles.productImage} />
                ) : (
                  <Ionicons name="cube-outline" size={24} color={color} />
                )}
              </View>

              <View style={styles.info}>
                <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
                <Text style={styles.variantCount}>{product.stock} ширхэг</Text>
                <View style={[styles.stockBadge, {
                  backgroundColor: inStock ? 'rgba(0,212,170,0.12)' : 'rgba(239,68,68,0.12)',
                  borderColor: inStock ? 'rgba(0,212,170,0.25)' : 'rgba(239,68,68,0.25)',
                }]}>
                  <Text style={[styles.stockText, { color: inStock ? C.success : C.red }]}>
                    {inStock ? 'Байгаа' : 'Дууссан'}
                  </Text>
                </View>
              </View>

              <View style={styles.right}>
                <Text style={styles.price}>{formatPrice(product.price)}</Text>
                <Switch
                  value={product.enabled}
                  onValueChange={() => toggleEnabled(product)}
                  trackColor={{ false: C.surface, true: C.primary + '55' }}
                  thumbColor={product.enabled ? C.primary : C.textTertiary}
                  ios_backgroundColor={C.surface}
                  style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
                />
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => router.push('/product/new')} activeOpacity={0.85}>
        <Ionicons name="add-outline" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  title: { color: C.text, fontSize: 22, fontWeight: '800' },
  addBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: 12, marginHorizontal: 20, marginBottom: 8, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: C.border, gap: 8 },
  searchInput: { flex: 1, color: C.text, fontSize: 14, padding: 0 },
  error: { marginHorizontal: 20, marginBottom: 8, color: C.red, fontSize: 12 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 100 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 12, marginBottom: 8, gap: 12 },
  imgPlaceholder: { width: 56, height: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' },
  productImage: { width: 56, height: 56 },
  info: { flex: 1, gap: 4 },
  productName: { color: C.text, fontSize: 14, fontWeight: '600' },
  variantCount: { color: C.textTertiary, fontSize: 12 },
  stockBadge: { borderRadius: 99, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' },
  stockText: { fontSize: 11, fontWeight: '600' },
  right: { alignItems: 'flex-end', gap: 4, flexShrink: 0 },
  price: { color: C.text, fontWeight: '700', fontSize: 14 },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', shadowColor: C.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 14, elevation: 10 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: C.textTertiary, fontSize: 15 },
});
