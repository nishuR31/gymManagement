import React, { useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react-native';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useTheme } from '../../hooks/useTheme';
import * as staffApi from '../../features/staff/staffApi';
import type { StaffProfileRole } from '@gym/shared';
import Toast from 'react-native-toast-message';

const formSchema = z.object({
  userId: z.string().trim().min(1, 'User ID is required'),
  salary: z.string().trim().min(1, 'Salary is required'),
  role: z.enum(['STAFF', 'TRAINER', 'MANAGER', 'ADMIN']),
});

type StaffFormValues = z.infer<typeof formSchema>;

interface StaffFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function StaffFormModal({ visible, onClose, onSuccess }: StaffFormModalProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<StaffFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userId: '',
      salary: '',
      role: 'STAFF',
    },
  });

  useEffect(() => {
    if (visible) reset();
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
      Toast.show({ type: 'error', text1: error.message || 'Failed to create profile' });
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose} statusBarTranslucent>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={{ borderBottomColor: colors.border }} className="flex-row justify-between items-center px-4 py-3 border-b">
            <Text className="text-xl font-black text-foreground">New Staff Profile</Text>
            <TouchableOpacity onPress={onClose} style={{ backgroundColor: colors.secondary }} className="p-2 rounded-full">
              <X size={18} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          <View style={{ padding: 16, paddingBottom: insets.bottom + 24 }}>
            <View className="mb-4">
              <Controller
                control={control}
                name="userId"
                render={({ field: { onChange, value } }) => (
                  <Input label="User ID" value={value} onChangeText={onChange} error={errors.userId?.message} autoCapitalize="none" />
                )}
              />
            </View>
            <View className="mb-4">
              <Controller
                control={control}
                name="salary"
                render={({ field: { onChange, value } }) => (
                  <Input label="Salary (Base Currency)" value={value} onChangeText={onChange} error={errors.salary?.message} keyboardType="numeric" />
                )}
              />
            </View>
            <View className="mb-4">
              <Controller
                control={control}
                name="role"
                render={({ field: { onChange, value } }) => (
                  <Input label="Role (e.g. STAFF, TRAINER)" value={value} onChangeText={onChange} error={errors.role?.message} autoCapitalize="characters" />
                )}
              />
            </View>

            <View className="mt-4">
              <Button onPress={handleSubmit(onSubmit)} isLoading={isSubmitting}>
                <Text className="font-bold">Create Profile</Text>
              </Button>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
