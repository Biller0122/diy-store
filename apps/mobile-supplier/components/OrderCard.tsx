import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SupplierOrder } from '@/lib/types';
import { StatusBadge } from './StatusBadge';

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

interface Props {
  order: SupplierOrder;
  onAccept?: () => void;
  onReject?: () => void;
  onShip?: () => void;
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now.getTime() - then.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Сая дэлгэрэнгүй';
  if (diffMin < 60) return `${diffMin} минутын өмнө`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} цагийн өмнө`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD} өдрийн өмнө`;
}

function formatPrice(amount: number): string {
  return '₮' + (amount / 100).toLocaleString('mn-MN');
}

export function OrderCard({ order, onAccept, onReject, onShip }: Props) {
  const isPending =
    order.state === 'PaymentAuthorized' || order.state === 'PaymentSettled';
  const isActive =
    order.state === 'PartiallyShipped' || order.state === 'Shipped' || order.state === 'PartiallyDelivered';

  const itemsPreview = order.lines
    .slice(0, 2)
    .map((l) => `${l.quantity}x ${l.productVariant.product.name}`)
    .join(' | ');

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.orderCode}>#{order.code}</Text>
        <StatusBadge status={order.state} />
      </View>

      {order.shippingAddress && (
        <Text style={styles.address} numberOfLines={1}>
          📍 {order.shippingAddress.streetLine1}, {order.shippingAddress.city}
        </Text>
      )}

      {itemsPreview ? (
        <Text style={styles.items} numberOfLines={1}>
          {itemsPreview}
        </Text>
      ) : null}

      <View style={styles.footerRow}>
        <Text style={styles.timeAgo}>{timeAgo(order.createdAt)}</Text>
        <Text style={styles.total}>{formatPrice(order.total)}</Text>
      </View>

      {(isPending || isActive) && (
        <View style={styles.actions}>
          {isPending && onAccept && (
            <TouchableOpacity style={styles.acceptBtn} onPress={onAccept} activeOpacity={0.8}>
              <Text style={styles.acceptText}>✅ Батлах</Text>
            </TouchableOpacity>
          )}
          {isPending && onReject && (
            <TouchableOpacity style={styles.rejectBtn} onPress={onReject} activeOpacity={0.8}>
              <Text style={styles.rejectText}>❌ Цуцлах</Text>
            </TouchableOpacity>
          )}
          {isActive && onShip && (
            <TouchableOpacity style={styles.shipBtn} onPress={onShip} activeOpacity={0.8}>
              <Text style={styles.shipText}>📦 Бэлэн боллоо</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderCode: {
    color: C.text,
    fontWeight: '700',
    fontSize: 15,
  },
  address: {
    color: C.textSub,
    fontSize: 13,
    marginBottom: 4,
  },
  items: {
    color: C.textTertiary,
    fontSize: 12,
    marginBottom: 8,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  timeAgo: {
    color: C.textTertiary,
    fontSize: 12,
  },
  total: {
    color: C.text,
    fontWeight: '700',
    fontSize: 15,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  acceptBtn: {
    flex: 1,
    backgroundColor: 'rgba(0,212,170,0.15)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,212,170,0.3)',
    paddingVertical: 9,
    alignItems: 'center',
  },
  acceptText: {
    color: '#00D4AA',
    fontWeight: '600',
    fontSize: 13,
  },
  rejectBtn: {
    flex: 1,
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
    paddingVertical: 9,
    alignItems: 'center',
  },
  rejectText: {
    color: '#EF4444',
    fontWeight: '600',
    fontSize: 13,
  },
  shipBtn: {
    flex: 1,
    backgroundColor: 'rgba(59,130,246,0.15)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.3)',
    paddingVertical: 9,
    alignItems: 'center',
  },
  shipText: {
    color: '#3B82F6',
    fontWeight: '600',
    fontSize: 13,
  },
});
