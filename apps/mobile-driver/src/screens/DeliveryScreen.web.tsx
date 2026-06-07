// Shows a web-safe active delivery fallback without native map modules.
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { useAuthStore } from '../store/auth';
import { useDeliveryStore } from '../store/delivery';
import { colors } from '../theme';

export default function DeliveryWebFallback() {
  const driver = useAuthStore((state) => state.driver);
  const activeOrder = useDeliveryStore((state) => state.activeOrder);
  const updateStatus = useDeliveryStore((state) => state.updateStatus);
  const completeWithCode = useDeliveryStore((state) => state.completeWithCode);
  const [deliveryCode, setDeliveryCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [saving, setSaving] = useState(false);

  if (!activeOrder || !driver) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.empty}>
          <Ionicons name="navigate-outline" size={70} color={colors.textTertiary} />
          <Text style={styles.emptyTitle}>Идэвхтэй захиалга байхгүй</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{activeOrder.orderNumber}</Text>
        <Card style={styles.mapFallback}>
          <Text style={styles.mapText}>Газрын зураг native app дээр харагдана</Text>
        </Card>
        {activeOrder.pickupStops.map((stop, index) => (
          <Card key={stop.supplierId} style={styles.card}>
            <Text style={styles.stop}>{index + 1}. {stop.supplierName}</Text>
            <Text style={styles.muted}>{stop.address}</Text>
          </Card>
        ))}
        <Card style={styles.card}>
          <Text style={styles.stop}>👤 {activeOrder.customerName}</Text>
          <Text style={styles.muted}>{activeOrder.dropoffAddress}</Text>
        </Card>
        {activeOrder.status === 'ON_THE_WAY' ? (
          <Card style={styles.card}>
            <Text style={styles.stop}>Буулгах код</Text>
            <Text style={styles.muted}>Хэрэглэгчээс 6 оронтой код аваад хүргэлтээ дуусгана.</Text>
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
            {codeError ? <Text style={styles.error}>{codeError}</Text> : null}
            <Button
              title={saving ? 'Шалгаж байна...' : 'Хүргэлт дуусгах'}
              onPress={async () => {
                setSaving(true);
                setCodeError('');
                try {
                  await completeWithCode(driver.id, deliveryCode);
                } catch (error) {
                  setCodeError(error instanceof Error ? error.message : 'Буулгах код шалгахад алдаа гарлаа');
                } finally {
                  setSaving(false);
                }
              }}
            />
          </Card>
        ) : (
          <Button
            title={activeOrder.status === 'DRIVER_AT_STORE' ? 'Бараа авлаа ✓' : 'Дэлгүүрт ирлээ'}
            onPress={async () => {
              try {
                await updateStatus(driver.id);
              } catch (error) {
                Alert.alert('Алдаа', error instanceof Error ? error.message : 'Хүргэлтийн төлөв шинэчлэхэд алдаа гарлаа');
              }
            }}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 40 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: colors.text, fontSize: 22, fontWeight: '900', marginTop: 16 },
  title: { color: colors.text, fontSize: 24, fontWeight: '900', marginBottom: 14 },
  mapFallback: { height: 220, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  mapText: { color: colors.textSub, fontWeight: '800' },
  card: { padding: 14, marginBottom: 10 },
  stop: { color: colors.text, fontSize: 15, fontWeight: '900' },
  muted: { color: colors.textSub, fontSize: 13, marginTop: 4 },
  codeInput: {
    marginVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderHover,
    backgroundColor: colors.surface,
    color: colors.text,
    fontFamily: 'Courier',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 8,
    padding: 12,
    textAlign: 'center',
  },
  error: { color: colors.error, fontSize: 12, fontWeight: '800', marginBottom: 10, textAlign: 'center' },
});
