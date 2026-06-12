import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { C } from '@/lib/colors';
import { useAppStore } from '@/lib/store';
import {
  shopFetch,
  ACTIVE_ORDER_QUERY,
  SET_SHIPPING_ADDRESS_MUTATION,
  CREATE_DELIVERY_REQUEST_MUTATION,
} from '@/lib/api';

interface CreatedDeliveryRequest {
  id: string;
  orderId: string;
  orderNumber: string;
  trackingToken: string;
  status: string;
}

interface OrderLine {
  id: string;
  quantity: number;
  linePriceWithTax: number;
  productVariant: {
    id: string;
    name: string;
    priceWithTax: number;
    product: { name: string };
  };
}

interface ActiveOrder {
  id: string;
  code: string;
  state: string;
  subTotal: number;
  total: number;
  lines: OrderLine[];
}

function formatPrice(price: number) {
  return '₮' + Math.round(price / 100).toLocaleString('mn-MN');
}

const UB_DISTRICTS = [
  'Баянзүрх',
  'Баянгол',
  'Сүхбаатар',
  'Чингэлтэй',
  'Хан-Уул',
  'Сонгинохайрхан',
  'Налайх',
  'Багануур',
  'Багахангай',
];

const DEFAULT_UB_COORDS = { lat: 47.9189, lng: 106.9176 };

const PAYMENT_METHODS = [
  { id: 'cash', label: 'Бэлнээр', icon: 'cash-outline' as const, available: true },
  { id: 'qpay', label: 'QPay', icon: 'qr-code-outline' as const, available: false },
  { id: 'card', label: 'Карт', icon: 'card-outline' as const, available: false },
];

export default function CheckoutScreen() {
  const router = useRouter();
  const { customer, supplierCart, clearSupplierCart } = useAppStore();

  const [order, setOrder] = useState<ActiveOrder | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [fullName, setFullName] = useState(
    customer ? `${customer.firstName} ${customer.lastName}`.trim() : ''
  );
  const [phone, setPhone] = useState(customer?.phoneNumber ?? '');
  const [district, setDistrict] = useState('Баянзүрх');
  const [khoroo, setKhoroo] = useState('');
  const [streetDetail, setStreetDetail] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [dropoffCoords, setDropoffCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState('');

  useEffect(() => {
    shopFetch<{ activeOrder: ActiveOrder | null }>(ACTIVE_ORDER_QUERY)
      .then((d) => setOrder(d.activeOrder))
      .catch((error) => {
        console.error('[CheckoutScreen] active order load failed', error);
        Alert.alert('Сагсны мэдээлэл ачаалсангүй', error instanceof Error ? error.message : 'Сүлжээний алдаа гарлаа');
      })
      .finally(() => setLoadingOrder(false));
  }, []);

  const dropoffAddress = `${district}, ${khoroo ? khoroo + '-р хороо, ' : ''}${streetDetail}`.trim().replace(/,\s*$/, '');

  const requestDropoffLocation = async () => {
    setLocationLoading(true);
    setLocationError('');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        const message = 'Хүргэлтийн бодит байршил авахын тулд байршлын зөвшөөрөл хэрэгтэй';
        setLocationError(message);
        Alert.alert('Байршлын зөвшөөрөл хэрэгтэй', message);
        return null;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const coords = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
      setDropoffCoords(coords);
      return coords;
    } catch (error) {
      console.error('[CheckoutScreen] current location failed', error);
      const message = error instanceof Error ? error.message : 'Байршил авах боломжгүй байна';
      setLocationError(message);
      Alert.alert('Байршил авах боломжгүй', message);
      return null;
    } finally {
      setLocationLoading(false);
    }
  };

  const geocodeDropoffAddress = async () => {
    try {
      const matches = await Location.geocodeAsync(`${dropoffAddress}, Улаанбаатар, Монгол`);
      const match = matches[0];
      if (!match) return null;
      const coords = { lat: match.latitude, lng: match.longitude };
      setDropoffCoords(coords);
      setLocationError('');
      return coords;
    } catch (error) {
      console.error('[CheckoutScreen] geocode failed', error);
      return null;
    }
  };

  const confirmAddressWithoutPreciseLocation = () =>
    new Promise<boolean>((resolve) => {
      Alert.alert(
        'Байршлыг баталгаажуулах',
        'GPS эсвэл geocode-оор хаягийг тогтоож чадсангүй. Оруулсан хаяг зөв гэдгийг баталгаажуулаад захиалгыг үргэлжлүүлэх үү?',
        [
          { text: 'Засах', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Үргэлжлүүлэх', onPress: () => resolve(true) },
        ],
      );
    });

  const resolveDropoffCoords = async () => {
    if (dropoffCoords) return dropoffCoords;
    const current = await requestDropoffLocation();
    if (current) return current;
    const geocoded = await geocodeDropoffAddress();
    if (geocoded) return geocoded;
    const confirmed = await confirmAddressWithoutPreciseLocation();
    if (!confirmed) return null;
    setLocationError('Нарийн координатгүй, баталгаажуулсан хаягаар илгээж байна.');
    return DEFAULT_UB_COORDS;
  };

  const handlePlaceOrder = async () => {
    if (!customer) {
      Alert.alert('Нэвтэрнэ үү', 'Захиалахын тулд нэвтэрнэ үү');
      return;
    }
    if ((!order || order.lines.length === 0) && supplierCart.length === 0) {
      Alert.alert('Сагс хоосон', 'Эхлээд бүтээгдэхүүн нэмнэ үү');
      return;
    }
    if (!fullName.trim() || !phone.trim() || !streetDetail.trim()) {
      Alert.alert('Дутуу мэдээлэл', 'Нэр, утас, хаяг бүгдийг бөглөнө үү');
      return;
    }
    if (paymentMethod !== 'cash') {
      Alert.alert('Төлбөрийн арга идэвхгүй', 'Одоогоор mobile checkout дээр зөвхөн бэлэн төлбөр ажиллаж байна.');
      return;
    }

    setSubmitting(true);
    try {
      if (order) {
        await shopFetch(SET_SHIPPING_ADDRESS_MUTATION, {
          input: {
            streetLine1: dropoffAddress,
            city: 'Улаанбаатар',
            phoneNumber: phone.trim(),
          },
        });
      }

      const supplierGroups = new Map<string, typeof supplierCart>();
      for (const item of supplierCart) {
        const next = supplierGroups.get(item.supplierId) ?? [];
        next.push(item);
        supplierGroups.set(item.supplierId, next);
      }

      const pickupStops = Array.from(supplierGroups.values()).map((items) => {
        const first = items[0];
        if (first.supplierLat == null || first.supplierLng == null) {
          throw new Error(`${first.supplierName} дэлгүүрийн байршил тохируулагдаагүй байна`);
        }
        return {
          supplierId: first.supplierId,
          supplierName: first.supplierName,
          district: first.supplierDistrict ?? 'Улаанбаатар',
          address: first.supplierAddress || first.supplierDistrict || 'Улаанбаатар',
          phone: first.supplierPhone || '',
          lat: first.supplierLat,
          lng: first.supplierLng,
          status: 'PENDING',
        };
      });

      const orderItems = supplierCart.map((item) => ({
        supplierId: item.supplierId,
        supplierName: item.supplierName,
        productId: item.productId,
        variantId: item.variantId,
        name: item.name,
        sku: item.slug,
        qty: item.qty,
        price: item.price,
      }));

      const supplierTotal = supplierCart.reduce((sum, item) => sum + item.price * item.qty, 0);
      const orderId = order?.id ?? `MOB-${Date.now()}`;
      const resolvedDropoffCoords = await resolveDropoffCoords();
      if (!resolvedDropoffCoords) {
        return;
      }

      const data = await shopFetch<{ createDeliveryRequest: CreatedDeliveryRequest }>(CREATE_DELIVERY_REQUEST_MUTATION, {
        orderId,
        customerId: customer.id,
        customerName: fullName.trim(),
        customerPhone: phone.trim(),
        pickupStops,
        orderItems,
        dropoffAddress,
        dropoffLat: resolvedDropoffCoords.lat,
        dropoffLng: resolvedDropoffCoords.lng,
        orderTotal: Math.round((order?.total ?? 0) / 100) + supplierTotal,
        paymentMethod,
      });

      clearSupplierCart();
      const delivery = data.createDeliveryRequest;
      const trackId = delivery.orderNumber || orderId;
      const trackPath = delivery.trackingToken
        ? `/track/${trackId}?t=${encodeURIComponent(delivery.trackingToken)}`
        : `/track/${trackId}`;
      router.replace(trackPath as never);
    } catch (e) {
      console.error('[CheckoutScreen] place order failed', e);
      Alert.alert('Алдаа', e instanceof Error ? e.message : 'Захиалга хийх боломжгүй');
    } finally {
      setSubmitting(false);
    }
  };

  if (!customer) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.navHeader}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={C.text} />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Захиалах</Text>
          <View style={{ width: 38 }} />
        </View>
        <View style={styles.centeredBox}>
          <Text style={styles.centeredText}>Захиалахын тулд нэвтэрнэ үү</Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.push('/(tabs)/account' as never)}
          >
            <Text style={styles.primaryBtnText}>Нэвтрэх</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loadingOrder) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.navHeader}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={C.text} />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Захиалах</Text>
          <View style={{ width: 38 }} />
        </View>
        <View style={styles.centeredBox}>
          <ActivityIndicator color={C.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  const supplierTotal = supplierCart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const displayTotal = (order?.total ?? 0) + supplierTotal * 100;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.navHeader}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={C.text} />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Захиалах</Text>
          <View style={{ width: 38 }} />
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Order summary */}
        {((order && order.lines.length > 0) || supplierCart.length > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Захиалга</Text>
            {order?.lines.map((line) => (
              <View key={line.id} style={styles.lineRow}>
                <Text style={styles.lineName} numberOfLines={1}>
                  {line.productVariant.product.name}
                </Text>
                <Text style={styles.lineQty}>×{line.quantity}</Text>
                <Text style={styles.linePrice}>{formatPrice(line.linePriceWithTax)}</Text>
              </View>
            ))}
            {supplierCart.map((item) => (
              <View key={item.id} style={styles.lineRow}>
                <Text style={styles.lineName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.lineQty}>x{item.qty}</Text>
                <Text style={styles.linePrice}>{'₮' + Math.round(item.price * item.qty).toLocaleString('mn-MN')}</Text>
              </View>
            ))}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Нийт</Text>
              <Text style={styles.totalValue}>
                {formatPrice((order?.total ?? 0) + supplierCart.reduce((sum, item) => sum + item.price * item.qty, 0) * 100)}
              </Text>
            </View>
          </View>
        )}

        {/* Delivery address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Хүргэлтийн хаяг</Text>

          <Text style={styles.inputLabel}>Нэр</Text>
          <TextInput
            style={styles.input}
            placeholder="Бат-Эрдэнэ Дорж"
            placeholderTextColor={C.textTertiary}
            value={fullName}
            onChangeText={setFullName}
          />

          <Text style={styles.inputLabel}>Утас</Text>
          <TextInput
            style={styles.input}
            placeholder="9900 0000"
            placeholderTextColor={C.textTertiary}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />

          <Text style={styles.inputLabel}>Дүүрэг</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
            <View style={styles.chipsRow}>
              {UB_DISTRICTS.map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[styles.chip, district === d && styles.chipActive]}
                  onPress={() => setDistrict(d)}
                >
                  <Text style={[styles.chipText, district === d && styles.chipTextActive]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <Text style={styles.inputLabel}>Хороо (тоогоор)</Text>
          <TextInput
            style={styles.input}
            placeholder="12"
            placeholderTextColor={C.textTertiary}
            value={khoroo}
            onChangeText={setKhoroo}
            keyboardType="number-pad"
          />

          <Text style={styles.inputLabel}>Гудамж / байр / тасалгаа</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            placeholder="Сүхбаатарын гудамж 15, 301 тасалгаа"
            placeholderTextColor={C.textTertiary}
            value={streetDetail}
            onChangeText={setStreetDetail}
            multiline
            numberOfLines={2}
          />

          {dropoffAddress.length > 3 && (
            <View style={styles.addressPreview}>
              <Ionicons name="location-outline" size={14} color={C.primary} />
              <Text style={styles.addressPreviewText} numberOfLines={2}>{dropoffAddress}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.locationBtn, locationLoading && styles.locationBtnDisabled]}
            onPress={requestDropoffLocation}
            disabled={locationLoading}
          >
            {locationLoading ? (
              <ActivityIndicator color={C.primary} />
            ) : (
              <Ionicons name={dropoffCoords ? 'checkmark-circle-outline' : 'navigate-outline'} size={18} color={dropoffCoords ? C.success : C.primary} />
            )}
            <Text style={[styles.locationBtnText, dropoffCoords && styles.locationBtnTextSuccess]}>
              {dropoffCoords ? 'Бодит байршил авсан' : 'Одоогийн байршил авах'}
            </Text>
          </TouchableOpacity>
          {locationError ? <Text style={styles.locationError}>{locationError}</Text> : null}
        </View>

        {/* Payment method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Төлбөрийн хэлбэр</Text>
          <View style={styles.paymentRow}>
            {PAYMENT_METHODS.map((m) => (
              <TouchableOpacity
                key={m.id}
                style={[
                  styles.paymentCard,
                  paymentMethod === m.id && styles.paymentCardActive,
                  !m.available && styles.paymentCardDisabled,
                ]}
                onPress={() => {
                  if (!m.available) {
                    Alert.alert('Тун удахгүй', `${m.label} төлбөр mobile checkout дээр хараахан идэвхгүй байна.`);
                    return;
                  }
                  setPaymentMethod(m.id);
                }}
                disabled={!m.available}
              >
                <Ionicons
                  name={m.icon}
                  size={22}
                  color={!m.available ? C.textTertiary : paymentMethod === m.id ? C.primary : C.textSub}
                />
                <Text style={[styles.paymentLabel, paymentMethod === m.id && styles.paymentLabelActive]}>
                  {m.label}
                </Text>
                {!m.available ? <Text style={styles.paymentUnavailable}>Тун удахгүй</Text> : null}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
        <View style={styles.bottomInner}>
          <View>
            <Text style={styles.bottomLabel}>Нийт дүн</Text>
            <Text style={styles.bottomTotal}>
              {displayTotal > 0 ? formatPrice(displayTotal) : '—'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.placeOrderBtn, submitting && styles.placeOrderBtnDisabled]}
            onPress={handlePlaceOrder}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.placeOrderText}>Захиалах</Text>
                <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: C.bg },
  safe: { backgroundColor: C.bg },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
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
  navTitle: { flex: 1, color: C.text, fontSize: 18, fontWeight: '700', textAlign: 'center' },

  centeredBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  centeredText: { color: C.textSub, fontSize: 16 },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 16 },

  section: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    gap: 10,
  },
  sectionTitle: { color: C.text, fontSize: 16, fontWeight: '700', marginBottom: 4 },

  lineRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  lineName: { flex: 1, color: C.textSub, fontSize: 13 },
  lineQty: { color: C.textTertiary, fontSize: 12 },
  linePrice: { color: C.text, fontSize: 13, fontWeight: '600', fontFamily: 'monospace', minWidth: 80, textAlign: 'right' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 10,
    marginTop: 4,
  },
  totalLabel: { color: C.text, fontSize: 14, fontWeight: '700' },
  totalValue: { color: C.primary, fontSize: 16, fontWeight: '800', fontFamily: 'monospace' },

  inputLabel: { color: C.textSub, fontSize: 12, fontWeight: '600', marginTop: 4 },
  input: {
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: C.text,
    fontSize: 14,
  },
  inputMultiline: { height: 64, textAlignVertical: 'top', paddingTop: 10 },

  chipsScroll: { marginVertical: 4 },
  chipsRow: { flexDirection: 'row', gap: 8, paddingRight: 8 },
  chip: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: C.surface,
  },
  chipActive: { borderColor: C.primary, backgroundColor: C.primaryGlow },
  chipText: { color: C.textSub, fontSize: 13 },
  chipTextActive: { color: C.primary, fontWeight: '600' },

  addressPreview: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: C.primaryGlow,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,69,0,0.2)',
  },
  addressPreviewText: { flex: 1, color: C.text, fontSize: 12, lineHeight: 18 },
  locationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.primaryGlow,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,69,0,0.24)',
    paddingVertical: 12,
    marginTop: 4,
  },
  locationBtnDisabled: { opacity: 0.7 },
  locationBtnText: { color: C.primary, fontSize: 13, fontWeight: '700' },
  locationBtnTextSuccess: { color: C.success },
  locationError: { color: '#FF4444', fontSize: 12, lineHeight: 18 },

  paymentRow: { flexDirection: 'row', gap: 10 },
  paymentCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  paymentCardActive: { borderColor: C.primary, backgroundColor: C.primaryGlow },
  paymentCardDisabled: { opacity: 0.45 },
  paymentLabel: { color: C.textSub, fontSize: 12, fontWeight: '600' },
  paymentLabelActive: { color: C.primary },
  paymentUnavailable: { color: C.textTertiary, fontSize: 10, fontWeight: '600' },

  primaryBtn: {
    backgroundColor: C.primary,
    borderRadius: 14,
    paddingHorizontal: 36,
    paddingVertical: 13,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  bottomBar: {
    backgroundColor: C.card,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  bottomInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  bottomLabel: { color: C.textTertiary, fontSize: 11, marginBottom: 2 },
  bottomTotal: { color: C.primary, fontSize: 20, fontWeight: '800', fontFamily: 'monospace' },
  placeOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.primary,
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 14,
    minWidth: 140,
    justifyContent: 'center',
  },
  placeOrderBtnDisabled: { opacity: 0.6 },
  placeOrderText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
