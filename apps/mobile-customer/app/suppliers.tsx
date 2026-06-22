import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type ThemeColors } from '@/lib/theme';
import { shopFetch, SUPPLIERS_QUERY } from '@/lib/api';
import { encodeRoutePart, mapSupplier, MarketplaceSupplier } from '@/lib/marketplace';
import { SupplierTile } from '@/components/MarketplaceCards';

export default function SuppliersScreen() {
  const router = useRouter();
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const [suppliers, setSuppliers] = useState<MarketplaceSupplier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    shopFetch<{ suppliers: { items: any[]; total: number } }>(SUPPLIERS_QUERY, { take: 48, skip: 0 })
      .then((data) => {
        setSuppliers((data.suppliers?.items ?? []).map(mapSupplier).sort((a, b) => b.productCount - a.productCount));
      })
      .catch(() => setSuppliers([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Дэлгүүрүүд</Text>
          <Text style={styles.subtitle}>{suppliers.length.toLocaleString('mn-MN')} баталгаажсан нийлүүлэгч</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={C.primary} />
          <Text style={styles.centerText}>Дэлгүүрүүд ачаалж байна...</Text>
        </View>
      ) : suppliers.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="storefront-outline" size={44} color={C.textTertiary} />
          <Text style={styles.centerText}>Backend дээр идэвхтэй дэлгүүр алга байна</Text>
        </View>
      ) : (
        <FlatList
          data={suppliers}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <SupplierTile supplier={item} onPress={() => router.push(`/supplier/${encodeRoutePart(item.slug)}` as never)} />
          )}
        />
      )}
    </SafeAreaView>
  );
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
  title: { color: C.text, fontSize: 24, fontWeight: '900' },
  subtitle: { color: C.textSub, fontSize: 12, marginTop: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 32 },
  centerText: { color: C.textSub, fontSize: 14, textAlign: 'center' },
  list: { padding: 16, paddingBottom: 28 },
  columnWrapper: { gap: 12, marginBottom: 12 },
});
