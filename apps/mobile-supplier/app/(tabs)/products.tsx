import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SupplierProduct } from '@/lib/types';

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

const PLACEHOLDER_COLORS = [
  '#FF4500', '#00D4AA', '#3B82F6', '#FFB547', '#8B5CF6',
  '#EF4444', '#06B6D4', '#84CC16', '#F97316', '#EC4899',
];

const MOCK_PRODUCTS: SupplierProduct[] = [
  {
    id: '1',
    name: 'Нийлүүлэгч багаж иж бүрдэл',
    slug: 'tool-set',
    enabled: true,
    variants: [{ id: 'v1', price: 12500_00, stockLevel: '15' }],
  },
  {
    id: '2',
    name: 'Боолт M8 урт',
    slug: 'bolt-m8',
    enabled: true,
    variants: [{ id: 'v2', price: 250_00, stockLevel: '0' }],
  },
  {
    id: '3',
    name: 'Цахилгаан кабель 2.5мм',
    slug: 'cable-2-5',
    enabled: true,
    variants: [{ id: 'v3', price: 3200_00, stockLevel: '50' }],
  },
  {
    id: '4',
    name: 'Будгийн сойз иж бүрдэл',
    slug: 'brush-set',
    enabled: false,
    variants: [{ id: 'v4', price: 1800_00, stockLevel: '8' }],
  },
  {
    id: '5',
    name: 'Перфоратор 800W',
    slug: 'perforator-800w',
    enabled: true,
    variants: [
      { id: 'v5a', price: 145000_00, stockLevel: '3' },
      { id: 'v5b', price: 165000_00, stockLevel: '1' },
    ],
  },
  {
    id: '6',
    name: 'Гар хусуур набор',
    slug: 'scraper-set',
    enabled: true,
    variants: [{ id: 'v6', price: 4500_00, stockLevel: '22' }],
  },
  {
    id: '7',
    name: 'Лакафарба 5л',
    slug: 'paint-5l',
    enabled: true,
    variants: [
      { id: 'v7a', price: 28000_00, stockLevel: '0' },
      { id: 'v7b', price: 31000_00, stockLevel: '6' },
    ],
  },
  {
    id: '8',
    name: 'Цементний уут 50кг',
    slug: 'cement-50kg',
    enabled: false,
    variants: [{ id: 'v8', price: 18500_00, stockLevel: '0' }],
  },
  {
    id: '9',
    name: 'Резин хоолой 3/4"',
    slug: 'rubber-hose',
    enabled: true,
    variants: [{ id: 'v9', price: 5600_00, stockLevel: '14' }],
  },
  {
    id: '10',
    name: 'Цоолтуур иж бүрдэл',
    slug: 'drill-set',
    enabled: true,
    variants: [{ id: 'v10', price: 9800_00, stockLevel: '7' }],
  },
];

function formatPrice(cents: number) {
  return '₮' + (cents / 100).toLocaleString('mn-MN');
}

function hasStock(product: SupplierProduct): boolean {
  return product.variants.some((v) => parseInt(v.stockLevel, 10) > 0);
}

function getMinPrice(product: SupplierProduct): number {
  if (product.variants.length === 0) return 0;
  return Math.min(...product.variants.map((v) => v.price));
}

export default function ProductsScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<SupplierProduct[]>(MOCK_PRODUCTS);

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  );

  const toggleEnabled = async (id: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p)),
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Бүтээгдэхүүн</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/product/new')}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={16} color={C.textTertiary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Бүтээгдэхүүн хайх..."
          placeholderTextColor={C.textTertiary}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={C.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {filtered.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Бүтээгдэхүүн олдсонгүй</Text>
          </View>
        )}
        {filtered.map((product, index) => {
          const color = PLACEHOLDER_COLORS[index % PLACEHOLDER_COLORS.length];
          const inStock = hasStock(product);
          const price = getMinPrice(product);

          return (
            <TouchableOpacity
              key={product.id}
              style={styles.row}
              onPress={() => router.push({ pathname: '/product/[id]', params: { id: product.id } })}
              activeOpacity={0.75}
            >
              {/* Image placeholder */}
              <View style={[styles.imgPlaceholder, { backgroundColor: color + '22' }]}>
                <Ionicons name="cube-outline" size={24} color={color} />
              </View>

              {/* Info */}
              <View style={styles.info}>
                <Text style={styles.productName} numberOfLines={1}>
                  {product.name}
                </Text>
                <Text style={styles.variantCount}>
                  {product.variants.length} хувилбар
                </Text>
                <View
                  style={[
                    styles.stockBadge,
                    {
                      backgroundColor: inStock
                        ? 'rgba(0,212,170,0.12)'
                        : 'rgba(239,68,68,0.12)',
                      borderColor: inStock
                        ? 'rgba(0,212,170,0.25)'
                        : 'rgba(239,68,68,0.25)',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.stockText,
                      { color: inStock ? C.success : C.red },
                    ]}
                  >
                    {inStock ? 'Байгаа' : 'Дууссан'}
                  </Text>
                </View>
              </View>

              {/* Price + toggle */}
              <View style={styles.right}>
                <Text style={styles.price}>{formatPrice(price)}</Text>
                <Switch
                  value={product.enabled}
                  onValueChange={() => toggleEnabled(product.id)}
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

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/product/new')}
        activeOpacity={0.85}
      >
        <Ionicons name="add-outline" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: {
    color: C.text,
    fontSize: 22,
    fontWeight: '800',
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: C.border,
    gap: 8,
  },
  searchIcon: { marginRight: 2 },
  searchInput: {
    flex: 1,
    color: C.text,
    fontSize: 14,
    padding: 0,
  },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 100 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  imgPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  productName: {
    color: C.text,
    fontSize: 14,
    fontWeight: '600',
  },
  variantCount: {
    color: C.textTertiary,
    fontSize: 12,
  },
  stockBadge: {
    borderRadius: 99,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  stockText: {
    fontSize: 11,
    fontWeight: '600',
  },
  right: {
    alignItems: 'flex-end',
    gap: 4,
    flexShrink: 0,
  },
  price: {
    color: C.text,
    fontWeight: '700',
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 10,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    color: C.textTertiary,
    fontSize: 15,
  },
});
