
import { View, Text, Modal, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Copy } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import Toast from 'react-native-toast-message';
import type { MemberLoginSetupDto } from '@gym/shared';

import { useTheme } from '../../hooks/useTheme';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';

interface MemberLoginModalProps {
  login: MemberLoginSetupDto | null;
  onClose: () => void;
}

export function MemberLoginModal({ login, onClose }: MemberLoginModalProps) {
  const { colors } = useTheme();

  const copyPassword = async () => {
    if (!login) return;
    await Clipboard.setStringAsync(login.temporaryPassword);
    Toast.show({ type: 'success', text1: 'Temporary password copied' });
  };

  return (
    <Modal
      visible={!!login}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <SafeAreaView edges={['bottom']} style={{ backgroundColor: colors.background }} className="rounded-t-3xl pt-2">
          {login && (
            <View className="p-4">
              <View className="flex-row justify-between items-center mb-4">
                <Text style={{ color: colors.foreground }} className="text-xl font-black">
                  {login.regenerated ? 'Member Login Regenerated' : 'Member Login Created'}
                </Text>
                <TouchableOpacity
                  onPress={onClose}
                  style={{ backgroundColor: colors.secondary }}
                  className="p-2 rounded-full"
                  activeOpacity={0.7}
                >
                  <X size={18} color={colors.foreground} />
                </TouchableOpacity>
              </View>

              <View style={{ backgroundColor: colors.warning + '20', borderColor: colors.warning }} className="p-3 mb-4 rounded-md border">
                <Text style={{ color: colors.warning }} className="font-semibold text-sm">
                  This temporary password is shown once. It will not be shown again after you close this window.
                </Text>
              </View>

              <Card className="mb-6">
                <CardContent className="p-4 gap-3">
                  <View>
                    <Text style={{ color: colors.mutedForeground }} className="text-xs font-bold uppercase mb-1">Member</Text>
                    <Text style={{ color: colors.foreground }} className="font-semibold">{login.member.firstName} {login.member.lastName}</Text>
                  </View>
                  <View style={{ backgroundColor: colors.border }} className="h-px" />
                  <View>
                    <Text style={{ color: colors.mutedForeground }} className="text-xs font-bold uppercase mb-1">Email</Text>
                    <Text style={{ color: colors.foreground }} className="font-semibold">{login.user.email}</Text>
                  </View>
                  <View style={{ backgroundColor: colors.border }} className="h-px" />
                  <View>
                    <Text style={{ color: colors.mutedForeground }} className="text-xs font-bold uppercase mb-1">Temporary Password</Text>
                    <View style={{ backgroundColor: colors.secondary }} className="flex-row items-center justify-between p-3 mt-1 rounded-md">
                      <Text style={{ color: colors.foreground }} className="font-mono text-lg font-black">{login.temporaryPassword}</Text>
                      <TouchableOpacity onPress={copyPassword} className="p-2">
                        <Copy size={20} color={colors.primary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </CardContent>
              </Card>

              <Button onPress={onClose} className="w-full">
                Done
              </Button>
            </View>
          )}
          <Toast />
        </SafeAreaView>
      </View>
    </Modal>
  );
}
