import React, { useEffect, useState, useCallback } from 'react';
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

export function StaffScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [staff, setStaff] = useState<StaffDto[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffDto | null>(null);

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
    `${s.firstName} ${s.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
    (s.email && s.email.toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <ScreenWrapper refreshing={isLoading} onRefresh={loadData}>
      <PageHeader
        label="Management"
        title="Staff"
        subtitle="Manage staff accounts and permissions"
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
                  className={`flex-row justify-between items-center p-4 ${
                    index !== filteredStaff.length - 1 ? 'border-b border-border' : ''
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
                        {person.firstName} {person.lastName}
                      </Text>
                      <Text className="text-xs font-semibold text-muted-foreground" numberOfLines={1}>
                        {person.email}
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
                    {selectedStaff.firstName} {selectedStaff.lastName}
                  </Text>
                  <View className="mt-2">
                    <StatusBadge status={selectedStaff.role} />
                  </View>
                </View>

                <Card>
                  <CardContent className="p-4 gap-4">
                    <View>
                      <Text className="text-xs font-bold text-muted-foreground uppercase mb-1">Email</Text>
                      <Text className="text-foreground font-semibold">{selectedStaff.email}</Text>
                    </View>
                    <View className="h-px bg-border" />
                    <View>
                      <Text className="text-xs font-bold text-muted-foreground uppercase mb-1">Joined</Text>
                      <Text className="text-foreground font-semibold">{formatDateTime(selectedStaff.createdAt)}</Text>
                    </View>
                  </CardContent>
                </Card>
              </ScrollView>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </ScreenWrapper>
  );
}
