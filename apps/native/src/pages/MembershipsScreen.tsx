import React, { useEffect, useState } from 'react';
import { View, Text, Alert, Switch, TouchableOpacity } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Search, UserRound } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { StatusBadge } from '../components/ui/StatusBadge';
import { EmptyState } from '../components/ui/EmptyState';
import { ScreenWrapper, PageHeader } from '../components/layout/ScreenWrapper';
import { useTheme } from '../hooks/useTheme';
import * as memberApi from '../features/members/memberApi';
import * as membershipApi from '../features/memberships/membershipApi';
import * as paymentApi from '../features/payments/paymentApi';
import { getApiErrorMessage } from '../utils/apiError';
import { formatCents } from '../utils/format';
import type { InvoiceDto, MemberDto, MembershipPlanDto, MembershipSubscriptionDto } from '@gym/shared';

const planSchema = z.object({
  name: z.string().trim().min(1, 'Required'),
  durationDays: z.coerce.number().int().positive(),
  priceCents: z.coerce.number().int().nonnegative(),
  ptIncluded: z.boolean(),
  lockerIncluded: z.boolean(),
  guestPassesIncluded: z.coerce.number().int().nonnegative(),
  accessTiming: z.string().trim(),
  gracePeriodDays: z.coerce.number().int().nonnegative(),
  freezeAllowed: z.boolean(),
});

const assignSchema = z.object({
  memberId: z.string().trim().min(1, 'Required'),
  planId: z.string().trim().min(1, 'Required'),
  startDate: z.string(),
});

type PlanFormValues = z.infer<typeof planSchema>;
type AssignFormValues = z.infer<typeof assignSchema>;

const TOGGLE_LABELS: Record<string, string> = {
  ptIncluded: 'PT Included',
  lockerIncluded: 'Locker Included',
  freezeAllowed: 'Freeze Allowed',
};

export function MembershipsScreen() {
  const { colors } = useTheme();

  const [plans, setPlans] = useState<MembershipPlanDto[]>([]);
  const [subscriptions, setSubscriptions] = useState<MembershipSubscriptionDto[]>([]);
  const [invoices, setInvoices] = useState<InvoiceDto[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [memberResults, setMemberResults] = useState<MemberDto[]>([]);
  const [selectedMember, setSelectedMember] = useState<MemberDto | null>(null);
  const [editingPlan, setEditingPlan] = useState<MembershipPlanDto | null>(null);

  const planForm = useForm<PlanFormValues>({
    resolver: zodResolver(planSchema) as any,
    defaultValues: {
      name: '',
      durationDays: 30,
      priceCents: 0,
      ptIncluded: false,
      lockerIncluded: false,
      guestPassesIncluded: 0,
      accessTiming: '',
      gracePeriodDays: 0,
      freezeAllowed: false,
    },
  });

  const assignForm = useForm<AssignFormValues>({
    resolver: zodResolver(assignSchema),
    defaultValues: { memberId: '', planId: '', startDate: '' },
  });

  const loadPlans = async (): Promise<void> => {
    try {
      setPlans(await membershipApi.listMembershipPlans(true));
    } catch {
      Toast.show({ type: 'error', text1: 'Could not load membership plans' });
    }
  };

  useEffect(() => {
    void loadPlans();
  }, []);

  useEffect(() => {
    const query = memberSearch.trim();
    if (query.length < 2) {
      setMemberResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const result = await memberApi.listMembers({ page: 1, pageSize: 8, search: query });
        setMemberResults(result.data);
      } catch {
        Toast.show({ type: 'error', text1: 'Could not search members' });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [memberSearch]);

  const createPlan = async (values: PlanFormValues): Promise<void> => {
    try {
      const payload = { ...values, ...(values.accessTiming ? { accessTiming: values.accessTiming } : {}) };
      if (editingPlan) {
        await membershipApi.updateMembershipPlan(editingPlan.id, payload);
      } else {
        await membershipApi.createMembershipPlan(payload);
      }
      setEditingPlan(null);
      planForm.reset();
      Toast.show({ type: 'success', text1: editingPlan ? 'Plan updated' : 'Plan created' });
      await loadPlans();
    } catch {
      Toast.show({ type: 'error', text1: editingPlan ? 'Could not update plan' : 'Could not create plan' });
    }
  };

  const editPlan = (plan: MembershipPlanDto): void => {
    setEditingPlan(plan);
    planForm.reset({
      name: plan.name,
      durationDays: plan.durationDays,
      priceCents: plan.priceCents,
      ptIncluded: plan.ptIncluded,
      lockerIncluded: plan.lockerIncluded,
      guestPassesIncluded: plan.guestPassesIncluded,
      accessTiming: plan.accessTiming ?? '',
      gracePeriodDays: plan.gracePeriodDays,
      freezeAllowed: plan.freezeAllowed,
    });
  };

  const deactivatePlan = (id: string): void => {
    Alert.alert('Deactivate Plan', 'Are you sure you want to deactivate this plan?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Deactivate', style: 'destructive', onPress: async () => {
          try {
            await membershipApi.deactivateMembershipPlan(id);
            Toast.show({ type: 'success', text1: 'Plan deactivated' });
            await loadPlans();
          } catch {
            Toast.show({ type: 'error', text1: 'Could not deactivate plan' });
          }
        },
      },
    ]);
  };

  const selectMemberForAssignment = (member: MemberDto): void => {
    setSelectedMember(member);
    setMemberSearch(`${member.firstName} ${member.lastName}`);
    setMemberResults([]);
    assignForm.setValue('memberId', member.id, { shouldValidate: true });
    void loadMemberSubscriptionSnapshot(member.id);
  };

  const loadMemberSubscriptionSnapshot = async (memberId: string): Promise<void> => {
    try {
      const [subscriptionRows, invoiceRows] = await Promise.all([
        membershipApi.listMemberSubscriptions(memberId),
        paymentApi.listMemberInvoices(memberId),
      ]);
      setSubscriptions(subscriptionRows);
      setInvoices(invoiceRows);
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Could not load member details', text2: getApiErrorMessage(error, 'Error') });
    }
  };

  const assignSubscription = async (values: AssignFormValues): Promise<void> => {
    try {
      await membershipApi.assignSubscription(values.memberId, values.planId, values.startDate || undefined);
      await loadMemberSubscriptionSnapshot(values.memberId);
      Toast.show({ type: 'success', text1: 'Subscription assigned' });
      assignForm.reset({ memberId: '', planId: '', startDate: '' });
      setMemberSearch('');
      setMemberResults([]);
      setSelectedMember(null);
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Could not assign subscription', text2: getApiErrorMessage(error, 'Error') });
    }
  };

  return (
    <ScreenWrapper>
      <PageHeader
        label="Plan Control"
        title="Memberships"
        subtitle="Create plans, assign subscriptions, and review member history."
      />

      {/* Plans list */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Active Plans</CardTitle>
        </CardHeader>
        {plans.length === 0 ? (
          <CardContent>
            <EmptyState title="No plans yet" description="Create your first membership plan below." />
          </CardContent>
        ) : (
          <View className="px-4 pb-4">
            {plans.map((plan, index) => (
              <View
                key={plan.id}
                className={`py-3 ${index !== plans.length - 1 ? 'border-b border-border' : ''}`}
              >
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-1 mr-3">
                    <Text className="font-bold text-foreground">{plan.name}</Text>
                    <Text className="text-sm text-muted-foreground mt-0.5">
                      {plan.durationDays} days · {formatCents(plan.priceCents)}
                    </Text>
                  </View>
                  <StatusBadge status={plan.isActive ? 'ACTIVE' : 'CANCELLED'} />
                </View>
                <View className="flex-row gap-2">
                  <Button variant="secondary" onPress={() => editPlan(plan)} size="sm">
                    Edit
                  </Button>
                  {plan.isActive && (
                    <Button variant="secondary" onPress={() => deactivatePlan(plan.id)} size="sm">
                      Deactivate
                    </Button>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </Card>

      {/* Create/Edit plan form */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>{editingPlan ? 'Edit Plan' : 'New Plan'}</CardTitle>
        </CardHeader>
        <CardContent>
          <Controller
            control={planForm.control}
            name="name"
            render={({ field: { onChange, value } }) => (
              <Input label="Plan name" value={value} onChangeText={onChange} error={planForm.formState.errors.name?.message} />
            )}
          />
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Controller
                control={planForm.control}
                name="durationDays"
                render={({ field: { onChange, value } }) => (
                  <Input label="Duration (days)" keyboardType="numeric" value={String(value)} onChangeText={(v) => onChange(Number(v))} error={planForm.formState.errors.durationDays?.message} />
                )}
              />
            </View>
            <View className="flex-1">
              <Controller
                control={planForm.control}
                name="priceCents"
                render={({ field: { onChange, value } }) => (
                  <Input label="Price (cents)" keyboardType="numeric" value={String(value)} onChangeText={(v) => onChange(Number(v))} error={planForm.formState.errors.priceCents?.message} />
                )}
              />
            </View>
          </View>

          <Controller
            control={planForm.control}
            name="accessTiming"
            render={({ field: { onChange, value } }) => (
              <Input label="Access timing" value={value} onChangeText={onChange} />
            )}
          />

          <View className="flex-row gap-3">
            <View className="flex-1">
              <Controller
                control={planForm.control}
                name="guestPassesIncluded"
                render={({ field: { onChange, value } }) => (
                  <Input label="Guest passes" keyboardType="numeric" value={String(value)} onChangeText={(v) => onChange(Number(v))} />
                )}
              />
            </View>
            <View className="flex-1">
              <Controller
                control={planForm.control}
                name="gracePeriodDays"
                render={({ field: { onChange, value } }) => (
                  <Input label="Grace days" keyboardType="numeric" value={String(value)} onChangeText={(v) => onChange(Number(v))} />
                )}
              />
            </View>
          </View>

          {/* Toggle rows */}
          {(['ptIncluded', 'lockerIncluded', 'freezeAllowed'] as const).map((fieldName) => (
            <View key={fieldName} className="flex-row items-center justify-between mb-4">
              <Text className="text-sm font-semibold text-foreground">
                {TOGGLE_LABELS[fieldName]}
              </Text>
              <Controller
                control={planForm.control}
                name={fieldName}
                render={({ field: { onChange, value } }) => (
                  <Switch
                    value={value}
                    onValueChange={onChange}
                    trackColor={{ true: colors.primary, false: colors.border }}
                    thumbColor={value ? colors.primaryForeground : colors.mutedForeground}
                  />
                )}
              />
            </View>
          ))}

          <Button onPress={planForm.handleSubmit(createPlan as any)}>
            {editingPlan ? 'Save Plan' : 'Create Plan'}
          </Button>
          {editingPlan && (
            <Button
              variant="ghost"
              onPress={() => { setEditingPlan(null); planForm.reset(); }}
              className="mt-2"
            >
              Cancel Edit
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Assign subscription */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Assign Subscription</CardTitle>
        </CardHeader>
        <CardContent>
          <Text className="mb-2 text-sm font-medium text-foreground">Search member</Text>
          <Input
            placeholder="Search by name, member ID..."
            value={memberSearch}
            onChangeText={(text) => {
              setMemberSearch(text);
              setSelectedMember(null);
              assignForm.setValue('memberId', '', { shouldValidate: true });
            }}
            leftIcon={<Search size={16} color={colors.mutedForeground} />}
          />

          {/* Dropdown results — rendered below without absolute positioning */}
          {memberSearch.trim().length >= 2 && memberResults.length > 0 && (
            <View
              style={{ borderColor: colors.border, backgroundColor: colors.background }}
              className="rounded-xl border mb-3 overflow-hidden"
            >
              {memberResults.map((member, index) => (
                <TouchableOpacity
                  key={member.id}
                  className={`flex-row items-center gap-3 px-3 py-3 ${index !== memberResults.length - 1 ? 'border-b border-border' : ''}`}
                  onPress={() => selectMemberForAssignment(member)}
                  activeOpacity={0.7}
                >
                  <View
                    style={{ backgroundColor: colors.primarySoft }}
                    className="h-9 w-9 items-center justify-center rounded-full"
                  >
                    <UserRound size={16} color={colors.primary} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-foreground">
                      {member.firstName} {member.lastName}
                    </Text>
                    <Text className="text-xs font-semibold text-muted-foreground">
                      {member.memberCode} · {member.phone}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Selected member chip */}
          {selectedMember && (
            <View
              style={{ borderColor: `${colors.primary}40`, backgroundColor: colors.secondary }}
              className="flex-row items-center gap-3 rounded-xl border p-3 mb-4"
            >
              <View
                style={{ backgroundColor: colors.primarySoft }}
                className="h-10 w-10 items-center justify-center rounded-full"
              >
                <UserRound size={20} color={colors.primary} />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-black text-foreground">
                  {selectedMember.firstName} {selectedMember.lastName}
                </Text>
                <Text className="text-xs font-semibold text-muted-foreground">
                  {selectedMember.memberCode} · {selectedMember.phone}
                </Text>
              </View>
            </View>
          )}

          <Controller
            control={assignForm.control}
            name="startDate"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Start date (YYYY-MM-DD)"
                value={value}
                onChangeText={onChange}
                error={assignForm.formState.errors.startDate?.message}
              />
            )}
          />

          <Button onPress={assignForm.handleSubmit(assignSubscription as any)}>
            Assign Subscription
          </Button>
        </CardContent>
      </Card>
    </ScreenWrapper>
  );
}
