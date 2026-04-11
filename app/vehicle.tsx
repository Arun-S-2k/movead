import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Modal, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { store } from '../constants/store';
import { useTheme } from '../constants/theme';

const BRANDS = ['Bajaj', 'TVS', 'Piaggio', 'Mahindra', 'Atul'];
const MODELS: Record<string, string[]> = {
  Bajaj: ['RE Compact', 'RE 4S', 'Maxima'],
  TVS: ['King Duramax', 'King Plus'],
  Piaggio: ['Ape City', 'Ape HT'],
  Mahindra: ['Alfa', 'Treo'],
  Atul: ['Shakti', 'Gem'],
};
const FUELS = [
  { key: 'CNG', icon: 'gas-cylinder' },
  { key: 'Petrol', icon: 'fuel' },
  { key: 'Electric', icon: 'lightning-bolt' },
  { key: 'LPG', icon: 'water' },
];

export default function Vehicle() {
  const [regNo, setRegNo] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [fuel, setFuel] = useState('');
  const [showBrands, setShowBrands] = useState(false);
  const [showModels, setShowModels] = useState(false);
  const [regNoFocused, setRegNoFocused] = useState(false);
  const router = useRouter();
  const t = useTheme();

  const handleContinue = () => {
    store.vehicleNumber = regNo;
    store.brand = brand;
    store.model = model;
    store.fuelType = fuel;
    router.push('/personal');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background }}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={[styles.logo, { color: t.brand }]}>MoveAd</Text>
        <View style={styles.headerRow}>
          <Text style={[styles.heading, { color: t.text }]}>Add Vehicle</Text>
          <Text style={[styles.step, { color: t.textMuted }]}>1/2</Text>
        </View>

        <Text style={[styles.label, { color: t.textSecondary }]}>Enter Vehicle Registration Number</Text>
        <TextInput
          style={[styles.input, {
            borderColor: regNoFocused ? t.brand : regNo ? '#666666' : t.border,
            backgroundColor: t.inputBg,
            color: t.text,
            borderWidth: regNoFocused ? 2 : 1,
          }]}
          placeholder='TN00 AB 1234'
          placeholderTextColor={t.textMuted}
          value={regNo}
          onChangeText={(text) => setRegNo(text.toUpperCase())}
          maxLength={10}
          onFocus={() => setRegNoFocused(true)}
          onBlur={() => setRegNoFocused(false)}
        />

        <Text style={[styles.label, { color: t.textSecondary }]}>Brand</Text>
        <TouchableOpacity
          style={[styles.dropdown, {
            borderColor: brand ? '#666666' : t.border,
            backgroundColor: t.inputBg,
            borderWidth: brand ? 2 : 1,
          }]}
          onPress={() => { setShowBrands(true); setShowModels(false); }}>
          <Text style={{ color: brand ? t.text : t.textMuted, fontSize: 15 }}>{brand || '-Select Brand-'}</Text>
          <MaterialCommunityIcons name="chevron-down" size={20} color={t.textMuted} />
        </TouchableOpacity>

        <Modal visible={showBrands} transparent animationType="fade">
          <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowBrands(false)}>
            <View style={[styles.modalBox, { backgroundColor: t.card }]}>
              <Text style={[styles.modalTitle, { color: t.text, borderBottomColor: t.border }]}>Select Brand</Text>
              {BRANDS.map(b => (
                <TouchableOpacity key={b} style={[styles.modalItem, { borderBottomColor: t.border }]} onPress={() => { setBrand(b); setModel(''); setShowBrands(false); }}>
                  <Text style={[styles.modalItemText, { color: t.text }]}>{b}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>

        <Text style={[styles.label, { color: t.textSecondary }]}>Model</Text>
        <TouchableOpacity
          style={[styles.dropdown, {
            borderColor: model ? '#666666' : t.border,
            backgroundColor: t.inputBg,
            borderWidth: model ? 2 : 1,
            opacity: brand ? 1 : 0.5,
          }]}
          onPress={() => { if (brand) setShowModels(true); }}>
          <Text style={{ color: model ? t.text : t.textMuted, fontSize: 15 }}>{model || '-Select Model-'}</Text>
          <MaterialCommunityIcons name="chevron-down" size={20} color={t.textMuted} />
        </TouchableOpacity>

        <Modal visible={showModels} transparent animationType="fade">
          <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowModels(false)}>
            <View style={[styles.modalBox, { backgroundColor: t.card }]}>
              <Text style={[styles.modalTitle, { color: t.text, borderBottomColor: t.border }]}>Select Model</Text>
              {brand && MODELS[brand].map(m => (
                <TouchableOpacity key={m} style={[styles.modalItem, { borderBottomColor: t.border }]} onPress={() => { setModel(m); setShowModels(false); }}>
                  <Text style={[styles.modalItemText, { color: t.text }]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>

        <Text style={[styles.label, { color: t.textSecondary }]}>Fuel Type</Text>
        <View style={styles.fuelRow}>
          {FUELS.map(f => (
            <TouchableOpacity key={f.key} style={[styles.fuelBtn, { borderColor: t.border, backgroundColor: t.inputBg }, fuel === f.key && { borderColor: t.brand, backgroundColor: '#FFF4EE' }]} onPress={() => setFuel(f.key)}>
              <MaterialCommunityIcons name={f.icon as any} size={28} color={fuel === f.key ? t.brand : t.textMuted} />
              <Text style={{ color: fuel === f.key ? t.brand : t.textMuted, fontSize: 12, marginTop: 4, fontWeight: fuel === f.key ? 'bold' : 'normal' }}>{f.key}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={[styles.button, { backgroundColor: t.brand }]} onPress={handleContinue}>
          <Text style={styles.buttonText}>Continue to step 2</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
  logo: { fontSize: 28, fontWeight: 'bold', marginBottom: 24 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  heading: { fontSize: 22, fontWeight: 'bold' },
  step: { fontSize: 14 },
  label: { fontSize: 13, marginBottom: 8, marginTop: 16 },
  input: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15 },
  dropdown: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 24 },
  modalBox: { borderRadius: 16, paddingVertical: 8 },
  modalTitle: { fontSize: 16, fontWeight: 'bold', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
  modalItem: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  modalItemText: { fontSize: 15 },
  fuelRow: { flexDirection: 'row', gap: 10, marginTop: 4, flexWrap: 'wrap' },
  fuelBtn: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 10, alignItems: 'center', width: 70 },
  button: { borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 32 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});