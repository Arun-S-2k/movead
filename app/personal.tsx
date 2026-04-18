import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Button from '../components/Button';
import InputField from '../components/InputField';
import { saveSession, store } from '../constants/store';
import { supabase } from '../constants/supabase';
import { useTheme } from '../constants/theme';

export default function Personal() {
  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  const [ownership, setOwnership] = useState('');
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const t = useTheme();

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      setProfilePhoto(result.assets[0].uri);
    }
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow camera access.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      setProfilePhoto(result.assets[0].uri);
    }
  };

  const handlePhotoPress = () => {
    Alert.alert('Profile Photo', 'Choose an option', [
      { text: 'Take Photo', onPress: handleTakePhoto },
      { text: 'Choose from Gallery', onPress: handlePickPhoto },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleContinue = async () => {
    if (!name || !gender || !ownership) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setLoading(true);

    let profilePhotoUrl = null;

    if (profilePhoto) {
      try {
        const response = await fetch(profilePhoto);
        const arrayBuffer = await response.arrayBuffer();
        const filename = `profiles/${store.mobile}_${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('Photos')
          .upload(filename, arrayBuffer, { contentType: 'image/jpeg' });
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('Photos').getPublicUrl(filename);
          profilePhotoUrl = urlData.publicUrl;
        }
      } catch (e) {
        console.log('Photo upload failed', e);
      }
    }

    const { data: driverData, error } = await supabase.from('drivers').insert({
      name,
      gender,
      ownership,
      mobile: store.mobile,
      vehicle_number: store.vehicleNumber || 'Not set',
      brand: store.brand,
      model: store.model,
      fuel_type: store.fuelType,
      email: store.email,
      profile_photo_url: profilePhotoUrl,
    }).select().single();

    if (error) {
      Alert.alert('Error', error.message);
      setLoading(false);
      return;
    }
    if (driverData?.id) store.id = driverData.id;
    store.name = name;
    await saveSession();
    setLoading(false);
    router.replace('/dashboard');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={[styles.logo, { color: t.brand }]}>MoveAd</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backRow}>
          <Text style={{ color: t.brand, fontSize: 14, fontWeight: 'bold' }}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerRow}>
          <Text style={[styles.heading, { color: t.text }]}>Personal Details</Text>
          <Text style={[styles.step, { color: t.textMuted }]}>2/2</Text>
        </View>

        <InputField label="Driver Name" placeholder="Enter driver name" value={name} onChangeText={setName} />

        <Text style={[styles.label, { color: t.textSecondary }]}>Gender</Text>
        <View style={styles.genderRow}>
          {['Male', 'Female', 'Other'].map(g => (
            <TouchableOpacity key={g} style={[styles.genderBtn, { borderColor: t.border, backgroundColor: t.surface }, gender === g && { backgroundColor: t.brand, borderColor: t.brand }]} onPress={() => setGender(g)}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: gender === g ? '#fff' : t.textSecondary }}>{g}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={[styles.photoBox, { borderColor: profilePhoto ? t.brand : t.border }]} onPress={handlePhotoPress}>
          {profilePhoto ? (
            <View style={styles.avatarCircle}>
              <Image source={{ uri: profilePhoto }} style={{ width: 80, height: 80, borderRadius: 40 }} />
              <View style={[styles.cameraOverlay, { backgroundColor: t.brand }]}>
                <MaterialCommunityIcons name="camera" size={16} color="#fff" />
              </View>
            </View>
          ) : (
            <View style={[styles.avatarCircle, { backgroundColor: t.surface }]}>
              <MaterialCommunityIcons name="account" size={48} color={t.textMuted} />
              <View style={[styles.cameraOverlay, { backgroundColor: t.brand }]}>
                <MaterialCommunityIcons name="camera" size={16} color="#fff" />
              </View>
            </View>
          )}
          <Text style={[styles.photoTitle, { color: t.text }]}>
            {profilePhoto ? 'Photo selected ✓' : 'Upload or take Profile Photo'}
          </Text>
          <Text style={[styles.photoSub, { color: t.textMuted }]}>
            {profilePhoto ? 'Tap to change' : 'Required For Verification'}
          </Text>
        </TouchableOpacity>

        <Text style={[styles.label, { color: t.textSecondary }]}>Auto Ownership</Text>
        <View style={styles.ownershipRow}>
          {['Owner', 'Rented Auto'].map(o => (
            <TouchableOpacity key={o} style={[styles.ownershipBtn, { borderColor: t.border, backgroundColor: t.surface }, ownership === o && { borderColor: t.brand, backgroundColor: t.background }]} onPress={() => setOwnership(o)}>
              <View style={[styles.radio, { borderColor: ownership === o ? t.brand : t.border }]}>
                {ownership === o && <View style={[styles.radioDot, { backgroundColor: t.brand }]} />}
              </View>
              <Text style={{ fontSize: 14, fontWeight: '500', color: ownership === o ? t.brand : t.textSecondary }}>{o}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Button label={loading ? 'Saving...' : 'Continue'} onPress={handleContinue} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 24, paddingTop: 40, paddingBottom: 40 },
  logo: { fontSize: 28, fontWeight: 'bold', marginBottom: 16 },
  backRow: { marginBottom: 12 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  heading: { fontSize: 22, fontWeight: 'bold' },
  step: { fontSize: 14 },
  label: { fontSize: 13, marginBottom: 8, marginTop: 16 },
  genderRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  genderBtn: { flex: 1, paddingVertical: 12, borderRadius: 50, borderWidth: 1, alignItems: 'center' },
  photoBox: { marginTop: 20, borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 16, paddingVertical: 28, alignItems: 'center' },
  avatarCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  cameraOverlay: { position: 'absolute', bottom: 0, right: 0, borderRadius: 12, padding: 4 },
  photoTitle: { fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
  photoSub: { fontSize: 12 },
  ownershipRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  ownershipBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
});