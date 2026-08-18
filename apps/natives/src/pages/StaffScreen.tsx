import { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ShieldCheck, Search, X } from 'lucide-react-native';
import Toast from 'react-native-toast-message';

import { Card, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { StatusBadge } from '../components/ui/StatusBadge';
import { EmptyState } from '../components/ui/EmptyState';
import { ScreenWrapper, PageHeader } from '../components/layout/ScreenWrapper';
import { useTheme } from '../hooks/useTheme';
import * as staffApi from '../features/staff/staffApi';
import { formatDateTime } from '../utils/format';
import type { StaffProfileDto as StaffDto } from '@gym/shared';
import { Button } from '../components/ui/Button';
import { StaffFormModal } from '../components/forms/StaffFormModal';
import { LeaveRequestModal } from '../components/forms/LeaveRequestModal';

export function StaffScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [staff, setStaff] = useState<StaffDto[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffDto | null>(null);
  const [isStaffFormVisible, setIsStaffFormVisible] = useState(false);
  const [isLeaveModalVisible, setIsLeaveModalVisible] = useState(false);

  const loadData = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      const response = await staffApi.listProfiles();
      setStaff(response);
    } catch {
      Toast.show({ type: 'error', text1: 'Could not load staff members' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  const filteredStaff = staff.filter((s) =>
    // Assuming backend populates user (if not, fallback to userId)
    (s as any).user ? `${(s as any).user.firstName} ${(s as any).user.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
      ((s as any).user.email && (s as any).user.email.toLowerCase().includes(search.toLowerCase())) :
      s.userId.toLowerCase().includes(search.toLowerCase())
  );

  const handleAction = async (action: 'checkIn' | 'checkOut') => {
    if (!selectedStaff) return;
    try {
      if (action === 'checkIn') {
        await staffApi.checkInStaff(selectedStaff.id);
        Toast.show({ type: 'success', text1: 'Staff checked in' });
      } else if (action === 'checkOut') {
        await staffApi.checkOutStaff(selectedStaff.id);
        Toast.show({ type: 'success', text1: 'Staff checked out' });
      }
    } catch (error: any) {
      Toast.show({ type: 'error', text1: error.message || 'Action failed' });
    }
  };

  return (
    <ScreenWrapper refreshing={isLoading} onRefresh={loadData}>
      <PageHeader
        label="Management"
        title="Staff"
        subtitle="Manage staff accounts and permissions"
        actions={
          <Button variant="primary" size="sm" onPress={() => setIsStaffFormVisible(true)}>
            <Text className="text-white font-bold">+ Staff</Text>
          </Button>
        }
      />

      <View className="mb-4">
        <Input
          placeholder="Search staff..."
          value={search}
          onChangeText={setSearch}
          leftIcon={<Search size={16} color={colors.mutedForeground} />}
        />
      </View>

      <Card>
        <CardContent className="p-0">
          {filteredStaff.length === 0 && !isLoading ? (
            <View className="p-4">
              <EmptyState icon={ShieldCheck} title="No staff found" />
            </View>
          ) : (
            <View>
              {filteredStaff.map((person, index) => (
                <TouchableOpacity
                  key={person.id}
                  onPress={() => setSelectedStaff(person)}
                  className={`flex-row justify-between items-center p-4 ${index !== filteredStaff.length - 1 ? 'border-b border-border' : ''
                    }`}
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-center flex-1 mr-2">
                    <View
                      style={{ backgroundColor: colors.primarySoft }}
                      className="w-10 h-10 items-center justify-center rounded-xl mr-3"
                    >
                      <ShieldCheck size={20} color={colors.primary} />
                    </View>
                    <View className="flex-1">
                      <Text className="font-bold text-foreground text-base" numberOfLines={1}>
                        {(person as any).user ? `${(person as any).user.firstName} ${(person as any).user.lastName}` : `User ID: ${person.userId}`}
                      </Text>
                      <Text className="text-xs font-semibold text-muted-foreground" numberOfLines={1}>
                        {(person as any).user?.email || ''}
                      </Text>
                    </View>
                  </View>
                  <StatusBadge status={person.role} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </CardContent>
      </Card>

      {/* Staff detail modal — cross-platform */}
      <Modal
        visible={!!selectedStaff}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setSelectedStaff(null)}
        statusBarTranslucent
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'left', 'right']}>
          {selectedStaff && (
            <View style={{ flex: 1 }}>
              <View
                style={{ borderBottomColor: colors.border }}
                className="flex-row justify-between items-center px-4 py-3 border-b"
              >
                <Text className="text-xl font-black text-foreground">Staff Details</Text>
                <TouchableOpacity
                  onPress={() => setSelectedStaff(null)}
                  style={{ backgroundColor: colors.secondary }}
                  className="p-2 rounded-full"
                  activeOpacity={0.7}
                >
                  <X size={18} color={colors.foreground} />
                </TouchableOpacity>
              </View>

              <ScrollView
                contentContainerStyle={{ padding: 16, paddingBottom: Math.max(insets.bottom, 24) }}
                showsVerticalScrollIndicator={false}
              >
                <View className="items-center mb-6 pt-4">
                  <View
                    style={{ backgroundColor: colors.primarySoft }}
                    className="w-20 h-20 items-center justify-center rounded-full mb-3"
                  >
                    <ShieldCheck size={32} color={colors.primary} />
                  </View>
                  <Text className="text-2xl font-black text-foreground">
                    {(selectedStaff as any).user ? `${(selectedStaff as any).user.firstName} ${(selectedStaff as any).user.lastName}` : `User ID: ${selectedStaff.userId}`}
                  </Text>
                  <View className="mt-2">
                    <StatusBadge status={selectedStaff.role} />
                  </View>
                </View>

                <Card>
                  <CardContent className="p-4 gap-4">
                    <View>
                      <Text className="text-xs font-bold text-muted-foreground uppercase mb-1">Email</Text>
                      <Text className="text-foreground font-semibold">{(selectedStaff as any).user?.email || 'N/A'}</Text>
                    </View>
                    <View className="h-px bg-border" />
                    <View>
                      <Text className="text-xs font-bold text-muted-foreground uppercase mb-1">Joined</Text>
                      <Text className="text-foreground font-semibold">{formatDateTime(selectedStaff.createdAt)}</Text>
                    </View>
                  </CardContent>
                </Card>

                {/* Actions */}
                <View className="mt-6 gap-3">
                  <Button variant="outline" onPress={() => handleAction('checkIn')}>
                    <Text style={{ color: colors.foreground }} className="font-bold">Check In</Text>
                  </Button>
                  <Button variant="outline" onPress={() => handleAction('checkOut')}>
                    <Text style={{ color: colors.foreground }} className="font-bold">Check Out</Text>
                  </Button>
                  <Button variant="outline" onPress={() => setIsLeaveModalVisible(true)}>
                    <Text style={{ color: colors.foreground }} className="font-bold">Request Leave</Text>
                  </Button>
                </View>
              </ScrollView>
            </View>
          )}
        </SafeAreaView>
      </Modal>

      <StaffFormModal
        visible={isStaffFormVisible}
        onClose={() => setIsStaffFormVisible(false)}
        onSuccess={() => {
          setIsStaffFormVisible(false);
          void loadData();
        }}
      />

      <LeaveRequestModal
        visible={isLeaveModalVisible}
        profile={selectedStaff}
        onClose={() => setIsLeaveModalVisible(false)}
        onSuccess={() => {
          setIsLeaveModalVisible(false);
        }}
      />
    </ScreenWrapper>
  );
}
