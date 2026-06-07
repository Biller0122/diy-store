import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { C } from '@/lib/colors';
import { DIY_GUIDES } from '@/lib/marketplace';

export default function HowToScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>DIY Заавар</Text>
          <Text style={styles.subtitle}>Зөв бараагаа хурдан сонгоход тусална</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {DIY_GUIDES.map((guide) => (
          <TouchableOpacity
            key={guide.title}
            style={styles.card}
            onPress={() => router.push(`/(tabs)/search?query=${encodeURIComponent(guide.query)}` as never)}
            activeOpacity={0.86}
          >
            <Text style={styles.emoji}>{guide.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{guide.title}</Text>
              <View style={styles.meta}>
                <Ionicons name="time-outline" size={12} color={C.textTertiary} />
                <Text style={styles.metaText}>{guide.readTime} уншлага</Text>
              </View>
            </View>
            <Ionicons name="arrow-forward" size={17} color={C.primary} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 14 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: C.text, fontSize: 22, fontWeight: '900' },
  subtitle: { color: C.textSub, fontSize: 12, marginTop: 2 },
  content: { padding: 16, gap: 12, paddingBottom: 30 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.card,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
  },
  emoji: { fontSize: 35, width: 46, textAlign: 'center' },
  cardTitle: { color: C.text, fontSize: 14, fontWeight: '800', lineHeight: 20 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 7 },
  metaText: { color: C.textTertiary, fontSize: 11 },
});
