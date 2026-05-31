import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { CREATE_SUPPLIER_PRODUCT_MUTATION, shopFetch } from '@/lib/api';
import { useSupplierStore } from '@/lib/store';

const C = {
  bg: '#08080E',
  card: '#0F0F1A',
  surface: '#161625',
  primary: '#FF4500',
  success: '#00D4AA',
  red: '#EF4444',
  border: 'rgba(255,255,255,0.06)',
  text: '#F5F5FF',
  textSub: '#8888AA',
  textTertiary: '#55556A',
};

function makeSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9\u0400-\u04ff-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function NewProductScreen() {
  const router = useRouter();
  const supplier = useSupplierStore((s) => s.supplier);
  const token = useSupplierStore((s) => s.token);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const slug = useMemo(() => makeSlug(name), [name]);

  const pickImage = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Зураг сонгох зөвшөөрөл хэрэгтэй');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.65,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      if (asset.base64) {
        setImage(`data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`);
      } else {
        setImage(asset.uri);
      }
      setError('');
    }
  };

  const save = async () => {
    setError('');
    const parsedPrice = Number(price.replace(/\D/g, ''));
    const parsedStock = Number(stock.replace(/\D/g, ''));
    if (!supplier?.id) {
      setError('Нэвтрэлтийн мэдээлэл олдсонгүй');
      return;
    }
    if (name.trim().length < 2) {
      setError('Барааны нэр оруулна уу');
      return;
    }
    if (!parsedPrice) {
      setError('Үнэ зөв оруулна уу');
      return;
    }
    if (Number.isNaN(parsedStock) || parsedStock < 0) {
      setError('Нөөц зөв оруулна уу');
      return;
    }

    setSaving(true);
    try {
      await shopFetch(
        CREATE_SUPPLIER_PRODUCT_MUTATION,
        {
          input: {
            supplierId: supplier.id,
            name: name.trim(),
            slug,
            description: description.trim(),
            category: category.trim(),
            image,
            price: parsedPrice * 100,
            stock: parsedStock,
            enabled: true,
          },
        },
        token,
      );
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Бараа хадгалахад алдаа гарлаа');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSaving(false);
    }
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

        <TouchableOpacity style={styles.imageDrop} onPress={pickImage} activeOpacity={0.8}>
          {image ? (
            <Image source={{ uri: image }} style={styles.previewImage} />
          ) : (
            <>
              <Ionicons name="image-outline" size={34} color={C.primary} />
              <Text style={styles.imageText}>Төхөөрөмжөөс зураг сонгох</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.card}>
          <Text style={styles.label}>Барааны нэр</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Жишээ: Цахилгаан дрилл" placeholderTextColor={C.textTertiary} />

          <Text style={styles.label}>Ангилал</Text>
          <TextInput style={styles.input} value={category} onChangeText={setCategory} placeholder="Жишээ: Багаж" placeholderTextColor={C.textTertiary} />

          <Text style={styles.label}>Үнэ</Text>
          <TextInput style={styles.input} value={price} onChangeText={setPrice} placeholder="₮ үнэ" placeholderTextColor={C.textTertiary} keyboardType="number-pad" />

          <Text style={styles.label}>Нөөц</Text>
          <TextInput style={styles.input} value={stock} onChangeText={setStock} placeholder="Тоо ширхэг" placeholderTextColor={C.textTertiary} keyboardType="number-pad" />

          <Text style={styles.label}>Тайлбар</Text>
          <TextInput style={[styles.input, styles.textArea]} value={description} onChangeText={setDescription} placeholder="Барааны товч тайлбар" placeholderTextColor={C.textTertiary} multiline />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity style={[styles.saveBtn, saving && styles.disabled]} onPress={save} activeOpacity={0.85} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Хадгалах</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  content: { padding: 20, paddingBottom: 36 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  iconBtn: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  title: { color: C.text, fontSize: 22, fontWeight: '900' },
  imageDrop: { height: 170, borderRadius: 22, borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(255,69,0,0.35)', backgroundColor: 'rgba(255,69,0,0.06)', alignItems: 'center', justifyContent: 'center', marginBottom: 18, overflow: 'hidden' },
  previewImage: { width: '100%', height: '100%' },
  imageText: { color: C.textSub, marginTop: 8, fontWeight: '700' },
  card: { backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.border, padding: 16, gap: 10 },
  label: { color: C.textSub, fontSize: 12, fontWeight: '700', marginTop: 6 },
  input: { height: 54, borderRadius: 14, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, color: C.text, paddingHorizontal: 14, fontSize: 15 },
  textArea: { height: 96, paddingTop: 14, textAlignVertical: 'top' },
  error: { color: C.red, marginTop: 12, fontSize: 13 },
  saveBtn: { height: 56, borderRadius: 16, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  disabled: { opacity: 0.65 },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '900' },
});
