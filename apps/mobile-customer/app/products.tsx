import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { C } from '@/lib/colors';
import { COLLECTIONS_QUERY, SEARCH_QUERY, shopFetch, SUPPLIER_PRODUCTS_QUERY } from '@/lib/api';
import {
  encodeRoutePart,
  mapSearchProduct,
  mapSupplierProduct,
  MarketplaceCategory,
  MarketplaceProduct,
  supplierProductMatchesCategory,
} from '@/lib/marketplace';
import { ProductTile } from '@/components/MarketplaceCards';

type ProductWithCategory = MarketplaceProduct & {
  category?: string | null;
  source?: 'supplier' | 'catalog';
};

type ProductSection = {
  title: string;
  products: ProductWithCategory[];
};

export default function ProductsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  const mode = params.mode === 'sale' ? 'sale' : 'new';
  const [products, setProducts] = useState<ProductWithCategory[]>([]);
  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      shopFetch<{ collections: { items: any[] } }>(COLLECTIONS_QUERY, {
        options: { take: 60, topLevelOnly: true, sort: { position: 'ASC' } },
      }),
      shopFetch<{ search: { items: any[]; totalItems: number } }>(SEARCH_QUERY, {
        input: { take: 80, sort: { name: 'ASC' } },
      }),
      shopFetch<{ supplierProducts: { items: any[]; total: number } }>(SUPPLIER_PRODUCTS_QUERY),
    ])
      .then(([collectionData, catalogData, supplierProductData]) => {
        const nextCategories = (collectionData.collections?.items ?? [])
          .filter((item) => item.slug !== '__root_collection__')
          .map((item, index) => ({
            id: item.id,
            name: item.name,
            slug: item.slug,
            icon: item.customFields?.icon ?? '📦',
            productCount: item.productVariants?.totalItems ?? 0,
          }));
        const supplierProducts = (supplierProductData.supplierProducts?.items ?? [])
          .filter((item) => item.enabled !== false)
          .map((item, index) => ({
            ...mapSupplierProduct(item, index),
            category: item.category,
            source: 'supplier' as const,
          }));
        const catalogProducts = (catalogData.search?.items ?? []).map((item, index) => ({
          ...mapSearchProduct(item, index),
          source: 'catalog' as const,
        }));
        setCategories(nextCategories);
        setProducts([...supplierProducts, ...catalogProducts]);
      })
      .catch(() => {
        setCategories([]);
        setProducts([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const visibleProducts = useMemo(() => {
    if (mode === 'sale') {
      return products
        .filter((product) => product.originalPrice && product.originalPrice > product.price)
        .map((product) => ({ ...product, badge: 'ХЯМДРАЛ' as const }));
    }
    return products.map((product, index) => ({
      ...product,
      badge: index === 0 ? ('ТОП' as const) : index < 8 ? ('ШИНЭ' as const) : product.badge,
    }));
  }, [mode, products]);

  const sections = useMemo(() => groupProducts(visibleProducts, categories), [categories, visibleProducts]);
  const title = mode === 'sale' ? 'Хямдралтай бараа' : 'Шинэ бараа';
  const subtitle = mode === 'sale' ? 'Хямдралтай бүтээгдэхүүнүүдийг төрлөөр ангиллаа' : 'Сүүлд нэмэгдсэн бүтээгдэхүүнүүдийг төрлөөр ангиллаа';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={C.primary} />
          <Text style={styles.centerText}>Бараа ачаалж байна...</Text>
        </View>
      ) : sections.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="cube-outline" size={44} color={C.textTertiary} />
          <Text style={styles.centerText}>Энэ жагсаалтад бараа алга байна</Text>
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {sections.map((section) => (
            <View key={section.title} style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <Text style={styles.sectionCount}>{section.products.length.toLocaleString('mn-MN')} бараа</Text>
              </View>
              <View style={styles.productGrid}>
                {section.products.map((product) => (
                  <ProductTile
                    key={`${product.source}-${product.variantId}`}
                    product={product}
                    wide
                    onPress={() => router.push(`/product/${encodeRoutePart(product.slug)}` as never)}
                  />
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function groupProducts(products: ProductWithCategory[], categories: MarketplaceCategory[]): ProductSection[] {
  const used = new Set<string>();
  const sections: ProductSection[] = [];

  for (const category of categories) {
    const categoryProducts = products.filter((product) => {
      if (product.source !== 'supplier' || used.has(product.variantId)) return false;
      return supplierProductMatchesCategory(product, category, true);
    });
    if (categoryProducts.length > 0) {
      categoryProducts.forEach((product) => used.add(product.variantId));
      sections.push({ title: category.name, products: categoryProducts });
    }
  }

  const remaining = products.filter((product) => !used.has(product.variantId));
  if (remaining.length > 0) {
    sections.push({ title: 'Бусад бараа', products: remaining });
  }

  return sections;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: C.text, fontSize: 24, fontWeight: '900' },
  subtitle: { color: C.textSub, fontSize: 12, marginTop: 2, lineHeight: 17 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 32 },
  centerText: { color: C.textSub, fontSize: 14, textAlign: 'center' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 30 },
  section: { marginBottom: 26 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, marginBottom: 12 },
  sectionTitle: { flex: 1, color: C.text, fontSize: 20, fontWeight: '900', lineHeight: 25 },
  sectionCount: { color: C.textTertiary, fontSize: 11, fontWeight: '700' },
  productGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
});
