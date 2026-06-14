import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type ThemeColors } from '@/lib/theme';
import { COLLECTION_BY_SLUG_QUERY, SEARCH_QUERY, shopFetch, SUPPLIER_PRODUCTS_QUERY } from '@/lib/api';
import { encodeRoutePart, mapSearchProduct, mapSupplierProduct, MarketplaceProduct, supplierProductMatchesCategory } from '@/lib/marketplace';
import { ProductTile } from '@/components/MarketplaceCards';

type CollectionDetail = {
  id: string;
  name: string;
  slug: string;
  customFields?: { icon?: string | null } | null;
  children?: Array<{ id: string; name: string; slug: string }>;
};

export default function CategoryScreen() {
  const router = useRouter();
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [collection, setCollection] = useState<CollectionDetail | null>(null);

  useEffect(() => {
    if (!slug) return;
    const decodedSlug = safeDecode(String(slug));
    setLoading(true);
    Promise.all([
      shopFetch<{ collection: CollectionDetail | null }>(COLLECTION_BY_SLUG_QUERY, { slug: decodedSlug }),
      shopFetch<{ search: { items: any[]; totalItems: number } }>(SEARCH_QUERY, {
        input: { collectionSlug: decodedSlug, take: 40 },
      }),
      shopFetch<{ supplierProducts: { items: any[]; total: number } }>(SUPPLIER_PRODUCTS_QUERY),
    ])
      .then(([collectionData, catalogData, supplierProductData]) => {
        const nextCollection = collectionData.collection;
        setCollection(nextCollection);
        const categoryForMatch = nextCollection ?? { slug: decodedSlug };
        const supplierProducts = (supplierProductData.supplierProducts?.items ?? [])
          .filter((item) => item.enabled !== false && supplierProductMatchesCategory(item, categoryForMatch, true))
          .map(mapSupplierProduct);
        const catalogProducts = (catalogData.search?.items ?? []).map(mapSearchProduct);
        setProducts([...supplierProducts, ...catalogProducts]);
        setTotalItems(supplierProducts.length + (catalogData.search?.totalItems ?? 0));
      })
      .catch(() => {
        setCollection(null);
        setProducts([]);
        setTotalItems(0);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>{collection?.name ?? safeDecode(String(slug))}</Text>
          <Text style={styles.subtitle}>{totalItems.toLocaleString('mn-MN')} бүтээгдэхүүн</Text>
        </View>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.push('/(tabs)/search' as never)}>
          <Ionicons name="search-outline" size={20} color={C.text} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={C.primary} />
          <Text style={styles.centerText}>Ангиллын бараа ачаалж байна...</Text>
        </View>
      ) : products.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="cube-outline" size={44} color={C.textTertiary} />
          <Text style={styles.centerText}>Энэ ангилалд бараа алга байна</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.variantId}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <ProductTile product={item} wide onPress={() => router.push(`/product/${encodeRoutePart(item.slug)}` as never)} />
          )}
        />
      )}
    </SafeAreaView>
  );
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

const makeStyles = (C: ThemeColors) => StyleSheet.create({
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
  title: { color: C.text, fontSize: 18, fontWeight: '900', textTransform: 'capitalize' },
  subtitle: { color: C.textSub, fontSize: 12, marginTop: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 32 },
  centerText: { color: C.textSub, fontSize: 14, textAlign: 'center' },
  list: { padding: 12, paddingBottom: 24 },
  columnWrapper: { gap: 12, marginBottom: 12 },
});
