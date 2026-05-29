import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';

export function Toast({ message, tone = 'error' }: { message?: string | null; tone?: 'error' | 'success' | 'warning' }) {
  if (!message) return null;
  const color = tone === 'success' ? colors.success : tone === 'warning' ? colors.warning : colors.error;
  return (
    <View style={[styles.toast, { borderColor: `${color}55`, backgroundColor: `${color}18` }]}>
      <Ionicons name={tone === 'success' ? 'checkmark-circle' : 'alert-circle'} size={17} color={color} />
      <Text style={[styles.text, { color }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  toast: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: radius.md, borderWidth: 1, padding: 12 },
  text: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '600' },
});
