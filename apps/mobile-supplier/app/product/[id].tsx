import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { SUPPLIER_PRODUCTS_QUERY, UPDATE_SUPPLIER_PRODUCT_MUTATION, shopFetch } from '@/lib/api';
import { useSupplierStore } from '@/lib/store';
import { SupplierProduct } from '@/lib/types';

const C = {
  bg: '#08080E',
  card: '#0F0F1A',
  surface: '#161625',
  primary: '#FF4500',
  success: '#00D4AA',
  red: '#EF4444',
  warning: '#FFB547',
  border: 'rgba(255,255,255,0.06)',
  text: '#F5F5FF',
  textSub: '#8888AA',
  textTertiary: '#55556A',
};

function formatPrice(cents: number) {
  return '₮' + Math.round(cents / 100).toLocaleString('mn-MN');
}

function toMoneyInput(cents?: number | null) {
  return cents ? String(Math.round(cents / 100)) : '';
}

function parseMoney(value: string) {
  return Number(value.replace(/\D/g, '')) * 100;
}

export default function SupplierProductDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const supplier = useSupplierStore((s) => s.supplier);
  const token = useSupplierStore((s) => s.token);
  const [product, setProduct] = useState<SupplierProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [description, setDescription] = useState('');
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    shopFetch<{ supplierProducts: { items: SupplierProduct[] } }>(
      SUPPLIER_PRODUCTS_QUERY,
      { supplierId: supplier?.id },
      token,
    )
      .then((data) => {
        if (!mounted) return;
        const found = data.supplierProducts.items.find((item) => String(item.id) === String(id)) ?? null;
        setProduct(found);
        setPrice(toMoneyInput(found?.price));
        setStock(found ? String(found.stock) : '');
        setDescription(found?.description ?? '');
        setEnabled(found?.enabled ?? true);
        setError(found ? '' : 'Бараа олдсонгүй');
      })
      .catch((err) => {
        if (mounted) setError(err instanceof Error ? err.message : 'Бараа татахад алдаа гарлаа');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [id, supplier?.id, token]);

  const changed = useMemo(() => {
    if (!product) return false;
    return (
      parseMoney(price) !== product.price ||
      Number(stock.replace(/\D/g, '')) !== product.stock ||
      description.trim() !== (product.description ?? '') ||
      enabled !== product.enabled
    );
  }, [description, enabled, price, product, stock]);

  const save = async () => {
    if (!product) return;
    const nextPrice = parseMoney(price);
    const nextStock = Number(stock.replace(/\D/g, ''));
    if (!nextPrice) {
      setError('Үнэ зөв оруулна уу');
      return;
    }
    if (Number.isNaN(nextStock) || nextStock < 0) {
      setError('Нөөц зөв оруулна уу');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const data = await shopFetch<{ updateSupplierProduct: Pick<SupplierProduct, 'id' | 'enabled' | 'stock' | 'price'> }>(
        UPDATE_SUPPLIER_PRODUCT_MUTATION,
        {
          id: product.id,
          input: {
            price: nextPrice,
            stock: nextStock,
            description: description.trim(),
            enabled,
          },
        },
        token,
      );
      const updated = {
        ...product,
        ...data.updateSupplierProduct,
        description: description.trim(),
        enabled,
        stock: nextStock,
        price: nextPrice,
      };
      setProduct(updated);
      setEditing(false);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Бараа шинэчлэхэд алдаа гарлаа');
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
          <Text style={styles.title}>Барааны дэлгэрэнгүй</Text>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setEditing((value) => !value)}>
            <Ionicons name={editing ? 'close-outline' : 'create-outline'} size={22} color={editing ? C.red : C.primary} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={C.primary} />
          </View>
        ) : product ? (
          <>
            <View style={styles.hero}>
              {product.image ? (
                <Image source={{ uri: product.image }} style={styles.heroImage} />
              ) : (
                <Ionicons name="cube-outline" size={48} color={C.primary} />
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.kicker}>ID: {product.id}</Text>
              <Text style={styles.name}>{product.name}</Text>
              <Text style={styles.desc}>{product.description || 'Тайлбар оруулаагүй байна.'}</Text>

              <InfoRow label="Төлөв">
                <View style={[styles.badge, { backgroundColor: product.enabled ? 'rgba(0,212,170,0.12)' : 'rgba(239,68,68,0.12)' }]}>
                  <Text style={[styles.badgeText, { color: product.enabled ? C.success : C.red }]}>
                    {product.enabled ? 'Идэвхтэй' : 'Идэвхгүй'}
                  </Text>
                </View>
              </InfoRow>
              <InfoRow label="Нөөц">
                <Text style={styles.value}>{product.stock} ширхэг</Text>
              </InfoRow>
              <InfoRow label="Үнэ">
                <Text style={[styles.value, { color: C.primary }]}>{formatPrice(product.price)}</Text>
              </InfoRow>
              <InfoRow label="Ангилал">
                <Text style={styles.value}>{product.category || '-'}</Text>
              </InfoRow>
            </View>

            {editing ? (
              <View style={styles.card}>
                <Text style={styles.editTitle}>Засах</Text>
                <Text style={styles.label}>Үнэ</Text>
                <TextInput style={styles.input} value={price} onChangeText={setPrice} keyboardType="number-pad" />
                <Text style={styles.label}>Нөөц</Text>
                <TextInput style={styles.input} value={stock} onChangeText={setStock} keyboardType="number-pad" />
                <Text style={styles.label}>Тайлбар</Text>
                <TextInput style={[styles.input, styles.textArea]} value={description} onChangeText={setDescription} multiline />
                <View style={styles.switchRow}>
                  <Text style={styles.label}>Барааг идэвхтэй байлгах</Text>
                  <Switch
                    value={enabled}
                    onValueChange={setEnabled}
                    trackColor={{ false: C.surface, true: C.primary + '55' }}
                    thumbColor={enabled ? C.primary : C.textTertiary}
                  />
                </View>
                <TouchableOpacity style={[styles.saveBtn, (!changed || saving) && styles.disabled]} onPress={save} disabled={!changed || saving}>
                  {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Хадгалах</Text>}
                </TouchableOpacity>
              </View>
            ) : null}
          </>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <Text style={styles.infoLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  content: { padding: 20, paddingBottom: 110 },
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
  center: { minHeight: 240, alignItems: 'center', justifyContent: 'center' },
  hero: {
    height: 180,
    borderRadius: 24,
    backgroundColor: 'rgba(255,69,0,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,69,0,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    overflow: 'hidden',
  },
  heroImage: { width: '100%', height: '100%' },
  card: { backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.border, padding: 18, marginBottom: 14 },
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
    gap: 16,
  },
  infoLabel: { color: C.textSub, fontSize: 13 },
  value: { color: C.text, fontSize: 15, fontWeight: '800', flexShrink: 1, textAlign: 'right' },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99 },
  badgeText: { fontSize: 12, fontWeight: '800' },
  editTitle: { color: C.text, fontSize: 16, fontWeight: '900', marginBottom: 12 },
  label: { color: C.textSub, fontSize: 12, fontWeight: '800', marginTop: 8, marginBottom: 7 },
  input: { minHeight: 52, borderRadius: 14, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, color: C.text, paddingHorizontal: 14, fontSize: 14 },
  textArea: { minHeight: 96, paddingTop: 14, textAlignVertical: 'top' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  saveBtn: { height: 54, borderRadius: 16, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  disabled: { opacity: 0.55 },
  saveText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  error: { color: C.red, marginTop: 8, fontSize: 13 },
});
