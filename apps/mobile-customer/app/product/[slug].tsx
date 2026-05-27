import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { C } from '@/lib/colors';

const MOCK_PRODUCT = {
  name: 'Perforator Bosch GBH 2-26 DRE',
  price: 145000,
  supplierName: 'Зочин Буд',
  rating: 4.8,
  reviewCount: 124,
  description:
    'Bosch GBH 2-26 DRE бол мэргэжлийн зориулалтын цахилгаан перфоратор юм. 800 ватт хүчин чадалтай, SDS-plus систем, 3 горим: өрөмдөх, цохилттой өрөмдөх, цохих. Бетон, чулуу, тоосго зэрэг хатуу материал дээр ажиллахад тохиромжтой. Ergonomik бариул, хэт ачаалал хамгаалалт бүхий.',
  stock: 'Нөөцтэй',
  variants: ['800W / Улаан', '1000W / Хар'],
};

function formatPrice(price: number) {
  return '₮' + price.toLocaleString('mn-MN');
}

export default function ProductDetailScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState(0);

  const product = MOCK_PRODUCT;

  const handleAddToCart = () => {
    Alert.alert(
      'Сагсанд нэмлээ ✅',
      `${product.name} (${quantity} ш) сагсанд нэмэгдлээ`,
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
        {/* Header */}
        <View style={styles.navHeader}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={C.text} />
          </TouchableOpacity>
          <Text style={styles.navTitle} numberOfLines={1}>Дэлгэрэнгүй</Text>
          <TouchableOpacity style={styles.shareBtn}>
            <Ionicons name="share-outline" size={20} color={C.text} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Large Image */}
        <View style={styles.imagePlaceholder}>
          <Ionicons name="cube-outline" size={72} color={C.textTertiary} />
          <Text style={styles.imagePlaceholderLabel}>Зураг</Text>
        </View>

        <View style={styles.content}>
          {/* Title + Price */}
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.slug} numberOfLines={1}>SKU: {slug}</Text>

          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatPrice(product.price * quantity)}</Text>
            <View style={styles.stockBadge}>
              <View style={styles.stockDot} />
              <Text style={styles.stockText}>{product.stock}</Text>
            </View>
          </View>

          {/* Rating */}
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Ionicons
                key={star}
                name={star <= Math.round(product.rating) ? 'star' : 'star-outline'}
                size={14}
                color={C.warning}
              />
            ))}
            <Text style={styles.ratingText}>{product.rating} ({product.reviewCount} сэтгэгдэл)</Text>
          </View>

          {/* Variants */}
          <Text style={styles.sectionLabel}>Хувилбар</Text>
          <View style={styles.variantRow}>
            {product.variants.map((v, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.variantChip, selectedVariant === i && styles.variantChipActive]}
                onPress={() => setSelectedVariant(i)}
              >
                <Text style={[styles.variantText, selectedVariant === i && styles.variantTextActive]}>
                  {v}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Quantity */}
          <Text style={styles.sectionLabel}>Тоо ширхэг</Text>
          <View style={styles.qtyRow}>
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => setQuantity((q) => Math.max(1, q - 1))}
            >
              <Ionicons name="remove" size={20} color={C.text} />
            </TouchableOpacity>
            <Text style={styles.qtyText}>{quantity}</Text>
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => setQuantity((q) => q + 1)}
            >
              <Ionicons name="add" size={20} color={C.text} />
            </TouchableOpacity>
          </View>

          {/* Supplier */}
          <Text style={styles.sectionLabel}>Нийлүүлэгч</Text>
          <TouchableOpacity style={styles.supplierRow}>
            <View style={styles.supplierAvatar}>
              <Text style={styles.supplierAvatarText}>{product.supplierName.charAt(0)}</Text>
            </View>
            <View>
              <Text style={styles.supplierName}>{product.supplierName}</Text>
              <View style={styles.supplierRatingRow}>
                <Ionicons name="star" size={11} color={C.warning} />
                <Text style={styles.supplierRating}>{product.rating}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={C.textTertiary} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>

          {/* Description */}
          <Text style={styles.sectionLabel}>Бүтээгдэхүүний тухай</Text>
          <Text style={styles.description}>{product.description}</Text>

          <View style={styles.bottomSpacer} />
        </View>
      </ScrollView>

      {/* Sticky Bottom Bar */}
      <SafeAreaView edges={['bottom']} style={styles.stickyBar}>
        <View style={styles.stickyInner}>
          <View>
            <Text style={styles.stickyLabel}>Нийт дүн</Text>
            <Text style={styles.stickyPrice}>{formatPrice(product.price * quantity)}</Text>
          </View>
          <TouchableOpacity
            style={styles.addToCartBtn}
            onPress={handleAddToCart}
            activeOpacity={0.85}
          >
            <Ionicons name="cart-outline" size={18} color="#fff" />
            <Text style={styles.addToCartText}>Сагсанд нэмэх</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
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
  shareBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },

  scroll: { flex: 1 },
  imagePlaceholder: {
    width: '100%',
    height: 280,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  imagePlaceholderLabel: { color: C.textTertiary, fontSize: 13 },

  content: { padding: 16 },
  productName: { color: C.text, fontSize: 20, fontWeight: '800', marginBottom: 4, lineHeight: 26 },
  slug: { color: C.textTertiary, fontSize: 11, fontFamily: 'monospace', marginBottom: 14 },

  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  price: { color: C.primary, fontSize: 26, fontWeight: '800', fontFamily: 'monospace' },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,212,170,0.12)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  stockDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.success },
  stockText: { color: C.success, fontSize: 12, fontWeight: '600' },

  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 20 },
  ratingText: { color: C.textSub, fontSize: 12, marginLeft: 4 },

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
    gap: 0,
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

  supplierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 12,
  },
  supplierAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  supplierAvatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  supplierName: { color: C.text, fontSize: 14, fontWeight: '700' },
  supplierRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  supplierRating: { color: C.warning, fontSize: 12, fontWeight: '600' },

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
  stickyPrice: { color: C.primary, fontSize: 20, fontWeight: '800', fontFamily: 'monospace' },
  addToCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.primary,
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  addToCartText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
