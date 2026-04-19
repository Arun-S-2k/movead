import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../constants/theme';

interface TabBarProps {
  activeTab: 'home' | 'myads' | 'wallet' | 'profile';
}

export default function TabBar({ activeTab }: TabBarProps) {
  const t = useTheme();
  const router = useRouter();

  return (
    <View style={[styles.tabBar, { backgroundColor: t.card, borderTopColor: t.border }]}>
      <TouchableOpacity style={styles.tabItem} onPress={() => router.replace('/dashboard')}>
        <MaterialCommunityIcons name="home" size={24} color={activeTab === 'home' ? t.brand : t.textMuted} />
        <Text style={[activeTab === 'home' ? styles.tabLabelActive : styles.tabLabel, { color: activeTab === 'home' ? t.brand : t.textMuted }]}>Home</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.tabItem}>
        <MaterialCommunityIcons name="bullhorn-outline" size={24} color={activeTab === 'myads' ? t.brand : t.textMuted} />
        <Text style={[activeTab === 'myads' ? styles.tabLabelActive : styles.tabLabel, { color: activeTab === 'myads' ? t.brand : t.textMuted }]}>My Ads</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.tabItem}>
        <MaterialCommunityIcons name="wallet-outline" size={24} color={activeTab === 'wallet' ? t.brand : t.textMuted} />
        <Text style={[activeTab === 'wallet' ? styles.tabLabelActive : styles.tabLabel, { color: activeTab === 'wallet' ? t.brand : t.textMuted }]}>Wallet</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.tabItem} onPress={() => router.replace('/profile')}>
        <MaterialCommunityIcons name="account-outline" size={24} color={activeTab === 'profile' ? t.brand : t.textMuted} />
        <Text style={[activeTab === 'profile' ? styles.tabLabelActive : styles.tabLabel, { color: activeTab === 'profile' ? t.brand : t.textMuted }]}>Profile</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: { flexDirection: 'row', paddingVertical: 10, paddingBottom: 16, borderTopWidth: 1 },
  tabItem: { flex: 1, alignItems: 'center', gap: 2 },
  tabLabel: { fontSize: 11 },
  tabLabelActive: { fontSize: 11, fontWeight: 'bold' },
});
