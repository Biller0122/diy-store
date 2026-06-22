import React, { useMemo, useState } from 'react';
import {
  Alert,
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
import { CREATE_SUPPLIER_PRODUCT_MUTATION, PRODUCT_CATEGORIES_QUERY, analyzeProductImage, shopFetch } from '@/lib/api';
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

type CategoryOption = { id: string; name: string; slug: string; parentId?: string | null; parent?: { id: string; name: string; slug: string } | null };

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
  const [analyzing, setAnalyzing] = useState(false);
  const [aiHint, setAiHint] = useState('');
  const [aiRetryVisible, setAiRetryVisible] = useState(false);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [categoryLoading, setCategoryLoading] = useState(false);

  const slug = useMemo(() => makeSlug(name), [name]);

  React.useEffect(() => {
    let mounted = true;
    setCategoryLoading(true);
    shopFetch<{ collections: { items: CategoryOption[] } }>(PRODUCT_CATEGORIES_QUERY, undefined, token)
      .then((data) => {
        if (!mounted) return;
        setCategories(data.collections.items.filter((item) => item.parentId || item.parent));
      })
      .catch((err) => {
        console.warn('[NewProductScreen] categories load failed', err instanceof Error ? err.message : err);
      })
      .finally(() => {
        if (mounted) setCategoryLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [token]);

  const launchPicker = async (source: 'camera' | 'library') => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const permission = source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      const message = source === 'camera' ? 'Камер ашиглах зөвшөөрөл хэрэгтэй' : 'Зураг сонгох зөвшөөрөл хэрэгтэй';
      setError(message);
      Alert.alert('Зөвшөөрөл хэрэгтэй', message);
      return;
    }
    const result = source === 'camera' ? await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.65,
      base64: true,
    }) : await ImagePicker.launchImageLibraryAsync({
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

  const pickImage = () => {
    Alert.alert('Барааны зураг', 'Зураг авах уу эсвэл цомгоос сонгох уу?', [
      { text: 'Камер', onPress: () => void launchPicker('camera') },
      { text: 'Цомог', onPress: () => void launchPicker('library') },
      { text: 'Болих', style: 'cancel' },
    ]);
  };

  const save = async () => {
    setError('');
    const parsedPrice = Number(price.replace(/\D/g, ''));
    const parsedStock = Number(stock.replace(/\D/g, ''));
    if (!supplier?.id) {
      setError('Нэвтрэлтийн мэдээлэл олдсонгүй');
      return;
    }
    if (name.trim().length < 2 || name.trim().length > 120) {
      setError('Барааны нэр 2-120 тэмдэгттэй байх ёстой');
      return;
    }
    if (!category.trim()) {
      setError('Ангилал сонгоно уу');
      return;
    }
    if (!parsedPrice || parsedPrice > 500_000_000) {
      setError('Үнэ 1-500,000,000₮ хооронд байх ёстой');
      return;
    }
    if (Number.isNaN(parsedStock) || parsedStock < 0 || parsedStock > 100_000) {
      setError('Нөөц 0-100,000 хооронд байх ёстой');
      return;
    }
    if (description.length > 2000) {
      setError('Тайлбар 2000 тэмдэгтээс ихгүй байх ёстой');
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

  const analyze = async () => {
    if (!image) {
      setError('Эхлээд барааны зураг сонгоно уу');
      return;
    }
    setAnalyzing(true);
    setError('');
    setAiRetryVisible(false);
    setAiHint('AI зураг шинжилж байна...');
    try {
      const result = await analyzeProductImage(image, category);
      if (result.name && !name.trim()) setName(result.name);
      if (result.description && !description.trim()) setDescription(result.description);
      if (result.category && !category.trim()) setCategory(result.category);
      const confidence = typeof result.confidence === 'number' ? ` (${Math.round(result.confidence * 100)}%)` : '';
      setAiHint(`AI санал бөглөгдлөө${confidence}`);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI шинжилгээ амжилтгүй боллоо');
      setAiHint('AI шинжилгээ амжилтгүй боллоо');
      setAiRetryVisible(true);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setAnalyzing(false);
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

        <TouchableOpacity
          style={[styles.aiCard, (!image || analyzing) && styles.disabled]}
          onPress={analyze}
          activeOpacity={0.85}
          disabled={!image || analyzing}
        >
          <View style={styles.aiIcon}>
            <Ionicons name="sparkles-outline" size={20} color={C.primary} />
          </View>
          <View style={styles.aiCopy}>
            <Text style={styles.aiTitle}>AI-аар бараа таних</Text>
            <Text style={styles.aiText}>{aiHint || 'Зурагнаас нэр, ангилал, тайлбарыг санал болгоно'}</Text>
          </View>
          {analyzing ? <ActivityIndicator color={C.primary} /> : <Ionicons name="chevron-forward" size={18} color={C.textTertiary} />}
        </TouchableOpacity>

        <View style={styles.card}>
          <Text style={styles.label}>Барааны нэр</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Жишээ: Цахилгаан дрилл" placeholderTextColor={C.textTertiary} />

          <Text style={styles.label}>Ангилал</Text>
          {categoryLoading ? <Text style={styles.helperText}>Ангилал уншиж байна...</Text> : null}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            <View style={styles.categoryRow}>
              {categories.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.categoryChip, category === item.slug && styles.categoryChipActive]}
                  onPress={() => setCategory(item.slug)}
                >
                  <Text style={[styles.categoryText, category === item.slug && styles.categoryTextActive]}>{item.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          {categories.length === 0 ? (
            <TextInput style={styles.input} value={category} onChangeText={setCategory} placeholder="Жишээ: Багаж" placeholderTextColor={C.textTertiary} />
          ) : null}

          <Text style={styles.label}>Үнэ</Text>
          <TextInput style={styles.input} value={price} onChangeText={setPrice} placeholder="₮ үнэ" placeholderTextColor={C.textTertiary} keyboardType="number-pad" />

          <Text style={styles.label}>Нөөц</Text>
          <TextInput style={styles.input} value={stock} onChangeText={setStock} placeholder="Тоо ширхэг" placeholderTextColor={C.textTertiary} keyboardType="number-pad" />

          <Text style={styles.label}>Тайлбар</Text>
          <TextInput style={[styles.input, styles.textArea]} value={description} onChangeText={setDescription} placeholder="Барааны товч тайлбар" placeholderTextColor={C.textTertiary} multiline />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {aiRetryVisible ? (
          <TouchableOpacity style={styles.retryBtn} onPress={analyze} disabled={analyzing}>
            <Text style={styles.retryText}>AI дахин оролдох</Text>
          </TouchableOpacity>
        ) : null}

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
  aiCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,69,0,0.08)', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,69,0,0.22)', padding: 14, marginBottom: 18, gap: 12 },
  aiIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,69,0,0.12)' },
  aiCopy: { flex: 1 },
  aiTitle: { color: C.text, fontSize: 14, fontWeight: '900', marginBottom: 3 },
  aiText: { color: C.textSub, fontSize: 12, lineHeight: 16 },
  helperText: { color: C.textTertiary, fontSize: 11 },
  categoryScroll: { marginBottom: 4 },
  categoryRow: { flexDirection: 'row', gap: 8, paddingRight: 8 },
  categoryChip: { borderRadius: 999, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, paddingHorizontal: 12, paddingVertical: 8 },
  categoryChipActive: { borderColor: C.primary, backgroundColor: 'rgba(255,69,0,0.14)' },
  categoryText: { color: C.textSub, fontSize: 12, fontWeight: '800' },
  categoryTextActive: { color: C.primary },
  card: { backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.border, padding: 16, gap: 10 },
  label: { color: C.textSub, fontSize: 12, fontWeight: '700', marginTop: 6 },
  input: { height: 54, borderRadius: 14, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, color: C.text, paddingHorizontal: 14, fontSize: 15 },
  textArea: { height: 96, paddingTop: 14, textAlignVertical: 'top' },
  error: { color: C.red, marginTop: 12, fontSize: 13 },
  retryBtn: { height: 44, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,69,0,0.3)', alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  retryText: { color: C.primary, fontWeight: '900' },
  saveBtn: { height: 56, borderRadius: 16, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  disabled: { opacity: 0.65 },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '900' },
});
