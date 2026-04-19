import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import TabBar from '../components/TabBar';
import { clearSession, store } from '../constants/store';
import { useTheme, setThemePreference, ThemePreference, getThemePreference } from '../constants/theme';
import { useEffect, useState } from 'react';

export default function Profile() {
  const t = useTheme();
  const router = useRouter();
  const [activeTheme, setActiveTheme] = useState<ThemePreference>('system');

  useEffect(() => {
    getThemePreference().then(setActiveTheme);
  }, []);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => {
        await clearSession();
        router.replace('/');
      }},
    ]);
  };

  const changeTheme = async (theme: ThemePreference) => {
    await setThemePreference(theme);
    setActiveTheme(theme);
  };

  const renderDetail = (label: string, value: string | null) => (
    <View style={[styles.detailRow, { borderBottomColor: t.border }]}>
      <Text style={[styles.detailLabel, { color: t.textMuted }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: t.text }]}>{value || 'Not provided'}</Text>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.surface }}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View style={[styles.avatarCircle, { backgroundColor: t.border }]}>
            <MaterialCommunityIcons name="account" size={48} color={t.textMuted} />
          </View>
          <Text style={[styles.driverName, { color: t.text }]}>{store.name}</Text>
          <Text style={[styles.vehicleNo, { color: t.textMuted }]}>{store.vehicleNumber}</Text>
        </View>

        <View style={[styles.card, { backgroundColor: t.card }]}>
          <Text style={[styles.cardTitle, { color: t.text }]}>Driver Details</Text>
          {renderDetail('Mobile', store.mobile)}
          {renderDetail('Email', store.email)}
          {renderDetail('Brand', store.brand)}
          {renderDetail('Model', store.model)}
          {renderDetail('Fuel Type', store.fuelType)}
        </View>

        <View style={[styles.card, { backgroundColor: t.card, marginTop: 16 }]}>
          <Text style={[styles.cardTitle, { color: t.text }]}>Appearance</Text>
          <View style={styles.themeSelector}>
            {(['system', 'light', 'dark'] as ThemePreference[]).map((theme) => (
              <TouchableOpacity
                key={theme}
                style={[
                  styles.themeButton,
                  { borderColor: t.border },
                  activeTheme === theme && { backgroundColor: t.brand, borderColor: t.brand }
                ]}
                onPress={() => changeTheme(theme)}
              >
                <Text style={[
                  styles.themeText,
                  { color: t.text },
                  activeTheme === theme && { color: '#fff', fontWeight: 'bold' }
                ]}>
                  {theme.charAt(0).toUpperCase() + theme.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.logoutBtn, { backgroundColor: '#EF4444' }]} 
          onPress={handleLogout}
        >
          <MaterialCommunityIcons name="logout" size={20} color="#fff" />
          <Text style={styles.logoutBtnText}>Logout</Text>
        </TouchableOpacity>

      </ScrollView>
      <TabBar activeTab="profile" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20 },
  header: { alignItems: 'center', marginBottom: 24, marginTop: 10 },
  avatarCircle: { width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  driverName: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  vehicleNo: { fontSize: 16 },
  card: { borderRadius: 16, padding: 20, marginBottom: 16 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1 },
  detailLabel: { fontSize: 14 },
  detailValue: { fontSize: 14, fontWeight: '500' },
  themeSelector: { flexDirection: 'row', gap: 10 },
  themeButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8, borderWidth: 1 },
  themeText: { fontSize: 14 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 12, marginTop: 24, marginBottom: 40 },
  logoutBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
