import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { UserRound, Search, AlertTriangle } from 'lucide-react-native';
import Toast from 'react-native-toast-message';

import { Card, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';
import { StatusBadge } from '../components/ui/StatusBadge';
import { SkeletonRows } from '../components/ui/Skeleton';
import { ScreenWrapper } from '../components/layout/ScreenWrapper';
import { useTheme } from '../hooks/useTheme';
import { useAppSelector } from '../store/hooks';
import * as memberApi from '../features/members/memberApi';
import type { MemberDto } from '@gym/shared';
import { formatDateTime } from '../utils/format';

export function RedlistScreen({ navigation }: any) {
  const { colors } = useTheme();

  const [members, setMembers] = useState<MemberDto[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const loadRedlist = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      const response = await memberApi.listMembers({
        page: 1,
        pageSize: 500, // Fetch a large batch to filter locally
        status: 'ACTIVE', // Only care about active members who are absent
        ...(search ? { search } : {}),
      });

      // Filter members who haven't checked in for 30 days or never checked in
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const redlisted = response.data.filter(member => {
        if (!member.lastAttendanceDate) return true; // Never attended
        return new Date(member.lastAttendanceDate) < thirtyDaysAgo;
      });

      setMembers(redlisted);
    } catch {
      Toast.show({ type: 'error', text1: 'Could not load redlist' });
    } finally {
      setIsLoading(false);
    }
  }, [search]);

  useEffect(() => {
    void loadRedlist();
  }, [loadRedlist]);

  return (
    <ScreenWrapper refreshing={isLoading} onRefresh={loadRedlist}>
      {/* Header */}
      <View className="mb-6 rounded-xl border border-border bg-card px-4 py-4">
        <Text className="text-xs font-black uppercase tracking-[0.18em] text-destructive">
          Attention Required
        </Text>
        <Text className="text-3xl font-black text-foreground leading-tight mb-1">
          Redlist
        </Text>
        <Text className="text-sm font-semibold text-muted-foreground mb-4">
          Members absent for 30+ days.
        </Text>
        <Input
          placeholder="Search redlist..."
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
                icon={AlertTriangle}
                title="No members at risk"
                description="Everyone seems to be attending regularly."
              />
            </View>
          ) : (
            <View>
              {members.map((member, index) => (
                <View
                  key={member.id}
                  className={`flex-row justify-between items-center px-4 py-3 ${
                    index !== members.length - 1 ? 'border-b border-border' : ''
                  }`}
                >
                  <View className="flex-row items-center flex-1 mr-3">
                    <View
                      style={{ backgroundColor: colors.destructiveSoft }}
                      className="w-10 h-10 items-center justify-center rounded-full mr-3"
                    >
                      <UserRound size={20} color={colors.destructive} />
                    </View>
                    <View className="flex-1">
                      <Text className="font-bold text-foreground text-base" numberOfLines={1}>
                        {member.firstName} {member.lastName}
                      </Text>
                      <Text className="text-xs font-semibold text-muted-foreground" numberOfLines={1}>
                        {member.memberCode} · {member.phone}
                      </Text>
                      <Text className="text-[10px] font-bold text-destructive uppercase mt-0.5">
                        {member.lastAttendanceDate
                          ? `Last seen: ${formatDateTime(member.lastAttendanceDate)}`
                          : 'Never attended'}
                      </Text>
                    </View>
                  </View>
                  <StatusBadge status={member.status} />
                </View>
              ))}
            </View>
          )}
        </CardContent>
      </Card>
    </ScreenWrapper>
  );
}
