import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Button from '../components/Button';
import InputField from '../components/InputField';
import { store } from '../constants/store';
import { supabase } from '../constants/supabase';
import { useTheme } from '../constants/theme';

export default function SignUp() {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [isLogin, setIsLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const t = useTheme();

  const handleSignUp = async () => {
    if (!name || !mobile) {
      Alert.alert('Error', 'Please enter your name and mobile number');
      return;
    }
    if (mobile.length < 10) {
      Alert.alert('Error', 'Please enter a valid 10 digit mobile number');
      return;
    }
    setLoading(true);
    // Check for duplicate mobile
    const { data: existing } = await supabase
      .from('drivers')
      .select('id')
      .eq('mobile', mobile)
      .single();

    if (existing) {
      Alert.alert('Already registered', 'This mobile number is already registered. Please login instead.');
      setLoading(false);
      return;
    }
    store.name = name;
    store.mobile = mobile;
    store.email = email;
    setLoading(false);
    router.push('/otp');
  };

  const handleLogin = async () => {
    if (!mobile) {
      Alert.alert('Error', 'Please enter your mobile number');
      return;
    }
    if (mobile.length < 10) {
      Alert.alert('Error', 'Please enter a valid 10 digit mobile number');
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('drivers')
      .select('*')
      .eq('mobile', mobile)
      .single();

    if (error || !data) {
      Alert.alert('Not found', 'No account found with this mobile number. Please sign up first.');
      setLoading(false);
      return;
    }
    store.name = data.name;
    store.mobile = data.mobile;
    store.email = data.email || '';
    store.vehicleNumber = data.vehicle_number;
    store.brand = data.brand;
    store.model = data.model;
    store.fuelType = data.fuel_type;
    setLoading(false);
    router.push('/dashboard');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={[styles.logo, { color: t.brand }]}>MoveAd</Text>

          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tab, !isLogin && { borderBottomWidth: 2, borderBottomColor: t.brand }]}
              onPress={() => { setIsLogin(false); setMobile(''); setName(''); setEmail(''); }}>
              <Text style={[styles.tabText, { color: !isLogin ? t.brand : t.textMuted }]}>Sign Up</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, isLogin && { borderBottomWidth: 2, borderBottomColor: t.brand }]}
              onPress={() => { setIsLogin(true); setMobile(''); setName(''); setEmail(''); }}>
              <Text style={[styles.tabText, { color: isLogin ? t.brand : t.textMuted }]}>Login</Text>
            </TouchableOpacity>
          </View>

          {!isLogin && (
            <InputField
              label="Full Name"
              placeholder="Enter your full name"
              value={name}
              onChangeText={setName}
            />
          )}

          <InputField
            label="Mobile Number"
            placeholder="Enter 10 digit mobile number"
            value={mobile}
            onChangeText={setMobile}
            keyboardType="phone-pad"
            maxLength={10}
          />

          <InputField
            label={isLogin ? "Email (optional)" : "Email (optional)"}
            placeholder="Enter your email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Button
            label={loading ? (isLogin ? 'Logging in...' : 'Checking...') : (isLogin ? 'Login' : 'Sign Up')}
            onPress={isLogin ? handleLogin : handleSignUp}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
  logo: { fontSize: 28, fontWeight: 'bold', marginBottom: 40 },
  tabRow: { flexDirection: 'row', marginBottom: 24, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabText: { fontSize: 15, fontWeight: '600' },
});