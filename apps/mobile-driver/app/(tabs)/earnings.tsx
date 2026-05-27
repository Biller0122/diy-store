import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useDriverStore } from '../../lib/store';

const C = {
  bg: '#08080E',
  card: '#0F0F1A',
  surface: '#161625',
  primary: '#FF4500',
  success: '#00D4AA',
  warning: '#FFB547',
  border: 'rgba(255,255,255,0.06)',
  text: '#F5F5FF',
  textSub: '#8888AA',
  textTertiary: '#55556A',
};

type Period = 'today' | 'week' | 'month';

const PERIOD_LABELS: Record<Period, string> = {
  today: 'Өнөөдөр',
  week: '7 хоног',
  month: 'Сар',
};

const WEEK_DATA = [
  { day: 'Да', earnings: 32000, count: 4 },
  { day: 'Мя', earnings: 45000, count: 6 },
  { day: 'Лх', earnings: 28000, count: 3 },
  { day: 'Пү', earnings: 56000, count: 7 },
  { day: 'Ба', earnings: 41000, count: 5 },
  { day: 'Бя', earnings: 78000, count: 10 },
  { day: 'Ня', earnings: 45000, count: 6 },
];

const MOCK_HISTORY = [
  { id: '1', date: 'Өнөөдөр 14:32', address: 'Баянзүрх → Хан-Уул', fee: 8500, km: 6.2, status: 'Дууссан' },
  { id: '2', date: 'Өнөөдөр 11:15', address: 'СБД → Баянгол', fee: 5000, km: 3.8, status: 'Дууссан' },
  { id: '3', date: 'Өчигдөр 18:44', address: 'Чингэлтэй → Сүхбаатар', fee: 4200, km: 2.9, status: 'Дууссан' },
  { id: '4', date: 'Өчигдөр 15:20', address: 'Баянзүрх → СБД', fee: 7800, km: 5.5, status: 'Дууссан' },
  { id: '5', date: 'Өчигдөр 10:05', address: 'Налайх → Баянзүрх', fee: 18000, km: 18.1, status: 'Дууссан' },
];

const PERIOD_STATS: Record<Period, { deliveries: number; earnings: number }> = {
  today: { deliveries: 6, earnings: 45000 },
  week: { deliveries: 41, earnings: 325000 },
  month: { deliveries: 143, earnings: 1120000 },
};

const maxEarnings = Math.max(...WEEK_DATA.map((d) => d.earnings));

export default function EarningsScreen() {
  const driver = useDriverStore((s) => s.driver);
  const [period, setPeriod] = useState<Period>('today');

  if (!driver) return null;

  const stats = PERIOD_STATS[period];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>Орлого</Text>

        {/* Period selector */}
        <View style={styles.periodRow}>
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.periodPill, period === p && styles.periodPillActive]}
              onPress={() => setPeriod(p)}
              activeOpacity={0.8}
            >
              <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
                {PERIOD_LABELS[p]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Big stats cards */}
        <View style={styles.bigStatsRow}>
          <View style={styles.bigCard}>
            <Ionicons name="bicycle-outline" size={20} color={C.textSub} />
            <Text style={styles.bigValue}>{stats.deliveries}</Text>
            <Text style={styles.bigLabel}>Хүргэлт</Text>
          </View>
          <View style={[styles.bigCard, styles.bigCardPrimary]}>
            <Ionicons name="wallet-outline" size={20} color={C.primary} />
            <Text style={[styles.bigValue, { color: C.primary }]}>
              ₮{stats.earnings.toLocaleString()}
            </Text>
            <Text style={styles.bigLabel}>Нийт орлого</Text>
          </View>
        </View>

        {/* Bar chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>7 хоногийн орлого</Text>
          <View style={styles.chartBars}>
            {WEEK_DATA.map((item) => {
              const heightPct = maxEarnings > 0 ? (item.earnings / maxEarnings) * 100 : 0;
              return (
                <View key={item.day} style={styles.barWrapper}>
                  <View style={styles.barContainer}>
                    <View
                      style={[
                        styles.bar,
                        { height: `${heightPct}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.barLabel}>{item.day}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* History */}
        <Text style={styles.historyTitle}>Хүргэлтийн түүх</Text>
        <View style={styles.historyCard}>
          {MOCK_HISTORY.map((item, idx) => (
            <View
              key={item.id}
              style={[
                styles.historyItem,
                idx < MOCK_HISTORY.length - 1 && styles.historyItemBorder,
              ]}
            >
              <View style={styles.historyLeft}>
                <View style={styles.historyIcon}>
                  <Ionicons name="checkmark-circle" size={18} color={C.success} />
                </View>
                <View>
                  <Text style={styles.historyAddress}>{item.address}</Text>
                  <Text style={styles.historyMeta}>{item.date} · {item.km} км</Text>
                </View>
              </View>
              <View style={styles.historyRight}>
                <Text style={styles.historyFee}>+₮{item.fee.toLocaleString()}</Text>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>{item.status}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  content: { padding: 20, paddingBottom: 32 },
  heading: { fontSize: 26, fontWeight: '900', color: C.text, marginBottom: 20 },

  periodRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  periodPill: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: C.card,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  periodPillActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  periodText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.textSub,
  },
  periodTextActive: {
    color: '#fff',
  },

  bigStatsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  bigCard: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: C.border,
  },
  bigCardPrimary: {
    borderColor: 'rgba(255,69,0,0.2)',
    backgroundColor: 'rgba(255,69,0,0.05)',
  },
  bigValue: {
    fontSize: 22,
    fontWeight: '900',
    color: C.text,
  },
  bigLabel: {
    fontSize: 12,
    color: C.textSub,
  },

  chartCard: {
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: C.border,
  },
  chartTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: C.textSub,
    marginBottom: 16,
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 100,
    gap: 6,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
  },
  barContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
    marginBottom: 4,
  },
  bar: {
    width: '100%',
    backgroundColor: C.primary,
    borderRadius: 4,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 10,
    color: C.textSub,
    fontWeight: '600',
  },

  historyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: C.text,
    marginBottom: 12,
  },
  historyCard: {
    backgroundColor: C.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  historyItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  historyIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,212,170,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyAddress: {
    fontSize: 13,
    fontWeight: '600',
    color: C.text,
  },
  historyMeta: {
    fontSize: 11,
    color: C.textSub,
    marginTop: 2,
  },
  historyRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  historyFee: {
    fontSize: 14,
    fontWeight: '800',
    color: C.success,
  },
  statusBadge: {
    backgroundColor: 'rgba(0,212,170,0.1)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusText: {
    fontSize: 10,
    color: C.success,
    fontWeight: '700',
  },
});
