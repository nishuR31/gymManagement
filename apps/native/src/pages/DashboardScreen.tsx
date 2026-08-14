import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadBar } from '../components/ui/LoadBar';
import { SkeletonRows } from '../components/ui/Skeleton';
import { StatusBadge } from '../components/ui/StatusBadge';
import { APP_NAME } from '../utils/env';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { logoutThunk } from '../features/auth/authSlice';
import { Button } from '../components/ui/Button';
import { 
  User, LogOut, Activity, CreditCard, Dumbbell, Settings,
  AlertTriangle, Boxes, CalendarClock, Clock3, Receipt, TrendingUp, Users, WalletCards
} from 'lucide-react-native';
import { isAdminRole } from '../utils/roles';
import { FloatingDock } from '../components/layout/FloatingDock';
import { themeColors } from '../constants/colors';
import { useEffect, useState, useCallback } from 'react';
import type { DashboardSummaryDto, MembershipSubscriptionDto, PaymentDto, ProductOrderDto, ProductDto, NotificationDto, AuditLogDto, LowStockProductDto } from '@gym/shared';
import * as dashboardApi from '../features/dashboard/dashboardApi';
import * as inventoryApi from '../features/inventory/inventoryApi';
import * as memberApi from '../features/members/memberApi';
import * as membershipApi from '../features/memberships/membershipApi';
import * as notificationApi from '../features/notifications/notificationApi';
import * as orderApi from '../features/orders/orderApi';
import * as paymentApi from '../features/payments/paymentApi';
import Toast from 'react-native-toast-message';
import { formatCents, formatDateTime, formatRelativeTime } from '../utils/format';

export function DashboardScreen({ navigation }: any) {
  const user = useAppSelector((state) => state.auth.user);
  const theme = useAppSelector((state) => state.theme.theme);
  const dispatch = useAppDispatch();
  const activeColors = themeColors[theme === 'amoled' ? 'amoled' : theme === 'dark' ? 'dark' : 'light'];
  
  const [summary, setSummary] = useState<DashboardSummaryDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadSummary = useCallback(async () => {
    if (user?.role === "MEMBER") {
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

  const handleLogout = () => {
    dispatch(logoutThunk());
    navigation.replace("Home");
  };

  if (user?.role === "MEMBER") {
    return <MemberDashboard userName={`${user.firstName} ${user.lastName}`} navigation={navigation} />;
  }

  return (
    <SafeAreaView className="flex-1 bg-background relative">
      <ScrollView 
        className="flex-1 p-4" 
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={activeColors.primary} />}
      >
        <View className="flex-row items-center justify-between mb-6">
          <View className="flex-row items-center gap-2 rounded-md border border-primary/35 bg-card/10 px-3 py-2">
            <Dumbbell size={14} color={activeColors.foreground} />
            <Text className="text-xs font-black uppercase tracking-widest text-foreground">Live Operations</Text>
          </View>
          <Button variant="ghost" size="icon" onPress={handleLogout}>
            <LogOut size={24} color={activeColors.foreground} />
          </Button>
        </View>

        <View className="mb-6">
          <Text className="text-3xl font-black leading-tight text-foreground">Dashboard</Text>
          <Text className="mt-2 text-sm font-semibold text-muted-foreground">
            Live operational summary for the gym floor, front desk, revenue, dues, inventory, and recent activity.
          </Text>
        </View>

        <View className="gap-4 mb-4 flex-row flex-wrap">
          <MetricCard icon={Users} title="In Gym" value={summary?.membersCurrentlyInGym ?? 0} loading={isLoading} tone="brand" activeColors={activeColors} />
          <MetricCard icon={CreditCard} title="Today's Rev" value={summary?.todaysRevenueCents ?? 0} formatter={formatCents} loading={isLoading} tone="warning" activeColors={activeColors} />
          <MetricCard icon={Activity} title="Attendance" value={summary?.todaysAttendance ?? 0} loading={isLoading} tone="success" activeColors={activeColors} />
          <MetricCard icon={TrendingUp} title="Monthly Rev" value={summary?.monthlyRevenueCents ?? 0} formatter={formatCents} loading={isLoading} tone="brand" activeColors={activeColors} />
        </View>

        <View className="gap-4 mb-4">
          <View className="rounded-xl border border-border bg-card p-4">
            <Text className="text-lg font-bold text-foreground mb-4">Pending Dues</Text>
            {isLoading ? <SkeletonRows rows={2} /> : (
              <View>
                <View className="mb-4 h-11 w-11 items-center justify-center rounded-md bg-accent text-destructive">
                  <Receipt size={20} color={activeColors.destructive} />
                </View>
                <Text className="text-3xl font-black text-foreground">{formatCents(summary?.pendingDuesCents ?? 0)}</Text>
                <Text className="mt-1 text-sm font-semibold text-muted-foreground">{summary?.pendingDuesCount ?? 0} open invoices</Text>
              </View>
            )}
          </View>

          <View className="rounded-xl border border-border bg-card p-4">
            <Text className="text-lg font-bold text-foreground mb-4">Expiring Soon</Text>
            {isLoading ? <SkeletonRows rows={2} /> : (
              <View>
                <View className="mb-4 h-11 w-11 items-center justify-center rounded-md bg-yellow-500/20">
                  <CalendarClock size={20} color={activeColors.warning || "#eab308"} />
                </View>
                <Text className="text-3xl font-black text-foreground">{summary?.membershipsExpiringSoon.length ?? 0}</Text>
                <Text className="mt-1 text-sm font-semibold text-muted-foreground">Memberships inside 30 days</Text>
              </View>
            )}
          </View>

          <View className="rounded-xl border border-border bg-card p-4">
            <Text className="text-lg font-bold text-foreground mb-4">Low Stock Alerts</Text>
            {isLoading ? <SkeletonRows rows={2} /> : (
              <View>
                <View className="mb-4 h-11 w-11 items-center justify-center rounded-md bg-destructive/20">
                  <AlertTriangle size={20} color={activeColors.destructive} />
                </View>
                <Text className="text-3xl font-black text-foreground">{summary?.lowStockAlerts.length ?? 0}</Text>
                <Text className="mt-1 text-sm font-semibold text-muted-foreground">Products at or below reorder point</Text>
              </View>
            )}
          </View>
        </View>

        <View className="gap-4 mb-4">
          <View className="rounded-xl border border-border bg-card p-4">
            <Text className="text-lg font-bold text-foreground mb-4">Recent Payments</Text>
            {isLoading ? <SkeletonRows /> : null}
            {!isLoading && (summary?.recentPayments.length ?? 0) === 0 ? <EmptyState title="No recent payments" /> : null}
            <View className="gap-3">
              {summary?.recentPayments.map((payment) => <PaymentRow key={payment.id} payment={payment} />)}
            </View>
          </View>

          <View className="rounded-xl border border-border bg-card p-4">
            <Text className="text-lg font-bold text-foreground mb-4">Low Stock</Text>
            {isLoading ? <SkeletonRows /> : null}
            {!isLoading && (summary?.lowStockAlerts.length ?? 0) === 0 ? <EmptyState title="No low-stock products" /> : null}
            <View className="gap-3">
              {summary?.lowStockAlerts.map((product) => <LowStockRow key={product.id} product={product} />)}
            </View>
          </View>
        </View>

      </ScrollView>
      <FloatingDock />
    </SafeAreaView>
  );
}

function MemberDashboard({ userName, navigation }: { userName: string; navigation: any }) {
  const [subscriptions, setSubscriptions] = useState<MembershipSubscriptionDto[]>([]);
  const [payments, setPayments] = useState<PaymentDto[]>([]);
  const [orders, setOrders] = useState<ProductOrderDto[]>([]);
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [loading, setLoading] = useState(true);
  
  const theme = useAppSelector((state) => state.theme.theme);
  const activeColors = themeColors[theme === 'amoled' ? 'amoled' : theme === 'dark' ? 'dark' : 'light'];

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const member = await memberApi.getCurrentMember();
      const [subscriptionRows, paymentRows, orderRows, productRows, notificationRows] = await Promise.all([
        membershipApi.listMemberSubscriptions(member.id).catch(() => []),
        paymentApi.listMemberPayments(member.id).catch(() => []),
        orderApi.listOrders({ pageSize: 5 }).then((response) => response.data).catch(() => []),
        inventoryApi.listProducts().catch(() => []),
        notificationApi.listNotifications({ pageSize: 5 }).then((response) => response.data).catch(() => [])
      ]);
      setSubscriptions(subscriptionRows);
      setPayments(paymentRows);
      setOrders(orderRows);
      setProducts(productRows);
      setNotifications(notificationRows);
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Could not load member dashboard', text2: error?.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const activeSubscription = subscriptions.find((subscription) => subscription.status === "ACTIVE") ?? subscriptions[0] ?? null;
  const membership = memberMembershipState(activeSubscription);
  const recentPaymentTotal = payments.slice(0, 3).reduce((total, payment) => total + payment.amountCents, 0);

  return (
    <SafeAreaView className="flex-1 bg-background relative">
      <ScrollView className="flex-1 p-4" contentContainerStyle={{ paddingBottom: 100 }}>
        <View className="mb-6">
          <View className="w-fit flex-row items-center gap-2 rounded-md border border-primary/35 bg-card/10 px-3 py-2 mb-4 self-start">
            <Dumbbell size={14} color={activeColors.foreground} />
            <Text className="text-xs font-black uppercase tracking-widest text-foreground">Member Portal</Text>
          </View>
          <Text className="text-3xl font-black text-foreground">Welcome, {userName}</Text>
          <Text className="mt-2 text-sm font-semibold text-muted-foreground">Membership, payments, bookings, and alerts.</Text>
        </View>

        <View className="gap-4 mb-4">
          <PortalMetric icon={WalletCards} title="Membership" value={membership.label} copy={activeSubscription?.planName ?? "No active plan"} tone={membership.tone} activeColors={activeColors} />
          <PortalMetric icon={CalendarClock} title="Days Remaining" value={membership.daysRemaining.toString()} copy={activeSubscription ? `Ends ${formatDateTime(activeSubscription.endDate)}` : "Contact front desk"} tone="warning" activeColors={activeColors} />
          <PortalMetric icon={CreditCard} title="Recent Payments" value={formatCents(recentPaymentTotal)} copy={`${payments.length} payment records`} tone="brand" activeColors={activeColors} />
        </View>

        {membership.label === "Expiring Soon" && (
          <View className="rounded-lg border border-yellow-500 bg-yellow-500/20 p-4 mb-4">
            <Text className="text-sm font-bold text-yellow-500">
              Your membership is expiring soon. Please renew at the front desk to avoid check-in interruption.
            </Text>
          </View>
        )}

      </ScrollView>
      <FloatingDock />
    </SafeAreaView>
  );
}

function MetricCard({ icon: Icon, title, value, formatter, loading, tone, activeColors }: any) {
  const displayValue = formatter ? formatter(value) : value.toString();
  const tones: any = {
    brand: "bg-primary/20",
    success: "bg-green-500/20",
    warning: "bg-yellow-500/20"
  };
  const iconColors: any = {
    brand: activeColors.primary,
    success: "#22c55e",
    warning: "#eab308"
  };

  return (
    <View className="w-[47%] rounded-xl border border-border bg-card p-4 mr-2 mb-2">
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <Text className="text-xs font-black uppercase tracking-widest text-muted-foreground">{title}</Text>
          {loading ? (
            <View className="mt-4"><SkeletonRows rows={1} /></View>
          ) : (
            <Text className="mt-4 text-2xl font-black text-foreground">{displayValue}</Text>
          )}
        </View>
        <View className={`h-11 w-11 items-center justify-center rounded-md ${tones[tone]}`}>
          <Icon size={20} color={iconColors[tone]} />
        </View>
      </View>
    </View>
  );
}

function PortalMetric({ icon: Icon, title, value, copy, tone, activeColors }: any) {
  const tones: any = {
    brand: "bg-primary/20",
    success: "bg-green-500/20",
    warning: "bg-yellow-500/20",
    danger: "bg-destructive/20"
  };
  const iconColors: any = {
    brand: activeColors.primary,
    success: "#22c55e",
    warning: "#eab308",
    danger: activeColors.destructive
  };

  return (
    <View className="rounded-xl border border-border bg-card p-4">
      <View className={`mb-4 h-11 w-11 items-center justify-center rounded-md ${tones[tone]}`}>
        <Icon size={20} color={iconColors[tone]} />
      </View>
      <Text className="text-xs font-black uppercase tracking-widest text-muted-foreground">{title}</Text>
      <Text className="mt-2 text-2xl font-black text-foreground">{value}</Text>
      <Text className="mt-2 text-sm font-semibold text-muted-foreground">{copy}</Text>
    </View>
  );
}

function memberMembershipState(subscription: MembershipSubscriptionDto | null) {
  if (!subscription) return { label: "No Plan", daysRemaining: 0, tone: "danger" as const };
  const daysRemaining = Math.ceil((new Date(subscription.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (daysRemaining < 0 || subscription.status === "EXPIRED") return { label: "Expired", daysRemaining, tone: "danger" as const };
  if (daysRemaining <= 7) return { label: "Expiring Soon", daysRemaining, tone: "warning" as const };
  return { label: "Active", daysRemaining, tone: "success" as const };
}

function PaymentRow({ payment }: { payment: PaymentDto }) {
  return (
    <View className="rounded-md border border-border bg-card/80 p-3 flex-row justify-between items-center">
      <View>
        <Text className="font-bold text-foreground">{formatCents(payment.amountCents)}</Text>
        <Text className="text-xs font-semibold text-muted-foreground">{payment.method} · {formatRelativeTime(payment.paidAt)}</Text>
      </View>
      <View className="rounded-md bg-secondary px-2 py-1">
        <Text className="text-xs text-muted-foreground">{payment.invoiceId.slice(0, 8)}</Text>
      </View>
    </View>
  );
}

function LowStockRow({ product }: { product: LowStockProductDto }) {
  return (
    <View className="rounded-md border border-border bg-card/80 p-3">
      <View className="mb-2 flex-row justify-between items-center">
        <View className="flex-row items-center gap-2">
          <Boxes size={16} color="#eab308" />
          <Text className="font-bold text-foreground">{product.name}</Text>
        </View>
        <Text className="font-semibold text-muted-foreground text-sm">{product.currentStock} left</Text>
      </View>
      <LoadBar value={product.currentStock} max={Math.max(1, product.reorderThreshold)} tone="danger" />
    </View>
  );
}
