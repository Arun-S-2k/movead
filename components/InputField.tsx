import { useState } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { useTheme } from '../constants/theme';

interface Props extends TextInputProps {
  label: string;
}

export default function InputField({ label, value, ...props }: Props) {
  const [focused, setFocused] = useState(false);
  const t = useTheme();

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: t.textSecondary }]}>{label}</Text>
      <TextInput
        style={[styles.input, {
          backgroundColor: t.inputBg,
          color: t.text,
          borderColor: focused ? t.brand : value ? '#666666' : t.border,
          borderWidth: focused ? 2 : 1,
        }]}
        placeholderTextColor={t.textMuted}
        value={value}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginTop: 16 },
  label: { fontSize: 13, marginBottom: 8 },
  input: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15 },
});