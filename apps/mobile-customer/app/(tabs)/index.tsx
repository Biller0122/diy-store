import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { C } from '@/lib/colors';

const MOCK_SUPPLIERS = [
  { id: '1', name: 'Зочин Буд', rating: 4.8, time: '20-30 мин', slug: 'zochin-bud' },
  { id: '2', name: 'Мод Материал', rating: 4.6, time: '30-45 мин', slug: 'mod-material' },
  { id: '3', name: 'Цахилгаан Хэрэгсэл', rating: 4.9, time: '15-25 мин', slug: 'tsahilgaan' },
  { id: '4', name: 'Барилгын Материал', rating: 4.5, time: '45-60 мин', slug: 'barilagiin' },
];

const MOCK_CATEGORIES = [
  { id: '1', icon: '🔨', label: 'Багаж' },
  { id: '2', icon: '🪵', label: 'Мод' },
  { id: '3', icon: '⚡', label: 'Цахилгаан' },
  { id: '4', icon: '🪟', label: 'Цонх' },
  { id: '5', icon: '🛁', label: 'Угаалгын' },
  { id: '6', icon: '🎨', label: 'Будаг' },
  { id: '7', icon: '🔩', label: 'Боолт' },
  { id: '8', icon: '🏗️', label: 'Барилга' },
];

const MOCK_PRODUCTS = [
  { id: '1', name: 'Perforator Bosch 800W', price: 145000, slug: 'bosch-perforator' },
  { id: '2', name: 'PVC Хоолой 110мм', price: 28000, slug: 'pvc-holooi' },
  { id: '3', name: 'LED Гэрлийн хавтан', price: 15500, slug: 'led-panel' },
  { id: '4', name: 'Цемент М400 50кг', price: 42000, slug: 'cement-m400' },
];

const TRUST_ITEMS = [
  { icon: '⚡', label: 'Хурдан хүргэлт' },
  { icon: '✅', label: 'Баталгаат чанар' },
  { icon: '🔄', label: 'Буцаалт' },
  { icon: '🏪', label: 'Дэлгүүрт очиж авах' },
];

function formatPrice(price: number) {
  return '₮' + price.toLocaleString('mn-MN');
}

function StarRating({ rating }: { rating: number }) {
  return (
    <View style={styles.starRow}>
      <Ionicons name="star" size={11} color={C.warning} />
      <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <View style={styles.logoDot} />
            <Text style={styles.logoText}>DIY Store</Text>
          </View>
          <TouchableOpacity style={styles.bellBtn}>
            <Ionicons name="notifications-outline" size={22} color={C.primary} />
            <View style={styles.bellDot} />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <Pressable style={styles.searchBar} onPress={() => router.push('/(tabs)/search')}>
          <Ionicons name="search-outline" size={18} color={C.textTertiary} />
          <Text style={styles.searchPlaceholder}>Хайх...</Text>
        </Pressable>

        {/* Featured Suppliers */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Дэлгүүрүүд</Text>
          <TouchableOpacity>
            <Text style={styles.seeAll}>Бүгдийг харах</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={MOCK_SUPPLIERS}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.supplierList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.supplierCard}
              onPress={() => router.push(`/supplier/${item.slug}` as never)}
              activeOpacity={0.8}
            >
              <View style={styles.supplierTopBorder} />
              <View style={styles.supplierAvatar}>
                <Text style={styles.supplierAvatarText}>{item.name.charAt(0)}</Text>
              </View>
              <Text style={styles.supplierName} numberOfLines={2}>{item.name}</Text>
              <StarRating rating={item.rating} />
              <View style={styles.deliveryRow}>
                <Ionicons name="time-outline" size={11} color={C.textTertiary} />
                <Text style={styles.deliveryText}>{item.time}</Text>
              </View>
            </TouchableOpacity>
          )}
        />

        {/* Categories */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Ангилал</Text>
        </View>
        <View style={styles.categoryGrid}>
          {MOCK_CATEGORIES.map((cat) => (
            <TouchableOpacity key={cat.id} style={styles.categoryCard} activeOpacity={0.75}>
              <Text style={styles.categoryIcon}>{cat.icon}</Text>
              <Text style={styles.categoryLabel}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* New Products */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Шинэ бүтээгдэхүүн</Text>
          <TouchableOpacity>
            <Text style={styles.seeAll}>Бүгдийг харах</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={MOCK_PRODUCTS}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.productList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.productCard}
              onPress={() => router.push(`/product/${item.slug}` as never)}
              activeOpacity={0.8}
            >
              <View style={styles.productImagePlaceholder}>
                <Ionicons name="cube-outline" size={36} color={C.textTertiary} />
              </View>
              <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
              <Text style={styles.productPrice}>{formatPrice(item.price)}</Text>
            </TouchableOpacity>
          )}
        />

        {/* Trust Strip */}
        <View style={styles.trustStrip}>
          {TRUST_ITEMS.map((t, i) => (
            <View key={i} style={styles.trustItem}>
              <Text style={styles.trustIcon}>{t.icon}</Text>
              <Text style={styles.trustLabel}>{t.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 16,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.primary,
  },
  logoText: {
    fontSize: 22,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.5,
  },
  bellBtn: { position: 'relative', padding: 4 },
  bellDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.primary,
  },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 24,
  },
  searchPlaceholder: { color: C.textTertiary, fontSize: 15 },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { color: C.text, fontSize: 17, fontWeight: '700' },
  seeAll: { color: C.primary, fontSize: 13, fontWeight: '600' },

  supplierList: { paddingRight: 16, gap: 12, marginBottom: 24 },
  supplierCard: {
    width: 160,
    height: 140,
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
    padding: 12,
    paddingTop: 14,
  },
  supplierTopBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: C.primary,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  supplierAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  supplierAvatarText: { color: C.primary, fontWeight: '700', fontSize: 16 },
  supplierName: { color: C.text, fontSize: 13, fontWeight: '600', marginBottom: 4, lineHeight: 17 },
  starRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 4 },
  ratingText: { color: C.warning, fontSize: 11, fontWeight: '600' },
  deliveryRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  deliveryText: { color: C.textTertiary, fontSize: 10 },

  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  categoryCard: {
    width: '22%',
    aspectRatio: 1,
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  categoryIcon: { fontSize: 26 },
  categoryLabel: { color: C.textSub, fontSize: 9, fontWeight: '500', textAlign: 'center' },

  productList: { paddingRight: 16, gap: 12, marginBottom: 24 },
  productCard: {
    width: 148,
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
    padding: 10,
  },
  productImagePlaceholder: {
    width: '100%',
    height: 100,
    backgroundColor: C.surface,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  productName: { color: C.text, fontSize: 12, fontWeight: '600', marginBottom: 6, lineHeight: 16 },
  productPrice: { color: C.primary, fontSize: 14, fontWeight: '700', fontFamily: 'monospace' },

  trustStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    marginBottom: 8,
  },
  trustItem: { alignItems: 'center', flex: 1 },
  trustIcon: { fontSize: 20, marginBottom: 4 },
  trustLabel: { color: C.textTertiary, fontSize: 9, textAlign: 'center', fontWeight: '500' },

  bottomSpacer: { height: 24 },
});
