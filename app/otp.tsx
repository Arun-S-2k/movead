import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Button from '../components/Button';
import InputField from '../components/InputField';
import { store } from '../constants/store';
import { useTheme } from '../constants/theme';

export default function OTP() {
  const [otp, setOtp] = useState('');
  const [timer, setTimer] = useState(30);
  const router = useRouter();
  const t = useTheme();

  useEffect(() => {
    if (timer === 0) return;
    const interval = setInterval(() => setTimer(t => t - 1), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const handleVerify = () => {
    if (otp.length < 4) {
      Alert.alert('Error', 'Please enter a valid OTP');
      return;
    }
    router.push('/vehicle');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background }}>
      <View style={styles.container}>
        <Text style={[styles.logo, { color: t.brand }]}>MoveAd</Text>
        <Text style={[styles.heading, { color: t.text }]}>Verify Mobile</Text>
        <Text style={[styles.sub, { color: t.textMuted }]}>Enter any 4-6 digit code to proceed</Text>

        <View style={[styles.mobileRow, { borderColor: t.border, backgroundColor: t.inputBg }]}>
          <Text style={[styles.mobileNum, { color: t.text }]}>+91 {store.mobile}</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ color: t.brand, fontWeight: 'bold', fontSize: 14 }}>Edit</Text>
          </TouchableOpacity>
        </View>

        <InputField
          label="Enter OTP"
          placeholder="······"
          value={otp}
          onChangeText={setOtp}
          keyboardType="number-pad"
          maxLength={6}
        />

        <TouchableOpacity style={styles.resend} disabled={timer > 0} onPress={() => setTimer(30)}>
          <Text style={{ color: timer > 0 ? t.textMuted : t.brand, fontWeight: 'bold', fontSize: 14 }}>
            {timer > 0 ? 'Resend OTP  00:' + String(timer).padStart(2, '0') + 's' : 'Resend OTP'}
          </Text>
        </TouchableOpacity>

        <Button label="Verify & Continue" onPress={handleVerify} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 60 },
  logo: { fontSize: 28, fontWeight: 'bold', marginBottom: 40 },
  heading: { fontSize: 26, fontWeight: 'bold', marginBottom: 6 },
  sub: { fontSize: 14, marginBottom: 24 },
  mobileRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14 },
  mobileNum: { fontSize: 15, fontWeight: '500' },
  resend: { alignItems: 'center', marginTop: 16, marginBottom: 8 },
});