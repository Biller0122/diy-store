import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const C = {
  bg: '#08080E',
  card: '#0F0F1A',
  surface: '#161625',
  primary: '#FF4500',
  success: '#00D4AA',
  amber: '#FFB547',
  border: 'rgba(255,255,255,0.06)',
  text: '#F5F5FF',
  textSub: '#8888AA',
  textTertiary: '#55556A',
};

const REVIEWS = [
  { id: 'r1', customerName: 'Дорж Б.', rating: 5, comment: 'Маш сайн бараа, хурдан хүргэлт. Дахин авна.', product: 'Dulux EasyCare 4L', date: '2026-06-10', helpful: 12 },
  { id: 'r2', customerName: 'Ганаа Н.', rating: 4, comment: 'Үнэ боломжийн, савлагаа сайн байна.', product: 'Цахилгаан кабель', date: '2026-06-08', helpful: 5 },
  { id: 'r3', customerName: 'Сарнай О.', rating: 3, comment: 'Бараа сайн ч хүргэлт удаан байсан.', product: 'Будгийн сойз', date: '2026-06-04', helpful: 3 },
  { id: 'r4', customerName: 'Болд Э.', rating: 5, comment: 'Зөвлөгөө сайн өгсөн, бараа тайлбартайгаа таарсан.', product: 'Перфоратор', date: '2026-06-01', helpful: 9 },
];

type Filter = 'all' | 5 | 4 | 3 | 2 | 1;

export default function ReviewsScreen() {
  const [filter, setFilter] = useState<Filter>('all');
  const filtered = REVIEWS.filter((review) => filter === 'all' || review.rating === filter);
  const average = REVIEWS.reduce((sum, review) => sum + review.rating, 0) / REVIEWS.length;
  const counts = useMemo(() => [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: REVIEWS.filter((review) => review.rating === rating).length,
  })), []);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Сэтгэгдэл</Text>
        <Text style={styles.subtitle}>Хэрэглэгчийн үнэлгээ, санал хүсэлт</Text>

        <View style={styles.summary}>
          <View style={styles.scoreBox}>
            <Text style={styles.score}>{average.toFixed(1)}</Text>
            <Stars rating={Math.round(average)} />
            <Text style={styles.scoreSub}>{REVIEWS.length} сэтгэгдэл</Text>
          </View>
          <View style={styles.ratingBars}>
            {counts.map((item) => (
              <View key={item.rating} style={styles.ratingRow}>
                <Text style={styles.ratingLabel}>{item.rating}</Text>
                <Ionicons name="star" size={10} color={C.amber} />
                <View style={styles.ratingTrack}>
                  <View style={[styles.ratingFill, { width: `${(item.count / REVIEWS.length) * 100}%` }]} />
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
            <Text style={styles.comment}>{review.comment}</Text>
            <View style={styles.reviewActions}>
              <Text style={styles.helpful}>Тустай: {review.helpful}</Text>
              <Text style={styles.reply}>Хариулах</Text>
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
  reply: { color: C.primary, fontSize: 12, fontWeight: '900' },
});
