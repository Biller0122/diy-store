import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { C } from '@/lib/colors';
import { shopFetch, PRODUCTS_QUERY } from '@/lib/api';

interface Product {
  id: string;
  name: string;
  slug: string;
  featuredAsset: { preview: string } | null;
  variants: { id: string; priceWithTax: number; currencyCode: string; stockLevel: string }[];
}

const MOCK_SUPPLIERS: Record<string, { name: string; description: string; rating: number; deliveryTime: string; minOrder: number; category: string }> = {
  'zochin-bud': {
    name: 'Зочин Буд',
    description: 'Барилгын материал, засал чимэглэлийн бүтээгдэхүүн. 2010 оноос эхлэн үйл ажиллагаа явуулж байна.',
    rating: 4.8,
    deliveryTime: '20-30 мин',
    minOrder: 10000,
    category: 'Барилгын материал',
  },
  'mod-material': {
    name: 'Мод Материал',
    description: 'Мод, хавтан болон цагаан тугалга зэрэг барилгын материалын томоохон постачлагч.',
    rating: 4.6,
    deliveryTime: '30-45 мин',
    minOrder: 20000,
    category: 'Мод материал',
  },
  'tsahilgaan': {
    name: 'Цахилгаан Хэрэгсэл',
    description: 'Цахилгааны хэрэгсэл, кабель, гэрлийн тоноглол, LED бүтээгдэхүүн.',
    rating: 4.9,
    deliveryTime: '15-25 мин',
    minOrder: 5000,
    category: 'Цахилгааны хэрэгсэл',
  },
  'barilagiin': {
    name: 'Барилгын Материал',
    description: 'Цемент, тоосго, элс, дам нурууны материал болон барилгын бүх төрлийн хэрэглэгдэхүүн.',
    rating: 4.5,
    deliveryTime: '45-60 мин',
    minOrder: 50000,
    category: 'Барилгын материал',
  },
};

function formatPrice(price: number) {
  return '₮' + Math.round(price / 100).toLocaleString('mn-MN');
}

function ProductCard({ product, onPress }: { product: Product; onPress: () => void }) {
  const variant = product.variants[0];
  const price = variant?.priceWithTax ?? 0;
  return (
    <TouchableOpacity style={styles.productCard} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.productImage}>
        <Ionicons name="cube-outline" size={32} color={C.textTertiary} />
      </View>
      <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
      <Text style={styles.productPrice}>{formatPrice(price)}</Text>
    </TouchableOpacity>
  );
}

export default function SupplierScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const supplier = slug ? MOCK_SUPPLIERS[slug] : null;

  useEffect(() => {
    shopFetch<{ products: { items: Product[] } }>(PRODUCTS_QUERY, { options: { take: 20 } })
      .then((d) => setProducts(d.products?.items ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (!supplier) {
    return (
      <View style={styles.container}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
          <View style={styles.navHeader}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={22} color={C.text} />
            </TouchableOpacity>
            <Text style={styles.navTitle}>Нийлүүлэгч</Text>
            <View style={{ width: 38 }} />
          </View>
        </SafeAreaView>
        <View style={styles.centeredBox}>
          <Text style={styles.notFoundText}>Нийлүүлэгч олдсонгүй</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
        <View style={styles.navHeader}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={C.text} />
          </TouchableOpacity>
          <Text style={styles.navTitle} numberOfLines={1}>{supplier.name}</Text>
          <View style={{ width: 38 }} />
        </View>
      </SafeAreaView>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroAvatar}>
            <Text style={styles.heroAvatarText}>{supplier.name.charAt(0)}</Text>
          </View>
          <Text style={styles.heroName}>{supplier.name}</Text>
          <Text style={styles.heroCategory}>{supplier.category}</Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Ionicons name="star" size={14} color={C.warning} />
              <Text style={styles.heroStatText}>{supplier.rating}</Text>
            </View>
            <View style={styles.heroDot} />
            <View style={styles.heroStat}>
              <Ionicons name="time-outline" size={14} color={C.textSub} />
              <Text style={styles.heroStatText}>{supplier.deliveryTime}</Text>
            </View>
            <View style={styles.heroDot} />
            <View style={styles.heroStat}>
              <Ionicons name="cart-outline" size={14} color={C.textSub} />
              <Text style={styles.heroStatText}>min ₮{(supplier.minOrder / 1000).toFixed(0)}K</Text>
            </View>
          </View>
          <Text style={styles.heroDesc}>{supplier.description}</Text>
        </View>

        {/* Products */}
        <View style={styles.productsSection}>
          <Text style={styles.productsTitle}>Бүтээгдэхүүн</Text>
          {loading ? (
            <ActivityIndicator color={C.primary} style={{ marginTop: 24 }} />
          ) : products.length === 0 ? (
            <View style={styles.centeredBox}>
              <Text style={styles.notFoundText}>Бүтээгдэхүүн байхгүй байна</Text>
            </View>
          ) : (
            <View style={styles.productsGrid}>
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onPress={() => router.push(`/product/${product.slug}` as never)}
                />
              ))}
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  navTitle: { flex: 1, color: C.text, fontSize: 16, fontWeight: '700', textAlign: 'center' },

  centeredBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
  notFoundText: { color: C.textSub, fontSize: 16 },

  scroll: { flex: 1 },

  hero: {
    alignItems: 'center',
    padding: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 8,
  },
  heroAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  heroAvatarText: { color: '#fff', fontSize: 32, fontWeight: '800' },
  heroName: { color: C.text, fontSize: 22, fontWeight: '800' },
  heroCategory: {
    color: C.textSub,
    fontSize: 13,
    backgroundColor: C.surface,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: C.border,
  },
  heroStats: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  heroStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  heroStatText: { color: C.textSub, fontSize: 13 },
  heroDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: C.textTertiary },
  heroDesc: { color: C.textSub, fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 4 },

  productsSection: { padding: 16 },
  productsTitle: { color: C.text, fontSize: 18, fontWeight: '700', marginBottom: 16 },
  productsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  productCard: {
    width: '47%',
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  productImage: {
    height: 110,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productName: {
    color: C.text,
    fontSize: 12,
    fontWeight: '600',
    padding: 10,
    paddingBottom: 4,
    lineHeight: 17,
  },
  productPrice: {
    color: C.primary,
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'monospace',
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
});
