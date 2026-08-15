import React, { useEffect } from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react-native';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useTheme } from '../../hooks/useTheme';
import type { MemberDto } from '@gym/shared';
import * as memberApi from '../../features/members/memberApi';
import Toast from 'react-native-toast-message';

const formSchema = z.object({
  firstName: z.string().trim().min(1, 'Required').max(80),
  lastName: z.string().trim().min(1, 'Required').max(80),
  phone: z.string().trim().min(5, 'Required').max(30),
  email: z.string().trim().email('Invalid email').or(z.literal('')),
});

type MemberFormValues = z.infer<typeof formSchema>;

interface MemberFormModalProps {
  visible: boolean;
  member: MemberDto | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function MemberFormModal({ visible, member, onClose, onSuccess }: MemberFormModalProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MemberFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
    },
  });

  useEffect(() => {
    if (visible) {
      if (member) {
        reset({
          firstName: member.firstName,
          lastName: member.lastName,
          phone: member.phone,
          email: member.email || '',
        });
      } else {
        reset({
          firstName: '',
          lastName: '',
          phone: '',
          email: '',
        });
      }
    }
  }, [visible, member, reset]);

  const onSubmit = async (data: MemberFormValues) => {
    try {
      if (member) {
        await memberApi.updateMember(member.id, data);
        Toast.show({ type: 'success', text1: 'Member updated successfully' });
      } else {
        await memberApi.createMember(data);
        Toast.show({ type: 'success', text1: 'Member created successfully' });
      }
      onSuccess();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: error.message || 'Failed to save member' });
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose} statusBarTranslucent>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={{ borderBottomColor: colors.border }} className="flex-row justify-between items-center px-4 py-3 border-b">
            <Text className="text-xl font-black text-foreground">
              {member ? 'Edit Member' : 'Add Member'}
            </Text>
            <TouchableOpacity onPress={onClose} style={{ backgroundColor: colors.secondary }} className="p-2 rounded-full">
              <X size={18} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}>
            <View className="mb-4">
              <Controller
                control={control}
                name="firstName"
                render={({ field: { onChange, value } }) => (
                  <Input label="First Name" value={value} onChangeText={onChange} error={errors.firstName?.message} />
                )}
              />
            </View>
            <View className="mb-4">
              <Controller
                control={control}
                name="lastName"
                render={({ field: { onChange, value } }) => (
                  <Input label="Last Name" value={value} onChangeText={onChange} error={errors.lastName?.message} />
                )}
              />
            </View>
            <View className="mb-4">
              <Controller
                control={control}
                name="phone"
                render={({ field: { onChange, value } }) => (
                  <Input label="Phone" value={value} onChangeText={onChange} error={errors.phone?.message} keyboardType="phone-pad" />
                )}
              />
            </View>
            <View className="mb-4">
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, value } }) => (
                  <Input label="Email (Optional)" value={value} onChangeText={onChange} error={errors.email?.message} keyboardType="email-address" autoCapitalize="none" />
                )}
              />
            </View>

            <View className="mt-4">
              <Button onPress={handleSubmit(onSubmit)} isLoading={isSubmitting}>
                <Text className="font-bold">{member ? 'Save Changes' : 'Create Member'}</Text>
              </Button>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
