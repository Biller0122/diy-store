import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { SUPPLIER_ORDERS_QUERY, shopFetch } from '@/lib/api';
import { useSupplierStore } from '@/lib/store';
import { SupplierOrder } from '@/lib/types';

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
  red: '#EF4444',
};

function formatPrice(cents: number) {
  return '₮' + Math.round(cents / 100).toLocaleString('mn-MN');
}

function monthLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Тодорхойгүй';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export default function RevenueScreen() {
  const supplier = useSupplierStore((s) => s.supplier);
  const [orders, setOrders] = useState<SupplierOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const commissionRate = 10;

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    shopFetch<{ supplierOrders: { items: SupplierOrder[] } }>(SUPPLIER_ORDERS_QUERY, { skip: 0, take: 100 })
      .then((data) => {
        if (mounted) {
          setOrders(data.supplierOrders.items);
          setError('');
        }
      })
      .catch((err) => {
        if (mounted) setError(err instanceof Error ? err.message : 'Орлого татахад алдаа гарлаа');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const deliveredOrders = orders.filter((order) => order.state !== 'Cancelled');
  const totalRevenue = deliveredOrders.reduce((sum, order) => sum + order.total, 0);
  const payout = Math.round(totalRevenue * (100 - commissionRate) / 100);
  const commission = totalRevenue - payout;
  const averageOrder = deliveredOrders.length ? Math.round(totalRevenue / deliveredOrders.length) : 0;

  const monthly = useMemo(() => {
    const map = new Map<string, { month: string; revenue: number; orders: number }>();
    for (const order of deliveredOrders) {
      const key = monthLabel(order.createdAt);
      const row = map.get(key) ?? { month: key, revenue: 0, orders: 0 };
      row.revenue += order.total;
      row.orders += 1;
      map.set(key, row);
    }
    return Array.from(map.values()).sort((a, b) => b.month.localeCompare(a.month)).slice(0, 6);
  }, [deliveredOrders]);

  const maxRevenue = Math.max(1, ...monthly.map((row) => row.revenue));

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Орлого & төлбөр</Text>
            <Text style={styles.subtitle}>{supplier?.businessName || 'Нийлүүлэгч'} · Комисс {commissionRate}%</Text>
          </View>
          {loading ? <ActivityIndicator color={C.primary} /> : null}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.grid}>
          <Metric icon="trending-up-outline" label="Нийт борлуулалт" value={formatPrice(totalRevenue)} tone={C.primary} />
          <Metric icon="wallet-outline" label="Таны авах" value={formatPrice(payout)} tone={C.success} />
          <Metric icon="card-outline" label="Платформ комисс" value={formatPrice(commission)} tone={C.textSub} />
          <Metric icon="receipt-outline" label="Дундаж захиалга" value={formatPrice(averageOrder)} tone={C.warning} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Сарын орлого</Text>
          {monthly.length === 0 ? (
            <Text style={styles.empty}>Одоогоор орлогын өгөгдөл алга</Text>
          ) : (
            monthly.map((row) => (
              <View key={row.month} style={styles.monthRow}>
                <View style={styles.monthInfo}>
                  <Text style={styles.month}>{row.month}</Text>
                  <Text style={styles.monthSub}>{row.orders} захиалга</Text>
                </View>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${Math.max(8, (row.revenue / maxRevenue) * 100)}%` }]} />
                </View>
                <Text style={styles.monthValue}>{formatPrice(row.revenue)}</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Төлбөрийн түүх</Text>
          {monthly.filter((row) => row.revenue > 0).map((row) => (
            <View key={`pay-${row.month}`} style={styles.payoutRow}>
              <View style={styles.payoutIcon}>
                <Ionicons name="arrow-up-outline" size={16} color={C.success} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.payoutTitle}>{row.month} тооцоо</Text>
                <Text style={styles.payoutSub}>Банк тохируулаагүй</Text>
              </View>
              <Text style={styles.payoutAmount}>{formatPrice(Math.round(row.revenue * 0.9))}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Metric({ icon, label, value, tone }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; tone: string }) {
  return (
    <View style={styles.metric}>
      <View style={[styles.metricIcon, { backgroundColor: tone + '18' }]}>
        <Ionicons name={icon} size={18} color={tone} />
      </View>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  content: { padding: 20, paddingBottom: 110 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  title: { color: C.text, fontSize: 22, fontWeight: '900' },
  subtitle: { color: C.textSub, fontSize: 12, marginTop: 4 },
  error: { color: C.red, marginBottom: 12, fontSize: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  metric: { width: '48%', backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 14 },
  metricIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  metricLabel: { color: C.textSub, fontSize: 11, marginBottom: 6 },
  metricValue: { color: C.text, fontSize: 16, fontWeight: '900' },
  card: { backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 16, marginBottom: 14 },
  cardTitle: { color: C.text, fontSize: 16, fontWeight: '900', marginBottom: 14 },
  empty: { color: C.textTertiary, textAlign: 'center', paddingVertical: 20 },
  monthRow: { marginBottom: 14 },
  monthInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 },
  month: { color: C.text, fontWeight: '800', fontSize: 13 },
  monthSub: { color: C.textTertiary, fontSize: 11 },
  barTrack: { height: 8, borderRadius: 99, backgroundColor: C.surface, overflow: 'hidden', marginBottom: 6 },
  barFill: { height: '100%', borderRadius: 99, backgroundColor: C.primary },
  monthValue: { color: C.textSub, fontSize: 12, textAlign: 'right' },
  payoutRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  payoutIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: 'rgba(0,212,170,0.12)', alignItems: 'center', justifyContent: 'center' },
  payoutTitle: { color: C.text, fontWeight: '800', fontSize: 13 },
  payoutSub: { color: C.textTertiary, fontSize: 11, marginTop: 2 },
  payoutAmount: { color: C.success, fontWeight: '900', fontSize: 13 },
});
