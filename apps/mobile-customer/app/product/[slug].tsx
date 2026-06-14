import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type ThemeColors } from '@/lib/theme';
import { useAppStore } from '@/lib/store';
import { shopFetch, PRODUCT_QUERY, ADD_TO_CART_MUTATION, ACTIVE_ORDER_QUERY, SUPPLIER_PRODUCTS_QUERY, SUPPLIER_QUERY } from '@/lib/api';

interface ProductVariant {
  id: string;
  name: string;
  priceWithTax: number;
  currencyCode: string;
  stockLevel: string;
  options: { name: string; code: string }[];
}

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  featuredAsset: { preview: string } | null;
  variants: ProductVariant[];
  collections: { id: string; name: string }[];
  supplierProduct?: boolean;
  supplier?: {
    id: string;
    businessName: string;
    slug?: string;
    phone?: string | null;
    address?: string | null;
    district?: string | null;
    lat?: number | null;
    lng?: number | null;
  } | null;
}

function formatPrice(price: number) {
  return '₮' + Math.round(price / 100).toLocaleString('mn-MN');
}

export default function ProductDetailScreen() {
  const router = useRouter();
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { customer, setCartCount, addSupplierCartItem } = useAppStore();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState(0);

  useEffect(() => {
    if (!slug) return;
    const decodedSlug = safeDecode(String(slug));
    shopFetch<{ product: Product | null }>(PRODUCT_QUERY, { slug: decodedSlug })
      .then(async (data) => {
        if (data.product) {
          setProduct(data.product);
          return;
        }
        const supplierData = await shopFetch<{ supplierProducts: { items: any[] } }>(SUPPLIER_PRODUCTS_QUERY);
        const supplierProduct = (supplierData.supplierProducts?.items ?? []).find((item) => item.slug === decodedSlug);
        if (!supplierProduct) {
          setProduct(null);
          return;
        }
        let supplier: Product['supplier'] = null;
        if (supplierProduct.supplierId) {
          try {
            const supplierData = await shopFetch<{ supplier: NonNullable<Product['supplier']> | null }>(
              SUPPLIER_QUERY,
              { id: supplierProduct.supplierId },
          );
          supplier = supplierData.supplier;
          } catch (error) {
            console.error('[ProductDetailScreen] supplier lookup failed', error);
            supplier = null;
          }
        }
        setProduct({
          id: supplierProduct.id,
          name: supplierProduct.name,
          slug: supplierProduct.slug,
          description: supplierProduct.description || '',
          featuredAsset: supplierProduct.image ? { preview: supplierProduct.image } : null,
          variants: [{
            id: supplierProduct.id,
            name: supplierProduct.name,
            priceWithTax: supplierProduct.price * 100,
            currencyCode: 'MNT',
            stockLevel: supplierProduct.enabled && supplierProduct.stock > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK',
            options: [],
          }],
          collections: supplierProduct.category ? [{ id: supplierProduct.category, name: supplierProduct.category }] : [],
          supplierProduct: true,
          supplier,
        });
      })
      .catch((error) => {
        console.error('[ProductDetailScreen] product load failed', error);
        Alert.alert('Бүтээгдэхүүн ачаалсангүй', error instanceof Error ? error.message : 'Сүлжээний алдаа гарлаа');
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const handleAddToCart = async () => {
    if (!product) return;
    const variant = product.variants[selectedVariant] ?? product.variants[0];
    const price = variant?.priceWithTax ?? 0;
    if (product.supplierProduct) {
      const supplier = product.supplier;
      addSupplierCartItem({
        productId: product.id,
        variantId: product.id,
        name: product.name,
        slug: product.slug,
        image: product.featuredAsset?.preview,
        price: Math.round(price),
        qty: quantity,
        supplierId: supplier?.id ?? 'unknown',
        supplierName: supplier?.businessName ?? 'Нийлүүлэгч',
        supplierSlug: supplier?.slug,
        supplierDistrict: supplier?.district,
        supplierAddress: supplier?.address,
        supplierPhone: supplier?.phone,
        supplierLat: supplier?.lat,
        supplierLng: supplier?.lng,
      });
      Alert.alert('Амжилттай', `${product.name} (${quantity} ш) сагсанд нэмэгдлээ`, [
        { text: 'Сагс харах', onPress: () => router.push('/(tabs)/cart' as never) },
        { text: 'Үргэлжлүүлэх' },
      ]);
      return;
    }
    if (!customer) {
      Alert.alert('Нэвтэрнэ үү', 'Сагсанд нэмэхийн тулд нэвтэрнэ үү', [
        { text: 'Болих', style: 'cancel' },
        { text: 'Нэвтрэх', onPress: () => router.push('/(tabs)/account' as never) },
      ]);
      return;
    }
    if (!variant) return;
    setAdding(true);
    try {
      await shopFetch(ADD_TO_CART_MUTATION, {
        productVariantId: variant.id,
        quantity,
      });
      const orderData = await shopFetch<{ activeOrder: { lines: { quantity: number }[] } | null }>(
        ACTIVE_ORDER_QUERY
      );
      const total = orderData.activeOrder?.lines.reduce((s, l) => s + l.quantity, 0) ?? 0;
      setCartCount(total);
      Alert.alert('Амжилттай ✅', `${product.name} (${quantity} ш) сагсанд нэмэгдлээ`, [
        { text: 'Сагс харах', onPress: () => router.push('/(tabs)/cart' as never) },
        { text: 'Үргэлжлүүлэх' },
      ]);
    } catch (e) {
      Alert.alert('Алдаа', e instanceof Error ? e.message : 'Сагсанд нэмэх боломжгүй');
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
          <View style={styles.navHeader}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={22} color={C.text} />
            </TouchableOpacity>
            <Text style={styles.navTitle}>Дэлгэрэнгүй</Text>
            <View style={styles.shareBtn} />
          </View>
        </SafeAreaView>
        <View style={styles.loadingBox}>
          <ActivityIndicator color={C.primary} size="large" />
        </View>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.container}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
          <View style={styles.navHeader}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={22} color={C.text} />
            </TouchableOpacity>
            <Text style={styles.navTitle}>Бүтээгдэхүүн олдсонгүй</Text>
            <View style={styles.shareBtn} />
          </View>
        </SafeAreaView>
        <View style={styles.loadingBox}>
          <Text style={styles.notFoundText}>Бүтээгдэхүүн олдсонгүй</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
            <Text style={styles.backLinkText}>Буцах</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const variant = product.variants[selectedVariant] ?? product.variants[0];
  const price = variant?.priceWithTax ?? 0;
  const isInStock = variant?.stockLevel !== 'OUT_OF_STOCK';

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
        <View style={styles.navHeader}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={C.text} />
          </TouchableOpacity>
          <Text style={styles.navTitle} numberOfLines={1}>Дэлгэрэнгүй</Text>
          <View style={styles.shareBtn} />
        </View>
      </SafeAreaView>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {product.featuredAsset?.preview ? (
          <Image source={{ uri: product.featuredAsset.preview }} style={styles.productImage} resizeMode="cover" />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="cube-outline" size={72} color={C.textTertiary} />
            <Text style={styles.imagePlaceholderLabel}>Зураг</Text>
          </View>
        )}

        <View style={styles.content}>
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.slugText}>SKU: {slug}</Text>

          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatPrice(price * quantity)}</Text>
            <View style={[styles.stockBadge, { backgroundColor: isInStock ? 'rgba(0,212,170,0.12)' : 'rgba(255,68,68,0.12)' }]}>
              <View style={[styles.stockDot, { backgroundColor: isInStock ? C.success : '#FF4444' }]} />
              <Text style={[styles.stockText, { color: isInStock ? C.success : '#FF4444' }]}>
                {isInStock ? 'Нөөцтэй' : 'Нөөц дууссан'}
              </Text>
            </View>
          </View>

          {product.variants.length > 1 && (
            <>
              <Text style={styles.sectionLabel}>Хувилбар</Text>
              <View style={styles.variantRow}>
                {product.variants.map((v, i) => (
                  <TouchableOpacity
                    key={v.id}
                    style={[styles.variantChip, selectedVariant === i && styles.variantChipActive]}
                    onPress={() => setSelectedVariant(i)}
                  >
                    <Text style={[styles.variantText, selectedVariant === i && styles.variantTextActive]}>
                      {v.options.map((o) => o.name).join(' / ') || v.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          <Text style={styles.sectionLabel}>Тоо ширхэг</Text>
          <View style={styles.qtyRow}>
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => setQuantity((q) => Math.max(1, q - 1))}
            >
              <Ionicons name="remove" size={20} color={C.text} />
            </TouchableOpacity>
            <Text style={styles.qtyText}>{quantity}</Text>
            <TouchableOpacity style={styles.qtyBtn} onPress={() => setQuantity((q) => q + 1)}>
              <Ionicons name="add" size={20} color={C.text} />
            </TouchableOpacity>
          </View>

          {product.collections.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Ангилал</Text>
              <View style={styles.tagsRow}>
                {product.collections.map((c) => (
                  <View key={c.id} style={styles.tag}>
                    <Text style={styles.tagText}>{c.name}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {!!product.description && (
            <>
              <Text style={styles.sectionLabel}>Бүтээгдэхүүний тухай</Text>
              <Text style={styles.description}>{product.description}</Text>
            </>
          )}

          <View style={styles.bottomSpacer} />
        </View>
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={styles.stickyBar}>
        <View style={styles.stickyInner}>
          <View>
            <Text style={styles.stickyLabel}>Нийт дүн</Text>
            <Text style={styles.stickyPrice}>{formatPrice(price * quantity)}</Text>
          </View>
          <TouchableOpacity
            style={[styles.addToCartBtn, (!isInStock || adding) && styles.addToCartBtnDisabled]}
            onPress={handleAddToCart}
            disabled={!isInStock || adding}
            activeOpacity={0.85}
          >
            {adding ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="cart-outline" size={18} color="#fff" />
                <Text style={styles.addToCartText}>
                  {isInStock ? 'Сагсанд нэмэх' : 'Нөөц дууссан'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

const makeStyles = (C: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
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
  navTitle: { flex: 1, color: C.text, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  shareBtn: { width: 38, height: 38 },

  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  notFoundText: { color: C.textSub, fontSize: 16 },
  backLink: { marginTop: 8 },
  backLinkText: { color: C.primary, fontSize: 14, fontWeight: '600' },

  scroll: { flex: 1 },
  imagePlaceholder: {
    width: '100%',
    height: 280,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  productImage: {
    width: '100%',
    height: 320,
    backgroundColor: C.surface,
  },
  imagePlaceholderLabel: { color: C.textTertiary, fontSize: 13 },

  content: { padding: 16 },
  productName: { color: C.text, fontSize: 20, fontWeight: '800', marginBottom: 4, lineHeight: 26 },
  slugText: { color: C.textTertiary, fontSize: 11, fontFamily: 'monospace', marginBottom: 14 },

  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  price: { color: C.accent, fontSize: 26, fontWeight: '800', fontFamily: 'monospace' },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  stockDot: { width: 7, height: 7, borderRadius: 4 },
  stockText: { fontSize: 12, fontWeight: '600' },

  sectionLabel: { color: C.textSub, fontSize: 12, fontWeight: '600', marginBottom: 10, marginTop: 16 },

  variantRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  variantChip: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: C.surface,
  },
  variantChipActive: { borderColor: C.primary, backgroundColor: C.primaryGlow },
  variantText: { color: C.textSub, fontSize: 13 },
  variantTextActive: { color: C.primary, fontWeight: '600' },

  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  qtyBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  qtyText: {
    color: C.text,
    fontSize: 16,
    fontWeight: '700',
    minWidth: 44,
    textAlign: 'center',
  },

  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    backgroundColor: C.surface,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: C.border,
  },
  tagText: { color: C.textSub, fontSize: 12 },

  description: { color: C.textSub, fontSize: 14, lineHeight: 22 },
  bottomSpacer: { height: 120 },

  stickyBar: {
    backgroundColor: C.card,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  stickyInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  stickyLabel: { color: C.textTertiary, fontSize: 11, marginBottom: 2 },
  stickyPrice: { color: C.accent, fontSize: 20, fontWeight: '800', fontFamily: 'monospace' },
  addToCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.primary,
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 14,
    minWidth: 160,
    justifyContent: 'center',
  },
  addToCartBtnDisabled: { opacity: 0.5 },
  addToCartText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
