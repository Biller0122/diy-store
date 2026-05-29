import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { useAuthStore } from '../../src/store/auth';
import { useDeliveryStore } from '../../src/store/delivery';
import { colors } from '../../src/theme';

export default function DeliveryWebFallback() {
  const driver = useAuthStore((state) => state.driver);
  const activeOrder = useDeliveryStore((state) => state.activeOrder);
  const updateStatus = useDeliveryStore((state) => state.updateStatus);

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
        <Button title={activeOrder.status === 'ON_THE_WAY' ? 'Хүргэлт дууслаа 🎉' : activeOrder.status === 'DRIVER_AT_STORE' ? 'Бараа авлаа ✓' : 'Дэлгүүрт ирлээ'} onPress={() => updateStatus(driver.id)} />
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
});
