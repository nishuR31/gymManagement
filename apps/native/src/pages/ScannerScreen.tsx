import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, Dimensions } from 'react-native';
import { Camera, CameraView, useCameraPermissions } from 'expo-camera';
import { ScreenWrapper, PageHeader } from '../components/layout/ScreenWrapper';
import { Button } from '../components/ui/Button';
import { useTheme } from '../hooks/useTheme';
import { ScanLine } from 'lucide-react-native';
import { useIsFocused } from '@react-navigation/native';

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
            style={StyleSheet.absoluteFillObject}
            facing="back"
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ['qr', 'pdf417'],
            }}
          />
        )}
        
        {/* Overlay frame for scanner */}
        <View style={StyleSheet.absoluteFillObject} className="items-center justify-center">
          <View style={{ width: 250, height: 250, borderWidth: 2, borderColor: colors.primary, borderRadius: 24, backgroundColor: 'transparent' }} className="items-center justify-center">
            <ScanLine size={64} color={`${colors.primary}80`} />
          </View>
        </View>
      </View>
      
      {scanned && (
        <Button className="mt-6" onPress={() => setScanned(false)}>
          Tap to Scan Again
        </Button>
      )}
    </ScreenWrapper>
  );
}
