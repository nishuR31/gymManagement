import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UserRound, Search, Eye, Archive, QrCode } from 'lucide-react-native';
import Toast from 'react-native-toast-message';

import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { useAppSelector } from '../store/hooks';
import { themeColors } from '../constants/colors';
import * as memberApi from '../features/members/memberApi';
import type { MemberDto } from '@gym/shared';
import { formatDateTime } from '../utils/format';

export function MembersScreen() {
  const theme = useAppSelector((state) => state.theme.theme);
  const activeColors = themeColors[theme === 'amoled' ? 'amoled' : theme === 'dark' ? 'dark' : 'light'];

  const [members, setMembers] = useState<MemberDto[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberDto | null>(null);

  const loadMembers = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const response = await memberApi.listMembers({
        page: 1,
        pageSize: 50,
        ...(search ? { search } : {}),
      });
      setMembers(response.data);
    } catch {
      Toast.show({ type: 'error', text1: 'Could not load members' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, [search]);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadMembers} tintColor={activeColors.primary} />} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        
        <View className="mb-6 bg-card border border-border p-4 rounded-lg shadow-sm">
          <Text className="text-xs font-black uppercase tracking-[0.18em] text-primary">Management</Text>
          <Text className="mt-2 text-3xl font-black text-foreground">Members</Text>
          <Text className="mt-1 text-sm font-semibold text-muted-foreground mb-4">View and manage gym members.</Text>
          
          <View className="relative justify-center">
            <Input
              placeholder="Search members..."
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
            {members.length === 0 && !isLoading ? (
              <View className="items-center py-12 px-4">
                <UserRound size={32} color={activeColors.mutedForeground} className="mb-2" />
                <Text className="font-bold text-foreground">No members found</Text>
                <Text className="text-sm text-muted-foreground text-center">Try a different search query or add a new member.</Text>
              </View>
            ) : (
              <View>
                {members.map((member, index) => (
                  <TouchableOpacity 
                    key={member.id} 
                    onPress={() => setSelectedMember(member)}
                    className={`flex-row justify-between items-center p-4 ${index !== members.length - 1 ? 'border-b border-border' : ''}`}
                  >
                    <View className="flex-row items-center flex-1">
                      <View className="w-10 h-10 bg-secondary items-center justify-center rounded-full mr-3">
                        <UserRound size={20} color={activeColors.primary} />
                      </View>
                      <View className="flex-1">
                        <Text className="font-bold text-foreground text-base">
                          {member.firstName} {member.lastName}
                        </Text>
                        <Text className="text-xs font-semibold text-muted-foreground">
                          {member.memberCode} · {member.email || member.phone}
                        </Text>
                      </View>
                    </View>
                    <View className={`px-2 py-1 rounded-full border ${member.status === 'ACTIVE' ? 'bg-green-500/10 border-green-500/20' : 'bg-secondary border-border'}`}>
                      <Text className={`text-xs font-bold ${member.status === 'ACTIVE' ? 'text-green-500' : 'text-muted-foreground'}`}>{member.status}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </CardContent>
        </Card>

      </ScrollView>

      {/* Member Details Modal */}
      <Modal visible={!!selectedMember} animationType="slide" presentationStyle="pageSheet">
        <View className="flex-1 bg-background pt-12">
          {selectedMember && (
            <View className="flex-1">
              <View className="flex-row justify-between items-center px-4 pb-4 border-b border-border">
                <Text className="text-xl font-bold text-foreground">Member Details</Text>
                <Button variant="outline" onPress={() => setSelectedMember(null)} className="h-8 px-4">Close</Button>
              </View>
              
              <ScrollView className="p-4" contentContainerStyle={{ paddingBottom: 60 }}>
                <View className="items-center mb-6">
                  <View className="w-20 h-20 bg-secondary items-center justify-center rounded-full mb-3">
                    <UserRound size={32} color={activeColors.primary} />
                  </View>
                  <Text className="text-2xl font-black text-foreground">{selectedMember.firstName} {selectedMember.lastName}</Text>
                  <Text className="text-primary font-bold">{selectedMember.memberCode}</Text>
                </View>

                <Card className="mb-4">
                  <CardContent className="p-4 gap-4">
                    <View>
                      <Text className="text-xs font-bold text-muted-foreground uppercase">Contact Information</Text>
                      <Text className="text-foreground mt-1">{selectedMember.email || 'No email provided'}</Text>
                      <Text className="text-foreground">{selectedMember.phone}</Text>
                    </View>
                    <View className="h-px bg-border" />
                    <View>
                      <Text className="text-xs font-bold text-muted-foreground uppercase">Status</Text>
                      <Text className="text-foreground mt-1 font-semibold">{selectedMember.status}</Text>
                    </View>
                    <View className="h-px bg-border" />
                    <View>
                      <Text className="text-xs font-bold text-muted-foreground uppercase">Joined</Text>
                      <Text className="text-foreground mt-1">{formatDateTime(selectedMember.createdAt)}</Text>
                    </View>
                  </CardContent>
                </Card>
              </ScrollView>
            </View>
          )}
        </View>
      </Modal>

    </SafeAreaView>
  );
}
