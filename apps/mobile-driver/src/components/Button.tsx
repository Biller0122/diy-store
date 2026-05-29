import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, TouchableOpacityProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

type Props = TouchableOpacityProps & {
  title: string;
  variant?: 'primary' | 'success' | 'ghost' | 'danger';
  size?: 'md' | 'lg';
  loading?: boolean;
  icon?: IconName;
};

export function Button({ title, variant = 'primary', size = 'lg', loading, icon, style, disabled, ...props }: Props) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      disabled={disabled || loading}
      style={[styles.base, styles[variant], styles[size], (disabled || loading) && styles.disabled, style]}
      {...props}
    >
      {loading ? <ActivityIndicator color={variant === 'ghost' ? colors.primary : colors.white} /> : null}
      {!loading && icon ? <Ionicons name={icon} size={20} color={variant === 'ghost' ? colors.textSub : colors.white} /> : null}
      {!loading ? <Text style={[styles.text, variant === 'ghost' && styles.ghostText]}>{title}</Text> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    borderRadius: radius.lg,
  },
  md: { height: 48, paddingHorizontal: 16 },
  lg: { height: 56, paddingHorizontal: 20 },
  primary: { backgroundColor: colors.primary },
  success: { backgroundColor: colors.success },
  danger: { backgroundColor: colors.error },
  ghost: { backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: colors.borderHover },
  disabled: { opacity: 0.55 },
  text: { color: colors.white, fontSize: 16, fontWeight: '800' },
  ghostText: { color: colors.textSub },
});
