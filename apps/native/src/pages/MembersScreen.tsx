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
import { useAppSelector } from '../store/hooks';
import * as memberApi from '../features/members/memberApi';
import * as membershipApi from '../features/memberships/membershipApi';
import * as paymentApi from '../features/payments/paymentApi';
import * as staffApi from '../features/staff/staffApi';
import { requestSecurityDisable } from '../features/auth/authApi';
import type {
  MemberDto,
  MemberWorkoutPlanDto,
  MemberDietPlanDto,
  MembershipSubscriptionDto,
  InvoiceDto,
  PaymentDto,
  MemberLoginSetupDto
} from '@gym/shared';
import { formatDateTime, formatCents } from '../utils/format';
import { MemberFormModal } from '../components/forms/MemberFormModal';
import { MemberLoginModal } from '../components/forms/MemberLoginModal';
import { ShieldOff, ShieldCheck, Archive, RotateCcw, WalletCards } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';

export function MembersScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const currentUser = useAppSelector((state) => state.auth.user);
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';
  const isStaff = currentUser?.role === 'STAFF';
  const canManageLifecycle = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'STAFF';

  const [members, setMembers] = useState<MemberDto[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberDto | null>(null);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingMember, setEditingMember] = useState<MemberDto | null>(null);

  // New states for extended details
  const [detailTab, setDetailTab] = useState<'profile' | 'payments' | 'plans'>('profile');
  const [memberPayments, setMemberPayments] = useState<PaymentDto[]>([]);
  const [memberWorkouts, setMemberWorkouts] = useState<MemberWorkoutPlanDto[]>([]);
  const [memberDiets, setMemberDiets] = useState<MemberDietPlanDto[]>([]);
  const [memberSubscriptions, setMemberSubscriptions] = useState<MembershipSubscriptionDto[]>([]);
  const [memberInvoices, setMemberInvoices] = useState<InvoiceDto[]>([]);
  const [qrPayload, setQrPayload] = useState<string | null>(null);
  const [loginSetup, setLoginSetup] = useState<MemberLoginSetupDto | null>(null);

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

  const handleAction = async (action: 'suspend' | 'restore' | 'archive') => {
    if (!selectedMember) return;
    try {
      if (action === 'suspend') {
        await memberApi.suspendMember(selectedMember.id, 'Suspended by admin via app');
        Toast.show({ type: 'success', text1: 'Member suspended' });
      } else if (action === 'restore') {
        await memberApi.restoreMember(selectedMember.id);
        Toast.show({ type: 'success', text1: 'Member restored' });
      } else if (action === 'archive') {
        await memberApi.archiveMember(selectedMember.id);
        Toast.show({ type: 'success', text1: 'Member archived' });
      }
      setSelectedMember(null);
      void loadMembers();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: error.message || 'Action failed' });
    }
  };

  const selectMember = async (member: MemberDto) => {
    setSelectedMember(member);
    setDetailTab('profile');
    setMemberPayments([]);
    setMemberWorkouts([]);
    setMemberDiets([]);
    setMemberSubscriptions([]);
    setMemberInvoices([]);
    setQrPayload(null);
    try {
      const [qr, payments, workouts, diets, subscriptions, invoices] = await Promise.all([
        memberApi.getMemberQr(member.id).catch(() => null),
        paymentApi.listMemberPayments(member.id).catch(() => []),
        staffApi.listMemberWorkouts(member.id).catch(() => []),
        staffApi.listMemberDiets(member.id).catch(() => []),
        membershipApi.listMemberSubscriptions(member.id).catch(() => []),
        paymentApi.listMemberInvoices(member.id).catch(() => []),
      ]);
      setMemberPayments(payments);
      setMemberWorkouts(workouts);
      setMemberDiets(diets);
      setMemberSubscriptions(subscriptions);
      setMemberInvoices(invoices);
      if (qr) setQrPayload(qr.qrPayload);
    } catch {
      setQrPayload(null);
    }
  };

  const regenerateQr = async () => {
    if (!selectedMember) return;
    try {
      const qr = await memberApi.regenerateMemberQr(selectedMember.id);
      Toast.show({ type: 'success', text1: 'QR regenerated' });
      setQrPayload(qr.qrPayload);
    } catch {
      Toast.show({ type: 'error', text1: 'Could not regenerate QR' });
    }
  };

  const createLogin = async () => {
    if (!selectedMember) return;
    try {
      const login = await memberApi.createMemberLogin(selectedMember.id);
      Toast.show({ type: 'success', text1: login.regenerated ? 'Member login regenerated' : 'Member login created' });
      setLoginSetup(login);
      setSelectedMember(login.member);
      await loadMembers();
    } catch {
      Toast.show({ type: 'error', text1: 'Could not create member login' });
    }
  };

  const disableSecurity = async () => {
    if (!selectedMember?.userId) return;
    try {
      await requestSecurityDisable(selectedMember.userId);
      Toast.show({ type: 'success', text1: 'Security disable requested successfully' });
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to request security disable' });
    }
  };

  return (
    <ScreenWrapper refreshing={isLoading} onRefresh={loadMembers}>
      {/* Embedded search header */}
      <View className="mb-6 rounded-xl border border-border bg-card px-4 py-4">
        <View className="flex-row justify-between items-start mb-1">
          <Text className="text-xs font-black uppercase tracking-[0.18em] text-primary">
            Management
          </Text>
          <Button variant="primary" size="sm" onPress={() => { setEditingMember(null); setIsFormVisible(true); }}>
            <Text className="text-white font-bold">+ Member</Text>
          </Button>
        </View>
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
                  onPress={() => void selectMember(member)}
                  className={`flex-row justify-between items-center px-4 py-3 ${index !== members.length - 1 ? 'border-b border-border' : ''
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
                      {member.notices && member.notices.length > 0 && (
                        <View className="flex-row mt-1 gap-1">
                          {member.notices.map(n => (
                            <View key={n} style={{ backgroundColor: colors.destructiveSoft }} className="px-1.5 py-0.5 rounded">
                              <Text style={{ color: colors.destructive }} className="text-[10px] font-bold uppercase">{n.replace('_', ' ')}</Text>
                            </View>
                          ))}
                        </View>
                      )}
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
                <Text style={{ color: colors.foreground }} className="text-xl font-black">Member Details</Text>
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
                  <Text style={{ color: colors.foreground }} className="text-2xl font-black">
                    {selectedMember.firstName} {selectedMember.lastName}
                  </Text>
                  <Text style={{ color: colors.primary }} className="font-bold mt-1">
                    {selectedMember.memberCode}
                    {selectedMember.streakDays ? ` · 🔥 ${selectedMember.streakDays} Day Streak` : ''}
                  </Text>
                  <View className="flex-row gap-2 mt-2 items-center">
                    <StatusBadge status={selectedMember.status} />
                    {selectedMember.notices?.map(n => (
                      <View key={n} style={{ backgroundColor: colors.destructiveSoft }} className="px-2 py-0.5 rounded items-center justify-center">
                        <Text style={{ color: colors.destructive }} className="text-[10px] font-bold uppercase">{n.replace('_', ' ')}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Tabs */}
                <View className="flex-row rounded-md border p-1 mb-6" style={{ borderColor: colors.border, backgroundColor: colors.background }}>
                  {(['profile', 'payments', 'plans'] as const).map((tab) => (
                    <TouchableOpacity
                      key={tab}
                      style={{ flex: 1, backgroundColor: detailTab === tab ? colors.card : 'transparent' }}
                      className="py-2 rounded px-2 items-center"
                      onPress={() => setDetailTab(tab)}
                    >
                      <Text style={{ color: detailTab === tab ? colors.primary : colors.mutedForeground }} className="font-bold capitalize text-sm">
                        {tab}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {detailTab === 'profile' && (
                  <View className="gap-4">
                    {/* Active Subscription Summary (if any) */}
                    {memberSubscriptions.length > 0 && (
                      <View style={{ backgroundColor: colors.background, borderColor: colors.border }} className="p-4 rounded-lg border mb-2">
                        <View className="flex-row items-center gap-2 mb-2">
                          <WalletCards size={16} color={colors.primary} />
                          <Text style={{ color: colors.primary }} className="text-xs font-black uppercase tracking-widest">
                            Current Membership
                          </Text>
                        </View>
                        <Text style={{ color: colors.foreground }} className="font-semibold mb-1">
                          {memberSubscriptions[0].planName}
                        </Text>
                        <Text style={{ color: colors.mutedForeground }} className="text-sm">
                          Expires {formatDateTime(memberSubscriptions[0].endDate)}
                        </Text>
                      </View>
                    )}

                    {/* Info card */}
                    <Card>
                      <CardContent className="p-4 pt-4 gap-4">
                        <DetailRow label="Email" value={selectedMember.email || 'No email provided'} colors={colors} />
                        <View style={{ backgroundColor: colors.border }} className="h-px" />
                        <DetailRow label="Phone" value={selectedMember.phone} colors={colors} />
                        <View style={{ backgroundColor: colors.border }} className="h-px" />
                        <DetailRow label="Status" value={selectedMember.status} colors={colors} />
                        <View style={{ backgroundColor: colors.border }} className="h-px" />
                        <DetailRow label="Joined" value={formatDateTime(selectedMember.createdAt)} colors={colors} />
                        <View style={{ backgroundColor: colors.border }} className="h-px" />
                        <DetailRow label="Last Attendance" value={selectedMember.lastAttendanceDate ? formatDateTime(selectedMember.lastAttendanceDate) : 'Never'} colors={colors} />
                        <View style={{ backgroundColor: colors.border }} className="h-px" />
                        <DetailRow label="Streak" value={selectedMember.streakDays ? `${selectedMember.streakDays} Days` : 'None'} colors={colors} />
                      </CardContent>
                    </Card>

                    {/* QR Code display */}
                    {qrPayload && (
                      <View style={{ borderColor: colors.border, backgroundColor: colors.background }} className="rounded-lg border overflow-hidden mt-2">
                        <View style={{ backgroundColor: colors.card, borderBottomColor: colors.border }} className="p-3 border-b">
                          <Text style={{ color: colors.foreground }} className="text-xs font-black uppercase tracking-widest">Membership Card</Text>
                        </View>
                        <View className="p-4 items-center">
                          <View style={{ borderColor: colors.border, backgroundColor: colors.card }} className="p-4 rounded-md border items-center justify-center">
                            <QRCode
                              value={qrPayload}
                              size={150}
                              color={colors.primary}
                              backgroundColor={colors.card}
                            />
                          </View>
                          <Text style={{ color: colors.mutedForeground }} className="text-xs font-semibold uppercase mt-4 mb-1">QR payload</Text>
                          <View style={{ backgroundColor: colors.secondary }} className="rounded-md px-3 py-2 w-full">
                            <Text style={{ color: colors.mutedForeground }} className="font-semibold text-xs text-center" selectable={true}>{qrPayload}</Text>
                          </View>
                        </View>
                      </View>
                    )}
                  </View>
                )}

                {detailTab === 'payments' && (
                  <View className="gap-2">
                    {memberPayments.length === 0 ? (
                      <Text style={{ color: colors.mutedForeground }} className="text-sm text-center my-4">No payments found.</Text>
                    ) : (
                      memberPayments.map((payment) => (
                        <View key={payment.id} style={{ borderColor: colors.border, backgroundColor: colors.background }} className="rounded-md border p-3">
                          <View className="flex-row justify-between">
                            <Text style={{ color: colors.foreground }} className="font-bold">{formatCents(payment.amountCents)}</Text>
                            <Text style={{ color: colors.mutedForeground }} className="font-semibold">{payment.method}</Text>
                          </View>
                          <Text style={{ color: colors.mutedForeground }} className="text-xs mt-1">{formatDateTime(payment.createdAt)}</Text>
                        </View>
                      ))
                    )}
                  </View>
                )}

                {detailTab === 'plans' && (
                  <View className="gap-4">
                    <View style={{ borderColor: colors.border, backgroundColor: colors.background }} className="rounded-lg border p-3">
                      <Text style={{ color: colors.foreground }} className="mb-2 font-bold">Workout Plans</Text>
                      {memberWorkouts.length === 0 ? (
                        <Text style={{ color: colors.mutedForeground }} className="text-sm">No workout plans assigned.</Text>
                      ) : (
                        memberWorkouts.map((plan) => (
                          <View key={plan.id} style={{ borderColor: colors.border, backgroundColor: colors.card }} className="rounded-md border p-3 mb-2">
                            <Text style={{ color: colors.foreground }} className="font-semibold">Starts {plan.startDate.slice(0, 10)}</Text>
                            <Text style={{ color: colors.mutedForeground }} className="text-xs mt-1">{plan.exercises.length} exercises</Text>
                          </View>
                        ))
                      )}
                    </View>

                    <View style={{ borderColor: colors.border, backgroundColor: colors.background }} className="rounded-lg border p-3">
                      <Text style={{ color: colors.foreground }} className="mb-2 font-bold">Diet Plans</Text>
                      {memberDiets.length === 0 ? (
                        <Text style={{ color: colors.mutedForeground }} className="text-sm">No diet plans assigned.</Text>
                      ) : (
                        memberDiets.map((plan) => (
                          <View key={plan.id} style={{ borderColor: colors.border, backgroundColor: colors.card }} className="rounded-md border p-3 mb-2">
                            <Text style={{ color: colors.foreground }} className="font-semibold">Starts {plan.startDate.slice(0, 10)}</Text>
                            <Text style={{ color: colors.mutedForeground }} className="text-xs mt-1">{plan.meals.length} meals</Text>
                          </View>
                        ))
                      )}
                    </View>
                  </View>
                )}

                {/* Actions (always visible at bottom) */}
                {canManageLifecycle && (
                  <View style={{ borderColor: colors.border }} className="mt-6 pt-4 border-t gap-3">
                    <View className="flex-row flex-wrap gap-2">
                      <Button variant="outline" className="flex-1 min-w-[45%]" onPress={() => {
                        setSelectedMember(null);
                        setEditingMember(selectedMember);
                        setIsFormVisible(true);
                      }}>
                        <Text style={{ color: colors.foreground }} className="font-bold">Edit</Text>
                      </Button>

                      <Button variant="outline" className="flex-1 min-w-[45%]" onPress={regenerateQr}>
                        <RotateCcw size={16} color={colors.foreground} className="mr-2" />
                        <Text style={{ color: colors.foreground }} className="font-bold">Regen QR</Text>
                      </Button>

                      <Button variant="outline" className="flex-1 min-w-[45%]" onPress={createLogin}>
                        <UserRound size={16} color={colors.foreground} className="mr-2" />
                        <Text style={{ color: colors.foreground }} className="font-bold">
                          {selectedMember.userId ? 'Regen Login' : 'Create Login'}
                        </Text>
                      </Button>
                    </View>

                    {selectedMember.status === 'ACTIVE' ? (
                      <Button variant="outline" onPress={() => handleAction('suspend')}>
                        <ShieldOff size={16} color={colors.warning} className="mr-2" />
                        <Text style={{ color: colors.warning }} className="font-bold">Suspend Member</Text>
                      </Button>
                    ) : selectedMember.status === 'SUSPENDED' ? (
                      <Button variant="outline" onPress={() => handleAction('restore')}>
                        <ShieldCheck size={16} color={colors.success} className="mr-2" />
                        <Text style={{ color: colors.success }} className="font-bold">Restore Member</Text>
                      </Button>
                    ) : null}

                    {selectedMember.userId && isSuperAdmin && (
                      <Button variant="outline" onPress={disableSecurity} style={{ borderColor: colors.destructive + '40', backgroundColor: colors.destructive + '10' }}>
                        <ShieldOff size={16} color={colors.destructive} className="mr-2" />
                        <Text style={{ color: colors.destructive }} className="font-bold">Request 2FA Disable</Text>
                      </Button>
                    )}

                    <Button variant="outline" onPress={() => handleAction('archive')}>
                      <Archive size={16} color={colors.destructive} className="mr-2" />
                      <Text style={{ color: colors.destructive }} className="font-bold">Archive Member</Text>
                    </Button>
                  </View>
                )}
              </ScrollView>
            </View>
          )}
        </SafeAreaView>
      </Modal>

      <MemberFormModal
        visible={isFormVisible}
        member={editingMember}
        onClose={() => setIsFormVisible(false)}
        onSuccess={() => {
          setIsFormVisible(false);
          void loadMembers();
        }}
      />

      <MemberLoginModal
        login={loginSetup}
        onClose={() => setLoginSetup(null)}
      />
    </ScreenWrapper>
  );
}

function DetailRow({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View>
      <Text style={{ color: colors.mutedForeground }} className="text-xs font-bold uppercase mb-1">{label}</Text>
      <Text style={{ color: colors.foreground }} className="font-semibold">{value}</Text>
    </View>
  );
}
