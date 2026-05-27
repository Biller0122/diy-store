import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  status: string;
}

interface BadgeConfig {
  label: string;
  color: string;
}

function getBadgeConfig(status: string): BadgeConfig {
  switch (status) {
    case 'PaymentAuthorized':
    case 'PaymentSettled':
    case 'pending':
      return { label: 'Хүлээгдэж буй', color: '#FFB547' };
    case 'PartiallyShipped':
    case 'Shipped':
    case 'active':
      return { label: 'Явж байна', color: '#3B82F6' };
    case 'PartiallyDelivered':
    case 'Delivered':
    case 'done':
      return { label: 'Хүргэгдлээ', color: '#00D4AA' };
    case 'Cancelled':
      return { label: 'Цуцлагдсан', color: '#EF4444' };
    default:
      return { label: status, color: '#8888AA' };
  }
}

export function StatusBadge({ status }: Props) {
  const { label, color } = getBadgeConfig(status);

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: color + '26',
          borderColor: color + '40',
        },
      ]}
    >
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
