import { useMemo } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type ThemeColors } from '@/lib/theme';
import { formatProductPrice, MarketplaceCategory, MarketplaceProduct, MarketplaceSupplier } from '@/lib/marketplace';

export function SectionHeading({
  title,
  subtitle,
  action,
  onPress,
}: {
  title: string;
  subtitle?: string;
  action?: string;
  onPress?: () => void;
}) {
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  return (
    <View style={styles.sectionHeading}>
      <View style={{ flex: 1 }}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
      {action && onPress ? (
        <TouchableOpacity style={styles.linkButton} onPress={onPress} activeOpacity={0.8}>
          <Text style={styles.linkText}>{action}</Text>
          <Ionicons name="arrow-forward" size={14} color={C.primary} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export function RemoteImage({
  uri,
  icon = 'cube-outline',
  style,
}: {
  uri?: string | null;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: object;
}) {
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  if (uri) {
    return <Image source={{ uri }} style={[styles.remoteImage, style]} resizeMode="cover" />;
  }
  return (
    <View style={[styles.imageFallback, style]}>
      <Ionicons name={icon} size={34} color={C.textTertiary} />
    </View>
  );
}

export function ProductTile({
  product,
  wide = false,
  onPress,
}: {
  product: MarketplaceProduct;
  wide?: boolean;
  onPress: () => void;
}) {
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  return (
    <TouchableOpacity style={[styles.productTile, wide && styles.productTileWide]} onPress={onPress} activeOpacity={0.88}>
      <View style={styles.productImageWrap}>
        <RemoteImage uri={product.image} style={styles.productImage} />
        {product.badge ? (
          <View style={[styles.badge, product.badge === 'ТОП' && styles.badgeAmber]}>
            <Text style={[styles.badgeText, product.badge === 'ТОП' && styles.badgeTextDark]}>{product.badge}</Text>
          </View>
        ) : null}
        <View style={[styles.stockPill, product.inStock === false && styles.stockPillOff]}>
          <View style={[styles.stockDot, product.inStock === false && styles.stockDotOff]} />
          <Text style={[styles.stockText, product.inStock === false && styles.stockTextOff]}>
            {product.inStock === false ? 'Дууссан' : 'Бэлэн'}
          </Text>
        </View>
      </View>
      <View style={styles.productBody}>
        <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
        {product.supplierName ? <Text style={styles.productSupplier} numberOfLines={1}>{product.supplierName}</Text> : null}
        <Text style={styles.productPrice}>{formatProductPrice(product)}</Text>
      </View>
    </TouchableOpacity>
  );
}

export function SupplierTile({ supplier, onPress }: { supplier: MarketplaceSupplier; onPress: () => void }) {
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  return (
    <TouchableOpacity style={styles.supplierTile} onPress={onPress} activeOpacity={0.86}>
      <View style={styles.supplierAvatar}>
        <Text style={styles.supplierAvatarText}>{supplier.name.charAt(0)}</Text>
      </View>
      <Text style={styles.supplierName} numberOfLines={2}>{supplier.name}</Text>
      <View style={styles.supplierMetaRow}>
        <Ionicons name="star" size={12} color={C.warning} />
        <Text style={styles.supplierMetaText}>{supplier.rating.toFixed(1)}</Text>
        <Text style={styles.supplierMuted}>({supplier.reviewCount})</Text>
      </View>
      <View style={styles.supplierMetaRow}>
        <Ionicons name="location-outline" size={12} color={C.textTertiary} />
        <Text style={styles.supplierMuted} numberOfLines={1}>{supplier.district || 'Улаанбаатар'}</Text>
      </View>
      <View style={styles.supplierFooter}>
        <Text style={styles.supplierMuted}>{supplier.productCount} бараа</Text>
        <Text style={[styles.openPill, !supplier.isOpen && styles.closedPill]}>
          {supplier.isOpen ? 'Нээлттэй' : 'Хаалттай'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export function CategoryTile({ category, onPress, selected = false }: { category: MarketplaceCategory; onPress: () => void; selected?: boolean }) {
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  return (
    <TouchableOpacity style={[styles.categoryTile, selected && styles.categoryTileSelected]} onPress={onPress} activeOpacity={0.82}>
      <Text style={styles.categoryIcon}>{category.icon}</Text>
      <Text style={styles.categoryName} numberOfLines={2}>{category.name}</Text>
      <Text style={styles.categoryCount}>{category.productCount.toLocaleString('mn-MN')} бараа</Text>
    </TouchableOpacity>
  );
}

const makeStyles = (C: ThemeColors) => StyleSheet.create({
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  sectionTitle: { color: C.text, fontSize: 19, fontWeight: '800', lineHeight: 24 },
  sectionSubtitle: { color: C.textSub, fontSize: 12, marginTop: 3, lineHeight: 17 },
  linkButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingBottom: 2 },
  linkText: { color: C.primary, fontSize: 12, fontWeight: '700' },

  remoteImage: { backgroundColor: C.surface },
  imageFallback: { backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },

  productTile: {
    width: 178,
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  productTileWide: { width: '47.8%' },
  productImageWrap: { height: 132, backgroundColor: C.surface },
  productImage: { width: '100%', height: '100%' },
  productBody: { padding: 11, minHeight: 94 },
  productName: { color: C.text, fontSize: 13, fontWeight: '700', lineHeight: 18 },
  productSupplier: { color: C.textTertiary, fontSize: 11, marginTop: 4 },
  productPrice: { color: C.accent, fontSize: 15, fontWeight: '800', fontFamily: 'monospace', marginTop: 'auto' },
  badge: {
    position: 'absolute',
    top: 10,
    left: 10,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: C.accent,
  },
  badgeAmber: { backgroundColor: C.warning },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  badgeTextDark: { color: '#141414' },
  stockPill: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(8,8,14,0.74)',
  },
  stockPillOff: { backgroundColor: 'rgba(255,68,68,0.18)' },
  stockDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.success },
  stockDotOff: { backgroundColor: '#FF4444' },
  stockText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  stockTextOff: { color: '#FF7777' },

  supplierTile: {
    width: 168,
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 13,
  },
  supplierAvatar: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: C.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  supplierAvatarText: { color: C.primary, fontSize: 18, fontWeight: '900' },
  supplierName: { color: C.text, fontSize: 13, fontWeight: '800', lineHeight: 18, minHeight: 36 },
  supplierMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  supplierMetaText: { color: C.text, fontSize: 11, fontWeight: '700' },
  supplierMuted: { color: C.textTertiary, fontSize: 11 },
  supplierFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 11 },
  openPill: {
    overflow: 'hidden',
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
    backgroundColor: 'rgba(34,197,94,0.14)',
    color: C.success,
    fontSize: 10,
    fontWeight: '800',
  },
  closedPill: { backgroundColor: 'rgba(136,136,170,0.12)', color: C.textTertiary },

  categoryTile: {
    width: '31.5%',
    minHeight: 118,
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 11,
    justifyContent: 'space-between',
  },
  categoryTileSelected: { borderColor: C.primary, backgroundColor: C.primaryGlow },
  categoryIcon: { fontSize: 27 },
  categoryName: { color: C.text, fontSize: 12, fontWeight: '800', lineHeight: 16 },
  categoryCount: { color: C.textTertiary, fontSize: 10 },
});
