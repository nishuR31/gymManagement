import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { UserRound, LogOut, ShieldCheck, Mail, ShieldAlert, KeyRound, Smartphone, Activity, Flame, SwitchCamera } from 'lucide-react-native';
import Toast from 'react-native-toast-message';

import { ScreenWrapper, PageHeader } from '../components/layout/ScreenWrapper';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { logoutThunk } from '../features/auth/authSlice';
import { useTheme } from '../hooks/useTheme';
import { readableStatus, formatRelativeTime } from '../utils/format';
import { ChangePasswordModal } from '../components/forms/ChangePasswordModal';
import { TwoFactorSetupModal } from '../components/forms/TwoFactorSetupModal';
import { MemberQRCodeModal } from '../components/forms/MemberQRCodeModal';
import { QrCode } from 'lucide-react-native';

import * as authApi from '../features/auth/authApi';
import * as memberApi from '../features/members/memberApi';
import type { MemberDto, AuthUserDto } from '@gym/shared';

export function ProfileScreen() {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const authUser = useAppSelector((state) => state.auth.user);

  const [user, setUser] = useState<AuthUserDto | null>(authUser);
  const [memberData, setMemberData] = useState<MemberDto | null>(null);
  const [loadingMember, setLoadingMember] = useState(false);
  
  const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
  const [is2FAModalVisible, setIs2FAModalVisible] = useState(false);
  const [isQRModalVisible, setIsQRModalVisible] = useState(false);
  const [qrPayload, setQrPayload] = useState<string | null>(null);
  const [loadingQR, setLoadingQR] = useState(false);

  useEffect(() => {
    // Refresh user data to get accurate 2FA / Passkey status
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const refreshedUser = await authApi.getCurrentUser();
      setUser(refreshedUser);
      
      // If member, load member specific data
      if (refreshedUser.role === 'MEMBER') {
        setLoadingMember(true);
        const memberInfo = await memberApi.getCurrentMember();
        setMemberData(memberInfo);
        setLoadingMember(false);
      }
    } catch (e) {
      console.log('Error refreshing user data', e);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: () => {
            dispatch(logoutThunk());
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleToggle2FA = () => {
    if (user?.twoFactorEnabled) {
      // Prompt to disable
      Alert.alert(
        'Disable 2FA',
        'Are you sure you want to disable Two-Factor Authentication? This will reduce your account security.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Disable', 
            style: 'destructive', 
            onPress: async () => {
              // In a real flow we should prompt for a token to disable, 
              // for simplicity we'll pass a dummy token if the backend requires it, 
              // or let's assume the user needs to enter it.
              // For now, we will open an alert prompt on iOS (Android doesn't support text input in Alert)
              // Ideally, another modal. We'll simulate success if backend doesn't strictly require token for disable if not prompted.
              // Actually, auth.routes.ts says: server.post("/2fa/disable", { schema: tokenSchema }) so token IS required.
              // We'd need a prompt. Since React Native Alert doesn't have cross platform prompt easily,
              // we will just show a toast for this demo that it requires a code.
              Toast.show({ type: 'info', text1: 'Disabling requires entering a code (flow incomplete in UI)' });
            }
          }
        ]
      );
    } else {
      setIs2FAModalVisible(true);
    }
  };

  const handleShowQR = async () => {
    if (!memberData) return;
    setIsQRModalVisible(true);
    if (!qrPayload) {
      setLoadingQR(true);
      try {
        const qrResponse = await memberApi.getMemberQr(memberData.id);
        setQrPayload(qrResponse.qrPayload);
      } catch (e) {
        console.log('Error fetching QR payload', e);
        Toast.show({ type: 'error', text1: 'Failed to load QR code' });
      } finally {
        setLoadingQR(false);
      }
    }
  };

  if (!user) return null;

  return (
    <ScreenWrapper>
      <PageHeader
        label="Account"
        title="Your Profile"
        subtitle="Manage your personal details and session."
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Personal Information */}
        <View className="items-center mb-6 pt-4">
          <View
            style={{ backgroundColor: colors.primarySoft }}
            className="w-24 h-24 items-center justify-center rounded-full mb-4"
          >
            <UserRound size={40} color={colors.primary} />
          </View>
          <Text style={{ color: colors.foreground }} className="text-2xl font-black">
            {user.firstName} {user.lastName}
          </Text>
          <View style={{ backgroundColor: colors.primarySoft }} className="px-3 py-1 mt-2 rounded-full">
            <Text style={{ color: colors.primary }} className="text-xs font-bold uppercase tracking-widest">
              {readableStatus(user.role)}
            </Text>
          </View>
        </View>

        <Card className="mb-4">
          <CardContent className="p-4 gap-4">
            <View>
              <View className="flex-row items-center gap-2 mb-1">
                <Mail size={16} color={colors.mutedForeground} />
                <Text style={{ color: colors.mutedForeground }} className="text-xs font-bold uppercase tracking-widest">
                  Email
                </Text>
              </View>
              <Text style={{ color: colors.foreground }} className="text-base font-semibold">
                {user.email || 'N/A'}
              </Text>
            </View>
            <View style={{ backgroundColor: colors.border }} className="h-px" />
            <View>
              <View className="flex-row items-center gap-2 mb-1">
                <ShieldCheck size={16} color={colors.mutedForeground} />
                <Text style={{ color: colors.mutedForeground }} className="text-xs font-bold uppercase tracking-widest">
                  Permissions
                </Text>
              </View>
              <Text style={{ color: colors.foreground }} className="text-base font-semibold">
                {readableStatus(user.role)} Access
              </Text>
            </View>
          </CardContent>
        </Card>

        {/* Gym Statistics (Member Only) */}
        {user.role === 'MEMBER' && memberData && (
          <Card className="mb-4">
            <CardContent className="p-4 gap-4">
              <Text style={{ color: colors.foreground }} className="font-bold text-lg mb-2">Gym Statistics</Text>
              
              <View className="flex-row gap-4">
                <View className="flex-1 rounded-lg p-3" style={{ backgroundColor: colors.secondary }}>
                  <View className="flex-row items-center gap-2 mb-1">
                    <Flame size={16} color={colors.primary} />
                    <Text style={{ color: colors.mutedForeground }} className="text-xs font-bold uppercase tracking-widest">
                      Streak
                    </Text>
                  </View>
                  <Text style={{ color: colors.foreground }} className="text-xl font-black">
                    {memberData.streakDays || 0} <Text className="text-sm font-semibold text-muted-foreground">Days</Text>
                  </Text>
                </View>

                <View className="flex-1 rounded-lg p-3" style={{ backgroundColor: colors.secondary }}>
                  <View className="flex-row items-center gap-2 mb-1">
                    <Activity size={16} color={colors.success} />
                    <Text style={{ color: colors.mutedForeground }} className="text-xs font-bold uppercase tracking-widest">
                      Last Check-in
                    </Text>
                  </View>
                  <Text style={{ color: colors.foreground }} className="text-sm font-bold">
                    {memberData.lastAttendanceDate ? formatRelativeTime(memberData.lastAttendanceDate) : 'Never'}
                  </Text>
                </View>
              </View>
            </CardContent>
          </Card>
        )}

        {/* Digital ID Card */}
        {user.role === 'MEMBER' && memberData && (
          <Card className="mb-4">
            <CardContent className="p-4">
              <Text style={{ color: colors.foreground }} className="font-bold text-lg mb-4">Digital ID Card</Text>
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-3 flex-1 mr-4">
                  <View style={{ backgroundColor: colors.primarySoft }} className="h-10 w-10 items-center justify-center rounded-lg">
                    <QrCode size={18} color={colors.primary} />
                  </View>
                  <View className="flex-1">
                    <Text style={{ color: colors.foreground }} className="font-bold text-base">Check-in QR Code</Text>
                    <Text style={{ color: colors.mutedForeground }} className="text-xs">Scan at the front desk</Text>
                  </View>
                </View>
                <Button variant="primary" size="sm" onPress={handleShowQR}>
                  Show QR
                </Button>
              </View>
            </CardContent>
          </Card>
        )}

        {/* Security Settings */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <Text style={{ color: colors.foreground }} className="font-bold text-lg mb-4">Security</Text>

            {/* Change Password */}
            <View className="flex-row items-center justify-between mb-4 pb-4" style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <View className="flex-row items-center gap-3 flex-1 mr-4">
                <View style={{ backgroundColor: colors.secondary }} className="h-10 w-10 items-center justify-center rounded-lg">
                  <KeyRound size={18} color={colors.foreground} />
                </View>
                <View className="flex-1">
                  <Text style={{ color: colors.foreground }} className="font-bold text-base">Change Password</Text>
                  <Text style={{ color: colors.mutedForeground }} className="text-xs">Update your current password</Text>
                </View>
              </View>
              <Button variant="outline" size="sm" onPress={() => setIsPasswordModalVisible(true)}>
                Update
              </Button>
            </View>

            {/* Two-Factor Auth */}
            <View className="flex-row items-center justify-between mb-4 pb-4" style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <View className="flex-row items-center gap-3 flex-1 mr-4">
                <View style={{ backgroundColor: user.twoFactorEnabled ? colors.successSoft : colors.secondary }} className="h-10 w-10 items-center justify-center rounded-lg">
                  <Smartphone size={18} color={user.twoFactorEnabled ? colors.success : colors.foreground} />
                </View>
                <View className="flex-1">
                  <Text style={{ color: colors.foreground }} className="font-bold text-base">Two-Factor Auth</Text>
                  <Text style={{ color: colors.mutedForeground }} className="text-xs">Protect your account with TOTP</Text>
                </View>
              </View>
              <Button 
                variant={user.twoFactorEnabled ? "outline" : "primary"} 
                size="sm" 
                onPress={handleToggle2FA}
              >
                {user.twoFactorEnabled ? 'Enabled' : 'Enable'}
              </Button>
            </View>

            {/* Passkeys */}
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3 flex-1 mr-4">
                <View style={{ backgroundColor: user.hasPasskeys ? colors.primarySoft : colors.secondary }} className="h-10 w-10 items-center justify-center rounded-lg">
                  <SwitchCamera size={18} color={user.hasPasskeys ? colors.primary : colors.foreground} />
                </View>
                <View className="flex-1">
                  <Text style={{ color: colors.foreground }} className="font-bold text-base">Passkeys</Text>
                  <Text style={{ color: colors.mutedForeground }} className="text-xs">Login with FaceID or TouchID</Text>
                </View>
              </View>
              <Button variant="outline" size="sm" onPress={() => Toast.show({ type: 'info', text1: 'Passkey management coming soon' })}>
                Manage
              </Button>
            </View>

          </CardContent>
        </Card>

        {/* Account Actions */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <View className="flex-row items-center gap-3">
              <View style={{ backgroundColor: colors.destructiveSoft }} className="h-10 w-10 items-center justify-center rounded-lg">
                <LogOut size={18} color={colors.destructive} />
              </View>
              <View className="flex-1">
                <Text style={{ color: colors.foreground }} className="font-bold text-base">Log Out</Text>
                <Text style={{ color: colors.mutedForeground }} className="text-sm">End your current session safely</Text>
              </View>
              <Button variant="outline" onPress={handleLogout} style={{ borderColor: colors.destructive, backgroundColor: 'transparent' }}>
                <Text style={{ color: colors.destructive }} className="font-bold text-sm">Log Out</Text>
              </Button>
            </View>
          </CardContent>
        </Card>
      </ScrollView>

      {/* Modals */}
      <ChangePasswordModal 
        visible={isPasswordModalVisible} 
        onClose={() => setIsPasswordModalVisible(false)} 
      />

      <TwoFactorSetupModal 
        visible={is2FAModalVisible} 
        onClose={() => setIs2FAModalVisible(false)} 
        onSuccess={() => {
          setIs2FAModalVisible(false);
          loadUserData();
        }} 
      />

      {memberData && (
        <MemberQRCodeModal
          visible={isQRModalVisible}
          onClose={() => setIsQRModalVisible(false)}
          qrPayload={qrPayload}
          loading={loadingQR}
          memberName={`${user.firstName} ${user.lastName}`}
        />
      )}

    </ScreenWrapper>
  );
}
