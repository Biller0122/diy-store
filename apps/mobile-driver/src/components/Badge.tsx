import { StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme';

export function Badge({ label, tone = 'primary' }: { label: string; tone?: 'primary' | 'success' | 'warning' | 'error' | 'muted' }) {
  const color = tone === 'success' ? colors.success : tone === 'warning' ? colors.warning : tone === 'error' ? colors.error : tone === 'muted' ? colors.textSub : colors.primary;
  return (
    <View style={[styles.badge, { borderColor: `${color}55`, backgroundColor: `${color}22` }]}>
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5 },
  text: { fontSize: 11, fontWeight: '800' },
});
