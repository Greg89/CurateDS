import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export interface CapturedPhoto {
  uri: string;
  fileName: string;
  contentType: string;
}

interface Props {
  onPhotoCaptured: (photo: CapturedPhoto) => void;
  onCancel: () => void;
}

export default function CameraScreen({ onPhotoCaptured, onCancel }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [flash, setFlash] = useState<'on' | 'off'>('off');
  const [capturing, setCapturing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  async function handleCapture() {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
      if (photo) {
        onPhotoCaptured({
          uri: photo.uri,
          fileName: `photo_${Date.now()}.jpg`,
          contentType: 'image/jpeg',
        });
      }
    } finally {
      setCapturing(false);
    }
  }

  async function handleGallery() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      onPhotoCaptured({
        uri: asset.uri,
        fileName: asset.fileName ?? `photo_${Date.now()}.jpg`,
        contentType: asset.mimeType ?? 'image/jpeg',
      });
    }
  }

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator testID="camera-permission-loading" size="large" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.message}>Camera access is needed to take photos.</Text>
        <Pressable
          testID="request-permission-button"
          style={styles.button}
          onPress={() => void requestPermission()}
        >
          <Text style={styles.buttonText}>Allow Camera</Text>
        </Pressable>
        <Pressable
          testID="gallery-fallback-button"
          style={[styles.button, styles.secondaryButton]}
          onPress={() => void handleGallery()}
        >
          <Text style={styles.buttonText}>Choose from Gallery</Text>
        </Pressable>
        <Pressable testID="cancel-button" onPress={onCancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        flash={flash}
        testID="camera-view"
      />
      <View style={styles.controls}>
        <Pressable testID="cancel-button" onPress={onCancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <Pressable
          testID="capture-button"
          style={[styles.captureButton, capturing && styles.captureDisabled]}
          onPress={() => void handleCapture()}
          disabled={capturing}
        >
          {capturing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View style={styles.captureInner} />
          )}
        </Pressable>
        <Pressable
          testID="flash-toggle-button"
          onPress={() => setFlash((f) => (f === 'off' ? 'on' : 'off'))}
        >
          <Text style={styles.flashText}>{flash === 'off' ? '⚡ Off' : '⚡ On'}</Text>
        </Pressable>
      </View>
      <Pressable
        testID="gallery-fallback-button"
        style={styles.galleryButton}
        onPress={() => void handleGallery()}
      >
        <Text style={styles.buttonText}>Gallery</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  camera: { flex: 1 },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingVertical: 24,
    backgroundColor: '#000',
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureDisabled: { opacity: 0.5 },
  captureInner: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#fff' },
  galleryButton: {
    position: 'absolute',
    bottom: 36,
    left: 32,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  button: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  secondaryButton: { backgroundColor: '#374151' },
  buttonText: { color: '#fff', fontWeight: '600' },
  message: { fontSize: 16, textAlign: 'center', color: '#374151' },
  cancelText: { color: '#fff', fontSize: 16 },
  flashText: { color: '#fff', fontSize: 14 },
});
