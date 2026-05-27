import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const C = {
  bg: '#08080E',
  card: '#0F0F1A',
  text: '#F5F5FF',
  textSub: '#8888AA',
  textTertiary: '#55556A',
  border: 'rgba(255,255,255,0.06)',
};

export default function DeliveryWebScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.mapPlaceholder}>
          <Text style={styles.mapEmoji}>🗺️</Text>
          <Text style={styles.mapTitle}>Газрын зураг</Text>
          <Text style={styles.mapSub}>
            Газрын зургийг мобайл апп дээр харна уу
          </Text>
        </View>
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            Хүргэлтийн дэлгэрэнгүй мэдээлэл болон газрын зураг нь iOS болон Android апп дээр дэмжигдэнэ.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  mapPlaceholder: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: C.card,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 16,
  },
  mapEmoji: { fontSize: 64, marginBottom: 12 },
  mapTitle: { fontSize: 20, fontWeight: '800', color: C.textSub },
  mapSub: { fontSize: 13, color: C.textTertiary, marginTop: 6, textAlign: 'center' },
  infoCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    width: '100%',
  },
  infoText: { fontSize: 14, color: C.textSub, lineHeight: 22, textAlign: 'center' },
});
