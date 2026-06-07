// Shows the active delivery workflow with native maps on iOS and Android.
import { useMemo, useState } from 'react';
import { Alert, Linking, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { SUPPORT_PHONE } from '../config/contact';
import { useAuthStore } from '../store/auth';
import { useDeliveryStore } from '../store/delivery';
import { colors } from '../theme';

const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#08080E' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8888AA' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#08080E' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1A1A2E' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#050510' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
];

export default function DeliveryScreen() {
  const router = useRouter();
  const driver = useAuthStore((state) => state.driver);
  const activeOrder = useDeliveryStore((state) => state.activeOrder);
  const driverLocation = useDeliveryStore((state) => state.driverLocation);
  const updateStatus = useDeliveryStore((state) => state.updateStatus);
  const completeWithCode = useDeliveryStore((state) => state.completeWithCode);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [deliveryCode, setDeliveryCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [isCompleting, setIsCompleting] = useState(false);

  const points = useMemo(() => {
    if (!activeOrder) return [];
    return [
      { latitude: driverLocation.lat, longitude: driverLocation.lng },
      ...activeOrder.pickupStops.map((stop) => ({ latitude: stop.lat, longitude: stop.lng })),
      { latitude: activeOrder.dropoffLat, longitude: activeOrder.dropoffLng },
    ];
  }, [activeOrder, driverLocation]);

  if (!activeOrder || !driver) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.empty}>
          <Ionicons name="navigate-outline" size={70} color={colors.textTertiary} />
          <Text style={styles.emptyTitle}>Идэвхтэй захиалга байхгүй</Text>
          <Text style={styles.emptySub}>Нүүр хэсгээс онлайн болж шинэ захиалга хүлээн авна уу.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentStop = activeOrder.pickupStops[activeOrder.currentStop];
  const isHeadingCustomer = activeOrder.status === 'ON_THE_WAY';
  const instruction = isHeadingCustomer
    ? '✅ Бараа авч, хэрэглэгч рүү явна уу'
    : `📍 ${currentStop?.supplierName ?? 'Дэлгүүр'} руу явна уу`;
  const address = isHeadingCustomer ? activeOrder.dropoffAddress : currentStop?.address;
  const actionLabel = activeOrder.status === 'DRIVER_ASSIGNED'
    ? 'Дэлгүүрт ирлээ'
    : activeOrder.status === 'DRIVER_AT_STORE'
    ? 'Бараа авлаа ✓'
    : 'Хүргэлт дууслаа 🎉';
  const actionSubtitle = activeOrder.status === 'DRIVER_ASSIGNED'
    ? `${currentStop?.supplierName ?? 'Дэлгүүр'} дэлгүүрт ирсэн`
    : activeOrder.status === 'DRIVER_AT_STORE'
    ? 'Бүх барааг авсан эсэхийг шалгаарай'
    : 'Хэрэглэгчид хүргэсэн эсэхийг баталгаажуулна уу';

  const performAction = async () => {
    if (activeOrder.status === 'ON_THE_WAY') {
      setCodeError('');
      setShowCodeModal(true);
      return;
    }
    await Haptics.impactAsync(activeOrder.status === 'DRIVER_AT_STORE' ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Medium);
    try {
      await updateStatus(driver.id);
    } catch (error) {
      Alert.alert('Алдаа', error instanceof Error ? error.message : 'Хүргэлтийн төлөв шинэчлэхэд алдаа гарлаа');
    }
  };

  const finishWithCode = async () => {
    const code = deliveryCode.replace(/\D/g, '');
    if (code.length !== 6) {
      setCodeError('6 оронтой буулгах код оруулна уу');
      return;
    }
    setIsCompleting(true);
    setCodeError('');
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      await completeWithCode(driver.id, code);
      setShowCodeModal(false);
      setDeliveryCode('');
      router.push('/(tabs)/earnings');
    } catch (error) {
      setCodeError(error instanceof Error ? error.message : 'Буулгах код шалгахад алдаа гарлаа');
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        customMapStyle={DARK_MAP_STYLE}
        region={{
          latitude: driverLocation.lat,
          longitude: driverLocation.lng,
          latitudeDelta: 0.06,
          longitudeDelta: 0.06,
        }}
      >
        <Marker coordinate={{ latitude: driverLocation.lat, longitude: driverLocation.lng }} title="Жолооч">
          <View style={styles.driverMarker}><Ionicons name="car-sport" size={18} color={colors.white} /></View>
        </Marker>
        {activeOrder.pickupStops.map((stop, index) => (
          <Marker key={stop.supplierId} coordinate={{ latitude: stop.lat, longitude: stop.lng }} title={stop.supplierName}>
            <View style={[styles.stopMarker, stop.status === 'PICKED_UP' && styles.stopMarkerDone]}>
              <Text style={styles.markerText}>{stop.status === 'PICKED_UP' ? '✓' : index + 1}</Text>
            </View>
          </Marker>
        ))}
        <Marker coordinate={{ latitude: activeOrder.dropoffLat, longitude: activeOrder.dropoffLng }} title={activeOrder.customerName}>
          <View style={styles.customerMarker}><Ionicons name="home" size={16} color={colors.white} /></View>
        </Marker>
        <Polyline coordinates={points} strokeColor={colors.primary} strokeWidth={4} lineDashPattern={[8, 8]} />
      </MapView>

      <SafeAreaView edges={['top']} style={styles.overlayHeader}>
        <Text style={styles.orderNumber}>{activeOrder.orderNumber}</Text>
        <Badge label={activeOrder.status} tone={activeOrder.status === 'ON_THE_WAY' ? 'success' : 'primary'} />
      </SafeAreaView>

      <ScrollView style={styles.sheet} contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false}>
        <View style={styles.handle} />
        <Card style={styles.instructionCard}>
          <Text style={styles.instruction}>{instruction}</Text>
          <Text style={styles.instructionAddress}>{address}</Text>
        </Card>

        <Text style={styles.sectionTitle}>Хүргэлтийн зам</Text>
        {activeOrder.pickupStops.map((stop, index) => {
          const isCurrent = index === activeOrder.currentStop && activeOrder.status !== 'ON_THE_WAY';
          return (
            <Card key={stop.supplierId} style={styles.stopCard}>
              <TouchableOpacity style={styles.stopHeader} onPress={() => setExpanded((current) => ({ ...current, [stop.supplierId]: !current[stop.supplierId] }))}>
                <Text style={styles.stopStatus}>{stop.status === 'PICKED_UP' ? '✅' : isCurrent ? '🔄' : '⬜'}</Text>
                <View style={styles.stopBadge}><Text style={styles.stopBadgeText}>{index + 1}</Text></View>
                <View style={styles.stopContent}>
                  <Text style={styles.stopName}>{stop.supplierName}</Text>
                  <Text style={styles.stopAddress}>{stop.address}</Text>
                </View>
                <Ionicons name={expanded[stop.supplierId] ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSub} />
              </TouchableOpacity>
              {expanded[stop.supplierId] ? (
                <View style={styles.stopDetails}>
                  {stop.phone ? <TouchableOpacity onPress={() => Linking.openURL(`tel:${stop.phone}`)}><Text style={styles.phone}>📞 {stop.phone}</Text></TouchableOpacity> : null}
                  {stop.items.map((item) => <Text key={item.name} style={styles.itemText}>- {item.name} × {item.qty}</Text>)}
                </View>
              ) : null}
            </Card>
          );
        })}

        <Card style={styles.stopCard}>
          <View style={styles.stopHeader}>
            <Text style={styles.stopStatus}>{activeOrder.status === 'DELIVERED' ? '✅' : '⬜'}</Text>
            <View style={[styles.stopBadge, { backgroundColor: colors.success }]}><Ionicons name="home" size={14} color={colors.white} /></View>
            <View style={styles.stopContent}>
              <Text style={styles.stopName}>👤 {activeOrder.customerName}</Text>
              <Text style={styles.stopAddress}>📍 {activeOrder.dropoffAddress}</Text>
              {activeOrder.deliveryNote ? <Text style={styles.note}>📝 {activeOrder.deliveryNote}</Text> : null}
            </View>
            <TouchableOpacity onPress={() => Linking.openURL(`tel:${activeOrder.customerPhone}`)}>
              <Ionicons name="call" size={20} color={colors.success} />
            </TouchableOpacity>
          </View>
        </Card>

        <Button title={actionLabel} variant={activeOrder.status === 'ON_THE_WAY' ? 'success' : 'primary'} onPress={performAction} style={styles.actionButton} />
        <Text style={styles.actionSubtitle}>{actionSubtitle}</Text>
        <TouchableOpacity style={styles.helpButton} onPress={() => Linking.openURL(`tel:${SUPPORT_PHONE}`)}>
          <Text style={styles.helpText}>Тусламж авах</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showCodeModal} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.modalBackdrop}>
          <View style={styles.codeSheet}>
            <Text style={styles.codeTitle}>Буулгах код оруулах</Text>
            <Text style={styles.codeSub}>Хэрэглэгчээс 6 оронтой код аваад оруулснаар хүргэлт бүрэн дуусна.</Text>
            <TextInput
              value={deliveryCode}
              onChangeText={(text) => {
                setDeliveryCode(text.replace(/\D/g, '').slice(0, 6));
                setCodeError('');
              }}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="000000"
              placeholderTextColor={colors.textTertiary}
              style={styles.codeInput}
            />
            {codeError ? <Text style={styles.codeError}>{codeError}</Text> : null}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowCodeModal(false);
                  setDeliveryCode('');
                  setCodeError('');
                }}
                disabled={isCompleting}
              >
                <Text style={styles.cancelText}>Болих</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.finishButton} onPress={finishWithCode} disabled={isCompleting}>
                <Text style={styles.finishText}>{isCompleting ? 'Шалгаж байна...' : 'Дуусгах'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, backgroundColor: colors.bg },
  map: { height: '45%' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  emptyTitle: { color: colors.text, fontSize: 22, fontWeight: '900', marginTop: 16 },
  emptySub: { color: colors.textSub, fontSize: 14, lineHeight: 22, textAlign: 'center', marginTop: 8 },
  overlayHeader: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderNumber: { color: colors.text, fontFamily: 'Courier', fontWeight: '900', backgroundColor: 'rgba(8,8,14,0.72)', padding: 8, borderRadius: 12 },
  driverMarker: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.white },
  stopMarker: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.white },
  stopMarkerDone: { backgroundColor: colors.success },
  customerMarker: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.white },
  markerText: { color: colors.white, fontWeight: '900' },
  sheet: { flex: 1, marginTop: -24, backgroundColor: colors.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  sheetContent: { padding: 20, paddingBottom: 44 },
  handle: { width: 42, height: 4, backgroundColor: colors.borderHover, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  instructionCard: { padding: 16, borderLeftWidth: 4, borderLeftColor: colors.primary, marginBottom: 18 },
  instruction: { color: colors.text, fontSize: 18, fontWeight: '900', lineHeight: 24 },
  instructionAddress: { color: colors.textSub, fontSize: 13, lineHeight: 19, marginTop: 6 },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '900', marginBottom: 10 },
  stopCard: { padding: 13, marginBottom: 10 },
  stopHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stopStatus: { fontSize: 18 },
  stopBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  stopBadgeText: { color: colors.white, fontWeight: '900', fontSize: 12 },
  stopContent: { flex: 1 },
  stopName: { color: colors.text, fontSize: 14, fontWeight: '900' },
  stopAddress: { color: colors.textSub, fontSize: 12, lineHeight: 18, marginTop: 2 },
  stopDetails: { marginLeft: 62, marginTop: 10, gap: 4 },
  phone: { color: colors.success, fontSize: 13, fontWeight: '700' },
  itemText: { color: colors.textSub, fontSize: 12, lineHeight: 18 },
  note: { color: colors.warning, fontSize: 12, lineHeight: 18, marginTop: 4 },
  actionButton: { marginTop: 12, height: 58 },
  actionSubtitle: { color: colors.textSub, textAlign: 'center', marginTop: 8, fontSize: 12 },
  helpButton: { alignItems: 'center', paddingVertical: 16 },
  helpText: { color: colors.textSub, fontWeight: '800' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.72)', padding: 16 },
  codeSheet: { backgroundColor: '#111315', borderRadius: 26, borderWidth: 1, borderColor: colors.borderHover, padding: 20 },
  codeTitle: { color: colors.text, fontSize: 22, fontWeight: '900' },
  codeSub: { color: colors.textSub, fontSize: 13, lineHeight: 20, marginTop: 6 },
  codeInput: {
    marginTop: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderHover,
    backgroundColor: colors.surface,
    color: colors.text,
    fontFamily: 'Courier',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 8,
    paddingHorizontal: 18,
    paddingVertical: 14,
    textAlign: 'center',
  },
  codeError: { color: colors.error, fontSize: 12, fontWeight: '800', marginTop: 10, textAlign: 'center' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  cancelButton: { flex: 1, borderRadius: 16, borderWidth: 1, borderColor: colors.borderHover, paddingVertical: 14, alignItems: 'center' },
  cancelText: { color: colors.textSub, fontWeight: '900' },
  finishButton: { flex: 1, borderRadius: 16, backgroundColor: colors.primary, paddingVertical: 14, alignItems: 'center' },
  finishText: { color: colors.white, fontWeight: '900' },
});
