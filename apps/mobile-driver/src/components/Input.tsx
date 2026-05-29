import { useState } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';

type Props = TextInputProps & {
  label: string;
  error?: string;
  passwordToggle?: boolean;
};

export function Input({ label, error, passwordToggle, secureTextEntry, style, ...props }: Props) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(!!secureTextEntry);
  return (
    <View style={styles.wrap}>
      <View style={[styles.inputWrap, focused && styles.focused, error && styles.error]}>
        <Text style={[styles.label, (focused || props.value) && styles.labelActive]}>{label}</Text>
        <TextInput
          placeholderTextColor={colors.textTertiary}
          style={[styles.input, style]}
          secureTextEntry={passwordToggle ? hidden : secureTextEntry}
          onFocus={(event) => {
            setFocused(true);
            props.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            props.onBlur?.(event);
          }}
          {...props}
        />
        {passwordToggle ? (
          <TouchableOpacity onPress={() => setHidden((next) => !next)} style={styles.eye}>
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.textSub} />
          </TouchableOpacity>
        ) : null}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  inputWrap: {
    minHeight: 58,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderHover,
    backgroundColor: 'rgba(255,255,255,0.04)',
    justifyContent: 'flex-end',
    paddingHorizontal: 14,
    paddingBottom: 7,
  },
  focused: { borderColor: colors.primary, backgroundColor: colors.primaryGlow },
  error: { borderColor: 'rgba(255,68,68,0.65)' },
  label: { position: 'absolute', left: 14, top: 18, fontSize: 14, color: colors.textSub },
  labelActive: { top: 7, fontSize: 11, fontWeight: '700', color: colors.textSub },
  input: { color: colors.text, fontSize: 15, fontWeight: '600', paddingRight: 34, paddingTop: 20, minHeight: 46 },
  eye: { position: 'absolute', right: 12, bottom: 17 },
  errorText: { color: colors.error, fontSize: 12, lineHeight: 16 },
});
