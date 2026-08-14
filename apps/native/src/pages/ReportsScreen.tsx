import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BarChart3, TrendingUp, Users } from 'lucide-react-native';
import Toast from 'react-native-toast-message';

import { Card, CardContent } from '../components/ui/Card';
import { useAppSelector } from '../store/hooks';
import { themeColors } from '../constants/colors';
import * as reportApi from '../features/reports/reportApi';
import type { FinancialSummaryDto, MembershipStatsDto } from '@gym/shared';
import { formatCents } from '../utils/format';

export function ReportsScreen() {
  const theme = useAppSelector((state) => state.theme.theme);
  const activeColors = themeColors[theme === 'amoled' ? 'amoled' : theme === 'dark' ? 'dark' : 'light'];

  const [financials, setFinancials] = useState<FinancialSummaryDto | null>(null);
  const [memberStats, setMemberStats] = useState<MembershipStatsDto | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadData = async (): Promise<void> => {
    setIsLoading(true);
    try {
      // Use current month/year for default fetch
      const year = new Date().getFullYear();
      const month = new Date().getMonth() + 1;
      
      const [fin, mem] = await Promise.all([
        reportApi.getFinancialSummary(year, month),
        reportApi.getMembershipStats(year, month)
      ]);
      setFinancials(fin);
      setMemberStats(mem);
    } catch {
      Toast.show({ type: 'error', text1: 'Could not load reports' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadData} tintColor={activeColors.primary} />} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        
        <View className="mb-6 bg-card border border-border p-4 rounded-lg shadow-sm">
          <Text className="text-xs font-black uppercase tracking-[0.18em] text-primary">Overview</Text>
          <Text className="mt-2 text-3xl font-black text-foreground">Reports</Text>
          <Text className="mt-1 text-sm font-semibold text-muted-foreground">Gym performance and analytics</Text>
        </View>

        <Text className="text-lg font-black text-foreground mb-4">Financial Summary</Text>
        <Card className="mb-6">
          <CardContent className="p-4 flex-row items-center justify-between">
            <View>
              <Text className="text-xs font-semibold uppercase text-muted-foreground">Total Revenue</Text>
              <Text className="text-3xl font-black text-foreground mt-1">
                {financials ? formatCents(financials.totalRevenueCents) : '$0.00'}
              </Text>
            </View>
            <View className="w-12 h-12 bg-primary/20 items-center justify-center rounded-full">
              <TrendingUp size={24} color={activeColors.primary} />
            </View>
          </CardContent>
          <View className="h-px w-full bg-border" />
          <CardContent className="p-4 flex-row">
            <View className="flex-1 border-r border-border pr-2">
              <Text className="text-[10px] font-bold text-muted-foreground uppercase">Memberships</Text>
              <Text className="text-lg font-bold text-foreground">{financials ? formatCents(financials.membershipRevenueCents) : '$0'}</Text>
            </View>
            <View className="flex-1 pl-4 border-r border-border pr-2">
              <Text className="text-[10px] font-bold text-muted-foreground uppercase">POS</Text>
              <Text className="text-lg font-bold text-foreground">{financials ? formatCents(financials.posRevenueCents) : '$0'}</Text>
            </View>
            <View className="flex-1 pl-4">
              <Text className="text-[10px] font-bold text-muted-foreground uppercase">Taxes</Text>
              <Text className="text-lg font-bold text-foreground">{financials ? formatCents(financials.taxCollectedCents) : '$0'}</Text>
            </View>
          </CardContent>
        </Card>

        <Text className="text-lg font-black text-foreground mb-4">Membership Stats</Text>
        <Card className="mb-6">
          <CardContent className="p-4 flex-row items-center justify-between">
            <View>
              <Text className="text-xs font-semibold uppercase text-muted-foreground">Active Members</Text>
              <Text className="text-3xl font-black text-foreground mt-1">
                {memberStats ? memberStats.totalActiveMembers : 0}
              </Text>
            </View>
            <View className="w-12 h-12 bg-primary/20 items-center justify-center rounded-full">
              <Users size={24} color={activeColors.primary} />
            </View>
          </CardContent>
          <View className="h-px w-full bg-border" />
          <CardContent className="p-4 flex-row">
            <View className="flex-1 border-r border-border pr-2">
              <Text className="text-[10px] font-bold text-muted-foreground uppercase">New Signups</Text>
              <Text className="text-lg font-bold text-foreground text-green-500">+{memberStats ? memberStats.newMemberships : 0}</Text>
            </View>
            <View className="flex-1 pl-4">
              <Text className="text-[10px] font-bold text-muted-foreground uppercase">Cancellations</Text>
              <Text className="text-lg font-bold text-foreground text-destructive">{memberStats ? memberStats.cancelledMemberships : 0}</Text>
            </View>
          </CardContent>
        </Card>

      </ScrollView>
    </SafeAreaView>
  );
}
