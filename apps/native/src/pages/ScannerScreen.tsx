import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, Dimensions, Platform } from 'react-native';
import { Camera, CameraView, useCameraPermissions } from 'expo-camera';
import { ScreenWrapper, PageHeader } from '../components/layout/ScreenWrapper';
import { Button } from '../components/ui/Button';
import { useTheme } from '../hooks/useTheme';
import { ScanLine, Image as ImageIcon } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { useIsFocused } from '@react-navigation/native';
import jsQR from 'jsqr';

export function ScannerScreen() {
  const { colors } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const isFocused = useIsFocused(); // Stop camera when navigating away

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission]);

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    setScanned(true);
    Alert.alert(
      'QR Code Scanned',
      `Type: ${type}\nData: ${data}`,
      [{ text: 'Scan Again', onPress: () => setScanned(false) }],
      { cancelable: false }
    );
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        
        if (Platform.OS === 'web') {
          // Web scanning using jsQR
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const code = jsQR(imageData.data, imageData.width, imageData.height);
              if (code) {
                handleBarCodeScanned({ type: 'qr', data: code.data });
              } else {
                Alert.alert('No QR Code', 'No valid QR code was found in the selected image.');
              }
            }
          };
          img.onerror = () => {
            Alert.alert('Error', 'Failed to load image for scanning.');
          };
          img.src = uri;
        } else {
          // Native scanning using BarCodeScanner
          const scannedResults = await BarCodeScanner.scanFromURLAsync(uri);
          if (scannedResults && scannedResults.length > 0) {
            const firstResult = scannedResults[0];
            handleBarCodeScanned({ type: firstResult.type as string, data: firstResult.data });
          } else {
            Alert.alert('No QR Code', 'No valid QR code was found in the selected image.');
          }
        }
      }
    } catch (error) {
      console.log('Error scanning image:', error);
      Alert.alert('Error', 'Failed to scan the image.');
    }
  };

  if (!permission) {
    return (
      <ScreenWrapper>
        <PageHeader title="QR Scanner" subtitle="Requesting camera permission..." />
        <View className="flex-1 items-center justify-center">
          <Text style={{ color: colors.foreground }}>Requesting camera permission...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  if (!permission.granted) {
    return (
      <ScreenWrapper>
        <PageHeader title="QR Scanner" subtitle="No access to camera" />
        <View className="flex-1 items-center justify-center p-6 gap-4">
          <Text style={{ color: colors.foreground }} className="text-center mb-4">
            We need your permission to show the camera to scan QR codes.
          </Text>
          <Button onPress={requestPermission}>Grant Permission</Button>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <PageHeader title="QR Scanner" subtitle="Point your camera at a QR code to read it." />
      
      <View className="flex-1 rounded-2xl overflow-hidden mt-4" style={{ backgroundColor: colors.secondary }}>
        {isFocused && (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ['qr', 'pdf417'],
            }}
          />
        )}
        
        {/* Overlay frame for scanner */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none" className="items-center justify-center">
          <View style={{ width: 250, height: 250, borderWidth: 2, borderColor: colors.primary, borderRadius: 24, backgroundColor: 'transparent' }} className="items-center justify-center">
            <ScanLine size={64} color={`${colors.primary}80`} />
          </View>
        </View>
      </View>
      
      <View className="mt-4 gap-3">
        {scanned && (
          <Button onPress={() => setScanned(false)}>
            Tap to Scan Again
          </Button>
        )}
        <Button variant="outline" onPress={pickImage} className="flex-row items-center justify-center gap-2">
          <ImageIcon size={20} color={colors.foreground} />
          <Text style={{ color: colors.foreground }} className="font-semibold ml-2">Upload from Gallery</Text>
        </Button>
      </View>
    </ScreenWrapper>
  );
}
