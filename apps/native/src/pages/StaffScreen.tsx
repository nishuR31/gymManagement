import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShieldCheck, Search } from 'lucide-react-native';
import Toast from 'react-native-toast-message';

import { Card, CardContent } from '../components/ui/Card';
import { FloatingDock } from '../components/layout/FloatingDock';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useAppSelector } from '../store/hooks';
import { themeColors } from '../constants/colors';
import * as staffApi from '../features/staff/staffApi';
import { type StaffDto } from '@gym/shared';
import { formatDateTime } from '../utils/format';

export function StaffScreen() {
  const theme = useAppSelector((state) => state.theme.theme);
  const activeColors = themeColors[theme === 'amoled' ? 'amoled' : theme === 'dark' ? 'dark' : 'light'];

  const [staff, setStaff] = useState<StaffDto[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffDto | null>(null);

  const loadData = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const response = await staffApi.listStaff({
        page: 1,
        pageSize: 50,
      });
      setStaff(response.data);
    } catch {
      Toast.show({ type: 'error', text1: 'Could not load staff members' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredStaff = staff.filter(s =>
    `${s.firstName} ${s.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
    (s.email && s.email.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadData} tintColor={activeColors.primary} />} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>

        <View className="mb-6 bg-card border border-border p-4 rounded-lg shadow-sm">
          <Text className="text-xs font-black uppercase tracking-[0.18em] text-primary">Management</Text>
          <Text className="mt-2 text-3xl font-black text-foreground">Staff</Text>
          <Text className="mt-1 text-sm font-semibold text-muted-foreground mb-4">Manage staff accounts and permissions</Text>

          <View className="relative justify-center">
            <Input
              placeholder="Search staff..."
              value={search}
              onChangeText={setSearch}
              className="pl-10 h-10"
            />
            <View className="absolute left-3 top-2.5">
              <Search size={16} color={activeColors.mutedForeground} />
            </View>
          </View>
        </View>

        <Card>
          <CardContent className="p-0">
            {filteredStaff.length === 0 && !isLoading ? (
              <View className="items-center py-12 px-4">
                <ShieldCheck size={32} color={activeColors.mutedForeground} className="mb-2" />
                <Text className="font-bold text-foreground">No staff found</Text>
              </View>
            ) : (
              <View>
                {filteredStaff.map((person, index) => (
                  <TouchableOpacity
                    key={person.id}
                    onPress={() => setSelectedStaff(person)}
                    className={`flex-row justify-between items-center p-4 ${index !== filteredStaff.length - 1 ? 'border-b border-border' : ''}`}
                  >
                    <View className="flex-row items-center flex-1 mr-2">
                      <View className="w-10 h-10 bg-secondary items-center justify-center rounded-full mr-3">
                        <ShieldCheck size={20} color={activeColors.primary} />
                      </View>
                      <View className="flex-1">
                        <Text className="font-bold text-foreground text-base" numberOfLines={1}>
                          {person.firstName} {person.lastName}
                        </Text>
                        <Text className="text-xs font-semibold text-muted-foreground">{person.email}</Text>
                      </View>
                    </View>
                    <View className="items-end">
                      <Text className="font-bold text-foreground text-sm uppercase">{person.role.name}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </CardContent>
        </Card>

      </ScrollView>

      <Modal visible={!!selectedStaff} animationType="slide" presentationStyle="pageSheet">
        <View className="flex-1 bg-background pt-12">
          {selectedStaff && (
            <View className="flex-1">
              <View className="flex-row justify-between items-center px-4 pb-4 border-b border-border">
                <Text className="text-xl font-bold text-foreground">Staff Details</Text>
                <Button variant="outline" onPress={() => setSelectedStaff(null)} className="h-8 px-4">Close</Button>
              </View>

              <ScrollView className="p-4" contentContainerStyle={{ paddingBottom: 60 }}>
                <View className="items-center mb-6">
                  <View className="w-20 h-20 bg-secondary items-center justify-center rounded-full mb-3">
                    <ShieldCheck size={32} color={activeColors.primary} />
                  </View>
                  <Text className="text-2xl font-black text-foreground">{selectedStaff.firstName} {selectedStaff.lastName}</Text>
                  <Text className="text-primary font-bold uppercase">{selectedStaff.role.name}</Text>
                </View>

                <Card className="mb-4">
                  <CardContent className="p-4 gap-4">
                    <View>
                      <Text className="text-xs font-bold text-muted-foreground uppercase">Email</Text>
                      <Text className="text-foreground mt-1">{selectedStaff.email}</Text>
                    </View>
                    <View className="h-px bg-border" />
                    <View>
                      <Text className="text-xs font-bold text-muted-foreground uppercase">Joined</Text>
                      <Text className="text-foreground mt-1">{formatDateTime(selectedStaff.createdAt)}</Text>
                    </View>
                  </CardContent>
                </Card>
              </ScrollView>
            </View>
          )}
        </View>
      </Modal>
      <FloatingDock />
    </SafeAreaView>
  );
}
