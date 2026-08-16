import React, { useState, useEffect } from 'react';
import { View, Text, Modal, ScrollView, ActivityIndicator, Clipboard } from 'react-native';
import { X, ShieldCheck, Copy, KeyRound } from 'lucide-react-native';
import Toast from 'react-native-toast-message';

import { useTheme } from '../../hooks/useTheme';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import * as authApi from '../../features/auth/authApi';
import type { TwoFactorSetupResponse } from '@gym/shared';
import QRCode from 'react-native-qrcode-svg';

interface TwoFactorSetupModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function TwoFactorSetupModal({ visible, onClose, onSuccess }: TwoFactorSetupModalProps) {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [setupData, setSetupData] = useState<TwoFactorSetupResponse | null>(null);
  const [token, setToken] = useState('');

  useEffect(() => {
    if (visible) {
      loadSetup();
    } else {
      setSetupData(null);
      setToken('');
    }
  }, [visible]);

  const loadSetup = async () => {
    setLoading(true);
    try {
      const data = await authApi.generateTwoFactor();
      setSetupData(data);
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Could not generate 2FA setup' });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (token.length !== 6) {
      Toast.show({ type: 'error', text1: 'Enter a valid 6-digit code' });
      return;
    }
    setVerifying(true);
    try {
      await authApi.verifyTwoFactor(token);
      Toast.show({ type: 'success', text1: '2FA enabled successfully!' });
      onSuccess();
      onClose();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Invalid code, please try again.' });
    } finally {
      setVerifying(false);
    }
  };

  const copySecret = () => {
    if (setupData?.secret) {
      Clipboard.setString(setupData.secret);
      Toast.show({ type: 'success', text1: 'Copied to clipboard' });
    }
  };

  // Convert qrCodeDataUrl to just the payload string for react-native-qrcode-svg if it's an otpauth:// uri
  // The backend might return a data URI (image) or raw otpauth:// URI.
  // Assuming qrCodeDataUrl is an otpauth:// URI based on standard libraries, or if it's a data image, we'd need to use Image component.
  // We'll use the secret directly as a fallback if the QR data url isn't an otpauth.
  
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ borderBottomColor: colors.border }} className="flex-row justify-between items-center px-4 py-3 border-b">
          <View className="flex-row items-center gap-2">
            <ShieldCheck size={20} color={colors.foreground} />
            <Text style={{ color: colors.foreground }} className="text-xl font-black">Enable 2FA</Text>
          </View>
          <Button variant="ghost" size="sm" onPress={onClose} className="p-2">
            <X size={20} color={colors.foreground} />
          </Button>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
          {loading ? (
            <View className="py-10 items-center justify-center">
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : setupData ? (
            <View className="gap-6">
              <View>
                <Text style={{ color: colors.foreground }} className="font-bold mb-1 text-base">1. Scan QR Code</Text>
                <Text style={{ color: colors.mutedForeground }} className="text-sm mb-4">
                  Scan the QR code below using your authenticator app (like Google Authenticator, Authy, or 1Password).
                </Text>
                
                <View className="items-center justify-center mb-2">
                  <View style={{ backgroundColor: '#ffffff', padding: 16, borderRadius: 12 }}>
                    {/* The backend usually sends otpauth string in qrCodeDataUrl or a data URL. We will just render the raw otpauth if it's not a data URL */}
                    {setupData.qrCodeDataUrl.startsWith('otpauth://') ? (
                      <QRCode value={setupData.qrCodeDataUrl} size={180} />
                    ) : (
                      <QRCode value={`otpauth://totp/ValorFitness?secret=${setupData.secret}&issuer=ValorFitness`} size={180} />
                    )}
                  </View>
                </View>
              </View>

              <View>
                <Text style={{ color: colors.foreground }} className="font-bold mb-1 text-base">2. Or Enter Setup Key</Text>
                <Text style={{ color: colors.mutedForeground }} className="text-sm mb-3">
                  If you can't scan the QR code, manually enter this secret key into your app.
                </Text>
                <View style={{ backgroundColor: colors.secondary, borderColor: colors.border }} className="flex-row items-center justify-between border rounded-lg p-3">
                  <Text style={{ color: colors.foreground }} className="font-mono font-bold tracking-widest">{setupData.secret}</Text>
                  <Button variant="ghost" size="sm" onPress={copySecret} className="px-2 py-1 h-auto">
                    <Copy size={16} color={colors.primary} />
                  </Button>
                </View>
              </View>

              <View>
                <Text style={{ color: colors.foreground }} className="font-bold mb-1 text-base">3. Verify Code</Text>
                <Text style={{ color: colors.mutedForeground }} className="text-sm mb-3">
                  Enter the 6-digit code from your authenticator app to verify the setup.
                </Text>
                <Input
                  placeholder="000000"
                  value={token}
                  onChangeText={setToken}
                  keyboardType="number-pad"
                  maxLength={6}
                  leftIcon={<KeyRound size={16} color={colors.mutedForeground} />}
                />
              </View>

              <Button 
                className="mt-4" 
                onPress={handleVerify} 
                isLoading={verifying}
                disabled={token.length !== 6}
              >
                Verify & Enable 2FA
              </Button>
            </View>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}
