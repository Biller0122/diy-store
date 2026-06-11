import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Linking, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { C } from '@/lib/colors';
import { COLLECTIONS_QUERY, HOMEPAGE_BANNERS_QUERY, SEARCH_QUERY, shopFetch, SUPPLIERS_QUERY, SUPPLIER_PRODUCTS_QUERY } from '@/lib/api';
import {
  CATEGORY_ICONS,
  encodeRoutePart,
  HomepageBanner,
  HOW_IT_WORKS,
  mapSearchProduct,
  mapSupplier,
  mapSupplierProduct,
  MarketplaceCategory,
  MarketplaceProduct,
  MarketplaceSupplier,
  supplierProductMatchesCategory,
} from '@/lib/marketplace';
import { CategoryTile, ProductTile, RemoteImage, SectionHeading, SupplierTile } from '@/components/MarketplaceCards';

type HomeData = {
  suppliers: MarketplaceSupplier[];
  categories: MarketplaceCategory[];
  products: MarketplaceProduct[];
  banners: HomepageBanner[];
  supplierTotal: number;
  productTotal: number;
};

const TRUST_ITEMS = [
  { icon: 'flash-outline', label: 'Хурдан хүргэлт' },
  { icon: 'shield-checkmark-outline', label: 'Баталгаат чанар' },
  { icon: 'swap-horizontal-outline', label: 'Буцаалт' },
  { icon: 'storefront-outline', label: 'Дэлгүүрээс авах' },
] as const;

const WEB_URL = (process.env.EXPO_PUBLIC_WEB_URL || 'https://shoptool.mn').replace(/\/$/, '');

function openWebPath(path: string) {
  Linking.openURL(`${WEB_URL}${path}`).catch(() => {});
}

function getCollectionProductCount(collection: any) {
  return collection.productVariants?.totalItems ?? 0;
}

function getBackendCategoryProductCount(collection: any, supplierProducts: any[]) {
  const catalogCount = [collection, ...(collection.children ?? [])].reduce(
    (total, item) => total + getCollectionProductCount(item),
    0,
  );
  const supplierCount = supplierProducts.filter((product) => (
    product.enabled !== false && supplierProductMatchesCategory(product, collection, true)
  )).length;
  return catalogCount + supplierCount;
}

function FeaturedBanner({ banner }: { banner?: HomepageBanner }) {
  if (!banner) return null;
  return (
    <TouchableOpacity style={styles.bannerCard} activeOpacity={0.9}>
      <View style={[styles.bannerGlow, { backgroundColor: banner.accentColor || C.primary }]} />
      <View style={styles.bannerCopy}>
        <View style={styles.eyebrowPill}>
          <Ionicons name="sparkles" size={12} color="#fff" />
          <Text style={styles.eyebrowText}>{banner.eyebrow || 'Онцлох санал'}</Text>
        </View>
        <Text style={styles.bannerTitle} numberOfLines={2}>{banner.title}</Text>
        {banner.subtitle ? <Text style={styles.bannerSubtitle} numberOfLines={2}>{banner.subtitle}</Text> : null}
      </View>
      <RemoteImage uri={banner.imageUrl} icon="construct-outline" style={styles.bannerImage} />
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const [data, setData] = useState<HomeData>({
    suppliers: [],
    categories: [],
    products: [],
    banners: [],
    supplierTotal: 0,
    productTotal: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const [supplierData, collectionData, productData, bannerData, supplierProductData] = await Promise.all([
          shopFetch<{ suppliers: { items: any[]; total: number } }>(SUPPLIERS_QUERY, { take: 12, skip: 0 }),
          shopFetch<{ collections: { items: any[] } }>(COLLECTIONS_QUERY, {
            options: { take: 12, topLevelOnly: true, sort: { position: 'ASC' } },
          }),
          shopFetch<{ search: { items: any[]; totalItems: number } }>(SEARCH_QUERY, {
            input: { take: 12, sort: { name: 'ASC' } },
          }),
          shopFetch<{ homepageBanners: HomepageBanner[] }>(HOMEPAGE_BANNERS_QUERY),
          shopFetch<{ supplierProducts: { items: any[]; total: number } }>(SUPPLIER_PRODUCTS_QUERY),
        ]);

        if (!mounted) return;
        setData({
          suppliers: (supplierData.suppliers?.items ?? []).map(mapSupplier),
          categories: (collectionData.collections?.items ?? [])
            .filter((item) => item.slug !== '__root_collection__')
            .map((item, index) => ({
              id: item.id,
              name: item.name,
              slug: item.slug,
              icon: item.customFields?.icon || CATEGORY_ICONS[index % CATEGORY_ICONS.length],
              productCount: getBackendCategoryProductCount(item, supplierProductData.supplierProducts?.items ?? []),
            })),
          products: [
            ...(supplierProductData.supplierProducts?.items ?? []).map(mapSupplierProduct),
            ...(productData.search?.items ?? []).map(mapSearchProduct),
          ],
          banners: bannerData.homepageBanners ?? [],
          supplierTotal: supplierData.suppliers?.total ?? 0,
          productTotal: (supplierProductData.supplierProducts?.total ?? 0) + (productData.search?.totalItems ?? 0),
        });
      } catch {
        if (mounted) setData((prev) => prev);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const saleProducts = useMemo(
    () => data.products
      .filter((product) => product.originalPrice && product.originalPrice > product.price)
      .slice(0, 8)
      .map((product) => ({ ...product, badge: 'ХЯМДРАЛ' as const })),
    [data.products],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <Image source={require('../../assets/shoptool-logo.png')} style={styles.logoImage} resizeMode="contain" />
          </View>
          <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/(tabs)/cart' as never)}>
            <Ionicons name="cart-outline" size={22} color={C.primary} />
          </TouchableOpacity>
        </View>

        <Pressable style={styles.searchBar} onPress={() => router.push('/(tabs)/search' as never)}>
          <Ionicons name="search-outline" size={19} color={C.textTertiary} />
          <Text style={styles.searchText}>Бүтээгдэхүүн, ангилал, дэлгүүр хайх</Text>
          <Ionicons name="options-outline" size={18} color={C.primary} />
        </Pressable>

        <FeaturedBanner banner={data.banners[0]} />

        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={C.primary} />
            <Text style={styles.loadingText}>Marketplace өгөгдөл ачаалж байна...</Text>
          </View>
        ) : null}

        <SectionHeading title="Дэлгүүрүүд" subtitle="Найдвартай нийлүүлэгчдээс шууд захиалаарай" action="Бүгд" onPress={() => router.push('/suppliers' as never)} />
        <FlatList
          horizontal
          data={data.suppliers}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
          renderItem={({ item }) => <SupplierTile supplier={item} onPress={() => router.push(`/supplier/${encodeRoutePart(item.slug)}` as never)} />}
          ListEmptyComponent={<Text style={styles.emptyText}>Backend дээр идэвхтэй нийлүүлэгч алга байна.</Text>}
        />

        <SectionHeading title="Шинэ бараа" subtitle="Сүүлд нэмэгдсэн бүтээгдэхүүн" action="Бүгдийг харах" onPress={() => router.push('/products?mode=new' as never)} />
        <FlatList
          horizontal
          data={data.products.slice(0, 8)}
          keyExtractor={(item) => item.variantId}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
          renderItem={({ item }) => <ProductTile product={item} onPress={() => router.push(`/product/${encodeRoutePart(item.slug)}` as never)} />}
          ListEmptyComponent={<Text style={styles.emptyText}>Backend дээр бараа бүртгэгдээгүй байна.</Text>}
        />

        {saleProducts.length > 0 ? (
          <>
            <SectionHeading title="Хямдралтай бараа" subtitle="Backend дээр бүртгэлтэй хямдрал" action="Бүгдийг харах" onPress={() => router.push('/products?mode=sale' as never)} />
            <View style={styles.productGrid}>
              {saleProducts.map((product) => (
                <ProductTile key={product.variantId} product={product} wide onPress={() => router.push(`/product/${encodeRoutePart(product.slug)}` as never)} />
              ))}
            </View>
          </>
        ) : null}

        <View style={styles.trustStrip}>
          {TRUST_ITEMS.map((item) => (
            <View key={item.label} style={styles.trustItem}>
              <Ionicons name={item.icon} size={19} color={C.primary} />
              <Text style={styles.trustText}>{item.label}</Text>
            </View>
          ))}
        </View>

        <SectionHeading title="Онцлох ангилал" subtitle="Шаардлагатай бараагаа хурдан олоорой" action="Бүгд" onPress={() => router.push('/(tabs)/categories' as never)} />
        <View style={styles.categoryGrid}>
          {data.categories.slice(0, 9).map((category) => (
            <CategoryTile key={category.id} category={category} onPress={() => router.push(`/category/${encodeRoutePart(category.slug)}` as never)} />
          ))}
        </View>

        <View style={styles.howSection}>
          <SectionHeading title="Хэрхэн ажилладаг вэ?" subtitle="4 алхамаар бараа тань хүргэгдэнэ" />
          <View style={styles.stepsGrid}>
            {HOW_IT_WORKS.map((step, index) => (
              <View key={step.title} style={styles.stepCard}>
                <Text style={styles.stepNumber}>{index + 1}</Text>
                <Text style={styles.stepIcon}>{step.icon}</Text>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDesc}>{step.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.tradeCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.tradeKicker}>Shoptool network</Text>
            <Text style={styles.tradeTitle}>Бизнесээ платформд холбоорой</Text>
            <Text style={styles.tradeText}>Нийлүүлэгчээр бараагаа борлуулах эсвэл жолоочоор хүргэлтийн захиалга авах боломжтой.</Text>
          </View>
          <View style={styles.tradeActions}>
            <TouchableOpacity style={styles.tradePrimary} onPress={() => openWebPath('/register')}>
              <Ionicons name="storefront-outline" size={15} color="#fff" />
              <Text style={styles.tradePrimaryText}>Нийлүүлэгч</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tradeSecondary} onPress={() => openWebPath('/driver/register')}>
              <Ionicons name="bicycle-outline" size={15} color={C.primary} />
              <Text style={styles.tradeSecondaryText}>Жолооч болох</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 18 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, paddingBottom: 14 },
  logoRow: { flexDirection: 'row', alignItems: 'center' },
  logoImage: { width: 190, height: 64 },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  searchText: { color: C.textTertiary, fontSize: 14, flex: 1 },
  bannerCard: {
    minHeight: 170,
    overflow: 'hidden',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
    marginBottom: 14,
    flexDirection: 'row',
  },
  bannerGlow: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, opacity: 0.16 },
  bannerCopy: { flex: 1.05, padding: 16, justifyContent: 'center' },
  eyebrowPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginBottom: 10,
  },
  eyebrowText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  bannerTitle: { color: C.text, fontSize: 20, fontWeight: '900', lineHeight: 25 },
  bannerSubtitle: { color: C.textSub, fontSize: 12, lineHeight: 17, marginTop: 6 },
  bannerImage: { width: 126, minHeight: 170 },
  trustStrip: {
    flexDirection: 'row',
    backgroundColor: C.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    padding: 10,
    marginBottom: 20,
  },
  trustItem: { flex: 1, alignItems: 'center', gap: 5 },
  trustText: { color: C.textSub, fontSize: 9, fontWeight: '700', textAlign: 'center' },
  loadingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 12,
    marginBottom: 18,
  },
  loadingText: { color: C.textSub, fontSize: 12 },
  horizontalList: { gap: 12, paddingRight: 16, paddingBottom: 22 },
  emptyText: { color: C.textSub, fontSize: 13, padding: 16 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  howSection: {
    backgroundColor: C.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    marginBottom: 24,
  },
  stepsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stepCard: { width: '48%', backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 12 },
  stepNumber: {
    position: 'absolute',
    top: 10,
    right: 10,
    color: C.primary,
    fontSize: 11,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  stepIcon: { fontSize: 25, marginBottom: 8 },
  stepTitle: { color: C.text, fontSize: 13, fontWeight: '800' },
  stepDesc: { color: C.textSub, fontSize: 11, lineHeight: 16, marginTop: 4 },
  productGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  tradeCard: {
    backgroundColor: C.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    marginBottom: 24,
    gap: 14,
  },
  tradeKicker: { color: C.primary, fontSize: 11, fontWeight: '900', marginBottom: 5, textTransform: 'uppercase' },
  tradeTitle: { color: C.text, fontSize: 18, fontWeight: '900', lineHeight: 23 },
  tradeText: { color: C.textSub, fontSize: 12, lineHeight: 18, marginTop: 6 },
  tradeActions: { flexDirection: 'row', gap: 10 },
  tradePrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: C.primary,
    borderRadius: 14,
    paddingVertical: 12,
  },
  tradePrimaryText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  tradeSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,69,0,0.26)',
    paddingVertical: 12,
  },
  tradeSecondaryText: { color: C.primary, fontSize: 12, fontWeight: '800' },
  bottomSpacer: { height: 30 },
});
