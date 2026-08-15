import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { UserRound, Search, X } from 'lucide-react-native';
import Toast from 'react-native-toast-message';

import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';
import { StatusBadge } from '../components/ui/StatusBadge';
import { SkeletonRows } from '../components/ui/Skeleton';
import { ScreenWrapper, PageHeader } from '../components/layout/ScreenWrapper';
import { useTheme } from '../hooks/useTheme';
import * as memberApi from '../features/members/memberApi';
import type { MemberDto } from '@gym/shared';
import { formatDateTime } from '../utils/format';

export function MembersScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [members, setMembers] = useState<MemberDto[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberDto | null>(null);

  const loadMembers = useCallback(async (): Promise<void> => {
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
  }, [search]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  return (
    <ScreenWrapper refreshing={isLoading} onRefresh={loadMembers}>
      {/* Embedded search header */}
      <View className="mb-6 rounded-xl border border-border bg-card px-4 py-4">
        <Text className="text-xs font-black uppercase tracking-[0.18em] text-primary mb-1">
          Management
        </Text>
        <Text className="text-3xl font-black text-foreground leading-tight mb-1">
          Members
        </Text>
        <Text className="text-sm font-semibold text-muted-foreground mb-4">
          View and manage gym members.
        </Text>
        <Input
          placeholder="Search members..."
          value={search}
          onChangeText={setSearch}
          leftIcon={<Search size={16} color={colors.mutedForeground} />}
        />
      </View>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <View className="p-4">
              <SkeletonRows rows={5} showAvatar />
            </View>
          ) : members.length === 0 ? (
            <View className="p-4">
              <EmptyState
                icon={UserRound}
                title="No members found"
                description="Try a different search query or add a new member."
              />
            </View>
          ) : (
            <View>
              {members.map((member, index) => (
                <TouchableOpacity
                  key={member.id}
                  onPress={() => setSelectedMember(member)}
                  className={`flex-row justify-between items-center px-4 py-3 ${
                    index !== members.length - 1 ? 'border-b border-border' : ''
                  }`}
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-center flex-1 mr-3">
                    <View
                      style={{ backgroundColor: colors.primarySoft }}
                      className="w-10 h-10 items-center justify-center rounded-full mr-3"
                    >
                      <UserRound size={20} color={colors.primary} />
                    </View>
                    <View className="flex-1">
                      <Text className="font-bold text-foreground text-base" numberOfLines={1}>
                        {member.firstName} {member.lastName}
                      </Text>
                      <Text className="text-xs font-semibold text-muted-foreground" numberOfLines={1}>
                        {member.memberCode} · {member.email || member.phone}
                      </Text>
                    </View>
                  </View>
                  <StatusBadge status={member.status} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </CardContent>
      </Card>

      {/* Member Detail Modal — cross-platform (no pageSheet) */}
      <Modal
        visible={!!selectedMember}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setSelectedMember(null)}
        statusBarTranslucent
      >
        <SafeAreaView
          style={{ flex: 1, backgroundColor: colors.background }}
          edges={['top', 'left', 'right']}
        >
          {selectedMember && (
            <View style={{ flex: 1 }}>
              {/* Modal header */}
              <View
                style={{ borderBottomColor: colors.border }}
                className="flex-row justify-between items-center px-4 py-3 border-b"
              >
                <Text className="text-xl font-black text-foreground">Member Details</Text>
                <TouchableOpacity
                  onPress={() => setSelectedMember(null)}
                  style={{ backgroundColor: colors.secondary }}
                  className="p-2 rounded-full"
                  activeOpacity={0.7}
                >
                  <X size={18} color={colors.foreground} />
                </TouchableOpacity>
              </View>

              <ScrollView
                contentContainerStyle={{
                  padding: 16,
                  paddingBottom: Math.max(insets.bottom, 24),
                }}
                showsVerticalScrollIndicator={false}
              >
                {/* Avatar + name */}
                <View className="items-center mb-6 pt-4">
                  <View
                    style={{ backgroundColor: colors.primarySoft }}
                    className="w-20 h-20 items-center justify-center rounded-full mb-3"
                  >
                    <UserRound size={32} color={colors.primary} />
                  </View>
                  <Text className="text-2xl font-black text-foreground">
                    {selectedMember.firstName} {selectedMember.lastName}
                  </Text>
                  <Text style={{ color: colors.primary }} className="font-bold mt-1">
                    {selectedMember.memberCode}
                  </Text>
                  <View className="mt-2">
                    <StatusBadge status={selectedMember.status} />
                  </View>
                </View>

                {/* Info card */}
                <Card>
                  <CardContent className="p-4 gap-4">
                    <DetailRow label="Email" value={selectedMember.email || 'No email provided'} />
                    <View className="h-px bg-border" />
                    <DetailRow label="Phone" value={selectedMember.phone} />
                    <View className="h-px bg-border" />
                    <DetailRow label="Status" value={selectedMember.status} />
                    <View className="h-px bg-border" />
                    <DetailRow label="Joined" value={formatDateTime(selectedMember.createdAt)} />
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

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text className="text-xs font-bold text-muted-foreground uppercase mb-1">{label}</Text>
      <Text className="text-foreground font-semibold">{value}</Text>
    </View>
  );
}
