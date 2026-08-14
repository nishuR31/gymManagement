import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Alert, Switch, TouchableOpacity } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertTriangle, Search, UserRound, X } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { StatusBadge } from '../components/ui/StatusBadge';
import { EmptyState } from '../components/ui/EmptyState';
import * as memberApi from '../features/members/memberApi';
import * as membershipApi from '../features/memberships/membershipApi';
import * as paymentApi from '../features/payments/paymentApi';
import { getApiErrorMessage } from '../utils/apiError';
import { formatCents } from '../utils/format';
import type { InvoiceDto, MemberDto, MembershipPlanDto, MembershipSubscriptionDto } from '@gym/shared';
import { useAppSelector } from '../store/hooks';
import { themeColors } from '../constants/colors';

const planSchema = z.object({
  name: z.string().trim().min(1, 'Required'),
  durationDays: z.coerce.number().int().positive(),
  priceCents: z.coerce.number().int().nonnegative(),
  ptIncluded: z.boolean(),
  lockerIncluded: z.boolean(),
  guestPassesIncluded: z.coerce.number().int().nonnegative(),
  accessTiming: z.string().trim(),
  gracePeriodDays: z.coerce.number().int().nonnegative(),
  freezeAllowed: z.boolean()
});

const assignSchema = z.object({
  memberId: z.string().trim().min(1, 'Required'),
  planId: z.string().trim().min(1, 'Required'),
  startDate: z.string()
});

type PlanFormValues = z.infer<typeof planSchema>;
type AssignFormValues = z.infer<typeof assignSchema>;

export function MembershipsScreen() {
  const theme = useAppSelector((state) => state.theme.theme);
  const activeColors = themeColors[theme === 'dark' ? 'dark' : 'light'];

  const [plans, setPlans] = useState<MembershipPlanDto[]>([]);
  const [subscriptions, setSubscriptions] = useState<MembershipSubscriptionDto[]>([]);
  const [invoices, setInvoices] = useState<InvoiceDto[]>([]);
  const [lastMemberId, setLastMemberId] = useState('');
  const [lastMemberLabel, setLastMemberLabel] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [memberResults, setMemberResults] = useState<MemberDto[]>([]);
  const [selectedMember, setSelectedMember] = useState<MemberDto | null>(null);
  const [isSearchingMembers, setIsSearchingMembers] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MembershipPlanDto | null>(null);

  const planForm = useForm<PlanFormValues>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      name: '',
      durationDays: 30,
      priceCents: 0,
      ptIncluded: false,
      lockerIncluded: false,
      guestPassesIncluded: 0,
      accessTiming: '',
      gracePeriodDays: 0,
      freezeAllowed: false
    }
  });

  const assignForm = useForm<AssignFormValues>({
    resolver: zodResolver(assignSchema),
    defaultValues: {
      memberId: '',
      planId: '',
      startDate: ''
    }
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
      setIsSearchingMembers(false);
      return;
    }

    const timer = setTimeout(() => {
      void searchMembers(query);
    }, 250);

    return () => clearTimeout(timer);
  }, [memberSearch]);

  const searchMembers = async (query: string): Promise<void> => {
    setIsSearchingMembers(true);
    try {
      const result = await memberApi.listMembers({ page: 1, pageSize: 8, search: query });
      setMemberResults(result.data);
    } catch {
      Toast.show({ type: 'error', text1: 'Could not search members' });
    } finally {
      setIsSearchingMembers(false);
    }
  };

  const createPlan = async (values: PlanFormValues): Promise<void> => {
    try {
      const payload = {
        ...values,
        ...(values.accessTiming ? { accessTiming: values.accessTiming } : {})
      };
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
      freezeAllowed: plan.freezeAllowed
    });
  };

  const deactivatePlan = (id: string): void => {
    Alert.alert('Deactivate Plan', 'Are you sure you want to deactivate this plan?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Deactivate', style: 'destructive', onPress: async () => {
        try {
          await membershipApi.deactivateMembershipPlan(id);
          Toast.show({ type: 'success', text1: 'Plan deactivated' });
          await loadPlans();
        } catch {
          Toast.show({ type: 'error', text1: 'Could not deactivate plan' });
        }
      }}
    ]);
  };

  const assignSubscription = async (values: AssignFormValues): Promise<void> => {
    try {
      await membershipApi.assignSubscription(values.memberId, values.planId, values.startDate || undefined);
      setLastMemberId(values.memberId);
      setLastMemberLabel(selectedMember ? `${selectedMember.firstName} ${selectedMember.lastName} (${selectedMember.memberCode})` : 'Selected member');
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

  const selectMemberForAssignment = (member: MemberDto): void => {
    setSelectedMember(member);
    setMemberSearch(`${member.firstName} ${member.lastName}`);
    setMemberResults([]);
    setLastMemberId(member.id);
    setLastMemberLabel(`${member.firstName} ${member.lastName} (${member.memberCode})`);
    assignForm.setValue('memberId', member.id, { shouldValidate: true });
    void loadMemberSubscriptionSnapshot(member.id);
  };

  const loadMemberSubscriptionSnapshot = async (memberId: string): Promise<void> => {
    try {
      const [subscriptionRows, invoiceRows] = await Promise.all([
        membershipApi.listMemberSubscriptions(memberId),
        paymentApi.listMemberInvoices(memberId)
      ]);
      setSubscriptions(subscriptionRows);
      setInvoices(invoiceRows);
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Could not load member subscription details', text2: getApiErrorMessage(error, 'Error') });
    }
  };

  const cancelSubscription = (subscription: MembershipSubscriptionDto): void => {
    Alert.alert('Cancel Subscription', 'Cancel this member subscription? Any open invoice for this subscription will also be cancelled.', [
      { text: 'No', style: 'cancel' },
      { text: 'Yes, Cancel', style: 'destructive', onPress: async () => {
        try {
          await membershipApi.cancelSubscription(subscription.memberId, subscription.id);
          await loadMemberSubscriptionSnapshot(subscription.memberId);
          Toast.show({ type: 'success', text1: 'Subscription cancelled' });
        } catch (error) {
          Toast.show({ type: 'error', text1: 'Could not cancel subscription', text2: getApiErrorMessage(error, 'Error') });
        }
      }}
    ]);
  };

  const currentSubscription = subscriptions.find((s) => s.status === 'ACTIVE' || s.status === 'FROZEN') ?? null;
  const currentInvoice = currentSubscription ? invoices.find((invoice) => invoice.subscriptionId === currentSubscription.id) ?? null : null;

  return (
    <ScrollView className="flex-1 bg-background p-4">
      <Card className="mb-6">
        <CardContent className="pt-6">
          <Text className="text-xs font-black uppercase tracking-[2px] text-primary">Plan Control</Text>
          <Text className="mt-2 text-3xl font-black text-foreground">Memberships</Text>
          <Text className="mt-1 text-sm font-semibold text-muted-foreground">Create plans, assign subscriptions, and review member history.</Text>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Plans</CardTitle>
        </CardHeader>
        <View className="px-4 pb-4">
          {plans.map((plan) => (
            <View key={plan.id} className="flex-row items-center justify-between py-3 border-b border-border">
              <View className="flex-1">
                <Text className="font-bold text-foreground">{plan.name}</Text>
                <Text className="text-sm text-muted-foreground">
                  <Text className="font-bold">{plan.durationDays}</Text> days · <Text className="font-bold">{formatCents(plan.priceCents)}</Text>
                </Text>
              </View>
              <View className="flex-row items-center gap-2">
                <StatusBadge status={plan.isActive ? 'ACTIVE' : 'CANCELLED'} />
                <Button variant="secondary" onPress={() => editPlan(plan)} className="px-3 h-9">
                  Edit
                </Button>
                {plan.isActive ? (
                  <Button variant="secondary" onPress={() => deactivatePlan(plan.id)} className="px-3 h-9">
                    Deactivate
                  </Button>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{editingPlan ? 'Edit Plan' : 'New Plan'}</CardTitle>
        </CardHeader>
        <CardContent>
          <Controller control={planForm.control} name="name" render={({ field: { onChange, value } }) => (
            <Input label="Name" value={value} onChangeText={onChange} error={planForm.formState.errors.name?.message} />
          )} />
          <View className="flex-row gap-4 mb-4">
            <View className="flex-1">
              <Controller control={planForm.control} name="durationDays" render={({ field: { onChange, value } }) => (
                <Input label="Duration days" keyboardType="numeric" value={String(value)} onChangeText={(v) => onChange(Number(v))} error={planForm.formState.errors.durationDays?.message} />
              )} />
            </View>
            <View className="flex-1">
              <Controller control={planForm.control} name="priceCents" render={({ field: { onChange, value } }) => (
                <Input label="Price cents" keyboardType="numeric" value={String(value)} onChangeText={(v) => onChange(Number(v))} error={planForm.formState.errors.priceCents?.message} />
              )} />
            </View>
          </View>
          
          <Controller control={planForm.control} name="accessTiming" render={({ field: { onChange, value } }) => (
            <Input label="Access timing" value={value} onChangeText={onChange} error={planForm.formState.errors.accessTiming?.message} />
          )} />

          <View className="flex-row gap-4 mb-4">
            <View className="flex-1">
              <Controller control={planForm.control} name="guestPassesIncluded" render={({ field: { onChange, value } }) => (
                <Input label="Guest passes" keyboardType="numeric" value={String(value)} onChangeText={(v) => onChange(Number(v))} error={planForm.formState.errors.guestPassesIncluded?.message} />
              )} />
            </View>
            <View className="flex-1">
              <Controller control={planForm.control} name="gracePeriodDays" render={({ field: { onChange, value } }) => (
                <Input label="Grace days" keyboardType="numeric" value={String(value)} onChangeText={(v) => onChange(Number(v))} error={planForm.formState.errors.gracePeriodDays?.message} />
              )} />
            </View>
          </View>
          
          {['ptIncluded', 'lockerIncluded', 'freezeAllowed'].map((fieldName) => (
            <View key={fieldName} className="flex-row items-center justify-between mb-4">
              <Text className="text-sm font-semibold text-muted-foreground capitalize">
                {fieldName.replace(/([A-Z])/g, ' $1')}
              </Text>
              <Controller control={planForm.control} name={fieldName as any} render={({ field: { onChange, value } }) => (
                <Switch value={value as boolean} onValueChange={onChange} trackColor={{ true: activeColors.primary, false: activeColors.border }} />
              )} />
            </View>
          ))}
          
          <Button onPress={planForm.handleSubmit(createPlan as any)}>
            {editingPlan ? 'Save Plan' : 'Create Plan'}
          </Button>
          {editingPlan && (
            <Button variant="ghost" onPress={() => { setEditingPlan(null); planForm.reset(); }} className="mt-2">
              Cancel Edit
            </Button>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Assign Subscription</CardTitle>
        </CardHeader>
        <CardContent>
          <View className="mb-4">
            <Text className="mb-2 text-sm font-medium text-foreground">Search member</Text>
            <View className="relative">
              <Search className="absolute left-3 top-3 z-10" size={16} color={activeColors.mutedForeground} />
              <Input
                placeholder="Search by name, member ID..."
                className="pl-9"
                value={memberSearch}
                onChangeText={(text) => {
                  setMemberSearch(text);
                  setSelectedMember(null);
                  assignForm.setValue('memberId', '', { shouldValidate: true });
                }}
              />
            </View>
            
            {memberSearch.trim().length >= 2 && memberResults.length > 0 && (
              <View className="max-h-64 rounded-md border border-border bg-background shadow-sm mb-4">
                {memberResults.map((member) => (
                  <TouchableOpacity
                    key={member.id}
                    className="flex-row items-center gap-3 border-b border-border px-3 py-3"
                    onPress={() => selectMemberForAssignment(member)}
                  >
                    <View className="h-9 w-9 items-center justify-center rounded-full bg-secondary">
                      <UserRound size={16} color={activeColors.primary} />
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-bold text-foreground">{member.firstName} {member.lastName}</Text>
                      <Text className="text-xs font-semibold text-muted-foreground">{member.memberCode} · {member.phone}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {selectedMember && (
              <View className="flex-row items-center gap-3 rounded-md border border-primary/40 bg-secondary p-3 mb-4">
                <View className="h-10 w-10 items-center justify-center rounded-full bg-background">
                  <UserRound size={20} color={activeColors.primary} />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-black text-foreground">{selectedMember.firstName} {selectedMember.lastName}</Text>
                  <Text className="text-xs font-semibold text-muted-foreground">{selectedMember.memberCode} · {selectedMember.phone}</Text>
                </View>
              </View>
            )}
          </View>
          
          <Controller control={assignForm.control} name="startDate" render={({ field: { onChange, value } }) => (
            <Input label="Start date (YYYY-MM-DD)" value={value} onChangeText={onChange} error={assignForm.formState.errors.startDate?.message} />
          )} />
          
          <Button onPress={assignForm.handleSubmit(assignSubscription as any)}>
            Assign
          </Button>
        </CardContent>
      </Card>

      <View className="h-12" />
    </ScrollView>
  );
}
