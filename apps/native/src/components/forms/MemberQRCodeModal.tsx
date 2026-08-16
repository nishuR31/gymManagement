import React from 'react';
import { View, Text, Modal, TouchableOpacity, ActivityIndicator } from 'react-native';
import { X } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';
import { useTheme } from '../../hooks/useTheme';

interface MemberQRCodeModalProps {
  visible: boolean;
  onClose: () => void;
  qrPayload: string | null;
  loading: boolean;
  memberName: string;
}

export function MemberQRCodeModal({
  visible,
  onClose,
  qrPayload,
  loading,
  memberName,
}: MemberQRCodeModalProps) {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 }}>
        <View style={{ backgroundColor: colors.card, borderRadius: 24, padding: 24, alignItems: 'center' }}>

          <View className="w-full flex-row justify-between items-center mb-6">
            <Text style={{ color: colors.foreground }} className="text-xl font-bold">
              Member Check-in
            </Text>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <X size={20} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          <Text style={{ color: colors.mutedForeground }} className="text-center mb-6">
            Show this QR Code to the front desk to check in.
          </Text>

          <View style={{
            backgroundColor: '#ffffff',
            padding: 24,
            borderRadius: 16,
            marginBottom: 24,
            elevation: 4,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8
          }}>
            {loading ? (
              <View style={{ width: 200, height: 200, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : qrPayload ? (
              <QRCode
                value={qrPayload}
                size={200}
                color="#000000"
                backgroundColor="#ffffff"
              />
            ) : (
              <View style={{ width: 200, height: 200, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: '#ef4444' }}>Failed to load QR code.</Text>
              </View>
            )}
          </View>

          <Text style={{ color: colors.foreground }} className="text-lg font-black tracking-wide">
            {memberName}
          </Text>

        </View>
      </View>
    </Modal>
  );
}
