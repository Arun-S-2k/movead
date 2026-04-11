import { useColorScheme } from 'react-native';

export const Colors = {
  light: {
    background: '#FFFFFF',
    surface: '#F3F4F6',
    card: '#FFFFFF',
    text: '#111111',
    textSecondary: '#555555',
    textMuted: '#888888',
    border: '#E5E7EB',
    inputBg: '#FAFAFA',
    brand: '#E05409',
  },
  dark: {
    background: '#121212',
    surface: '#1E1E1E',
    card: '#242424',
    text: '#F0F0F0',
    textSecondary: '#BBBBBB',
    textMuted: '#888888',
    border: '#2E2E2E',
    inputBg: '#1E1E1E',
    brand: '#E05409',
  },
};

export function useTheme() {
  const scheme = useColorScheme();
  return scheme === 'dark' ? Colors.dark : Colors.light;
}