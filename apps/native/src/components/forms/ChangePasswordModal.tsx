import React, { useState } from 'react';
import { View, Text, Modal, ScrollView } from 'react-native';
import { X, ShieldAlert, KeyRound } from 'lucide-react-native';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Toast from 'react-native-toast-message';

import { useTheme } from '../../hooks/useTheme';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import * as authApi from '../../features/auth/authApi';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Confirm password must be at least 8 characters'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

interface ChangePasswordModalProps {
  visible: boolean;
  onClose: () => void;
}

export function ChangePasswordModal({ visible, onClose }: ChangePasswordModalProps) {
  const { colors } = useTheme();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { control, handleSubmit, reset, formState: { errors } } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: ChangePasswordFormValues) => {
    setIsSubmitting(true);
    try {
      await authApi.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      Toast.show({ type: 'success', text1: 'Password changed successfully' });
      reset();
      onClose();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: error.message || 'Failed to change password' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ borderBottomColor: colors.border }} className="flex-row justify-between items-center px-4 py-3 border-b">
          <View className="flex-row items-center gap-2">
            <KeyRound size={20} color={colors.foreground} />
            <Text style={{ color: colors.foreground }} className="text-xl font-black">Change Password</Text>
          </View>
          <Button variant="ghost" size="sm" onPress={handleClose} className="p-2">
            <X size={20} color={colors.foreground} />
          </Button>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
          <View style={{ backgroundColor: colors.warningSoft }} className="p-3 rounded-lg flex-row gap-3 mb-6 items-start">
            <ShieldAlert size={20} color={colors.warning} className="mt-0.5" />
            <Text style={{ color: colors.warning }} className="flex-1 text-sm font-semibold">
              Choose a strong password to keep your account secure. You will not be logged out of your current session.
            </Text>
          </View>

          <View className="gap-4">
            <Controller control={control} name="currentPassword" render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Current Password"
                secureTextEntry
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.currentPassword?.message}
                placeholder="Enter current password"
              />
            )} />

            <Controller control={control} name="newPassword" render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="New Password"
                secureTextEntry
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.newPassword?.message}
                placeholder="Enter new password"
              />
            )} />

            <Controller control={control} name="confirmPassword" render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Confirm New Password"
                secureTextEntry
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.confirmPassword?.message}
                placeholder="Confirm new password"
              />
            )} />
          </View>

          <Button className="mt-8" onPress={handleSubmit(onSubmit)} isLoading={isSubmitting}>
            Update Password
          </Button>
        </ScrollView>
      </View>
    </Modal>
  );
}
