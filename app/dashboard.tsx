import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import * as MediaLibrary from 'expo-media-library';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Image, Modal, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ViewShot, { captureRef } from 'react-native-view-shot';
import { store } from '../constants/store';
import { supabase } from '../constants/supabase';
import { useTheme } from '../constants/theme';

const today = new Date();
const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
const UPLOADED_DAYS = [1,2,3,4,5,7,8,9,11,12,14,15,16,18,19,20,22,23,24,25,26];



export default function Dashboard() {
  const t = useTheme();
  const [showCamera, setShowCamera] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [uploadedDays, setUploadedDays] = useState<number[]>([]);
  const [photo, setPhoto] = useState<string | null>(null);
  const [showFullPhoto, setShowFullPhoto] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photoMeta, setPhotoMeta] = useState<{ date: string; time: string; location: string; coords: string } | null>(null);

  // Fetch real data on load
  useEffect(() => {
    if (!store.id && !store.mobile) return;
    
    const fetchData = async () => {
      const year = today.getFullYear();
      const month = today.getMonth() + 1;
      const startOfMonth = new Date(year, month - 1, 1).toISOString();
      const startOfNextMonth = new Date(year, month, 1).toISOString();

      const { data, error } = await supabase
        .from('photo_uploads')
        .select('uploaded_at, photo_url, location_name, latitude, longitude')
        .eq('mobile', store.mobile)
        .gte('uploaded_at', startOfMonth)
        .lt('uploaded_at', startOfNextMonth);

      if (data) {
        const days = data.map(item => new Date(item.uploaded_at).getDate());
        setUploadedDays(Array.from(new Set(days))); // unique days

        // Check if today was uploaded
        const todayStr = today.toISOString().split('T')[0];
        const todayUpload = data.find(item => item.uploaded_at.startsWith(todayStr));
        if (todayUpload) {
          setPhoto(todayUpload.photo_url);
          const upDate = new Date(todayUpload.uploaded_at);
          setPhotoMeta({
            location: todayUpload.location_name || '',
            date: upDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
            time: upDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
            coords: `${todayUpload.latitude}, ${todayUpload.longitude}`
          });
        }
      } else if (error) {
        console.error("Dashboard fetch error:", error.message);
      }
    };
    fetchData();
  }, []);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();
  const cameraRef = useRef<CameraView>(null);
  const watermarkRef = useRef<View>(null);

  const handleTakePhoto = async () => {
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) { Alert.alert('Permission needed', 'Camera permission is required.'); return; }
    }
    if (!mediaPermission?.granted) await requestMediaPermission();
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Location permission is required.'); return; }
    setShowCamera(true);
  };

  const capturePhoto = async () => {
    if (cameraRef.current) {
      const pic = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (pic) {
        const now = new Date();
        const date = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        const time = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
        
        // Show preview immediately to avoid UI delay
        setPreviewPhoto(pic.uri);
        setShowCamera(false);
        setPhotoMeta({ date, time, location: 'Locating...', coords: 'Locating...' });

        // Fetch location in the background
        setTimeout(async () => {
          try {
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            const geo = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
            let locationStr = 'Location unavailable';
            if (geo.length > 0) locationStr = `${geo[0].district || geo[0].city}, ${geo[0].region}`;
            const coordsStr = `${loc.coords.latitude.toFixed(4)}, ${loc.coords.longitude.toFixed(4)}`;
            setPhotoMeta(prev => prev ? { ...prev, location: locationStr, coords: coordsStr } : null);
          } catch (e) {
            setPhotoMeta(prev => prev ? { ...prev, location: 'Location unavailable', coords: '0.0000, 0.0000' } : null);
          }
        }, 50);
      }
    }
  };

  const confirmUpload = async () => {
    if (previewPhoto && photoMeta) {
      if (photoMeta.coords === 'Locating...') {
        Alert.alert('Please wait', 'Still acquiring location details...');
        return;
      }
      setUploading(true);
      try {
        // Step 1: Capture the watermarked view as an image
        const watermarkedUri = await captureRef(watermarkRef, {
          format: 'jpg',
          quality: 0.9,
        });

        const filename = `uploads/${store.mobile || 'unknown'}_${Date.now()}.jpg`;

        // Step 2: Upload the watermarked image
        const response = await fetch(watermarkedUri);
        const arrayBuffer = await response.arrayBuffer();

        const { error: storageError } = await supabase.storage
          .from('Photos')
          .upload(filename, arrayBuffer, { contentType: 'image/jpeg' });

        if (storageError) {
          Alert.alert('Upload failed', storageError.message);
          setUploading(false);
          return;
        }

        const { data: urlData } = supabase.storage.from('Photos').getPublicUrl(filename);
        const coords = photoMeta.coords.split(',');

        const { error: dbError } = await supabase.from('photo_uploads').insert({
          photo_url: urlData.publicUrl,
          latitude: parseFloat(coords[0]),
          longitude: parseFloat(coords[1]),
          location_name: photoMeta.location,
          uploaded_at: new Date().toISOString(),
          driver_id: store.id || null,
          driver_name: store.name || null,
          vehicle_number: store.vehicleNumber || null,
          mobile: store.mobile || null,
        });

        if (dbError) {
          Alert.alert('Database Error', 'Uploaded to storage but failed to save in database: ' + dbError.message);
          setUploading(false);
          return;
        }

        setUploadedDays(prev => Array.from(new Set([...prev, new Date().getDate()])));

        await MediaLibrary.saveToLibraryAsync(watermarkedUri);
        setPhoto(watermarkedUri);
        setPreviewPhoto(null);
      } catch (e: any) {
        Alert.alert('Error', e.message || JSON.stringify(e));
      }
      setUploading(false);
    }
  };
  const retakePhoto = () => {
    setPreviewPhoto(null);
    setShowCamera(true);
  };

  const driverName = store.name || 'Driver';
  const vehicleNo = store.vehicleNumber || 'Vehicle';

  if (showCamera) {
    return (
      <View style={{ flex: 1 }}>
        <CameraView style={{ flex: 1 }} facing="back" ref={cameraRef}>
          <View style={styles.cameraWatermarkTop}>
            <Text style={styles.cameraWatermarkText}>MoveAd • {driverName} • {vehicleNo}</Text>
          </View>
          <View style={styles.cameraControls}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCamera(false)}>
              <MaterialCommunityIcons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.captureBtn} onPress={capturePhoto}>
              <View style={styles.captureInner} />
            </TouchableOpacity>
            <View style={{ width: 52 }} />
          </View>
        </CameraView>
      </View>
    );
  }

  // Build the diagonal watermark text
  const watermarkLine1 = `MoveAd • ${driverName} • ${vehicleNo}`;
  const watermarkLine2 = `${photoMeta?.location || ''}`;
  const watermarkLine3 = `${photoMeta?.date || ''} ${photoMeta?.time || ''}`;
  const watermarkLine4 = `${photoMeta?.coords || ''}`;

  if (previewPhoto) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
        {/* Use ViewShot component wrapper for reliable Android capture */}
        <ViewShot ref={watermarkRef} options={{ format: 'jpg', quality: 0.9 }} style={{ flex: 1, backgroundColor: '#000' }}>
          <Image source={{ uri: previewPhoto }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          
          {/* Diagonal watermark overlay */}
          <View style={styles.diagonalWatermarkContainer} pointerEvents="none">
            {/* 2 diagonal watermarks: top-middle and bottom-middle */}
            {[1, 3].map((row) => (
              <View key={row} style={[styles.diagonalRow, { top: `${row * 25}%` }]}>
                <View style={styles.diagonalTextBlock}>
                  <Text style={styles.diagonalText}>{watermarkLine1}</Text>
                  <Text style={styles.diagonalTextSmall}>{watermarkLine2}</Text>
                  <Text style={styles.diagonalTextSmall}>{watermarkLine3} • {watermarkLine4}</Text>
                </View>
              </View>
            ))}
          </View>
        </ViewShot>
        <View style={styles.previewActions}>
          <TouchableOpacity style={styles.retakeBtn} onPress={retakePhoto} disabled={uploading}>
            <MaterialCommunityIcons name="camera-retake" size={20} color="#888" />
            <Text style={styles.retakeBtnText}>Retake</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.confirmBtn, 
              (uploading || photoMeta?.coords === 'Locating...') && { opacity: 0.6 }
            ]} 
            onPress={confirmUpload} 
            disabled={uploading || photoMeta?.coords === 'Locating...'}
          >
            {(!uploading && photoMeta?.coords !== 'Locating...') && (
              <MaterialCommunityIcons name="check" size={22} color="#fff" />
            )}
            <Text style={styles.confirmBtnText}>
              {photoMeta?.coords === 'Locating...' ? 'Locating...' : uploading ? 'Uploading...' : 'Upload'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.surface }}>
      <Modal visible={showFullPhoto} transparent animationType="fade">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => setShowFullPhoto(false)}>
            <MaterialCommunityIcons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Image source={{ uri: photo! }} style={{ flex: 1 }} resizeMode="contain" />
          <View style={styles.fullPhotoMeta}>
            <Text style={styles.fullPhotoTitle}>Photo Details</Text>
            <Text style={styles.fullPhotoDetail}>📍 {photoMeta?.location}</Text>
            <Text style={styles.fullPhotoDetail}>🕐 {photoMeta?.date} {photoMeta?.time}</Text>
            <Text style={styles.fullPhotoDetail}>🌐 {photoMeta?.coords}</Text>
            <Text style={styles.fullPhotoWatermark}>MoveAd • {driverName} • {vehicleNo}</Text>
          </View>
        </SafeAreaView>
      </Modal>

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View style={styles.profileRow}>
            <View style={[styles.avatarCircle, { backgroundColor: t.border }]}>
              <MaterialCommunityIcons name="account" size={28} color={t.textMuted} />
            </View>
            <View>
              <Text style={[styles.driverName, { color: t.text }]}>{driverName}</Text>
              <Text style={[styles.vehicleNo, { color: t.textMuted }]}>{vehicleNo}</Text>
            </View>
          </View>
          <TouchableOpacity style={[styles.bellBtn, { backgroundColor: t.card }]}>
            <MaterialCommunityIcons name="bell-outline" size={22} color={t.text} />
            <View style={[styles.bellDot, { backgroundColor: t.brand }]} />
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: t.card }]}>
          <Text style={[styles.cardTitle, { color: t.text }]}>Daily Photo Upload</Text>
          {!photo && <Text style={[styles.timer, { color: t.brand }]}>8hr left</Text>}

          <TouchableOpacity
            style={[styles.uploadBox, { backgroundColor: t.surface }]}
            onPress={() => photo && setShowFullPhoto(true)}
            activeOpacity={photo ? 0.8 : 1}>
            {photo ? (
              <View style={{ width: '100%', height: '100%' }}>
                <Image source={{ uri: photo }} style={styles.previewImage} />
                <View style={styles.tapHint}>
                  <MaterialCommunityIcons name="magnify-plus" size={16} color="#fff" />
                  <Text style={styles.tapHintText}>Tap to view</Text>
                </View>
              </View>
            ) : (
              <>
                <MaterialCommunityIcons name="camera-off" size={48} color={t.brand} />
                <Text style={[styles.uploadStatus, { color: t.brand }]}>Today's photo not uploaded</Text>
              </>
            )}
          </TouchableOpacity>

          {photo ? (
            <View style={styles.successRow}>
              <MaterialCommunityIcons name="check-circle" size={20} color="#22C55E" />
              <Text style={[styles.successText, { color: '#22C55E' }]}>Uploaded successfully today!</Text>
            </View>
          ) : (
            <Text style={[styles.uploadHint, { color: t.textMuted }]}>Please upload a clear photo of your rickshaw backside to keep earning today's rewards.</Text>
          )}

          {photo ? (
            <TouchableOpacity style={styles.retakeSmallBtn} onPress={handleTakePhoto}>
              <Text style={[styles.retakeSmallText, { color: t.textMuted }]}>Retake photo</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.button, { backgroundColor: t.brand }]} onPress={handleTakePhoto}>
              <MaterialCommunityIcons name="camera" size={20} color="#fff" />
              <Text style={styles.buttonText}>Take photo now</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={[styles.card, { backgroundColor: t.card, marginTop: 16 }]}>
          <Text style={[styles.cardTitle, { color: t.text, fontSize: 16, textAlign: 'left', marginBottom: 4 }]}>
            {today.toLocaleString('en-IN', { month: 'long', year: 'numeric' })}
          </Text>
          <Text style={[styles.uploadHint, { color: t.textMuted, textAlign: 'left', marginBottom: 12 }]}>Daily upload compliance</Text>
          <View style={styles.heatmap}>
            {['S','M','T','W','T','F','S'].map((d, i) => (
              <View key={i} style={styles.heatmapCell}>
                <Text style={{ color: t.textMuted, fontSize: 9 }}>{d}</Text>
              </View>
            ))}
          </View>
          <View style={styles.heatmap}>
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const uploaded = uploadedDays.includes(day);
              const isToday = day === today.getDate();
              const isFuture = day > today.getDate();
              return (
                <View key={day} style={[
                  styles.heatmapCell,
                  { backgroundColor: isFuture ? t.surface : uploaded ? '#22C55E' : '#EF444420' },
                  isToday && { borderWidth: 2, borderColor: t.brand },
                ]}>
                  <Text style={{
                    fontSize: 10,
                    fontWeight: isToday ? 'bold' : 'normal',
                    color: isFuture ? t.textMuted : uploaded ? '#fff' : '#EF4444',
                  }}>{day}</Text>
                </View>
              );
            })}
          </View>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#22C55E' }]} />
              <Text style={[styles.legendText, { color: t.textMuted }]}>Uploaded</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
              <Text style={[styles.legendText, { color: t.textMuted }]}>Missed</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: t.surface, borderWidth: 1, borderColor: t.border }]} />
              <Text style={[styles.legendText, { color: t.textMuted }]}>Upcoming</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.tabBar, { backgroundColor: t.card, borderTopColor: t.border }]}>
        <TouchableOpacity style={styles.tabItem}>
          <MaterialCommunityIcons name="home" size={24} color={t.brand} />
          <Text style={[styles.tabLabelActive, { color: t.brand }]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem}>
          <MaterialCommunityIcons name="bullhorn-outline" size={24} color={t.textMuted} />
          <Text style={[styles.tabLabel, { color: t.textMuted }]}>My Ads</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem}>
          <MaterialCommunityIcons name="wallet-outline" size={24} color={t.textMuted} />
          <Text style={[styles.tabLabel, { color: t.textMuted }]}>Wallet</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem}>
          <MaterialCommunityIcons name="account-outline" size={24} color={t.textMuted} />
          <Text style={[styles.tabLabel, { color: t.textMuted }]}>Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarCircle: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  driverName: { fontSize: 16, fontWeight: 'bold' },
  vehicleNo: { fontSize: 13 },
  bellBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  bellDot: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4 },
  card: { borderRadius: 20, padding: 20 },
  cardTitle: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 4 },
  timer: { fontSize: 14, textAlign: 'center', marginBottom: 16, fontWeight: '500' },
  uploadBox: { borderRadius: 16, height: 180, alignItems: 'center', justifyContent: 'center', marginBottom: 16, gap: 8, overflow: 'hidden' },
  previewImage: { width: '100%', height: '100%' },
  metaOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.65)', padding: 8 },
  metaText: { color: '#fff', fontSize: 10, marginBottom: 2 },
  metaWatermark: { color: '#E05409', fontSize: 10, fontWeight: 'bold', marginTop: 2 },
  diagonalWatermarkContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' },
  diagonalRow: { position: 'absolute', left: -40, right: -40, alignItems: 'center', transform: [{ rotate: '-30deg' }] },
  diagonalTextBlock: { alignItems: 'center', paddingVertical: 4, backgroundColor: 'rgba(0,0,0,0.15)', paddingHorizontal: 100, borderRadius: 10 },
  diagonalText: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 'bold', textAlign: 'center', letterSpacing: 0.5, textShadowColor: 'black', textShadowRadius: 3, textShadowOffset: { width: 1, height: 1 } },
  diagonalTextSmall: { color: 'rgba(255,255,255,0.7)', fontSize: 10, textAlign: 'center', marginTop: 1, textShadowColor: 'black', textShadowRadius: 2, textShadowOffset: { width: 1, height: 1 } },
  tapHint: { position: 'absolute', top: 8, right: 8, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  tapHintText: { color: '#fff', fontSize: 10 },
  uploadStatus: { fontSize: 14, fontWeight: '500' },
  uploadHint: { fontSize: 13, textAlign: 'center', marginBottom: 16, lineHeight: 20 },
  successRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 12 },
  successText: { fontSize: 14, fontWeight: '600' },
  button: { borderRadius: 12, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  retakeSmallBtn: { alignItems: 'center', paddingVertical: 8 },
  retakeSmallText: { fontSize: 13 },
  previewActions: { flexDirection: 'row', padding: 20, gap: 12, backgroundColor: '#000' },
  retakeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#333' },
  retakeBtnText: { color: '#888', fontSize: 15 },
  confirmBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: '#22C55E' },
  confirmBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  closeBtn: { position: 'absolute', top: 50, right: 20, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, padding: 8 },
  fullPhotoMeta: { backgroundColor: '#111', padding: 20 },
  fullPhotoTitle: { color: '#fff', fontSize: 14, fontWeight: 'bold', marginBottom: 8 },
  fullPhotoDetail: { color: '#aaa', fontSize: 13, marginBottom: 4 },
  fullPhotoWatermark: { color: '#E05409', fontSize: 13, fontWeight: 'bold', marginTop: 4 },
  heatmap: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 4 },
  heatmapCell: { width: 34, height: 34, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  legendRow: { flexDirection: 'row', gap: 16, marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12 },
  tabBar: { flexDirection: 'row', paddingVertical: 10, paddingBottom: 16, borderTopWidth: 1 },
  tabItem: { flex: 1, alignItems: 'center', gap: 2 },
  tabLabel: { fontSize: 11 },
  tabLabelActive: { fontSize: 11, fontWeight: 'bold' },
  cameraControls: { position: 'absolute', bottom: 40, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 40 },
  cancelBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  captureBtn: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  captureInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff', borderWidth: 2, borderColor: '#333' },
  cameraWatermarkTop: { position: 'absolute', top: 60, left: 0, right: 0, alignItems: 'center' },
  cameraWatermarkText: { color: '#E05409', fontSize: 12, fontWeight: 'bold', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
});