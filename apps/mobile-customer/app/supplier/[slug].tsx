import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { C } from '@/lib/colors';
import { shopFetch, SUPPLIER_BY_SLUG_QUERY, SUPPLIER_PRODUCTS_QUERY } from '@/lib/api';
import { encodeRoutePart, mapSupplierProduct, MarketplaceProduct } from '@/lib/marketplace';
import { ProductTile } from '@/components/MarketplaceCards';

type SupplierDetail = {
  id: string;
  businessName: string;
  slug: string;
  description?: string | null;
  district?: string | null;
  rating: number;
  reviewCount: number;
  productCount: number;
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
};

export default function SupplierScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [supplier, setSupplier] = useState<SupplierDetail | null>(null);
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    const decodedSlug = safeDecode(String(slug));
    setLoading(true);
    shopFetch<{ supplierBySlug: SupplierDetail | null }>(SUPPLIER_BY_SLUG_QUERY, { slug: decodedSlug })
      .then(async (data) => {
        const nextSupplier = data.supplierBySlug;
        setSupplier(nextSupplier);
        if (!nextSupplier) {
          setProducts([]);
          return;
        }
        const productData = await shopFetch<{ supplierProducts: { items: any[] } }>(
          SUPPLIER_PRODUCTS_QUERY,
          { supplierId: nextSupplier.id },
        );
        setProducts((productData.supplierProducts?.items ?? []).map((item, index) => mapSupplierProduct({
          ...item,
          supplierName: nextSupplier.businessName,
        }, index)));
      })
      .catch(() => {
        setSupplier(null);
        setProducts([]);
      })
      .finally(() => setLoading(false));
  }, [slug]);

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
          <Text style={styles.navTitle} numberOfLines={1}>{supplier.businessName}</Text>
          <View style={{ width: 38 }} />
        </View>
      </SafeAreaView>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroAvatar}>
            <Text style={styles.heroAvatarText}>{supplier.businessName.charAt(0)}</Text>
          </View>
          <Text style={styles.heroName}>{supplier.businessName}</Text>
          <Text style={styles.heroCategory}>{supplier.district || 'Улаанбаатар'}</Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Ionicons name="star" size={14} color={C.warning} />
              <Text style={styles.heroStatText}>{(supplier.rating || 0).toFixed(1)}</Text>
            </View>
            <View style={styles.heroDot} />
            <View style={styles.heroStat}>
              <Ionicons name="time-outline" size={14} color={C.textSub} />
              <Text style={styles.heroStatText}>{supplier.deliveryEnabled ? '30-60 мин' : 'Pickup'}</Text>
            </View>
            <View style={styles.heroDot} />
            <View style={styles.heroStat}>
              <Ionicons name="cart-outline" size={14} color={C.textSub} />
              <Text style={styles.heroStatText}>{supplier.productCount} бараа</Text>
            </View>
          </View>
          <Text style={styles.heroDesc}>{supplier.description || `${supplier.businessName} нийлүүлэгчийн дэлгүүр`}</Text>
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
                <ProductTile
                  key={product.id}
                  product={product}
                  wide
                  onPress={() => router.push(`/product/${encodeRoutePart(product.slug)}` as never)}
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

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
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
});
