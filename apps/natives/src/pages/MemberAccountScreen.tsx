import { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import {
  CalendarClock,
  Clock3,
  MapPin,
  Phone,
  UserRound,
  WalletCards,
  CreditCard,
  ClipboardList,
} from 'lucide-react-native';
import { APP_NAME } from '../utils/env';
import { SkeletonRows } from '../components/ui/Skeleton';
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
import { useTheme } from '../hooks/useTheme';
import type {
  GymInfoDto,
  MemberDietPlanDto,
  MemberDto,
  MemberWorkoutPlanDto,
  MembershipSubscriptionDto,
  PaymentDto,
  ProductOrderDto,
} from '@gym/shared';
import { Card, CardContent } from '../components/ui/Card';
import { ScreenWrapper } from '../components/layout/ScreenWrapper';

type MemberAccountMode = 'membership' | 'payments' | 'profile' | 'plans';

const TABS: { key: MemberAccountMode; label: string }[] = [
  { key: 'profile', label: 'Profile' },
  { key: 'membership', label: 'Membership' },
  { key: 'payments', label: 'Payments' },
  { key: 'plans', label: 'Plans' },
];

export function MemberAccountScreen({ route }: any) {
  const initialMode: MemberAccountMode = route?.params?.mode ?? 'profile';
  const [activeMode, setActiveMode] = useState<MemberAccountMode>(initialMode);

  const { colors } = useTheme();

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
        const [subscriptionRows, paymentRows, orderRows, workoutRows, dietRows, info] =
          await Promise.all([
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
        Toast.show({ type: 'error', text1: 'Could not load account', text2: getApiErrorMessage(error, 'Error') });
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
      <ScreenWrapper showDock={false}>
        <SkeletonRows rows={1} />
        <View className="mt-6">
          <SkeletonRows rows={4} showAvatar />
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper showDock={false}>
      {/* Header */}
      <View className="mb-5 rounded-xl border border-border bg-card px-4 py-4">
        <View className="items-center mb-4">
          <View
            style={{ backgroundColor: colors.primarySoft }}
            className="h-16 w-16 items-center justify-center rounded-full mb-3"
          >
            <UserRound size={28} color={colors.primary} />
          </View>
          <Text className="text-2xl font-black text-foreground">
            {member ? `${member.firstName} ${member.lastName}` : 'My Account'}
          </Text>
          {member?.memberCode && (
            <Text style={{ color: colors.primary }} className="font-bold mt-0.5">
              {member.memberCode}
            </Text>
          )}
          <View className="mt-2">
            <StatusBadge status={activeSubscription?.status ?? 'EXPIRED'} />
          </View>
        </View>

        {/* Tab row */}
        <View className="flex-row gap-2 flex-wrap">
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveMode(tab.key)}
              style={{
                backgroundColor: activeMode === tab.key ? colors.primary : colors.secondary,
              }}
              className="flex-1 min-w-[80px] rounded-lg px-3 py-2 items-center"
              activeOpacity={0.75}
            >
              <Text
                style={{
                  color: activeMode === tab.key ? colors.primaryForeground : colors.mutedForeground,
                  fontWeight: '700',
                  fontSize: 13,
                }}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Profile tab */}
      {activeMode === 'profile' && (
        <View className="gap-4">
          <Card>
            <CardContent className="pt-4">
              <View className="flex-row flex-wrap">
                <View className="w-1/2 pr-2 mb-4">
                  <Detail label="Name" value={member ? `${member.firstName} ${member.lastName}` : '-'} />
                </View>
                <View className="w-1/2 pl-2 mb-4">
                  <Detail label="Member ID" value={member?.memberCode ?? '-'} />
                </View>
                <View className="w-1/2 pr-2 mb-4">
                  <Detail label="Phone" value={member?.phone ?? '-'} />
                </View>
                <View className="w-1/2 pl-2 mb-4">
                  <Detail label="Email" value={member?.email ?? '-'} />
                </View>
                <View className="w-1/2 pr-2 mb-4">
                  <Detail label="Join date" value={member ? formatDateTime(member.joinedAt) : '-'} />
                </View>
                <View className="w-1/2 pl-2 mb-4">
                  <Detail label="Status" value={member?.status ?? '-'} />
                </View>
              </View>
            </CardContent>
          </Card>
          <GymInfoCard info={gymInfo} colors={colors} />
        </View>
      )}

      {/* Membership tab */}
      {activeMode === 'membership' && (
        <View className="gap-4">
          <Card>
            <CardContent className="pt-4">
              <View className="flex-row items-center justify-between mb-4">
                <View>
                  <Text className="text-lg font-black text-foreground">Current Membership</Text>
                  <Text className="text-sm font-semibold text-muted-foreground mt-0.5">
                    Plan dates and renewal state
                  </Text>
                </View>
                <StatusBadge status={membershipStatus.status} />
              </View>
              {activeSubscription ? (
                <View className="flex-row flex-wrap">
                  <View className="w-1/2 pr-2 mb-4"><Detail label="Current plan" value={activeSubscription.planName} /></View>
                  <View className="w-1/2 pl-2 mb-4"><Detail label="Plan amount" value={formatCents(activeSubscription.priceAtPurchaseCents)} /></View>
                  <View className="w-1/2 pr-2 mb-4"><Detail label="Start date" value={formatDateTime(activeSubscription.startDate)} /></View>
                  <View className="w-1/2 pl-2 mb-4"><Detail label="Expiry date" value={formatDateTime(activeSubscription.endDate)} /></View>
                  <View className="w-1/2 pr-2"><Detail label="Days remaining" value={String(membershipStatus.daysRemaining)} /></View>
                </View>
              ) : (
                <EmptyState
                  icon={WalletCards}
                  title="No active membership"
                  description="Contact the front desk to activate a plan."
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <Text className="text-base font-black text-foreground mb-3">Recent Orders</Text>
              {orders.length === 0 ? (
                <EmptyState icon={CalendarClock} title="No orders yet" />
              ) : (
                <View className="gap-2">
                  {orders.slice(0, 4).map((order) => (
                    <View
                      key={order.id}
                      style={{ backgroundColor: colors.secondary }}
                      className="rounded-lg p-3"
                    >
                      <Text className="font-bold text-foreground">{order.productName}</Text>
                      <Text className="mt-0.5 text-xs text-muted-foreground">
                        {order.orderCode} · {formatCents(order.amountCents)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </CardContent>
          </Card>
        </View>
      )}

      {/* Payments tab */}
      {activeMode === 'payments' && (
        <Card>
          <CardContent className="pt-4">
            <Text className="text-base font-black text-foreground mb-3">Payment History</Text>
            {payments.length === 0 ? (
              <EmptyState icon={CreditCard} title="No payments yet" />
            ) : (
              <View className="gap-2">
                {payments.map((payment) => (
                  <View
                    key={payment.id}
                    style={{ backgroundColor: colors.secondary }}
                    className="rounded-lg p-3 flex-row justify-between items-center"
                  >
                    <View>
                      <Text className="font-bold text-foreground">
                        {formatCents(payment.amountCents)}
                      </Text>
                      <Text className="text-xs text-muted-foreground mt-0.5">
                        {payment.method} · <Text style={{ color: colors.foreground }} className="text-xs font-bold">{formatDateTime(payment.paidAt)}</Text>
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </CardContent>
        </Card>
      )}

      {/* Plans tab */}
      {activeMode === 'plans' && (
        <View className="gap-4">
          <Card>
            <CardContent className="pt-4">
              <Text className="text-base font-black text-foreground mb-3">Workout Plans</Text>
              {workouts.length === 0 ? (
                <EmptyState icon={ClipboardList} title="No workout plans assigned" />
              ) : (
                <View className="gap-2">
                  {workouts.map((w) => (
                    <View key={w.id} style={{ backgroundColor: colors.secondary }} className="rounded-lg p-3">
                      <Text className="font-bold text-foreground">{w.templateId}</Text>
                    </View>
                  ))}
                </View>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <Text className="text-base font-black text-foreground mb-3">Diet Plans</Text>
              {diets.length === 0 ? (
                <EmptyState icon={ClipboardList} title="No diet plans assigned" />
              ) : (
                <View className="gap-2">
                  {diets.map((d) => (
                    <View key={d.id} style={{ backgroundColor: colors.secondary }} className="rounded-lg p-3">
                      <Text className="font-bold text-foreground">{d.templateId}</Text>
                    </View>
                  ))}
                </View>
              )}
            </CardContent>
          </Card>
        </View>
      )}
    </ScreenWrapper>
  );
}

function GymInfoCard({ info, colors }: { info: GymInfoDto | null; colors: any }) {
  const hours = Object.entries(info?.businessHours ?? {});
  return (
    <Card>
      <CardContent className="pt-4">
        <Text className="text-xs font-black uppercase tracking-[2px] text-primary">Gym Info</Text>
        <Text className="mt-1 text-xl font-black text-foreground">{info?.name ?? APP_NAME}</Text>
        <View className="mt-3 gap-2">
          <InfoLine icon={MapPin} value={info?.address || 'Address not set'} colors={colors} />
          <InfoLine
            icon={Phone}
            value={[info?.phone, info?.email].filter(Boolean).join(' · ') || 'Contact not set'}
            colors={colors}
          />
        </View>
        <View
          style={{ borderColor: colors.border, backgroundColor: colors.background }}
          className="mt-3 rounded-xl border p-3"
        >
          <View className="flex-row items-center gap-2 mb-2">
            <Clock3 size={16} color={colors.primary} />
            <Text className="text-sm font-bold text-foreground">Business Hours</Text>
          </View>
          <View className="gap-1">
            {hours.length === 0 ? (
              <Text className="text-xs font-semibold text-muted-foreground">Hours not set</Text>
            ) : null}
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

function InfoLine({ icon: Icon, value, colors }: { icon: any; value: string; colors: any }) {
  return (
    <View
      style={{ borderColor: colors.border, backgroundColor: colors.secondary }}
      className="flex-row gap-2 rounded-xl border p-3"
    >
      <Icon size={16} color={colors.primary} />
      <Text className="font-semibold text-sm text-muted-foreground flex-1" numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text className="text-xs font-semibold uppercase text-muted-foreground">{label}</Text>
      <Text className="mt-0.5 font-bold text-foreground" numberOfLines={2}>{value}</Text>
    </View>
  );
}

function membershipState(subscription: MembershipSubscriptionDto | null): {
  status: 'ACTIVE' | 'EXPIRED' | 'EXPIRING_SOON';
  daysRemaining: number;
} {
  if (!subscription) return { status: 'EXPIRED', daysRemaining: 0 };
  const daysRemaining = Math.ceil(
    (new Date(subscription.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
  if (daysRemaining < 0 || subscription.status === 'EXPIRED')
    return { status: 'EXPIRED', daysRemaining };
  if (daysRemaining <= 7) return { status: 'EXPIRING_SOON', daysRemaining };
  return { status: 'ACTIVE', daysRemaining };
}
