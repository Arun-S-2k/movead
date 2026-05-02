import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import * as MediaLibrary from 'expo-media-library';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { Alert, Image, Modal, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View, RefreshControl } from 'react-native';
import ViewShot, { captureRef } from 'react-native-view-shot';
import TabBar from '../components/TabBar';
import { clearSession, store } from '../constants/store';
import { supabase } from '../constants/supabase';
import { useTheme } from '../constants/theme';

const today = new Date();
const currentYear = today.getFullYear();
const currentMonth = today.getMonth();

const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

const totalCells = firstDayOfMonth + daysInMonth;
const rowsNeeded = Math.ceil(totalCells / 7);
const nextMonthDaysCount = (rowsNeeded * 7) - totalCells;



export default function Dashboard() {
  const t = useTheme();
  const router = useRouter();
  const [showCamera, setShowCamera] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [uploadedDays, setUploadedDays] = useState<number[]>([]);
  const [photo, setPhoto] = useState<string | null>(null);
  const [showFullPhoto, setShowFullPhoto] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photoMeta, setPhotoMeta] = useState<{ date: string; time: string; location: string; coords: string } | null>(null);
  const [driverId, setDriverId] = useState<string | null>(null);
  const [monthUploads, setMonthUploads] = useState<any[]>([]);
  const [historyPhoto, setHistoryPhoto] = useState<{ photo_url: string; meta: any } | null>(null);
  const [showAdModal, setShowAdModal] = useState(false);
  const [activeCampaign, setActiveCampaign] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const payoutPerMonth = 300;
  const payoutPerWeek = payoutPerMonth / 4;

  let currentAd: any = null;
  if (activeCampaign && activeCampaign.campaigns) {
    const sDate = new Date(activeCampaign.assigned_on || activeCampaign.campaigns.start_date);
    const eDate = new Date(activeCampaign.expected_end || activeCampaign.campaigns.end_date);
    const formatDate = (d: Date) => d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    
    // dynamically handle payout
    let payoutText = `₹${payoutPerMonth} / month`;
    let splitText = `₹${payoutPerWeek} / week`;

    if (activeCampaign.payment_amount) {
      if (activeCampaign.payout_frequency === 'Weekly') {
        payoutText = `₹${activeCampaign.payment_amount} / week`;
        splitText = `₹${(activeCampaign.payment_amount / 7).toFixed(0)} / day`;
      } else {
        payoutText = `₹${activeCampaign.payment_amount} / month`;
        splitText = `₹${(activeCampaign.payment_amount / 4).toFixed(0)} / week`;
      }
    }

    currentAd = {
      advertiser: activeCampaign.campaigns.advertiser || 'Unknown Advertiser',
      title: activeCampaign.campaigns.name || 'Ad Campaign',
      tenure: `${formatDate(sDate)} - ${formatDate(eDate)}`,
      payout: payoutText,
      payoutSplit: splitText,
      image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?q=80&w=800&h=200&fit=crop',
      dimensions: '60cm x 15cm sticker',
      description: 'Please ensure the sticker remains clean and visible at all times. Upload daily photos to receive your payout.',
    };
  }

  const fetchData = async () => {
    if (!store.mobile) return;
    try {
      // Step 1: Get driver record from drivers table using mobile number
      const { data: driverData, error: driverError } = await supabase
        .from('drivers')
        .select('id')
        .eq('mobile', store.mobile)
        .single();

        if (driverError || !driverData) {
          console.error('[Dashboard] Failed to fetch driver record:', driverError?.message);
          return;
        }

        const fetchedDriverId = driverData.id;
        setDriverId(fetchedDriverId);

        // Step 2: Query photo_uploads for this driver in the current month
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const startOfMonth = new Date(year, month - 1, 1).toISOString();
        const startOfNextMonth = new Date(year, month, 1).toISOString();

        // Try querying by driver_id with date filter
        let { data, error } = await supabase
          .from('photo_uploads')
          .select('uploaded_at, photo_url, location_name, latitude, longitude')
          .eq('driver_id', fetchedDriverId)
          .gte('uploaded_at', startOfMonth)
          .lt('uploaded_at', startOfNextMonth);

        // Fallback: if no results by driver_id, try by mobile
        if ((!data || data.length === 0) && store.mobile) {
          const fallback = await supabase
            .from('photo_uploads')
            .select('uploaded_at, photo_url, location_name, latitude, longitude')
            .eq('mobile', store.mobile)
            .gte('uploaded_at', startOfMonth)
            .lt('uploaded_at', startOfNextMonth);
          data = fallback.data;
          error = fallback.error;
        }

        // Step 3: Fetch active campaign for driver
        const { data: campaignData } = await supabase
          .from('driver_campaigns')
          .select('*, campaigns(*)')
          .eq('driver_id', fetchedDriverId)
          .eq('status', 'active')
          .maybeSingle();

        if (campaignData && campaignData.campaigns) {
          setActiveCampaign(campaignData);
        } else {
          setActiveCampaign(null);
        }

        if (data && data.length > 0) {
          setMonthUploads(data);
          // Extract unique day numbers for the heatmap (use local date)
          const days = data.map(item => new Date(item.uploaded_at).getDate());
          setUploadedDays(Array.from(new Set(days)));

          // Check if today's photo was already uploaded — compare using local date parts
          const todayDate = now.getDate();
          const todayMonth = now.getMonth();
          const todayYear = now.getFullYear();
          const todayUpload = data.find(item => {
            const d = new Date(item.uploaded_at);
            return d.getDate() === todayDate && d.getMonth() === todayMonth && d.getFullYear() === todayYear;
          });
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
          console.error('[Dashboard] Fetch error:', error.message);
        }
    } catch (e) {
      console.error('[Dashboard] Error in fetch:', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };
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
          driver_id: driverId,
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

  const activeModalPhotoUrl = historyPhoto ? historyPhoto.photo_url : photo;
  const activeModalMeta = historyPhoto ? historyPhoto.meta : photoMeta;
  const isModalVisible = showFullPhoto || !!historyPhoto;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.surface }}>
      <Modal visible={isModalVisible} transparent animationType="fade">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => { setShowFullPhoto(false); setHistoryPhoto(null); }}>
            <MaterialCommunityIcons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          {activeModalPhotoUrl && <Image source={{ uri: activeModalPhotoUrl }} style={{ flex: 1 }} resizeMode="contain" />}
          <View style={styles.fullPhotoMeta}>
            <Text style={styles.fullPhotoTitle}>Photo Details</Text>
            <Text style={styles.fullPhotoDetail}>📍 {activeModalMeta?.location}</Text>
            <Text style={styles.fullPhotoDetail}>🕐 {activeModalMeta?.date} {activeModalMeta?.time}</Text>
            <Text style={styles.fullPhotoDetail}>🌐 {activeModalMeta?.coords}</Text>
            <Text style={styles.fullPhotoWatermark}>MoveAd • {driverName} • {vehicleNo}</Text>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Advertisement Details Modal */}
      {currentAd && (
        <Modal visible={showAdModal} transparent animationType="slide">
          <SafeAreaView style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)' }}>
            <View style={[styles.adModalContent, { backgroundColor: t.surface }]}>
              <View style={styles.adModalHeader}>
                <Text style={[styles.adModalTitle, { color: t.text }]}>Campaign Details</Text>
                <TouchableOpacity onPress={() => setShowAdModal(false)}>
                  <MaterialCommunityIcons name="close-circle" size={32} color={t.textMuted} />
                </TouchableOpacity>
              </View>
              
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Aspect ratio 4:1 for 60x15cm */}
                <View style={styles.adFullImageContainer}>
                  <Image source={{ uri: currentAd.image }} style={styles.adFullImage} resizeMode="cover" />
                  <View style={styles.adDimensionsBadge}>
                    <Text style={styles.adDimensionsText}>{currentAd.dimensions}</Text>
                  </View>
                </View>

                <View style={[styles.adDetailBox, { backgroundColor: t.card }]}>
                  <Text style={[styles.adDetailLabel, { color: t.textMuted }]}>Advertiser</Text>
                  <Text style={[styles.adDetailValue, { color: t.text }]}>{currentAd.advertiser}</Text>
                  
                  <Text style={[styles.adDetailLabel, { color: t.textMuted, marginTop: 16 }]}>Campaign</Text>
                  <Text style={[styles.adDetailValue, { color: t.text }]}>{currentAd.title}</Text>
                  
                  <Text style={[styles.adDetailLabel, { color: t.textMuted, marginTop: 16 }]}>Tenure</Text>
                  <Text style={[styles.adDetailValue, { color: t.text }]}>{currentAd.tenure}</Text>

                  <Text style={[styles.adDetailLabel, { color: t.textMuted, marginTop: 16 }]}>Payouts</Text>
                  <Text style={[styles.adDetailValue, { color: '#22C55E' }]}>{currentAd.payout} <Text style={{fontSize: 14, color: t.textMuted, fontWeight: 'normal'}}>(Paid {currentAd.payoutSplit})</Text></Text>

                  <Text style={[styles.adDetailLabel, { color: t.textMuted, marginTop: 16 }]}>Instructions</Text>
                  <Text style={[styles.adDetailValue, { color: t.text, fontWeight: 'normal', lineHeight: 22 }]}>{currentAd.description}</Text>
                </View>
              </ScrollView>
            </View>
          </SafeAreaView>
        </Modal>
      )}

      <ScrollView 
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.brand} colors={[t.brand]} />}
      >
        <View style={styles.header}>
          <View style={styles.profileRow}>
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

        {!currentAd ? (
          <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border, paddingVertical: 40, alignItems: 'center' }]}>
            <MaterialCommunityIcons name="bullhorn-outline" size={48} color={t.textMuted} style={{ marginBottom: 16 }} />
            <Text style={{ color: t.text, fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>No Active Campaign</Text>
            <Text style={{ color: t.textMuted, fontSize: 14, textAlign: 'center', paddingHorizontal: 20 }}>You will be notified once a new campaign is assigned to your vehicle.</Text>
          </View>
        ) : (
          <>
            <TouchableOpacity 
              style={[styles.adCard, { backgroundColor: t.card, borderColor: t.border }]} 
              onPress={() => setShowAdModal(true)}
              activeOpacity={0.8}
            >
              <View style={styles.adHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.adLabel, { color: t.textMuted }]}>Current Campaign</Text>
                  <Text style={[styles.adAdvertiser, { color: t.text }]}>{currentAd.advertiser}</Text>
                </View>
                <View style={[styles.adBadge, { backgroundColor: '#22C55E' }]}>
                  <Text style={[styles.adBadgeText, { color: '#FFF' }]}>Active</Text>
                </View>
              </View>
              
              {/* A small preview strip of the ad */}
              <Image source={{ uri: currentAd.image }} style={styles.adPreviewStrip} resizeMode="cover" />
              
              <View style={[styles.adFooterRow, { justifyContent: 'space-between', alignItems: 'flex-end' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingBottom: 2 }}>
                  <MaterialCommunityIcons name="calendar-range" size={16} color={t.textMuted} />
                  <Text style={[styles.adTenure, { color: t.textMuted }]}>{currentAd.tenure}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <MaterialCommunityIcons name="cash-multiple" size={16} color="#22C55E" />
                    <Text style={[styles.adTenure, { color: '#22C55E', fontWeight: 'bold' }]}>{currentAd.payout}</Text>
                  </View>
                  <Text style={{ fontSize: 11, color: t.textMuted, marginTop: 2 }}>Split: {currentAd.payoutSplit}</Text>
                </View>
              </View>
            </TouchableOpacity>

            <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
              <Text style={[styles.cardTitle, { color: t.text }]}>Daily Photo Upload</Text>
              {!photo && <Text style={[styles.timer, { color: t.brand }]}>8hr left</Text>}

              <TouchableOpacity
                style={[styles.uploadBox, { backgroundColor: t.inputBg, borderColor: t.border }]}
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
          </>
        )}

        <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border, marginTop: 16 }]}>
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
            {/* Previous month trailing dates */}
            {Array.from({ length: firstDayOfMonth }, (_, i) => {
              const prevDay = daysInPrevMonth - firstDayOfMonth + i + 1;
              return (
                <View key={`prev-${i}`} style={[styles.heatmapCell, { backgroundColor: 'transparent' }]}>
                  <Text style={{ fontSize: 10, color: t.textMuted }}>{prevDay}</Text>
                </View>
              );
            })}
            
            {/* Current month dates */}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const uploaded = uploadedDays.includes(day);
              const isToday = day === today.getDate();
              const isFuture = day > today.getDate();
              
              const handlePress = () => {
                if (uploaded) {
                  const upload = monthUploads.find(item => new Date(item.uploaded_at).getDate() === day);
                  if (upload) {
                    const upDate = new Date(upload.uploaded_at);
                    setHistoryPhoto({
                      photo_url: upload.photo_url,
                      meta: {
                        location: upload.location_name || '',
                        date: upDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
                        time: upDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
                        coords: `${upload.latitude}, ${upload.longitude}`
                      }
                    });
                  }
                }
              };
              
              const CellWrapper = uploaded ? TouchableOpacity : View;

              return (
                <CellWrapper 
                  key={day} 
                  style={[
                    styles.heatmapCell,
                    { backgroundColor: isFuture ? t.inputBg : uploaded ? '#22C55E' : '#EF444420' },
                    isToday && { borderWidth: 2, borderColor: '#E05409' }, // Matches orange border in mockup
                  ]}
                  onPress={uploaded ? handlePress : undefined}
                >
                  <Text style={{
                    fontSize: 10,
                    fontWeight: isToday ? 'bold' : 'normal',
                    color: isFuture ? t.textMuted : uploaded ? '#fff' : '#EF4444',
                  }}>{day}</Text>
                </CellWrapper>
              );
            })}

            {/* Next month leading dates */}
            {Array.from({ length: nextMonthDaysCount }, (_, i) => {
              const nextDay = i + 1;
              return (
                <View key={`next-${i}`} style={[styles.heatmapCell, { backgroundColor: 'transparent' }]}>
                  <Text style={{ fontSize: 10, color: t.textMuted }}>{nextDay}</Text>
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
              <View style={[styles.legendDot, { backgroundColor: t.inputBg, borderWidth: 1, borderColor: t.border }]} />
              <Text style={[styles.legendText, { color: t.textMuted }]}>Upcoming</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <TabBar activeTab="home" />
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
  card: { borderRadius: 20, padding: 20, borderWidth: 1, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
  cardTitle: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 4 },
  timer: { fontSize: 14, textAlign: 'center', marginBottom: 16, fontWeight: '500' },
  uploadBox: { borderRadius: 16, height: 180, alignItems: 'center', justifyContent: 'center', marginBottom: 16, gap: 8, overflow: 'hidden', borderWidth: 1.5, borderStyle: 'dashed' },
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
  heatmap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 4, width: '100%' },
  heatmapCell: { width: '13%', aspectRatio: 1, borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
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
  
  // Advertisement Card Styles
  adCard: { borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
  adHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  adLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, fontWeight: '600' },
  adAdvertiser: { fontSize: 18, fontWeight: 'bold' },
  adBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  adBadgeText: { fontSize: 11, fontWeight: 'bold' },
  adPreviewStrip: { width: '100%', height: 48, borderRadius: 8, marginBottom: 14 },
  adFooterRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  adTenure: { fontSize: 13, fontWeight: '500' },
  
  // Advertisement Modal Styles
  adModalContent: { flex: 1, marginTop: 80, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 },
  adModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  adModalTitle: { fontSize: 22, fontWeight: 'bold' },
  adFullImageContainer: { width: '100%', aspectRatio: 4, borderRadius: 16, overflow: 'hidden', marginBottom: 24, backgroundColor: '#000' },
  adFullImage: { width: '100%', height: '100%' },
  adDimensionsBadge: { position: 'absolute', bottom: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.65)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  adDimensionsText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  adDetailBox: { borderRadius: 20, padding: 24 },
  adDetailLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, fontWeight: '600' },
  adDetailValue: { fontSize: 16, fontWeight: 'bold' },
});