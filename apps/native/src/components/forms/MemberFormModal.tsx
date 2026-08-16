import { useEffect, useState } from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChevronDown, X } from 'lucide-react-native';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useTheme } from '../../hooks/useTheme';
import type { MemberDto } from '@gym/shared';
import * as memberApi from '../../features/members/memberApi';
import Toast from 'react-native-toast-message';

// Common country phone prefixes
const PHONE_PREFIXES = ['+91', '+1', '+44', '+971', '+61', '+65', '+81', '+49', '+33', '+86'];

const formSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(80, 'Too long'),
  lastName: z.string().trim().min(1, 'Last name is required').max(80, 'Too long'),
  phonePrefix: z.string(),
  phone: z
    .string()
    .trim()
    .min(5, 'Phone number too short')
    .max(20, 'Phone number too long')
    .regex(/^\d[\d\s\-()]*$/, 'Enter digits only (spaces/dashes allowed)'),
  email: z.string().trim().email('Invalid email address').or(z.literal('')),
});

type MemberFormValues = z.infer<typeof formSchema>;

interface MemberFormModalProps {
  visible: boolean;
  member: MemberDto | null;
  onClose: () => void;
  onSuccess: () => void;
}

function extractPhoneNumber(fullPhone: string): { prefix: string; number: string } {
  const sorted = [...PHONE_PREFIXES].sort((a, b) => b.length - a.length);
  for (const p of sorted) {
    if (fullPhone.startsWith(p)) {
      return { prefix: p, number: fullPhone.slice(p.length).trim() };
    }
  }
  return { prefix: '+91', number: fullPhone };
}

/** Extract the most useful error string from an API error */
function parseApiError(error: any): string {
  const data = error?.response?.data;
  if (data?.message && typeof data.message === 'string') return data.message;
  if (Array.isArray(data?.message)) return data.message.join(', ');
  if (data?.error && typeof data.error === 'string') return data.error;
  if (error?.message && typeof error.message === 'string') return error.message;
  return 'An unexpected error occurred. Please try again.';
}

export function MemberFormModal({ visible, member, onClose, onSuccess }: MemberFormModalProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [prefixOpen, setPrefixOpen] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<MemberFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phonePrefix: '+91',
      phone: '',
      email: '',
    },
  });

  const selectedPrefix = watch('phonePrefix');

  useEffect(() => {
    if (visible) {
      if (member) {
        const { prefix, number } = extractPhoneNumber(member.phone ?? '');
        reset({
          firstName: member.firstName,
          lastName: member.lastName,
          phonePrefix: PHONE_PREFIXES.includes(prefix) ? prefix : '+91',
          phone: number,
          email: member.email || '',
        });
      } else {
        reset({ firstName: '', lastName: '', phonePrefix: '+91', phone: '', email: '' });
      }
    }
  }, [visible, member, reset]);

  const onSubmit = async (data: MemberFormValues) => {
    const fullPhone = `${data.phonePrefix}${data.phone}`;
    try {
      if (member) {
        await memberApi.updateMember(member.id, {
          firstName: data.firstName,
          lastName: data.lastName,
          phone: fullPhone,
          email: data.email || null,
        });
        Toast.show({ type: 'success', text1: 'Member updated successfully' });
      } else {
        await memberApi.createMember({
          firstName: data.firstName,
          lastName: data.lastName,
          phone: fullPhone,
          email: data.email || undefined,
        });
        Toast.show({ type: 'success', text1: 'Member created successfully' });
      }
      onSuccess();
    } catch (error: any) {
      const msg = parseApiError(error);
      Toast.show({
        type: 'error',
        text1: member ? 'Could not update member' : 'Could not create member',
        text2: msg,
        visibilityTime: 5000,
      });
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose} statusBarTranslucent>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={{ borderBottomColor: colors.border }} className="flex-row justify-between items-center px-4 py-3 border-b">
            <Text style={{ color: colors.foreground }} className="text-xl font-black">
              {member ? 'Edit Member' : 'Add Member'}
            </Text>
            <TouchableOpacity onPress={onClose} style={{ backgroundColor: colors.secondary }} className="p-2 rounded-full">
              <X size={18} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}>
            {/* First Name */}
            <View className="mb-4">
              <Controller
                control={control}
                name="firstName"
                render={({ field: { onChange, value } }) => (
                  <Input label="First Name" value={value} onChangeText={onChange} error={errors.firstName?.message} autoCapitalize="words" />
                )}
              />
            </View>

            {/* Last Name */}
            <View className="mb-4">
              <Controller
                control={control}
                name="lastName"
                render={({ field: { onChange, value } }) => (
                  <Input label="Last Name" value={value} onChangeText={onChange} error={errors.lastName?.message} autoCapitalize="words" />
                )}
              />
            </View>

            {/* Phone with prefix */}
            <View className="mb-4">
              <Text style={{ color: colors.mutedForeground }} className="mb-1.5 text-sm font-medium">Phone Number</Text>
              <View className="flex-row gap-2 items-start">
                {/* Prefix picker */}
                <TouchableOpacity
                  onPress={() => setPrefixOpen((v) => !v)}
                  style={{ backgroundColor: colors.secondary, borderColor: colors.border, borderWidth: 1, height: 48 }}
                  className="flex-row items-center rounded-lg px-3 gap-1 min-w-[80px]"
                >
                  <Text style={{ color: colors.foreground }} className="font-bold text-sm">{selectedPrefix}</Text>
                  <ChevronDown size={14} color={colors.mutedForeground} />
                </TouchableOpacity>

                {/* Number input */}
                <View className="flex-1">
                  <Controller
                    control={control}
                    name="phone"
                    render={({ field: { onChange, value } }) => (
                      <Input
                        value={value}
                        onChangeText={onChange}
                        error={errors.phone?.message}
                        keyboardType="phone-pad"
                        placeholder="9876543210"
                      />
                    )}
                  />
                </View>
              </View>

              {/* Prefix dropdown */}
              {prefixOpen && (
                <View style={{ borderColor: colors.border, backgroundColor: colors.card, borderWidth: 1 }} className="rounded-lg mt-1 overflow-hidden">
                  {PHONE_PREFIXES.map((p) => (
                    <TouchableOpacity
                      key={p}
                      onPress={() => { setValue('phonePrefix', p); setPrefixOpen(false); }}
                      style={{ borderBottomColor: colors.border }}
                      className="px-4 py-3 border-b"
                    >
                      <Text style={{ color: colors.foreground, fontWeight: selectedPrefix === p ? 'bold' : 'normal' }}>{p}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Email */}
            <View className="mb-4">
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, value } }) => (
                  <Input
                    label="Email (Optional)"
                    value={value}
                    onChangeText={onChange}
                    error={errors.email?.message}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                )}
              />
            </View>

            <View className="mt-4">
              <Button onPress={handleSubmit(onSubmit)} isLoading={isSubmitting}>
                <Text style={{ color: colors.primaryForeground }} className="font-bold">
                  {member ? 'Save Changes' : 'Create Member'}
                </Text>
              </Button>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
      {/* Toast inside modal so it renders on top on Android */}
      <Toast />
    </Modal>
  );
}
