import { useEffect, useState, useCallback } from 'react';
import { View, Text } from 'react-native';
import { TrendingUp, Users } from 'lucide-react-native';
import Toast from 'react-native-toast-message';

import { Card, CardContent } from '../components/ui/Card';
import { ScreenWrapper, PageHeader } from '../components/layout/ScreenWrapper';
import { useTheme } from '../hooks/useTheme';
import * as reportApi from '../features/reports/reportApi';
import type { ReportDto } from '@gym/shared';
import { formatCents } from '../utils/format';

export function ReportsScreen() {
  const { colors } = useTheme();

  const [financialReport, setFinancialReport] = useState<ReportDto | null>(null);
  const [membershipReport, setMembershipReport] = useState<ReportDto | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadData = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      const month = new Date().toLocaleString('en-US', { month: 'long' });
      const [fin, mem] = await Promise.all([
        reportApi.getReport('payments', { month }).catch(() => null),
        reportApi.getReport('memberships', { month }).catch(() => null),
      ]);
      setFinancialReport(fin);
      setMembershipReport(mem);
    } catch {
      Toast.show({ type: 'error', text1: 'Could not load reports' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  const totalRevenue = financialReport?.totals?.totalRevenueCents ?? 0;
  const membershipRevenue = financialReport?.totals?.membershipRevenueCents ?? 0;
  const posRevenue = financialReport?.totals?.posRevenueCents ?? 0;
  const taxCollected = financialReport?.totals?.taxCollectedCents ?? 0;
  const activeMembers = membershipReport?.totals?.totalActiveMembers ?? 0;
  const newSignups = membershipReport?.totals?.newMemberships ?? 0;
  const cancellations = membershipReport?.totals?.cancelledMemberships ?? 0;

  return (
    <ScreenWrapper refreshing={isLoading} onRefresh={loadData}>
      <PageHeader
        label="Overview"
        title="Reports"
        subtitle="Gym performance and analytics"
      />

      {/* Financial summary */}
      <Text className="text-base font-black text-foreground mb-3">Financial Summary</Text>
      <Card className="mb-4">
        <CardContent className="p-4 flex-row items-center justify-between">
          <View>
            <Text className="text-xs font-semibold uppercase text-muted-foreground">
              Total Revenue
            </Text>
            <Text className="text-3xl font-black text-foreground mt-1">
              {formatCents(totalRevenue)}
            </Text>
          </View>
          <View
            style={{ backgroundColor: colors.primarySoft }}
            className="w-12 h-12 items-center justify-center rounded-xl"
          >
            <TrendingUp size={24} color={colors.primary} />
          </View>
        </CardContent>
        <View className="h-px bg-border" />
        <CardContent className="p-4 flex-row">
          <View className="flex-1 border-r border-border pr-3">
            <Text className="text-[10px] font-bold text-muted-foreground uppercase">Memberships</Text>
            <Text className="text-lg font-bold text-foreground mt-0.5">
              {formatCents(membershipRevenue)}
            </Text>
          </View>
          <View className="flex-1 px-3 border-r border-border">
            <Text className="text-[10px] font-bold text-muted-foreground uppercase">POS</Text>
            <Text className="text-lg font-bold text-foreground mt-0.5">
              {formatCents(posRevenue)}
            </Text>
          </View>
          <View className="flex-1 pl-3">
            <Text className="text-[10px] font-bold text-muted-foreground uppercase">Taxes</Text>
            <Text className="text-lg font-bold text-foreground mt-0.5">
              {formatCents(taxCollected)}
            </Text>
          </View>
        </CardContent>
      </Card>

      {/* Membership stats */}
      <Text className="text-base font-black text-foreground mb-3">Membership Stats</Text>
      <Card className="mb-4">
        <CardContent className="p-4 flex-row items-center justify-between">
          <View>
            <Text className="text-xs font-semibold uppercase text-muted-foreground">
              Active Members
            </Text>
            <Text className="text-3xl font-black text-foreground mt-1">{activeMembers}</Text>
          </View>
          <View
            style={{ backgroundColor: colors.primarySoft }}
            className="w-12 h-12 items-center justify-center rounded-xl"
          >
            <Users size={24} color={colors.primary} />
          </View>
        </CardContent>
        <View className="h-px bg-border" />
        <CardContent className="p-4 flex-row">
          <View className="flex-1 border-r border-border pr-3">
            <Text className="text-[10px] font-bold text-muted-foreground uppercase">New Signups</Text>
            <Text style={{ color: colors.success }} className="text-lg font-bold mt-0.5">
              +{newSignups}
            </Text>
          </View>
          <View className="flex-1 pl-3">
            <Text className="text-[10px] font-bold text-muted-foreground uppercase">Cancellations</Text>
            <Text style={{ color: colors.destructive }} className="text-lg font-bold mt-0.5">
              {cancellations}
            </Text>
          </View>
        </CardContent>
      </Card>
    </ScreenWrapper>
  );
}
