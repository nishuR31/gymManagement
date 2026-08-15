import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadBar } from '../components/ui/LoadBar';
import { SkeletonRows } from '../components/ui/Skeleton';
import { ScreenWrapper, PageHeader } from '../components/layout/ScreenWrapper';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { logoutThunk } from '../features/auth/authSlice';
import { Button } from '../components/ui/Button';
import { useTheme } from '../hooks/useTheme';
import {
  Users,
  LogOut,
  Activity,
  CreditCard,
  AlertTriangle,
  Boxes,
  CalendarClock,
  Calendar,
  Receipt,
  TrendingUp,
  WalletCards,
} from 'lucide-react-native';
import type {
  DashboardSummaryDto,
  MembershipSubscriptionDto,
  PaymentDto,
  LowStockProductDto,
  MemberDto,
} from '@gym/shared';
import * as dashboardApi from '../features/dashboard/dashboardApi';
import * as memberApi from '../features/members/memberApi';
import * as membershipApi from '../features/memberships/membershipApi';
import * as paymentApi from '../features/payments/paymentApi';
import Toast from 'react-native-toast-message';
import { formatCents, formatDateTime, formatRelativeTime } from '../utils/format';
import { Card, CardContent } from '../components/ui/Card';

export function DashboardScreen({ navigation }: any) {
  const user = useAppSelector((state) => state.auth.user);
  const dispatch = useAppDispatch();
  const { colors } = useTheme();

  const [summary, setSummary] = useState<DashboardSummaryDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const loadSummary = useCallback(async () => {
    if (user?.role === 'MEMBER') {
      setIsLoading(false);
      return;
    }
    try {
      setSummary(await dashboardApi.getDashboardSummary());
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Could not load dashboard', text2: error?.message });
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [user?.role]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadSummary();
  }, [loadSummary]);

  const handleLogout = useCallback(() => {
    dispatch(logoutThunk());
    navigation.replace('Home');
  }, [dispatch, navigation]);

  const onDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || date;
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    setDate(currentDate);
    // Note: the backend does not currently support historical dashboard summary by date, 
    // so this is primarily for UI parity as requested.
  };

  if (user?.role === 'MEMBER') {
    return (
      <MemberDashboard
        userName={`${user.firstName} ${user.lastName}`}
        navigation={navigation}
      />
    );
  }

  return (
    <ScreenWrapper refreshing={refreshing} onRefresh={onRefresh}>
      <PageHeader
        label="Live Operations"
        title="Dashboard"
        subtitle={`Summary for ${date.toLocaleDateString()}`}
        onSubtitlePress={() => setShowDatePicker(true)}
        actions={
          <>
            <Button variant="ghost" size="icon" onPress={() => setShowDatePicker(true)}>
              <Calendar size={22} color={colors.foreground} />
            </Button>
            <Button variant="ghost" size="icon" onPress={handleLogout}>
              <LogOut size={22} color={colors.foreground} />
            </Button>
          </>
        }
      />

      {showDatePicker && Platform.OS === 'web' ? (
        React.createElement('input', {
          type: 'date',
          value: date.toISOString().split('T')[0],
          onChange: (e: any) => {
            const newDate = new Date(e.target.value);
            if (!isNaN(newDate.getTime())) {
              setDate(newDate);
            }
            setShowDatePicker(false);
          },
          style: {
            position: 'absolute',
            right: 16,
            top: 60,
            zIndex: 50,
            padding: 8,
            borderRadius: 8,
            border: `1px solid ${colors.border}`,
            backgroundColor: colors.card,
            color: colors.foreground,
            colorScheme: colors.background === '#09090b' ? 'dark' : 'light',
          }
        })
      ) : showDatePicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display="default"
          onChange={onDateChange}
          themeVariant={colors.background === '#09090b' ? 'dark' : 'light'}
        />
      )}

      {/* 2-column metric grid */}
      <View className="flex-row flex-wrap gap-3 mb-4">
        <MetricCard
          icon={Users}
          title="In Gym"
          value={summary?.membersCurrentlyInGym ?? 0}
          loading={isLoading}
          tone="brand"
          colors={colors}
        />
        <MetricCard
          icon={CreditCard}
          title="Today's Rev"
          value={summary?.todaysRevenueCents ?? 0}
          formatter={formatCents}
          loading={isLoading}
          tone="warning"
          colors={colors}
        />
        <MetricCard
          icon={Activity}
          title="Attendance"
          value={summary?.todaysAttendance ?? 0}
          loading={isLoading}
          tone="success"
          colors={colors}
        />
        <MetricCard
          icon={TrendingUp}
          title="Monthly Rev"
          value={summary?.monthlyRevenueCents ?? 0}
          formatter={formatCents}
          loading={isLoading}
          tone="brand"
          colors={colors}
        />
      </View>

      {/* Alert cards row */}
      <View className="flex-row gap-3 mb-4">
        <AlertCard
          icon={Receipt}
          iconColor={colors.destructive}
          iconBg={colors.destructiveSoft}
          title="Pending Dues"
          value={formatCents(summary?.pendingDuesCents ?? 0)}
          subtitle={`${summary?.pendingDuesCount ?? 0} open invoices`}
          loading={isLoading}
        />
        <AlertCard
          icon={CalendarClock}
          iconColor={colors.warning}
          iconBg={colors.warningSoft}
          title="Expiring Soon"
          value={String(summary?.membershipsExpiringSoon.length ?? 0)}
          subtitle="Memberships in 30 days"
          loading={isLoading}
        />
      </View>

      {/* Low stock alert */}
      <Card className="mb-4">
        <CardContent className="pt-4">
          <View className="flex-row items-center gap-2 mb-2">
            <View style={{ backgroundColor: colors.destructiveSoft }} className="h-9 w-9 items-center justify-center rounded-lg">
              <AlertTriangle size={18} color={colors.destructive} />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-black text-foreground">Low Stock Alerts</Text>
              <Text className="text-xs text-muted-foreground">Products at or below reorder point</Text>
            </View>
            <Text className="text-2xl font-black text-foreground">
              {summary?.lowStockAlerts.length ?? 0}
            </Text>
          </View>
        </CardContent>
      </Card>

      {/* Recent payments */}
      <Card className="mb-4">
        <CardContent className="pt-4">
          <Text className="text-base font-bold text-foreground mb-3">Recent Payments</Text>
          {isLoading ? <SkeletonRows showAvatar /> : null}
          {!isLoading && (summary?.recentPayments.length ?? 0) === 0 ? (
            <EmptyState title="No recent payments" />
          ) : null}
          <View className="gap-2">
            {summary?.recentPayments.map((payment) => (
              <PaymentRow key={payment.id} payment={payment} colors={colors} />
            ))}
          </View>
        </CardContent>
      </Card>

      {/* Low stock list */}
      <Card className="mb-2">
        <CardContent className="pt-4">
          <Text className="text-base font-bold text-foreground mb-3">Low Stock</Text>
          {isLoading ? <SkeletonRows showAvatar /> : null}
          {!isLoading && (summary?.lowStockAlerts.length ?? 0) === 0 ? (
            <EmptyState title="No low-stock products" />
          ) : null}
          <View className="gap-2">
            {summary?.lowStockAlerts.map((product) => (
              <LowStockRow key={product.id} product={product} colors={colors} />
            ))}
          </View>
        </CardContent>
      </Card>

      {/* Red List */}
      <Card className="mb-2 mt-2">
        <CardContent className="pt-4">
          <Text className="text-base font-bold text-destructive mb-3">Red List (Missing &gt; 7 Days)</Text>
          {isLoading ? <SkeletonRows showAvatar /> : null}
          {!isLoading && (summary?.redListMembers?.length ?? 0) === 0 ? (
            <EmptyState title="No members on the Red List!" />
          ) : null}
          <View className="gap-2">
            {summary?.redListMembers?.map((member) => (
              <RedListRow key={member.id} member={member} colors={colors} />
            ))}
          </View>
        </CardContent>
      </Card>
    </ScreenWrapper>
  );
}

// ─── Member Dashboard ───────────────────────────────────────────────────────

function MemberDashboard({
  userName,
  navigation,
}: {
  userName: string;
  navigation: any;
}) {
  const [subscriptions, setSubscriptions] = useState<MembershipSubscriptionDto[]>([]);
  const [payments, setPayments] = useState<PaymentDto[]>([]);
  const [currentMember, setCurrentMember] = useState<MemberDto | null>(null);
  const [loading, setLoading] = useState(true);
  const { colors } = useTheme();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const member = await memberApi.getCurrentMember();
      const [subscriptionRows, paymentRows] = await Promise.all([
        membershipApi.listMemberSubscriptions(member.id).catch(() => []),
        paymentApi.listMemberPayments(member.id).catch(() => []),
      ]);
      setCurrentMember(member);
      setSubscriptions(subscriptionRows);
      setPayments(paymentRows);
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Could not load member dashboard', text2: error?.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const activeSubscription =
    subscriptions.find((s) => s.status === 'ACTIVE') ?? subscriptions[0] ?? null;
  const membership = memberMembershipState(activeSubscription);
  const recentPaymentTotal = payments
    .slice(0, 3)
    .reduce((total, payment) => total + payment.amountCents, 0);

  return (
    <ScreenWrapper refreshing={loading} onRefresh={loadData}>
      <PageHeader
        label="Member Portal"
        title={`Welcome, ${userName}`}
        subtitle="Membership, payments, bookings, and alerts."
      />

      <View className="gap-3 mb-4">
        <PortalMetric
          icon={WalletCards}
          title="Membership"
          value={membership.label}
          copy={activeSubscription?.planName ?? 'No active plan'}
          tone={membership.tone}
          colors={colors}
        />
        <PortalMetric
          icon={CalendarClock}
          title="Days Remaining"
          value={membership.daysRemaining.toString()}
          copy={
            activeSubscription
              ? `Ends ${formatDateTime(activeSubscription.endDate)}`
              : 'Contact front desk'
          }
          tone="warning"
          colors={colors}
        />
        <PortalMetric
          icon={CreditCard}
          title="Recent Payments"
          value={formatCents(recentPaymentTotal)}
          copy={`${payments.length} payment records`}
          tone="brand"
          colors={colors}
        />
        <PortalMetric
          icon={TrendingUp}
          title="Current Streak"
          value={currentMember?.streakDays ? `${currentMember.streakDays} Days` : '0 Days'}
          copy="Keep up the great work!"
          tone="success"
          colors={colors}
        />
      </View>

      {membership.label === 'Expiring Soon' && (
        <View
          style={{ borderColor: colors.warning, backgroundColor: colors.warningSoft }}
          className="rounded-xl border p-4 mb-4"
        >
          <Text style={{ color: colors.warning }} className="text-sm font-bold">
            Your membership is expiring soon. Please renew at the front desk to avoid
            check-in interruption.
          </Text>
        </View>
      )}
    </ScreenWrapper>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function MetricCard({
  icon: Icon,
  title,
  value,
  formatter,
  loading,
  tone,
  colors,
}: any) {
  const displayValue = formatter ? formatter(value) : value.toString();

  const toneColors = {
    brand: { bg: colors.primarySoft, icon: colors.primary },
    success: { bg: colors.successSoft, icon: colors.success },
    warning: { bg: colors.warningSoft, icon: colors.warning },
  } as Record<string, { bg: string; icon: string }>;

  const tc = toneColors[tone] ?? toneColors.brand;

  return (
    <View className="flex-1 min-w-[45%] rounded-xl border border-border bg-card p-4">
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <Text className="text-xs font-black uppercase tracking-widest text-muted-foreground">
            {title}
          </Text>
          {loading ? (
            <View className="mt-3">
              <SkeletonRows rows={1} />
            </View>
          ) : (
            <Text className="mt-3 text-2xl font-black text-foreground">{displayValue}</Text>
          )}
        </View>
        <View
          style={{ backgroundColor: tc.bg }}
          className="h-11 w-11 items-center justify-center rounded-lg ml-2"
        >
          <Icon size={20} color={tc.icon} />
        </View>
      </View>
    </View>
  );
}

function AlertCard({
  icon: Icon,
  iconColor,
  iconBg,
  title,
  value,
  subtitle,
  loading,
}: any) {
  return (
    <View className="flex-1 rounded-xl border border-border bg-card p-4">
      {loading ? (
        <SkeletonRows rows={2} />
      ) : (
        <>
          <View
            style={{ backgroundColor: iconBg }}
            className="mb-3 h-10 w-10 items-center justify-center rounded-lg"
          >
            <Icon size={18} color={iconColor} />
          </View>
          <Text className="text-xs font-black uppercase tracking-widest text-muted-foreground">
            {title}
          </Text>
          <Text className="mt-1 text-2xl font-black text-foreground">{value}</Text>
          <Text className="mt-0.5 text-xs font-semibold text-muted-foreground">
            {subtitle}
          </Text>
        </>
      )}
    </View>
  );
}

function PortalMetric({
  icon: Icon,
  title,
  value,
  copy,
  tone,
  colors,
}: any) {
  const toneColors = {
    brand: { bg: colors.primarySoft, icon: colors.primary },
    success: { bg: colors.successSoft, icon: colors.success },
    warning: { bg: colors.warningSoft, icon: colors.warning },
    danger: { bg: colors.destructiveSoft, icon: colors.destructive },
  } as Record<string, { bg: string; icon: string }>;

  const tc = toneColors[tone] ?? toneColors.brand;

  return (
    <View className="rounded-xl border border-border bg-card p-4">
      <View
        style={{ backgroundColor: tc.bg }}
        className="mb-3 h-10 w-10 items-center justify-center rounded-lg"
      >
        <Icon size={20} color={tc.icon} />
      </View>
      <Text className="text-xs font-black uppercase tracking-widest text-muted-foreground">
        {title}
      </Text>
      <Text className="mt-1.5 text-2xl font-black text-foreground">{value}</Text>
      <Text className="mt-1 text-sm font-semibold text-muted-foreground">{copy}</Text>
    </View>
  );
}

function memberMembershipState(subscription: MembershipSubscriptionDto | null) {
  if (!subscription) return { label: 'No Plan', daysRemaining: 0, tone: 'danger' as const };
  const daysRemaining = Math.ceil(
    (new Date(subscription.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
  if (daysRemaining < 0 || subscription.status === 'EXPIRED')
    return { label: 'Expired', daysRemaining, tone: 'danger' as const };
  if (daysRemaining <= 7) return { label: 'Expiring Soon', daysRemaining, tone: 'warning' as const };
  return { label: 'Active', daysRemaining, tone: 'success' as const };
}

function PaymentRow({ payment, colors }: { payment: PaymentDto; colors: any }) {
  return (
    <View
      style={{ backgroundColor: colors.secondary }}
      className="rounded-lg p-3 flex-row justify-between items-center"
    >
      <View>
        <Text className="font-bold text-foreground">{formatCents(payment.amountCents)}</Text>
        <Text className="text-xs font-semibold text-muted-foreground">
          {payment.method} · {formatRelativeTime(payment.paidAt)}
        </Text>
      </View>
      <View className="rounded-md bg-background px-2 py-1">
        <Text className="text-xs text-muted-foreground">{payment.invoiceId.slice(0, 8)}</Text>
      </View>
    </View>
  );
}

function LowStockRow({ product, colors }: { product: LowStockProductDto; colors: any }) {
  return (
    <View className="rounded-lg border border-border bg-card p-3">
      <View className="mb-2 flex-row justify-between items-center">
        <View className="flex-row items-center gap-2 flex-1 mr-2">
          <Boxes size={16} color={colors.warning} />
          <Text className="font-bold text-foreground flex-1" numberOfLines={1}>
            {product.name}
          </Text>
        </View>
        <Text className="font-semibold text-muted-foreground text-sm">
          {product.currentStock} left
        </Text>
      </View>
      <LoadBar
        value={product.currentStock}
        max={Math.max(1, product.reorderThreshold)}
        tone="danger"
      />
    </View>
  );
}

function RedListRow({ member, colors }: { member: MemberDto; colors: any }) {
  return (
    <View className="rounded-lg border border-destructive bg-destructiveSoft p-3">
      <View className="mb-1 flex-row justify-between items-center">
        <View className="flex-row items-center gap-2 flex-1 mr-2">
          <AlertTriangle size={16} color={colors.destructive} />
          <Text className="font-bold text-foreground flex-1" numberOfLines={1}>
            {member.firstName} {member.lastName}
          </Text>
        </View>
        <Text className="font-semibold text-destructive text-xs">
          {member.lastAttendanceDate ? formatRelativeTime(member.lastAttendanceDate) : 'Never'}
        </Text>
      </View>
      <View className="flex-row gap-4 mt-1">
        <Text className="text-xs text-muted-foreground">{member.phone}</Text>
        <Text className="text-xs text-muted-foreground">{member.email}</Text>
      </View>
    </View>
  );
}
