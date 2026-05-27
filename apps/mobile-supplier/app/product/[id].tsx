import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

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
};

export default function SupplierProductDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={C.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Барааны дэлгэрэнгүй</Text>
          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="create-outline" size={20} color={C.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.hero}>
          <Ionicons name="cube-outline" size={48} color={C.primary} />
        </View>

        <View style={styles.card}>
          <Text style={styles.kicker}>ID: {id}</Text>
          <Text style={styles.name}>Нийлүүлэгчийн бараа</Text>
          <Text style={styles.desc}>Үнэ, нөөц, төлөв болон хувилбаруудыг эндээс удирдана.</Text>

          <View style={styles.row}>
            <Text style={styles.label}>Төлөв</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Идэвхтэй</Text>
            </View>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Нөөц</Text>
            <Text style={styles.value}>15 ширхэг</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Үнэ</Text>
            <Text style={[styles.value, { color: C.primary }]}>₮12,500</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  content: { padding: 20, paddingBottom: 36 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
  },
  title: { color: C.text, fontSize: 18, fontWeight: '900' },
  hero: {
    height: 180,
    borderRadius: 24,
    backgroundColor: 'rgba(255,69,0,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,69,0,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  card: { backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.border, padding: 18 },
  kicker: { color: C.textTertiary, fontSize: 12, marginBottom: 6 },
  name: { color: C.text, fontSize: 22, fontWeight: '900' },
  desc: { color: C.textSub, fontSize: 14, lineHeight: 21, marginTop: 8, marginBottom: 18 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  label: { color: C.textSub, fontSize: 13 },
  value: { color: C.text, fontSize: 15, fontWeight: '800' },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99, backgroundColor: 'rgba(0,212,170,0.12)' },
  badgeText: { color: C.success, fontSize: 12, fontWeight: '800' },
});
