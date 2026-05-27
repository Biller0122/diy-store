import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const C = {
  bg: '#08080E',
  card: '#0F0F1A',
  surface: '#161625',
  primary: '#FF4500',
  success: '#00D4AA',
  border: 'rgba(255,255,255,0.06)',
  text: '#F5F5FF',
  textSub: '#8888AA',
  textTertiary: '#55556A',
};

export default function NewProductScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');

  const save = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={C.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Бараа нэмэх</Text>
          <View style={styles.iconBtn} />
        </View>

        <View style={styles.imageDrop}>
          <Ionicons name="image-outline" size={34} color={C.primary} />
          <Text style={styles.imageText}>Зураг сонгох</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Барааны нэр</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Жишээ: Цахилгаан дрилл"
            placeholderTextColor={C.textTertiary}
          />

          <Text style={styles.label}>Үнэ</Text>
          <TextInput
            style={styles.input}
            value={price}
            onChangeText={setPrice}
            placeholder="₮ үнэ"
            placeholderTextColor={C.textTertiary}
            keyboardType="number-pad"
          />

          <Text style={styles.label}>Нөөц</Text>
          <TextInput
            style={styles.input}
            value={stock}
            onChangeText={setStock}
            placeholder="Тоо ширхэг"
            placeholderTextColor={C.textTertiary}
            keyboardType="number-pad"
          />
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={save} activeOpacity={0.85}>
          <Text style={styles.saveText}>Хадгалах</Text>
        </TouchableOpacity>
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
  title: { color: C.text, fontSize: 22, fontWeight: '900' },
  imageDrop: {
    height: 150,
    borderRadius: 22,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,69,0,0.35)',
    backgroundColor: 'rgba(255,69,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  imageText: { color: C.textSub, marginTop: 8, fontWeight: '700' },
  card: { backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.border, padding: 16, gap: 10 },
  label: { color: C.textSub, fontSize: 12, fontWeight: '700', marginTop: 6 },
  input: {
    height: 54,
    borderRadius: 14,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    color: C.text,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  saveBtn: {
    height: 56,
    borderRadius: 16,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '900' },
});
