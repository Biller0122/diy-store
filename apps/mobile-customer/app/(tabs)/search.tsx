import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme, type ThemeColors } from '@/lib/theme';
import { COLLECTIONS_QUERY, SEARCH_QUERY, shopFetch, SUPPLIER_PRODUCTS_QUERY } from '@/lib/api';
import { encodeRoutePart, mapSearchProduct, mapSupplierProduct, MarketplaceProduct } from '@/lib/marketplace';
import { ProductTile, SectionHeading } from '@/components/MarketplaceCards';

const POPULAR_CHIPS = ['Перфоратор', 'LED гэрэл', 'PVC хоолой', 'Цемент', 'Мод', 'Кабель', 'Будаг', 'Плита'];
const RECENT_KEY = 'recent_searches';

type SearchProduct = MarketplaceProduct & {
  category?: string | null;
  categorySlug?: string | null;
  source: 'supplier' | 'catalog';
};

type ResultGroup = {
  key: string;
  title: string;
  products: SearchProduct[];
};

const TOKEN_LABELS: Record<string, string> = {
  cement: 'Цемент',
  tsement: 'Цемент',
  sement: 'Цемент',
  'цемент': 'Цемент',
  'цемэнт': 'Цемент',
  armatur: 'Арматур',
  armature: 'Арматур',
  rebar: 'Арматур',
  'арматур': 'Арматур',
  toosgo: 'Тоосго',
  tosgo: 'Тоосго',
  brick: 'Тоосго',
  'тоосго': 'Тоосго',
  barilga: 'Барилга',
  building: 'Барилга',
  material: 'Материал',
  materialuud: 'Материал',
  'барилга': 'Барилга',
  'материал': 'Материал',
  budag: 'Будаг',
  paint: 'Будаг',
  'будаг': 'Будаг',
  bagaj: 'Багаж',
  tool: 'Багаж',
  tools: 'Багаж',
  'багаж': 'Багаж',
};

const TOKEN_VARIANTS: Record<string, string[]> = {
  cement: ['cement', 'tsement', 'sement', 'цемент', 'цемэнт'],
  tsement: ['cement', 'tsement', 'sement', 'цемент', 'цемэнт'],
  sement: ['cement', 'tsement', 'sement', 'цемент', 'цемэнт'],
  'цемент': ['cement', 'tsement', 'sement', 'цемент', 'цемэнт'],
  'цемэнт': ['cement', 'tsement', 'sement', 'цемент', 'цемэнт'],
  armatur: ['armatur', 'armature', 'rebar', 'арматур'],
  armature: ['armatur', 'armature', 'rebar', 'арматур'],
  rebar: ['armatur', 'armature', 'rebar', 'арматур'],
  'арматур': ['armatur', 'armature', 'rebar', 'арматур'],
  toosgo: ['toosgo', 'tosgo', 'brick', 'тоосго'],
  tosgo: ['toosgo', 'tosgo', 'brick', 'тоосго'],
  brick: ['toosgo', 'tosgo', 'brick', 'тоосго'],
  'тоосго': ['toosgo', 'tosgo', 'brick', 'тоосго'],
};

function normalizeSearchText(text: string) {
  return text.toLowerCase().replace(/ё/g, 'е');
}

function getSearchTokens(term: string) {
  return normalizeSearchText(term)
    .split(/[,\s]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function getTokenVariants(token: string) {
  return TOKEN_VARIANTS[token] ?? [token];
}

function getCanonicalToken(token: string) {
  const variants = getTokenVariants(token);
  return variants.find((variant) => TOKEN_LABELS[variant]) ?? token;
}

function tokenLabel(token: string) {
  const normalized = getCanonicalToken(normalizeSearchText(token));
  return TOKEN_LABELS[normalized] ?? normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function matchesSearch(term: string, values: Array<string | null | undefined>) {
  const normalized = normalizeSearchText(term.trim());
  const tokens = getSearchTokens(term);
  const variants = tokens.flatMap(getTokenVariants);
  const haystack = normalizeSearchText(values.filter(Boolean).join(' '));

  if (!normalized) return true;
  if (haystack.includes(normalized)) return true;
  return variants.some((variant) => haystack.includes(variant));
}

function buildCategoryNames(items: any[]) {
  const entries = items.flatMap((item) => [
    [item.slug, item.name],
    ...((item.children ?? []).map((child: any) => [child.slug, child.name])),
  ]);
  return new Map<string, string>(entries);
}

function groupResults(results: SearchProduct[], query: string): ResultGroup[] {
  const tokens = getSearchTokens(query);
  const canonicalTokens = tokens.map(getCanonicalToken);
  const groups = new Map<string, ResultGroup>();

  for (const product of results) {
    const haystack = normalizeSearchText([product.name, product.slug, product.category, product.categorySlug].filter(Boolean).join(' '));
    const matchedToken = tokens.find((token) => getTokenVariants(token).some((variant) => haystack.includes(variant)));
    const key = matchedToken ? getCanonicalToken(matchedToken) : product.category ?? 'Бусад';
    const title = matchedToken ? tokenLabel(matchedToken) : key;
    const group = groups.get(key) ?? { key, title, products: [] };
    group.products.push(product);
    groups.set(key, group);
  }

  return Array.from(groups.values()).sort((a, b) => {
    const aIndex = canonicalTokens.indexOf(a.key);
    const bIndex = canonicalTokens.indexOf(b.key);
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return b.products.length - a.products.length;
  });
}

export default function SearchScreen() {
  const router = useRouter();
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const params = useLocalSearchParams<{ query?: string }>();
  const inputRef = useRef<TextInput>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [query, setQuery] = useState(params.query ? String(params.query) : '');
  const [results, setResults] = useState<SearchProduct[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [searching, setSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [searchError, setSearchError] = useState('');

  useEffect(() => {
    inputRef.current?.focus();
    AsyncStorage.getItem(RECENT_KEY)
      .then((value) => {
        if (value) setRecentSearches(JSON.parse(value));
      })
      .catch((error) => {
        console.error('[SearchScreen] recent searches load failed', error);
        Alert.alert('Сүүлийн хайлт ачаалсангүй', 'Дараа дахин оролдоно уу.');
      });
  }, []);

  const persistRecent = async (value: string) => {
    const next = [value, ...recentSearches.filter((item) => item.toLowerCase() !== value.toLowerCase())].slice(0, 8);
    setRecentSearches(next);
    AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next)).catch((error) => {
      console.error('[SearchScreen] recent searches save failed', error);
      Alert.alert('Хайлтын түүх хадгалсангүй', 'Төхөөрөмжийн санах ойд бичихэд алдаа гарлаа.');
    });
  };

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setTotalItems(0);
      return;
    }
    setSearching(true);
    setSearchError('');
    try {
      const [catalogData, supplierProductData, collectionData] = await Promise.all([
        shopFetch<{ search: { items: any[]; totalItems: number } }>(SEARCH_QUERY, {
          input: { term: q.trim(), take: 48, groupByProduct: true },
        }),
        shopFetch<{ supplierProducts: { items: any[]; total: number } }>(SUPPLIER_PRODUCTS_QUERY),
        shopFetch<{ collections: { items: any[] } }>(COLLECTIONS_QUERY, {
          options: { take: 100, sort: { position: 'ASC' } },
        }).catch((error) => {
          console.error('[SearchScreen] collections lookup failed', error);
          return { collections: { items: [] } };
        }),
      ]);
      const categoryNames = buildCategoryNames(collectionData.collections?.items ?? []);
      const supplierProducts = (supplierProductData.supplierProducts?.items ?? [])
        .filter((item) => item.enabled !== false)
        .filter((item) => matchesSearch(q, [
          item.name,
          item.slug,
          item.category,
          categoryNames.get(item.category ?? ''),
        ]))
        .map((item, index) => ({
          ...mapSupplierProduct(item, index),
          category: categoryNames.get(item.category ?? '') ?? item.category ?? 'Нийлүүлэгч',
          categorySlug: item.category ?? 'supplier',
          source: 'supplier' as const,
        }));
      const catalogProducts = (catalogData.search?.items ?? []).map((item, index) => ({
        ...mapSearchProduct(item, index),
        category: 'Каталог',
        categorySlug: 'catalog',
        source: 'catalog' as const,
      }));
      setResults([...supplierProducts, ...catalogProducts]);
      setTotalItems(supplierProducts.length + (catalogData.search?.totalItems ?? 0));
    } catch (error) {
      console.error('[SearchScreen] search failed', error);
      const message = error instanceof Error ? error.message : 'Хайлт хийхэд алдаа гарлаа';
      setSearchError(message);
      Alert.alert('Хайлт амжилтгүй', message);
      setResults([]);
      setTotalItems(0);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (params.query) {
      const next = String(params.query);
      setQuery(next);
      doSearch(next);
    }
  }, [params.query, doSearch]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      setTotalItems(0);
      return;
    }
    debounceRef.current = setTimeout(() => doSearch(query), 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, doSearch]);

  const handleSubmit = () => {
    const value = query.trim();
    if (!value) return;
    persistRecent(value);
    doSearch(value);
  };

  const handleChip = (chip: string) => {
    setQuery(chip);
    persistRecent(chip);
    doSearch(chip);
  };

  const clearRecent = () => {
    setRecentSearches([]);
    AsyncStorage.removeItem(RECENT_KEY).catch((error) => {
      console.error('[SearchScreen] recent searches clear failed', error);
      Alert.alert('Хайлтын түүх цэвэрлэсэнгүй', 'Дараа дахин оролдоно уу.');
    });
  };

  const showEmpty = !query.trim();
  const resultGroups = groupResults(results, query);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Хайлт</Text>
        <Text style={styles.headerSub}>Каталог, дэлгүүр, материал</Text>
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color={C.textTertiary} />
        <TextInput
          ref={inputRef}
          style={styles.searchInput}
          placeholder="Юу хайж байна?"
          placeholderTextColor={C.textTertiary}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSubmit}
          returnKeyType="search"
          autoCapitalize="none"
        />
        {query.length > 0 ? (
          <TouchableOpacity onPress={() => { setQuery(''); setResults([]); }} style={styles.clearBtn}>
            <Ionicons name="close-circle" size={19} color={C.textTertiary} />
          </TouchableOpacity>
        ) : null}
      </View>

      {showEmpty ? (
        <FlatList
          data={[]}
          keyExtractor={() => 'empty'}
          renderItem={null}
          contentContainerStyle={styles.emptyContent}
          ListHeaderComponent={
            <>
              {recentSearches.length > 0 ? (
                <View style={styles.group}>
                  <SectionHeading title="Сүүлийн хайлтууд" action="Цэвэрлэх" onPress={clearRecent} />
                  <View style={styles.chipsWrap}>
                    {recentSearches.map((item) => (
                      <TouchableOpacity key={item} style={styles.recentChip} onPress={() => handleChip(item)}>
                        <Ionicons name="time-outline" size={13} color={C.textSub} />
                        <Text style={styles.recentChipText}>{item}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ) : null}
              <View style={styles.group}>
                <SectionHeading title="Алдартай хайлтууд" subtitle="Хэрэглэгчдийн их хайдаг материалууд" />
                <View style={styles.chipsWrap}>
                  {POPULAR_CHIPS.map((chip) => (
                    <TouchableOpacity key={chip} style={styles.popularChip} onPress={() => handleChip(chip)}>
                      <Text style={styles.popularChipText}>{chip}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </>
          }
        />
      ) : (
        <View style={styles.resultsContainer}>
          {searching ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={C.primary} />
              <Text style={styles.loadingText}>Хайж байна...</Text>
            </View>
          ) : results.length === 0 ? (
            <View style={styles.loadingBox}>
              <Ionicons name="search-outline" size={42} color={C.textTertiary} />
              <Text style={styles.noResultText}>{searchError || `"${query}" үр дүн олдсонгүй`}</Text>
            </View>
          ) : (
            <>
              <Text style={styles.resultCount}>{totalItems.toLocaleString('mn-MN')} бүтээгдэхүүн олдлоо</Text>
              <FlatList
                data={resultGroups}
                keyExtractor={(item) => item.key}
                contentContainerStyle={styles.resultList}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <View style={styles.resultGroup}>
                    <View style={styles.groupHeader}>
                      <Text style={styles.groupTitle}>{item.title}</Text>
                      <Text style={styles.groupCount}>{item.products.length.toLocaleString('mn-MN')} бараа</Text>
                    </View>
                    <View style={styles.productGrid}>
                      {item.products.map((product) => (
                        <ProductTile
                          key={`${product.source}-${product.variantId}`}
                          product={product}
                          wide
                          onPress={() => router.push(`/product/${encodeRoutePart(product.slug)}` as never)}
                        />
                      ))}
                    </View>
                  </View>
                )}
              />
            </>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (C: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  headerTitle: { color: C.text, fontSize: 24, fontWeight: '900' },
  headerSub: { color: C.textSub, fontSize: 12, marginTop: 2 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 14,
    paddingHorizontal: 13,
    height: 50,
  },
  searchInput: { flex: 1, color: C.text, fontSize: 15 },
  clearBtn: { padding: 4 },
  emptyContent: { padding: 16, gap: 28 },
  group: { marginBottom: 28 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: C.surface,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  recentChipText: { color: C.textSub, fontSize: 13, fontWeight: '600' },
  popularChip: {
    backgroundColor: C.primaryGlow,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,69,0,0.24)',
  },
  popularChipText: { color: C.primary, fontSize: 13, fontWeight: '800' },
  resultsContainer: { flex: 1 },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 },
  loadingText: { color: C.textSub, fontSize: 14 },
  noResultText: { color: C.textSub, fontSize: 14, textAlign: 'center' },
  resultCount: { color: C.textSub, fontSize: 13, paddingHorizontal: 16, paddingBottom: 10 },
  resultList: { paddingHorizontal: 16, paddingBottom: 24 },
  resultGroup: { marginBottom: 24 },
  groupHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
  groupTitle: { flex: 1, color: C.text, fontSize: 18, fontWeight: '900', lineHeight: 23 },
  groupCount: { color: C.textTertiary, fontSize: 11, fontWeight: '700' },
  productGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
});
