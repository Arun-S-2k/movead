import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../constants/theme';

interface Props {
  label: string;
  onPress: () => void;
}

export default function Button({ label, onPress }: Props) {
  const t = useTheme();
  return (
    <TouchableOpacity style={[styles.button, { backgroundColor: t.brand }]} onPress={onPress}>
      <Text style={styles.text}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: { borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 32 },
  text: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});