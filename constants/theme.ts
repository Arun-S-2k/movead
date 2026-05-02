import { useColorScheme } from 'react-native';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const Colors = {
  light: {
    background: '#FFFFFF',
    surface: '#F4F4F5',
    card: '#FFFFFF',
    text: '#09090B',
    textSecondary: '#52525B',
    textMuted: '#71717A',
    border: '#E4E4E7',
    inputBg: '#F4F4F5',
    brand: '#E05409',
  },
  dark: {
    background: '#000000',
    surface: '#000000',
    card: '#1C1C1E',
    text: '#FAFAFA',
    textSecondary: '#A1A1AA',
    textMuted: '#71717A',
    border: '#2C2C2E',
    inputBg: '#2C2C2E',
    brand: '#E05409',
  },
};

export type ThemePreference = 'system' | 'light' | 'dark';

let currentPref: ThemePreference = 'system';
const themeSubscribers = new Set<(pref: ThemePreference) => void>();

export const getThemePreference = async (): Promise<ThemePreference> => {
  const saved = await AsyncStorage.getItem('theme_pref');
  return (saved as ThemePreference) || 'system';
};

// Removed top-level initialization to prevent window is not defined error

export const setThemePreference = async (pref: ThemePreference) => {
  currentPref = pref;
  themeSubscribers.forEach(cb => cb(pref)); // Synchronously notify components
  await AsyncStorage.setItem('theme_pref', pref);
};

export function useTheme() {
  const systemScheme = useColorScheme();
  const [pref, setPref] = useState<ThemePreference>(currentPref);

  useEffect(() => {
    const load = async () => {
       const saved = await getThemePreference();
       currentPref = saved;
       setPref(saved);
    };
    load();
    
    const sub = (newPref: ThemePreference) => {
      setPref(newPref);
    };
    themeSubscribers.add(sub);
    return () => themeSubscribers.delete(sub);
  }, []);

  const activeScheme = pref === 'system' ? systemScheme : pref;
  return activeScheme === 'dark' ? Colors.dark : Colors.light;
}