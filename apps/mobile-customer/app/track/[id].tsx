import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { C } from '@/lib/colors';
import { shopFetch, DELIVERY_REQUEST_QUERY } from '@/lib/api';

interface DeliveryRequest {
  id: string;
  orderId: string;
  orderNumber: string;
  status: string;
  driverId: string | null;
  driverLat: number | null;
  driverLng: number | null;
  dropoffAddress: string;
  dropoffLat: number;
  dropoffLng: number;
  estimatedDuration: number;
  finalFee: number;
  proposedFee: number;
  createdAt: string;
}

const STATUS_INFO: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  SEARCHING: {
    label: 'Жолооч хайж байна...',
    icon: 'search-outline',
    color: '#FFB547',
    bg: 'rgba(255,181,71,0.15)',
  },
  OFFERED: {
    label: 'Жолоочид санал илгээлээ',
    icon: 'notifications-outline',
    color: '#6482FF',
    bg: 'rgba(100,130,255,0.15)',
  },
  ACCEPTED: {
    label: 'Жолооч хүлээн авсан',
    icon: 'checkmark-circle-outline',
    color: '#00D4AA',
    bg: 'rgba(0,212,170,0.15)',
  },
  IN_PROGRESS: {
    label: 'Хүргэлт явагдаж байна',
    icon: 'bicycle-outline',
    color: '#6482FF',
    bg: 'rgba(100,130,255,0.15)',
  },
  COMPLETED: {
    label: 'Амжилттай хүргэгдлээ ✅',
    icon: 'checkmark-done-circle-outline',
    color: '#00D4AA',
    bg: 'rgba(0,212,170,0.15)',
  },
  CANCELLED: {
    label: 'Цуцлагдсан',
    icon: 'close-circle-outline',
    color: '#FF4444',
    bg: 'rgba(255,68,68,0.15)',
  },
  TIMEOUT: {
    label: 'Жолооч олдсонгүй',
    icon: 'time-outline',
    color: '#FF4444',
    bg: 'rgba(255,68,68,0.15)',
  },
};

const STEPS = [
  { key: 'SEARCHING', label: 'Жолооч хайж байна' },
  { key: 'ACCEPTED', label: 'Жолооч хүлээн авсан' },
  { key: 'IN_PROGRESS', label: 'Хүргэлт явагдаж байна' },
  { key: 'COMPLETED', label: 'Хүргэгдлээ' },
];

const STEP_ORDER = ['SEARCHING', 'OFFERED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED'];

function getStepIndex(status: string) {
  return STEP_ORDER.indexOf(status);
}

function formatFee(fee: number) {
  if (!fee) return '—';
  return '₮' + Math.round(fee).toLocaleString('mn-MN');
}

export default function TrackScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [delivery, setDelivery] = useState<DeliveryRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchDelivery = useCallback(async () => {
    if (!id) return;
    try {
      const data = await shopFetch<{ deliveryRequest: DeliveryRequest | null }>(
        DELIVERY_REQUEST_QUERY,
        { orderId: id }
      );
      if (data.deliveryRequest) {
        setDelivery(data.deliveryRequest);
      }
    } catch {
      // keep previous state
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDelivery();
    pollRef.current = setInterval(fetchDelivery, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchDelivery]);

  useEffect(() => {
    if (delivery && (delivery.status === 'COMPLETED' || delivery.status === 'CANCELLED' || delivery.status === 'TIMEOUT')) {
      if (pollRef.current) clearInterval(pollRef.current);
    }
  }, [delivery?.status]);

  const statusInfo = delivery ? (STATUS_INFO[delivery.status] ?? STATUS_INFO.SEARCHING) : STATUS_INFO.SEARCHING;
  const stepIndex = delivery ? getStepIndex(delivery.status) : 0;

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
        <View style={styles.navHeader}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={C.text} />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Захиалгын явц</Text>
          <TouchableOpacity style={styles.backBtn} onPress={fetchDelivery}>
            <Ionicons name="refresh-outline" size={20} color={C.text} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={C.primary} size="large" />
          <Text style={styles.loadingText}>Мэдээлэл ачааллаж байна...</Text>
        </View>
      ) : !delivery ? (
        <View style={styles.loadingBox}>
          <Ionicons name="alert-circle-outline" size={48} color={C.textTertiary} />
          <Text style={styles.notFoundText}>Хүргэлтийн мэдээлэл олдсонгүй</Text>
          <Text style={styles.notFoundSub}>Захиалга бүртгэгдээгүй байж болзошгүй</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={fetchDelivery}
          >
            <Text style={styles.retryBtnText}>Дахин оролдох</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Status hero */}
          <View style={[styles.statusCard, { backgroundColor: statusInfo.bg, borderColor: statusInfo.color + '33' }]}>
            <View style={[styles.statusIconBox, { backgroundColor: statusInfo.color + '22' }]}>
              <Ionicons name={statusInfo.icon as never} size={36} color={statusInfo.color} />
            </View>
            <Text style={[styles.statusLabel, { color: statusInfo.color }]}>{statusInfo.label}</Text>
            <Text style={styles.orderNumber}>#{delivery.orderNumber}</Text>
          </View>

          {/* Progress steps */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Хүргэлтийн явц</Text>
            {STEPS.map((step, i) => {
              const done = stepIndex >= getStepIndex(step.key);
              const current = step.key === delivery.status;
              return (
                <View key={step.key} style={styles.stepRow}>
                  <View style={styles.stepLeft}>
                    <View style={[styles.stepDot, done && styles.stepDotDone, current && styles.stepDotCurrent]}>
                      {done ? (
                        <Ionicons name="checkmark" size={12} color="#fff" />
                      ) : (
                        <View style={styles.stepDotInner} />
                      )}
                    </View>
                    {i < STEPS.length - 1 && (
                      <View style={[styles.stepLine, done && styles.stepLineDone]} />
                    )}
                  </View>
                  <Text style={[styles.stepLabel, done && styles.stepLabelDone, current && styles.stepLabelCurrent]}>
                    {step.label}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Delivery details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Хүргэлтийн мэдээлэл</Text>
            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={16} color={C.primary} />
              <View style={styles.detailText}>
                <Text style={styles.detailLabel}>Хүргэх хаяг</Text>
                <Text style={styles.detailValue}>{delivery.dropoffAddress || 'Хаяг тодорхойгүй'}</Text>
              </View>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={16} color={C.warning} />
              <View style={styles.detailText}>
                <Text style={styles.detailLabel}>Тооцоолсон хугацаа</Text>
                <Text style={styles.detailValue}>{delivery.estimatedDuration} минут</Text>
              </View>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="cash-outline" size={16} color={C.success} />
              <View style={styles.detailText}>
                <Text style={styles.detailLabel}>Хүргэлтийн хөлс</Text>
                <Text style={styles.detailValue}>
                  {delivery.finalFee > 0 ? formatFee(delivery.finalFee) : formatFee(delivery.proposedFee)}
                </Text>
              </View>
            </View>
            {delivery.driverId && (
              <View style={styles.detailRow}>
                <Ionicons name="bicycle-outline" size={16} color={C.primary} />
                <View style={styles.detailText}>
                  <Text style={styles.detailLabel}>Жолооч</Text>
                  <Text style={styles.detailValue}>Жолооч #{delivery.driverId}</Text>
                </View>
              </View>
            )}
          </View>

          {/* Auto-refresh notice */}
          {delivery.status !== 'COMPLETED' && delivery.status !== 'CANCELLED' && (
            <View style={styles.refreshNotice}>
              <ActivityIndicator color={C.textTertiary} size="small" />
              <Text style={styles.refreshText}>5 секунд тутам шинэчлэгдэж байна</Text>
            </View>
          )}

          {delivery.status === 'COMPLETED' && (
            <TouchableOpacity
              style={styles.doneBtn}
              onPress={() => router.push('/(tabs)/orders' as never)}
            >
              <Text style={styles.doneBtnText}>Захиалгуудруу буцах</Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  navTitle: { color: C.text, fontSize: 18, fontWeight: '700' },

  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  loadingText: { color: C.textSub, fontSize: 14 },
  notFoundText: { color: C.text, fontSize: 16, fontWeight: '600' },
  notFoundSub: { color: C.textSub, fontSize: 13, textAlign: 'center' },
  retryBtn: {
    backgroundColor: C.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 8,
  },
  retryBtnText: { color: '#fff', fontWeight: '700' },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 16 },

  statusCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    gap: 10,
  },
  statusIconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statusLabel: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  orderNumber: { color: C.textSub, fontSize: 13, fontFamily: 'monospace' },

  section: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    gap: 0,
  },
  sectionTitle: { color: C.text, fontSize: 15, fontWeight: '700', marginBottom: 16 },

  stepRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 0, minHeight: 48 },
  stepLeft: { alignItems: 'center', width: 24, marginRight: 12 },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: C.surface,
    borderWidth: 2,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotDone: { backgroundColor: C.success, borderColor: C.success },
  stepDotCurrent: { borderColor: C.primary },
  stepDotInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.border },
  stepLine: { width: 2, flex: 1, backgroundColor: C.border, marginTop: 2, marginBottom: 2, minHeight: 20 },
  stepLineDone: { backgroundColor: C.success },
  stepLabel: { flex: 1, color: C.textTertiary, fontSize: 14, paddingTop: 4, paddingBottom: 12 },
  stepLabelDone: { color: C.textSub },
  stepLabelCurrent: { color: C.text, fontWeight: '600' },

  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: C.border },
  detailText: { flex: 1, gap: 2 },
  detailLabel: { color: C.textTertiary, fontSize: 11 },
  detailValue: { color: C.text, fontSize: 13, fontWeight: '500' },

  refreshNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  refreshText: { color: C.textTertiary, fontSize: 12 },

  doneBtn: {
    backgroundColor: C.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  doneBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
