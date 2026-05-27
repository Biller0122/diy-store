import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Pressable,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { C } from '@/lib/colors';

const RECENT_SEARCHES = ['Гар дрель', 'PVC хоолой', 'Цемент', 'LED гэрэл'];

const ALL_PRODUCTS = [
  { id: '1', name: 'Perforator Bosch 800W', price: 145000, slug: 'bosch-perforator', category: 'Багаж' },
  { id: '2', name: 'PVC Хоолой 110мм', price: 28000, slug: 'pvc-holooi', category: 'Угаалгын' },
  { id: '3', name: 'LED Гэрлийн хавтан', price: 15500, slug: 'led-panel', category: 'Цахилгаан' },
  { id: '4', name: 'Цемент М400 50кг', price: 42000, slug: 'cement-m400', category: 'Барилга' },
  { id: '5', name: 'Гар дрель 12В', price: 68000, slug: 'gar-drel', category: 'Багаж' },
  { id: '6', name: 'Будаг цагаан 4л', price: 22000, slug: 'budaг-цагаан', category: 'Будаг' },
  { id: '7', name: 'Мод самбар 2x4', price: 35000, slug: 'mod-sambar', category: 'Мод' },
  { id: '8', name: 'Боолт M10x50', price: 3500, slug: 'bolt-m10', category: 'Боолт' },
];

function formatPrice(price: number) {
  return '₮' + price.toLocaleString('mn-MN');
}

type Product = (typeof ALL_PRODUCTS)[number];

function ProductCard({ item, onPress }: { item: Product; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.productCard} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.productImagePlaceholder}>
        <Ionicons name="cube-outline" size={32} color={C.textTertiary} />
      </View>
      <View style={styles.productInfo}>
        <Text style={styles.productCategory}>{item.category}</Text>
        <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.productPrice}>{formatPrice(item.price)}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function SearchScreen() {
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const filtered = query.trim().length > 0
    ? ALL_PRODUCTS.filter((p) =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.category.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  const showResults = query.trim().length > 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Search Input Row */}
      <View style={styles.searchRow}>
        <View style={styles.inputWrapper}>
          <Ionicons name="search-outline" size={18} color={C.textTertiary} style={styles.searchIcon} />
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Хайх..."
            placeholderTextColor={C.textTertiary}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            onSubmitEditing={Keyboard.dismiss}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} style={styles.clearBtn}>
              <Ionicons name="close-circle" size={18} color={C.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity onPress={() => { setQuery(''); Keyboard.dismiss(); }} style={styles.cancelBtn}>
          <Text style={styles.cancelText}>Болих</Text>
        </TouchableOpacity>
      </View>

      {!showResults ? (
        <View style={styles.recentSection}>
          <Text style={styles.recentTitle}>Сүүлийн хайлтууд</Text>
          <View style={styles.chipRow}>
            {RECENT_SEARCHES.map((item, i) => (
              <Pressable key={i} style={styles.chip} onPress={() => setQuery(item)}>
                <Ionicons name="time-outline" size={13} color={C.textTertiary} />
                <Text style={styles.chipText}>{item}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.recentTitle, { marginTop: 28 }]}>Түгээмэл хайлт</Text>
          <View style={styles.chipRow}>
            {['Цемент', 'LED', 'Дрель', 'Будаг', 'Мод'].map((item, i) => (
              <Pressable key={i} style={[styles.chip, styles.chipPopular]} onPress={() => setQuery(item)}>
                <Text style={[styles.chipText, { color: C.primary }]}>{item}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : (
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsCount}>
            {filtered.length} үр дүн "{query}"
          </Text>
          {filtered.length === 0 ? (
            <View style={styles.emptyResults}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyTitle}>Үр дүн олдсонгүй</Text>
              <Text style={styles.emptySubtitle}>Өөр үгээр хайж үзнэ үү</Text>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.id}
              numColumns={2}
              columnWrapperStyle={styles.columnWrapper}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.productGrid}
              renderItem={({ item }) => (
                <ProductCard
                  item={item}
                  onPress={() => router.push(`/product/${item.slug}` as never)}
                />
              )}
            />
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 10,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: { marginRight: 8 },
  input: {
    flex: 1,
    color: C.text,
    fontSize: 15,
    height: '100%',
  },
  clearBtn: { padding: 4 },
  cancelBtn: { paddingVertical: 8, paddingHorizontal: 4 },
  cancelText: { color: C.primary, fontSize: 14, fontWeight: '600' },

  recentSection: { paddingHorizontal: 16, paddingTop: 8 },
  recentTitle: { color: C.textSub, fontSize: 13, fontWeight: '600', marginBottom: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: C.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipPopular: {
    borderColor: C.primaryGlow,
    backgroundColor: C.primaryGlow,
  },
  chipText: { color: C.textSub, fontSize: 13 },

  resultsContainer: { flex: 1 },
  resultsCount: {
    color: C.textTertiary,
    fontSize: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  emptyResults: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { color: C.text, fontSize: 17, fontWeight: '600', marginBottom: 6 },
  emptySubtitle: { color: C.textSub, fontSize: 14 },

  productGrid: { paddingHorizontal: 16, paddingBottom: 24 },
  columnWrapper: { gap: 12, marginBottom: 12 },
  productCard: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  productImagePlaceholder: {
    width: '100%',
    height: 110,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: { padding: 10 },
  productCategory: { color: C.textTertiary, fontSize: 10, fontWeight: '600', marginBottom: 3 },
  productName: { color: C.text, fontSize: 12, fontWeight: '600', marginBottom: 6, lineHeight: 16 },
  productPrice: { color: C.primary, fontSize: 13, fontWeight: '700', fontFamily: 'monospace' },
});
