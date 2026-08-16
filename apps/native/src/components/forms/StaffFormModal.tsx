import { useEffect, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChevronDown, X } from 'lucide-react-native';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useTheme } from '../../hooks/useTheme';
import * as staffApi from '../../features/staff/staffApi';
import type { StaffProfileRole } from '@gym/shared';
import Toast from 'react-native-toast-message';

const VALID_ROLES = ['STAFF', 'TRAINER', 'MANAGER', 'ADMIN'] as const;

const formSchema = z.object({
  userId: z.string().trim().min(10, 'User ID (UUID) is required — copy from user profile'),
  salary: z.string().trim().min(1, 'Salary is required').regex(/^\d+(\.\d{1,2})?$/, 'Enter a valid number, e.g. 25000'),
  role: z.enum(['STAFF', 'TRAINER', 'MANAGER', 'ADMIN']),
});

type StaffFormValues = z.infer<typeof formSchema>;

interface StaffFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
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

export function StaffFormModal({ visible, onClose, onSuccess }: StaffFormModalProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [roleOpen, setRoleOpen] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<StaffFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { userId: '', salary: '', role: 'STAFF' },
  });

  const selectedRole = watch('role');

  useEffect(() => {
    if (visible) reset({ userId: '', salary: '', role: 'STAFF' });
  }, [visible, reset]);

  const onSubmit = async (data: StaffFormValues) => {
    try {
      await staffApi.createProfile({
        userId: data.userId,
        role: data.role as StaffProfileRole,
        salaryCents: Math.round(Number(data.salary) * 100),
      });
      Toast.show({ type: 'success', text1: 'Staff profile created' });
      onSuccess();
    } catch (error: any) {
      const msg = parseApiError(error);
      Toast.show({
        type: 'error',
        text1: 'Could not create staff profile',
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
            <Text style={{ color: colors.foreground }} className="text-xl font-black">New Staff Profile</Text>
            <TouchableOpacity onPress={onClose} style={{ backgroundColor: colors.secondary }} className="p-2 rounded-full">
              <X size={18} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}>
            {/* Helper note */}
            <View style={{ backgroundColor: `${colors.warning}15`, borderColor: `${colors.warning}40`, borderWidth: 1 }} className="rounded-lg p-3 mb-5">
              <Text style={{ color: colors.warning }} className="text-xs font-semibold leading-relaxed">
                You need the user's UUID (unique system ID). Find it in their user account details or by having them share it from their Profile screen.
              </Text>
            </View>

            {/* User ID */}
            <View className="mb-4">
              <Controller
                control={control}
                name="userId"
                render={({ field: { onChange, value } }) => (
                  <Input
                    label="User ID (UUID)"
                    value={value}
                    onChangeText={onChange}
                    error={errors.userId?.message}
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  />
                )}
              />
            </View>

            {/* Salary */}
            <View className="mb-4">
              <Controller
                control={control}
                name="salary"
                render={({ field: { onChange, value } }) => (
                  <Input
                    label="Monthly Salary (₹ or base currency)"
                    value={value}
                    onChangeText={onChange}
                    error={errors.salary?.message}
                    keyboardType="numeric"
                    placeholder="25000"
                  />
                )}
              />
            </View>

            {/* Role picker */}
            <View className="mb-6">
              <Text style={{ color: colors.mutedForeground }} className="mb-1.5 text-sm font-medium">Role</Text>
              <TouchableOpacity
                onPress={() => setRoleOpen((v) => !v)}
                style={{ backgroundColor: colors.secondary, borderColor: colors.border, borderWidth: 1, height: 48 }}
                className="flex-row items-center justify-between rounded-lg px-4"
              >
                <Text style={{ color: colors.foreground }} className="font-bold text-sm">{selectedRole}</Text>
                <ChevronDown size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
              {errors.role?.message ? (
                <Text className="mt-1 text-xs text-destructive">{errors.role.message}</Text>
              ) : null}

              {roleOpen && (
                <View style={{ borderColor: colors.border, backgroundColor: colors.card, borderWidth: 1 }} className="rounded-lg mt-1 overflow-hidden">
                  {VALID_ROLES.map((r) => (
                    <TouchableOpacity
                      key={r}
                      onPress={() => { setValue('role', r); setRoleOpen(false); }}
                      style={{ borderBottomColor: colors.border }}
                      className="px-4 py-3 border-b"
                    >
                      <Text style={{ color: colors.foreground, fontWeight: selectedRole === r ? 'bold' : 'normal' }}>{r}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <Button onPress={handleSubmit(onSubmit)} isLoading={isSubmitting}>
              <Text style={{ color: colors.primaryForeground }} className="font-bold">Create Profile</Text>
            </Button>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
      <Toast />
    </Modal>
  );
}
