import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { C } from '@/lib/colors';
import { COLLECTIONS_QUERY, shopFetch, SUPPLIER_PRODUCTS_QUERY } from '@/lib/api';
import { CATEGORY_ICONS, encodeRoutePart, MarketplaceCategory, supplierProductMatchesCategory } from '@/lib/marketplace';
import { CategoryTile } from '@/components/MarketplaceCards';

type CategoryGroup = {
  parent: MarketplaceCategory;
  children: MarketplaceCategory[];
};

function getCollectionProductCount(collection: any) {
  return collection.productVariants?.totalItems ?? 0;
}

function getBackendCategoryProductCount(collection: any, supplierProducts: any[], includeChildren = false) {
  const collections = includeChildren ? [collection, ...(collection.children ?? [])] : [collection];
  const catalogCount = collections.reduce((total, item) => total + getCollectionProductCount(item), 0);
  const supplierCount = supplierProducts.filter((product) => (
    product.enabled !== false && supplierProductMatchesCategory(product, collection, includeChildren)
  )).length;
  return catalogCount + supplierCount;
}

export default function CategoriesScreen() {
  const router = useRouter();
  const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>([]);
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadCategories(isRefresh = false) {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const [collectionData, supplierProductData] = await Promise.all([
        shopFetch<{ collections: { items: any[] } }>(COLLECTIONS_QUERY, {
          options: { take: 60, topLevelOnly: true, sort: { position: 'ASC' } },
        }),
        shopFetch<{ supplierProducts: { items: any[]; total: number } }>(SUPPLIER_PRODUCTS_QUERY),
      ]);

      const supplierProducts = supplierProductData.supplierProducts?.items ?? [];
      const mapped = (collectionData.collections?.items ?? [])
        .filter((item) => item.slug !== '__root_collection__')
        .map((item, index) => {
          const rawChildren = item.children ?? [];
          const children = rawChildren.map((child: any, childIndex: number) => ({
            id: child.id,
            name: child.name,
            slug: child.slug,
            icon: child.customFields?.icon || item.customFields?.icon || CATEGORY_ICONS[(index + childIndex + 1) % CATEGORY_ICONS.length],
            productCount: getBackendCategoryProductCount(child, supplierProducts),
          }));

          return {
            parent: {
              id: item.id,
              name: item.name,
              slug: item.slug,
              icon: item.customFields?.icon || CATEGORY_ICONS[index % CATEGORY_ICONS.length],
              productCount: getBackendCategoryProductCount({ ...item, children: rawChildren }, supplierProducts, true),
            },
            children,
          };
        });

      setCategoryGroups(mapped);
    } catch {
      setCategoryGroups([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadCategories();
  }, []);

  function handleParentPress(group: CategoryGroup) {
    if (group.children.length === 0) {
      router.push(`/category/${encodeRoutePart(group.parent.slug)}` as never);
      return;
    }

    setExpandedCategoryId((current) => (current === group.parent.id ? null : group.parent.id));
  }

  const categories = useMemo(
    () => categoryGroups.flatMap((group) => [group.parent, ...group.children]),
    [categoryGroups],
  );

  const totalProducts = useMemo(
    () => categories.reduce((total, category) => total + category.productCount, 0),
    [categories],
  );

  const categoryRows = useMemo(() => {
    const rows: CategoryGroup[][] = [];
    for (let index = 0; index < categoryGroups.length; index += 3) {
      rows.push(categoryGroups.slice(index, index + 3));
    }
    return rows;
  }, [categoryGroups]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl tintColor={C.primary} refreshing={refreshing} onRefresh={() => loadCategories(true)} />}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Ангилал</Text>
            <Text style={styles.subtitle}>Бараагаа ангиллаар нь хурдан олоорой</Text>
          </View>
          <Pressable style={styles.searchButton} onPress={() => router.push('/(tabs)/search' as never)}>
            <Ionicons name="search-outline" size={22} color={C.primary} />
          </Pressable>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <Ionicons name="grid-outline" size={24} color={C.primary} />
          </View>
          <View style={styles.summaryCopy}>
            <Text style={styles.summaryTitle}>{categories.length.toLocaleString('mn-MN')} ангилал</Text>
            <Text style={styles.summaryText}>{totalProducts.toLocaleString('mn-MN')} бараа backend дээрээс ачааллаа</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={C.primary} />
            <Text style={styles.loadingText}>Ангилал ачаалж байна...</Text>
          </View>
        ) : null}

        {!loading && categoryGroups.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="cube-outline" size={28} color={C.textTertiary} />
            <Text style={styles.emptyTitle}>Ангилал бүртгэгдээгүй байна</Text>
            <Text style={styles.emptyText}>Backend дээр collection нэмэгдмэгц энд автоматаар харагдана.</Text>
          </View>
        ) : (
          <View style={styles.categorySection}>
            {categoryRows.map((row) => {
              const expandedGroup = row.find((group) => group.parent.id === expandedCategoryId);

              return (
                <View key={row.map((group) => group.parent.id).join('-')} style={styles.categoryRowGroup}>
                  <View style={styles.categoryGrid}>
                    {row.map((group) => (
                      <CategoryTile
                        key={group.parent.id}
                        category={group.parent}
                        selected={expandedCategoryId === group.parent.id}
                        onPress={() => handleParentPress(group)}
                      />
                    ))}
                  </View>

                  {expandedGroup && expandedGroup.children.length > 0 ? (
                    <View style={styles.subcategoryPanel}>
                      <View style={styles.subcategoryHeader}>
                        <Text style={styles.subcategoryTitle}>{expandedGroup.parent.name} дэд ангилал</Text>
                        <Text style={styles.sectionCount}>{expandedGroup.children.length.toLocaleString('mn-MN')} ангилал</Text>
                      </View>
                      <View style={styles.categoryGrid}>
                        {expandedGroup.children.map((category) => (
                          <CategoryTile key={category.id} category={category} onPress={() => router.push(`/category/${encodeRoutePart(category.slug)}` as never)} />
                        ))}
                      </View>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 18 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 16,
  },
  title: { color: C.text, fontSize: 30, fontWeight: '900', lineHeight: 36 },
  subtitle: { color: C.textSub, fontSize: 13, lineHeight: 19, marginTop: 4 },
  searchButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    marginBottom: 16,
  },
  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: C.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCopy: { flex: 1 },
  summaryTitle: { color: C.text, fontSize: 16, fontWeight: '900' },
  summaryText: { color: C.textSub, fontSize: 12, lineHeight: 17, marginTop: 3 },
  loadingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 12,
    marginBottom: 16,
  },
  loadingText: { color: C.textSub, fontSize: 12 },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    padding: 22,
  },
  emptyTitle: { color: C.text, fontSize: 15, fontWeight: '800', marginTop: 10 },
  emptyText: { color: C.textSub, fontSize: 12, lineHeight: 18, marginTop: 5, textAlign: 'center' },
  categorySection: { marginBottom: 12 },
  categoryRowGroup: { marginBottom: 10 },
  sectionCount: { color: C.textTertiary, fontSize: 11, fontWeight: '700' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  subcategoryPanel: {
    marginTop: 10,
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 10,
  },
  subcategoryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, marginBottom: 10 },
  subcategoryTitle: { flex: 1, color: C.text, fontSize: 14, fontWeight: '900', lineHeight: 19 },
  bottomSpacer: { height: 30 },
});
