import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { C } from '@/lib/colors';
import { SEARCH_QUERY, SEMANTIC_SEARCH_QUERY, shopFetch, SUPPLIER_PRODUCTS_QUERY } from '@/lib/api';
import { mapSearchProduct, mapSemanticProduct, mapSupplierProduct, MarketplaceProduct } from '@/lib/marketplace';
import { ProductTile, SectionHeading } from '@/components/MarketplaceCards';

const POPULAR_CHIPS = ['Перфоратор', 'LED гэрэл', 'PVC хоолой', 'Цемент', 'Мод', 'Кабель', 'Будаг', 'Плита'];
const RECENT_KEY = 'recent_searches';

export default function SearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ query?: string }>();
  const inputRef = useRef<TextInput>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [query, setQuery] = useState(params.query ? String(params.query) : '');
  const [results, setResults] = useState<MarketplaceProduct[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [searching, setSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    inputRef.current?.focus();
    AsyncStorage.getItem(RECENT_KEY)
      .then((value) => {
        if (value) setRecentSearches(JSON.parse(value));
      })
      .catch(() => {});
  }, []);

  const persistRecent = async (value: string) => {
    const next = [value, ...recentSearches.filter((item) => item.toLowerCase() !== value.toLowerCase())].slice(0, 8);
    setRecentSearches(next);
    AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next)).catch(() => {});
  };

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setTotalItems(0);
      return;
    }
    setSearching(true);
    try {
      const semanticData = await shopFetch<{ semanticSearch: { items: any[]; total: number } }>(SEMANTIC_SEARCH_QUERY, {
        query: q.trim(),
        take: 40,
      });
      const semanticProducts = (semanticData.semanticSearch?.items ?? []).map(mapSemanticProduct);
      if (semanticProducts.length > 0) {
        setResults(semanticProducts);
        setTotalItems(semanticData.semanticSearch?.total ?? semanticProducts.length);
        setSearching(false);
        return;
      }
    } catch {
      // Fall back to Vendure keyword search while semantic indexing is not ready.
    }

    try {
      const [catalogData, supplierProductData] = await Promise.all([
        shopFetch<{ search: { items: any[]; totalItems: number } }>(SEARCH_QUERY, {
          input: { term: q.trim(), take: 40 },
        }),
        shopFetch<{ supplierProducts: { items: any[]; total: number } }>(SUPPLIER_PRODUCTS_QUERY),
      ]);
      const term = q.trim().toLowerCase();
      const supplierProducts = (supplierProductData.supplierProducts?.items ?? [])
        .filter((item) => item.enabled !== false && item.name?.toLowerCase().includes(term))
        .map(mapSupplierProduct);
      const catalogProducts = (catalogData.search?.items ?? []).map(mapSearchProduct);
      setResults([...supplierProducts, ...catalogProducts]);
      setTotalItems(supplierProducts.length + (catalogData.search?.totalItems ?? 0));
    } catch {
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
    AsyncStorage.removeItem(RECENT_KEY).catch(() => {});
  };

  const showEmpty = !query.trim();

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
              <Text style={styles.noResultText}>"{query}" үр дүн олдсонгүй</Text>
            </View>
          ) : (
            <>
              <Text style={styles.resultCount}>{totalItems.toLocaleString('mn-MN')} бүтээгдэхүүн олдлоо</Text>
              <FlatList
                data={results}
                keyExtractor={(item) => item.variantId}
                contentContainerStyle={styles.resultList}
                numColumns={2}
                columnWrapperStyle={styles.columnWrapper}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <ProductTile product={item} wide onPress={() => router.push(`/product/${item.slug}` as never)} />
                )}
              />
            </>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  resultList: { paddingHorizontal: 12, paddingBottom: 24 },
  columnWrapper: { gap: 12, marginBottom: 12 },
});
