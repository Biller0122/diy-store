import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PRODUCT_REVIEWS_QUERY, SUPPLIER_PRODUCTS_QUERY, shopFetch } from '@/lib/api';
import { useSupplierStore } from '@/lib/store';
import { SupplierProduct } from '@/lib/types';

const C = {
  bg: '#08080E',
  card: '#0F0F1A',
  surface: '#161625',
  primary: '#FF4500',
  amber: '#FFB547',
  border: 'rgba(255,255,255,0.06)',
  text: '#F5F5FF',
  textSub: '#8888AA',
  textTertiary: '#55556A',
  red: '#EF4444',
};

type Review = {
  id: string;
  productId: string;
  customerName: string;
  rating: number;
  title: string;
  body: string;
  product: string;
  date: string;
  helpful: number;
};

type Filter = 'all' | 5 | 4 | 3 | 2 | 1;

export default function ReviewsScreen() {
  const supplier = useSupplierStore((s) => s.supplier);
  const token = useSupplierStore((s) => s.token);
  const [filter, setFilter] = useState<Filter>('all');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadReviews = useCallback(async () => {
    if (!supplier?.id) return;
    setLoading(true);
    setError('');
    try {
      const productData = await shopFetch<{ supplierProducts: { items: SupplierProduct[] } }>(
        SUPPLIER_PRODUCTS_QUERY,
        { supplierId: supplier.id },
        token,
      );
      const chunks = await Promise.all(productData.supplierProducts.items.map(async (product) => {
        const data = await shopFetch<{
          getProductReviews: {
            items: Array<{
              id: string;
              productId: string;
              customerId: string;
              rating: number;
              title: string;
              body: string;
              helpfulCount: number;
              createdAt: string;
              status: string;
            }>;
          };
        }>(PRODUCT_REVIEWS_QUERY, { productId: product.id }, token);
        return data.getProductReviews.items
          .filter((review) => review.status === 'APPROVED')
          .map((review) => ({
            id: review.id,
            productId: review.productId,
            customerName: `Хэрэглэгч ${String(review.customerId).slice(-4)}`,
            rating: review.rating,
            title: review.title,
            body: review.body,
            product: product.name,
            date: new Date(review.createdAt).toLocaleDateString('mn-MN'),
            helpful: review.helpfulCount,
          }));
      }));
      setReviews(chunks.flat());
    } catch (err) {
      console.warn('[ReviewsScreen] reviews load failed', err instanceof Error ? err.message : err);
      setReviews([]);
      setError(err instanceof Error ? err.message : 'Сэтгэгдэл ачаалж чадсангүй');
    } finally {
      setLoading(false);
    }
  }, [supplier?.id, token]);

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  const filtered = reviews.filter((review) => filter === 'all' || review.rating === filter);
  const average = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0;
  const counts = useMemo(() => [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: reviews.filter((review) => review.rating === rating).length,
  })), [reviews]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Сэтгэгдэл</Text>
        <Text style={styles.subtitle}>Хэрэглэгчийн үнэлгээ, санал хүсэлт</Text>

        <View style={styles.summary}>
          <View style={styles.scoreBox}>
            <Text style={styles.score}>{average.toFixed(1)}</Text>
            <Stars rating={Math.round(average)} />
            <Text style={styles.scoreSub}>{reviews.length} сэтгэгдэл</Text>
          </View>
          <View style={styles.ratingBars}>
            {counts.map((item) => (
              <View key={item.rating} style={styles.ratingRow}>
                <Text style={styles.ratingLabel}>{item.rating}</Text>
                <Ionicons name="star" size={10} color={C.amber} />
                <View style={styles.ratingTrack}>
                  <View style={[styles.ratingFill, { width: `${reviews.length ? (item.count / reviews.length) * 100 : 0}%` }]} />
                </View>
                <Text style={styles.ratingCount}>{item.count}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.filters}>
          {(['all', 5, 4, 3, 2, 1] as const).map((item) => (
            <TouchableOpacity
              key={String(item)}
              style={[styles.filter, filter === item && styles.filterActive]}
              onPress={() => setFilter(item)}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterText, filter === item && styles.filterTextActive]}>
                {item === 'all' ? 'Бүгд' : `${item} од`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? <ActivityIndicator color={C.primary} /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {!loading && !error && filtered.length === 0 ? <Text style={styles.empty}>Сэтгэгдэл одоогоор алга.</Text> : null}

        {filtered.map((review) => (
          <View key={review.id} style={styles.reviewCard}>
            <View style={styles.reviewHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{review.customerName[0]}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.customer}>{review.customerName}</Text>
                <Text style={styles.product}>{review.product} · {review.date}</Text>
              </View>
              <Stars rating={review.rating} />
            </View>
            <Text style={styles.comment}>{review.title ? `${review.title}\n${review.body}` : review.body}</Text>
            <View style={styles.reviewActions}>
              <Text style={styles.helpful}>Тустай: {review.helpful}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <View style={styles.stars}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Ionicons key={index} name={index < rating ? 'star' : 'star-outline'} size={12} color={C.amber} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  content: { padding: 20, paddingBottom: 110 },
  title: { color: C.text, fontSize: 22, fontWeight: '900' },
  subtitle: { color: C.textSub, fontSize: 12, marginTop: 4, marginBottom: 18 },
  summary: { flexDirection: 'row', backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 16, gap: 16 },
  scoreBox: { width: 94, alignItems: 'center', justifyContent: 'center' },
  score: { color: C.primary, fontSize: 42, fontWeight: '900' },
  scoreSub: { color: C.textTertiary, fontSize: 10, marginTop: 5 },
  stars: { flexDirection: 'row', gap: 1 },
  ratingBars: { flex: 1, gap: 7 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ratingLabel: { color: C.textSub, fontSize: 11, width: 10 },
  ratingTrack: { flex: 1, height: 6, borderRadius: 99, backgroundColor: C.surface, overflow: 'hidden' },
  ratingFill: { height: '100%', backgroundColor: C.amber, borderRadius: 99 },
  ratingCount: { color: C.textTertiary, fontSize: 11, width: 12, textAlign: 'right' },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 18 },
  filter: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 99, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  filterActive: { backgroundColor: C.primary, borderColor: C.primary },
  filterText: { color: C.textSub, fontSize: 12, fontWeight: '800' },
  filterTextActive: { color: '#fff' },
  reviewCard: { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 10 },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,69,0,0.16)', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: C.primary, fontWeight: '900' },
  customer: { color: C.text, fontWeight: '900', fontSize: 13 },
  product: { color: C.textTertiary, fontSize: 10, marginTop: 2 },
  comment: { color: C.textSub, fontSize: 13, lineHeight: 19 },
  reviewActions: { flexDirection: 'row', gap: 18, marginTop: 12 },
  helpful: { color: C.textTertiary, fontSize: 12 },
  empty: { color: C.textSub, textAlign: 'center', paddingVertical: 28 },
  error: { color: C.red, textAlign: 'center', paddingVertical: 18 },
});
