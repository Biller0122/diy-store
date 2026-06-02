import { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../src/components/Card';
import { getDriverDeliveryHistory, getDriverEarnings, type DriverDeliveryHistoryResult } from '../../src/api/client';
import { useAuthStore } from '../../src/store/auth';
import { colors } from '../../src/theme';

type Period = 'today' | 'week' | 'month';

const labels: Record<Period, string> = {
  today: 'Өнөөдөр',
  week: 'Энэ 7 хоног',
  month: 'Энэ сар',
};

const periodParam: Record<Period, string> = {
  today: 'today',
  week: 'week',
  month: 'month',
};

type EarningsData = {
  totalDeliveries: number;
  totalEarned: number;
  averageRating: number;
  averagePerDelivery: number;
  chart: Array<{ label: string; amount: number; count: number }>;
  history: Array<{
    id: string;
    orderNumber: string;
    date: string;
    supplierDistrict: string;
    customerDistrict: string;
    customerAddress: string;
    fee: number;
    rating: number;
  }>;
};

type HistoryItem = {
  id: string;
  orderNumber: string;
  date: string;
  customerName: string;
  supplierDistrict: string;
  customerDistrict: string;
  customerAddress: string;
  fee: number;
  rating: number | null;
  status: 'COMPLETED' | 'CANCELLED';
  distance: number;
  pickups: number;
  items: string;
};

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card style={styles.summaryCard}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </Card>
  );
}

function formatMoney(amount: number) {
  return `₮${Math.round(amount / 100).toLocaleString()}`;
}

function toHistoryItem(item: DriverDeliveryHistoryResult): HistoryItem {
  const pickup = item.pickupStops[0];
  const supplierDistrict = pickup?.district || pickup?.address?.split(',')[0]?.trim() || 'Нийлүүлэгч';
  const customerDistrict = item.dropoffAddress?.split(',')[0]?.trim() || 'Хэрэглэгч';
  return {
    id: item.id,
    orderNumber: item.orderNumber || item.id,
    date: new Date(item.updatedAt).toLocaleString('mn-MN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
    customerName: item.customerName || 'Хэрэглэгч',
    supplierDistrict,
    customerDistrict,
    customerAddress: item.dropoffAddress,
    fee: item.finalFee || item.proposedFee || 0,
    rating: item.status === 'COMPLETED' ? 5 : null,
    status: item.status,
    distance: item.distance,
    pickups: item.pickupStops.length,
    items: item.orderItems.map((orderItem) => `${orderItem.name} ×${orderItem.qty}`).join(', '),
  };
}

export default function EarningsScreen() {
  const driver = useAuthStore((state) => state.driver);
  const [period, setPeriod] = useState<Period>('today');
  const [data, setData] = useState<EarningsData | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selected, setSelected] = useState<HistoryItem | null>(null);

  useEffect(() => {
    if (!driver) return;
    setLoading(true);
    getDriverEarnings(driver.id, periodParam[period])
      .then((result) => {
        const earnings = (result as { getDriverEarnings: EarningsData }).getDriverEarnings;
        setData(earnings ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [driver, period]);

  useEffect(() => {
    if (!driver) return;
    setHistoryLoading(true);
    getDriverDeliveryHistory(driver.id, 50)
      .then((result) => {
        setHistory(result.deliveryHistoryForDriver.map(toHistoryItem));
      })
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false));
  }, [driver]);

  if (!driver) return null;

  const chart = data?.chart ?? [{ label: labels[period], amount: 0, count: 0 }];
  const max = Math.max(...chart.map((item) => item.amount), 1);
  const total = data?.totalEarned ?? 0;
  const deliveries = data?.totalDeliveries ?? 0;
  const averageRating = data?.averageRating ?? driver.rating;
  const averagePerDelivery = data?.averagePerDelivery ?? 0;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>Орлого</Text>
        <View style={styles.periodRow}>
          {(Object.keys(labels) as Period[]).map((key) => (
            <TouchableOpacity key={key} style={[styles.periodPill, period === key && styles.periodPillActive]} onPress={() => setPeriod(key)}>
              <Text style={[styles.periodText, period === key && styles.periodTextActive]}>{labels[key]}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.summaryGrid}>
          <SummaryCard label="Нийт хүргэлт" value={loading ? '…' : String(deliveries)} />
          <SummaryCard label="Нийт орлого" value={loading ? '…' : formatMoney(total)} />
          <SummaryCard label="Дундаж үнэлгээ" value={loading ? '…' : `⭐ ${averageRating.toFixed(1)}`} />
          <SummaryCard label="Дундаж хүргэлт" value={loading ? '…' : formatMoney(averagePerDelivery)} />
        </View>

        <Card style={styles.chartCard}>
          <Text style={styles.sectionTitle}>Орлогын график</Text>
          <View style={styles.chart}>
            {chart.map((item) => (
              <TouchableOpacity key={item.label} style={styles.barWrap} activeOpacity={0.75}>
                <Text style={styles.tooltip}>{formatMoney(item.amount)}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.bar, { height: `${Math.max(8, (item.amount / max) * 100)}%` }]} />
                </View>
                <Text style={styles.barLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        <Text style={styles.sectionTitle}>Хүргэлтийн түүх</Text>
        {historyLoading ? (
          <Text style={styles.emptyText}>Уншиж байна…</Text>
        ) : history.length === 0 ? (
          <Text style={styles.emptyText}>Хүргэлтийн түүх одоогоор байхгүй</Text>
        ) : (
          history.map((item) => (
            <TouchableOpacity key={item.id} onPress={() => setSelected(item)} activeOpacity={0.82}>
              <Card style={styles.historyCard}>
                <View style={styles.historyLeft}>
                  <Text style={styles.historyDate}>{item.date}</Text>
                  <Text style={styles.historyRoute}>{item.supplierDistrict} → {item.customerDistrict}</Text>
                </View>
                <View style={styles.historyRight}>
                  <Text style={[styles.historyAmount, item.status === 'CANCELLED' && styles.cancelledAmount]}>
                    {item.status === 'CANCELLED' ? 'Цуцлагдсан' : formatMoney(item.fee)}
                  </Text>
                  <Text style={styles.historyRating}>{item.status === 'COMPLETED' ? `⭐ ${item.rating ?? driver.rating}` : `${item.distance} км`}</Text>
                </View>
              </Card>
            </TouchableOpacity>
          ))
        )}

        <Card style={styles.payoutCard}>
          <Text style={styles.sectionTitle}>Банкны данс</Text>
          <Text style={styles.bank}>Банк: {driver.bankName ?? '—'} {driver.bankAccount ?? '—'}</Text>
        </Card>
      </ScrollView>

      <Modal visible={!!selected} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <Card style={styles.modalCard}>
            <Text style={styles.modalTitle}>{selected?.orderNumber}</Text>
            <Text style={styles.modalText}>Төлөв: {selected?.status === 'COMPLETED' ? 'Хүргэгдсэн' : 'Цуцлагдсан'}</Text>
            <Text style={styles.modalText}>Хэрэглэгч: {selected?.customerName}</Text>
            <Text style={styles.modalText}>Нийлүүлэгч: {selected?.supplierDistrict}</Text>
            <Text style={styles.modalText}>Хаяг: {selected?.customerAddress}</Text>
            <Text style={styles.modalText}>Бараа: {selected?.items || '—'}</Text>
            <Text style={styles.modalText}>Зай: {selected?.distance} км · {selected?.pickups} дэлгүүр</Text>
            <Text style={styles.modalFee}>{selected?.status === 'COMPLETED' ? formatMoney(selected?.fee ?? 0) : 'Цуцлагдсан'}</Text>
            <Text style={styles.modalText}>Үнэлгээ: {selected?.rating ? `⭐ ${selected.rating}` : '—'}</Text>
            <TouchableOpacity style={styles.closeButton} onPress={() => setSelected(null)}>
              <Ionicons name="close" size={20} color={colors.white} />
            </TouchableOpacity>
          </Card>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 38 },
  heading: { color: colors.text, fontSize: 28, fontWeight: '900', marginBottom: 18 },
  periodRow: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  periodPill: { flex: 1, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  periodPillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  periodText: { color: colors.textSub, fontSize: 12, fontWeight: '800' },
  periodTextActive: { color: colors.white },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 18 },
  summaryCard: { width: '48.5%', padding: 15 },
  summaryValue: { color: colors.primary, fontFamily: 'Courier', fontSize: 20, fontWeight: '900' },
  summaryLabel: { color: colors.textSub, fontSize: 11, marginTop: 6 },
  chartCard: { padding: 16, marginBottom: 22 },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '900', marginBottom: 12 },
  chart: { height: 160, flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  barWrap: { flex: 1, height: '100%', alignItems: 'center' },
  tooltip: { color: colors.textSub, fontSize: 9, height: 18 },
  barTrack: { flex: 1, width: '100%', justifyContent: 'flex-end' },
  bar: { width: '100%', backgroundColor: colors.primary, borderTopLeftRadius: 8, borderTopRightRadius: 8 },
  barLabel: { color: colors.textSub, fontSize: 11, fontWeight: '700', marginTop: 6 },
  historyCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, marginBottom: 9 },
  historyLeft: { flex: 1 },
  historyDate: { color: colors.textSub, fontSize: 12 },
  historyRoute: { color: colors.text, fontSize: 13, fontWeight: '700', marginTop: 4 },
  historyRight: { alignItems: 'flex-end' },
  historyAmount: { color: colors.primary, fontFamily: 'Courier', fontSize: 15, fontWeight: '900' },
  cancelledAmount: { color: colors.error, fontFamily: 'System', fontSize: 12 },
  historyRating: { color: colors.warning, fontSize: 12, marginTop: 4 },
  emptyText: { color: colors.textSub, textAlign: 'center', paddingVertical: 18 },
  payoutCard: { padding: 16, marginTop: 12 },
  bank: { color: colors.text, fontSize: 14, marginBottom: 10 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'center', padding: 24 },
  modalCard: { padding: 18 },
  modalTitle: { color: colors.text, fontSize: 20, fontWeight: '900', marginBottom: 12 },
  modalText: { color: colors.textSub, fontSize: 14, lineHeight: 22 },
  modalFee: { color: colors.primary, fontSize: 32, fontFamily: 'Courier', fontWeight: '900', marginVertical: 12 },
  closeButton: { position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
});
