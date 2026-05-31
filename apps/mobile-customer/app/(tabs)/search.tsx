import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { C } from '@/lib/colors';
import { shopFetch, PRODUCTS_QUERY } from '@/lib/api';

interface Product {
  id: string;
  name: string;
  slug: string;
  featuredAsset: { preview: string } | null;
  variants: { id: string; priceWithTax: number; stockLevel: string }[];
}

const POPULAR_CHIPS = ['Перфоратор', 'LED гэрэл', 'PVC хоолой', 'Цемент', 'Мод', 'Кабель', 'Будаг'];
const RECENT_KEY = 'recent_searches';

function formatPrice(price: number) {
  return '₮' + Math.round(price / 100).toLocaleString('mn-MN');
}

function ProductCard({ product, onPress }: { product: Product; onPress: () => void }) {
  const variant = product.variants[0];
  const price = variant?.priceWithTax ?? 0;
  return (
    <TouchableOpacity style={styles.productCard} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.productImage}>
        <Ionicons name="cube-outline" size={28} color={C.textTertiary} />
      </View>
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
        <Text style={styles.productPrice}>{formatPrice(price)}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function SearchScreen() {
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const data = await shopFetch<{ products: { items: Product[] } }>(PRODUCTS_QUERY, {
        options: {
          take: 40,
          filter: { name: { contains: q } },
        },
      });
      setResults(data.products?.items ?? []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      doSearch(query);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, doSearch]);

  const handleSubmit = () => {
    if (!query.trim()) return;
    doSearch(query);
    if (!recentSearches.includes(query.trim())) {
      setRecentSearches((prev) => [query.trim(), ...prev].slice(0, 6));
    }
  };

  const handleChip = (chip: string) => {
    setQuery(chip);
    doSearch(chip);
  };

  const showEmpty = !query.trim();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Search bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color={C.textTertiary} style={styles.searchIcon} />
        <TextInput
          ref={inputRef}
          style={styles.searchInput}
          placeholder="Бүтээгдэхүүн хайх..."
          placeholderTextColor={C.textTertiary}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSubmit}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => { setQuery(''); setResults([]); }} style={styles.clearBtn}>
            <Ionicons name="close-circle" size={18} color={C.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {showEmpty ? (
        <FlatList
          data={[]}
          renderItem={null}
          ListHeaderComponent={
            <View style={styles.emptyContent}>
              {recentSearches.length > 0 && (
                <View style={styles.group}>
                  <View style={styles.groupHeader}>
                    <Text style={styles.groupTitle}>Сүүлийн хайлтууд</Text>
                    <TouchableOpacity onPress={() => setRecentSearches([])}>
                      <Text style={styles.clearAll}>Цэвэрлэх</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.chipsWrap}>
                    {recentSearches.map((s) => (
                      <TouchableOpacity key={s} style={styles.recentChip} onPress={() => handleChip(s)}>
                        <Ionicons name="time-outline" size={13} color={C.textSub} />
                        <Text style={styles.recentChipText}>{s}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
              <View style={styles.group}>
                <Text style={styles.groupTitle}>Алдартай хайлтууд</Text>
                <View style={styles.chipsWrap}>
                  {POPULAR_CHIPS.map((c) => (
                    <TouchableOpacity key={c} style={styles.popularChip} onPress={() => handleChip(c)}>
                      <Text style={styles.popularChipText}>{c}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          }
          keyExtractor={() => ''}
          contentContainerStyle={{ flex: 1 }}
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
              <Ionicons name="search-outline" size={40} color={C.textTertiary} />
              <Text style={styles.noResultText}>"{query}" — үр дүн олдсонгүй</Text>
            </View>
          ) : (
            <>
              <Text style={styles.resultCount}>{results.length} бүтээгдэхүүн олдлоо</Text>
              <FlatList
                data={results}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.resultList}
                numColumns={2}
                columnWrapperStyle={styles.columnWrapper}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <ProductCard
                    product={item}
                    onPress={() => router.push(`/product/${item.slug}` as never)}
                  />
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    margin: 16,
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: C.text, fontSize: 15 },
  clearBtn: { padding: 4 },

  emptyContent: { padding: 16, gap: 28 },
  group: { gap: 12 },
  groupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  groupTitle: { color: C.text, fontSize: 15, fontWeight: '700' },
  clearAll: { color: C.primary, fontSize: 13 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: C.surface,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: C.border,
  },
  recentChipText: { color: C.textSub, fontSize: 13 },
  popularChip: {
    backgroundColor: C.primaryGlow,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(255,69,0,0.2)',
  },
  popularChipText: { color: C.primary, fontSize: 13, fontWeight: '600' },

  resultsContainer: { flex: 1 },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { color: C.textSub, fontSize: 14 },
  noResultText: { color: C.textSub, fontSize: 14, textAlign: 'center' },

  resultCount: {
    color: C.textSub,
    fontSize: 13,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  resultList: { paddingHorizontal: 12, paddingBottom: 24 },
  columnWrapper: { gap: 12, marginBottom: 12 },
  productCard: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  productImage: {
    height: 100,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: { padding: 10, gap: 4 },
  productName: { color: C.text, fontSize: 12, fontWeight: '600', lineHeight: 17 },
  productPrice: { color: C.primary, fontSize: 13, fontWeight: '700', fontFamily: 'monospace' },
});
