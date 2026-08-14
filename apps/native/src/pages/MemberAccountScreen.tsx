import { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { CalendarClock, Clock3, MapPin, Phone, UserRound, WalletCards } from 'lucide-react-native';
import { APP_NAME } from '../utils/env';
import Toast from 'react-native-toast-message';
import { EmptyState } from '../components/ui/EmptyState';
import { StatusBadge } from '../components/ui/StatusBadge';
import * as memberApi from '../features/members/memberApi';
import * as membershipApi from '../features/memberships/membershipApi';
import * as orderApi from '../features/orders/orderApi';
import * as paymentApi from '../features/payments/paymentApi';
import * as settingsApi from '../features/settings/settingsApi';
import * as staffApi from '../features/staff/staffApi';
import { getApiErrorMessage } from '../utils/apiError';
import { formatCents, formatDateTime } from '../utils/format';
import { useAppSelector } from '../store/hooks';
import { themeColors } from '../constants/colors';
import type { GymInfoDto, MemberDietPlanDto, MemberDto, MemberWorkoutPlanDto, MembershipSubscriptionDto, PaymentDto, ProductOrderDto } from '@gym/shared';
import { Card, CardContent } from '../components/ui/Card';

type MemberAccountMode = 'membership' | 'payments' | 'profile' | 'plans';

export function MemberAccountScreen({ route }: any) {
  const mode: MemberAccountMode = route?.params?.mode ?? 'profile';

  const theme = useAppSelector((state) => state.theme.theme);
  const activeColors = themeColors[theme === 'dark' ? 'dark' : 'light'];

  const [member, setMember] = useState<MemberDto | null>(null);
  const [subscriptions, setSubscriptions] = useState<MembershipSubscriptionDto[]>([]);
  const [payments, setPayments] = useState<PaymentDto[]>([]);
  const [orders, setOrders] = useState<ProductOrderDto[]>([]);
  const [workouts, setWorkouts] = useState<MemberWorkoutPlanDto[]>([]);
  const [diets, setDiets] = useState<MemberDietPlanDto[]>([]);
  const [gymInfo, setGymInfo] = useState<GymInfoDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const self = await memberApi.getCurrentMember();
        setMember(self);
        const [subscriptionRows, paymentRows, orderRows, workoutRows, dietRows, info] = await Promise.all([
          membershipApi.listMemberSubscriptions(self.id).catch(() => []),
          paymentApi.listMemberPayments(self.id).catch(() => []),
          orderApi.listOrders({ pageSize: 10 }).then((res) => res.data).catch(() => []),
          staffApi.listMemberWorkouts(self.id).catch(() => []),
          staffApi.listMemberDiets(self.id).catch(() => []),
          settingsApi.getGymInfo().catch(() => null),
        ]);
        setSubscriptions(subscriptionRows);
        setPayments(paymentRows);
        setOrders(orderRows);
        setWorkouts(workoutRows);
        setDiets(dietRows);
        setGymInfo(info);
      } catch (error) {
        Toast.show({ type: 'error', text1: 'Could not load member account', text2: getApiErrorMessage(error, 'Error') });
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  const activeSubscription = subscriptions.find((s) => s.status === 'ACTIVE') ?? subscriptions[0] ?? null;
  const membershipStatus = useMemo(() => membershipState(activeSubscription), [activeSubscription]);

  if (loading) {
    return (
      <View className="flex-1 bg-background items-center justify-center p-6">
        <ActivityIndicator size="large" color={activeColors.primary} />
        <Text className="mt-4 font-bold text-muted-foreground text-sm">Loading account</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-background p-4">
      <Card className="mb-6">
        <CardContent className="pt-6">
          <Text className="text-xs font-black uppercase tracking-[2px] text-primary">
            {mode === 'membership' ? 'My Membership' : mode === 'payments' ? 'My Payments' : mode === 'plans' ? 'My Plans' : 'My Profile'}
          </Text>
          <Text className="mt-2 text-3xl font-black text-foreground">
            {member ? `${member.firstName} ${member.lastName}` : 'Member Account'}
          </Text>
          <Text className="mt-1 text-sm font-black text-primary">{member?.memberCode}</Text>
        </CardContent>
      </Card>

      {mode === 'membership' && (
        <View className="gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <View className="flex-row items-center justify-between mb-4">
                <View>
                  <Text className="text-xl font-black text-foreground">Current Membership</Text>
                  <Text className="mt-1 text-sm font-semibold text-muted-foreground">Plan dates and renewal state</Text>
                </View>
                <StatusBadge status={membershipStatus.status} />
              </View>
              {activeSubscription ? (
                <View className="flex-row flex-wrap">
                  <View className="w-1/2 pr-2 mb-4"><Detail label="Current plan" value={activeSubscription.planName} /></View>
                  <View className="w-1/2 pl-2 mb-4"><Detail label="Plan amount" value={formatCents(activeSubscription.priceAtPurchaseCents)} /></View>
                  <View className="w-1/2 pr-2 mb-4"><Detail label="Start date" value={formatDateTime(activeSubscription.startDate)} /></View>
                  <View className="w-1/2 pl-2 mb-4"><Detail label="Expiry date" value={formatDateTime(activeSubscription.endDate)} /></View>
                  <View className="w-1/2 pr-2 mb-4"><Detail label="Days remaining" value={membershipStatus.daysRemaining.toString()} /></View>
                  <View className="w-1/2 pl-2 mb-4"><Detail label="Coach status" value={activeSubscription.planName.toLowerCase().includes('coach') ? 'Coach add-on active' : 'No coach add-on'} /></View>
                </View>
              ) : (
                <EmptyState icon={WalletCards} title="No active membership" description="Contact the front desk to activate a plan." />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <Text className="text-xl font-black text-foreground mb-4">Recent Orders</Text>
              {orders.length === 0 ? <EmptyState icon={CalendarClock} title="No orders yet" /> : null}
              {orders.slice(0, 4).map((order) => (
                <View key={order.id} className="rounded-md border border-border bg-background p-3 mb-2">
                  <Text className="font-bold text-foreground">{order.productName}</Text>
                  <Text className="mt-1 text-xs text-muted-foreground">{order.orderCode} · {formatCents(order.amountCents)}</Text>
                </View>
              ))}
            </CardContent>
          </Card>
        </View>
      )}

      {mode === 'profile' && (
        <View className="gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <View className="mb-4 h-14 w-14 items-center justify-center rounded-full bg-secondary">
                <UserRound size={24} color={activeColors.primary} />
              </View>
              <View className="flex-row flex-wrap">
                <View className="w-1/2 pr-2 mb-4"><Detail label="Name" value={member ? `${member.firstName} ${member.lastName}` : '-'} /></View>
                <View className="w-1/2 pl-2 mb-4"><Detail label="Member ID" value={member?.memberCode ?? '-'} /></View>
                <View className="w-1/2 pr-2 mb-4"><Detail label="Phone" value={member?.phone ?? '-'} /></View>
                <View className="w-1/2 pl-2 mb-4"><Detail label="Email" value={member?.email ?? '-'} /></View>
                <View className="w-1/2 pr-2 mb-4"><Detail label="Join date" value={member ? formatDateTime(member.joinedAt) : '-'} /></View>
                <View className="w-1/2 pl-2 mb-4"><Detail label="Status" value={member?.status ?? '-'} /></View>
              </View>
            </CardContent>
          </Card>
          <GymInfoCard info={gymInfo} activeColors={activeColors} />
        </View>
      )}

      {/* Add padding at the bottom for scrolling */}
      <View className="h-12" />
    </ScrollView>
  );
}

function GymInfoCard({ info, activeColors }: { info: GymInfoDto | null; activeColors: any }) {
  const hours = Object.entries(info?.businessHours ?? {});

  return (
    <Card>
      <CardContent className="pt-6">
        <Text className="text-xs font-black uppercase tracking-[2px] text-primary">Gym Info</Text>
        <Text className="mt-2 text-xl font-black text-foreground">{info?.name ?? APP_NAME}</Text>
        <View className="mt-4 gap-3">
          <InfoLine icon={MapPin} value={info?.address || 'Address not set'} activeColors={activeColors} />
          <InfoLine icon={Phone} value={[info?.phone, info?.email].filter(Boolean).join(' · ') || 'Contact not set'} activeColors={activeColors} />
        </View>
        <View className="mt-4 rounded-md border border-border bg-background p-3">
          <View className="flex-row items-center gap-2 mb-2">
            <Clock3 size={16} color={activeColors.primary} />
            <Text className="text-sm font-bold text-foreground">Timings</Text>
          </View>
          <View className="gap-1">
            {hours.length === 0 ? <Text className="text-xs font-semibold text-muted-foreground">Hours not set</Text> : null}
            {hours.map(([day, value]) => (
              <View key={day} className="flex-row justify-between">
                <Text className="capitalize text-xs font-semibold text-muted-foreground">{day}</Text>
                <Text className="text-xs font-semibold text-foreground">{value as string}</Text>
              </View>
            ))}
          </View>
        </View>
      </CardContent>
    </Card>
  );
}

function InfoLine({ icon: Icon, value, activeColors }: { icon: any; value: string; activeColors: any }) {
  return (
    <View className="flex-row gap-2 rounded-md border border-border bg-background p-3">
      <Icon size={16} color={activeColors.primary} />
      <Text className="font-semibold text-sm text-muted-foreground flex-shrink">{value}</Text>
    </View>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text className="text-xs font-semibold uppercase text-muted-foreground">{label}</Text>
      <Text className="mt-1 font-bold text-foreground">{value}</Text>
    </View>
  );
}

function membershipState(subscription: MembershipSubscriptionDto | null): { status: 'ACTIVE' | 'EXPIRED' | 'EXPIRING_SOON'; daysRemaining: number } {
  if (!subscription) {
    return { status: 'EXPIRED', daysRemaining: 0 };
  }
  const today = new Date();
  const end = new Date(subscription.endDate);
  const daysRemaining = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (daysRemaining < 0 || subscription.status === 'EXPIRED') {
    return { status: 'EXPIRED', daysRemaining };
  }
  if (daysRemaining <= 7) {
    return { status: 'EXPIRING_SOON', daysRemaining };
  }
  return { status: 'ACTIVE', daysRemaining };
}
