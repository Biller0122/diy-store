import { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Badge } from '../../src/components/Badge';
import { Card } from '../../src/components/Card';
import { useAuthStore } from '../../src/store/auth';
import { colors } from '../../src/theme';

type Period = 'today' | 'week' | 'month';

const labels: Record<Period, string> = {
  today: 'Өнөөдөр',
  week: 'Энэ 7 хоног',
  month: 'Энэ сар',
};

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card style={styles.summaryCard}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </Card>
  );
}

export default function EarningsScreen() {
  const driver = useAuthStore((state) => state.driver);
  const [period, setPeriod] = useState<Period>('today');
  const [selected, setSelected] = useState<{ id: string; orderNumber: string; date: string; from: string; to: string; amount: number; rating: number } | null>(null);
  const chart = period === 'today'
    ? [{ label: labels.today, amount: driver?.todayEarnings ?? 0 }]
    : [{ label: labels[period], amount: driver?.totalEarnings ?? 0 }];
  const max = Math.max(...chart.map((item) => item.amount), 1);
  const total = chart.reduce((sum, item) => sum + item.amount, 0);
  const deliveries = period === 'today' ? driver?.totalDeliveries ?? 0 : driver?.totalDeliveries ?? 0;
  const average = Math.round(total / deliveries);
  const history: Array<{ id: string; orderNumber: string; date: string; from: string; to: string; amount: number; rating: number }> = [];

  if (!driver) return null;

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
          <SummaryCard label="Нийт хүргэлт" value={String(deliveries)} />
          <SummaryCard label="Нийт орлого" value={`₮${total.toLocaleString()}`} />
          <SummaryCard label="Дундаж үнэлгээ" value={`⭐ ${driver.rating.toFixed(1)}`} />
          <SummaryCard label="Дундаж хүргэлт" value={`₮${Number.isFinite(average) ? average.toLocaleString() : '0'}`} />
        </View>

        <Card style={styles.chartCard}>
          <Text style={styles.sectionTitle}>Орлогын график</Text>
          <View style={styles.chart}>
            {chart.map((item) => (
              <TouchableOpacity key={item.label} style={styles.barWrap} activeOpacity={0.75}>
                <Text style={styles.tooltip}>₮{item.amount.toLocaleString()}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.bar, { height: `${Math.max(8, (item.amount / max) * 100)}%` }]} />
                </View>
                <Text style={styles.barLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        <Text style={styles.sectionTitle}>Хүргэлтийн түүх</Text>
        {history.map((item) => (
          <TouchableOpacity key={item.id} onPress={() => setSelected(item)} activeOpacity={0.82}>
            <Card style={styles.historyCard}>
              <View style={styles.historyLeft}>
                <Text style={styles.historyDate}>{item.date}</Text>
                <Text style={styles.historyRoute}>From: {item.from} → To: {item.to}</Text>
              </View>
              <View style={styles.historyRight}>
                <Text style={styles.historyAmount}>₮{item.amount.toLocaleString()}</Text>
                <Text style={styles.historyRating}>⭐ {item.rating}</Text>
              </View>
            </Card>
          </TouchableOpacity>
        ))}
        {history.length === 0 ? <Text style={styles.emptyText}>Хүргэлтийн түүх одоогоор байхгүй</Text> : null}

        <Card style={styles.payoutCard}>
          <View style={styles.payoutHeader}>
            <Text style={styles.sectionTitle}>Төлбөр авах</Text>
            <Badge label="Удахгүй" tone="warning" />
          </View>
          <Text style={styles.bank}>Банк: {driver.bankName ?? 'Хаан банк'} {driver.bankAccount ?? '5030001122'}</Text>
          <Text style={styles.editLink}>Банкны мэдээлэл засах</Text>
          <View style={styles.disabledButton}><Text style={styles.disabledText}>Төлбөр хүсэх</Text></View>
          <Text style={styles.minNote}>Хамгийн бага ₮50,000</Text>
        </Card>
      </ScrollView>

      <Modal visible={!!selected} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <Card style={styles.modalCard}>
            <Text style={styles.modalTitle}>{selected?.orderNumber}</Text>
            <Text style={styles.modalText}>Нийлүүлэгчид: {selected?.from}</Text>
            <Text style={styles.modalText}>Хаяг: {selected?.to}, хэрэглэгчийн хаяг</Text>
            <Text style={styles.modalText}>Бараа: Өрөм ×1, Будаг ×2</Text>
            <Text style={styles.modalFee}>₮{selected?.amount.toLocaleString()}</Text>
            <Text style={styles.modalText}>Үнэлгээ: ⭐ {selected?.rating}</Text>
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
  historyRating: { color: colors.warning, fontSize: 12, marginTop: 4 },
  emptyText: { color: colors.textSub, textAlign: 'center', paddingVertical: 18 },
  payoutCard: { padding: 16, marginTop: 12 },
  payoutHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bank: { color: colors.text, fontSize: 14, marginBottom: 10 },
  editLink: { color: colors.primary, fontWeight: '800', marginBottom: 12 },
  disabledButton: { height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)' },
  disabledText: { color: colors.textTertiary, fontWeight: '900' },
  minNote: { color: colors.textSub, fontSize: 12, textAlign: 'center', marginTop: 10 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'center', padding: 24 },
  modalCard: { padding: 18 },
  modalTitle: { color: colors.text, fontSize: 20, fontWeight: '900', marginBottom: 12 },
  modalText: { color: colors.textSub, fontSize: 14, lineHeight: 22 },
  modalFee: { color: colors.primary, fontSize: 32, fontFamily: 'Courier', fontWeight: '900', marginVertical: 12 },
  closeButton: { position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
});
