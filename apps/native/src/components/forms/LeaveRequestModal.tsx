import React, { useEffect, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Calendar as CalendarIcon } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useTheme } from '../../hooks/useTheme';
import * as staffApi from '../../features/staff/staffApi';
import type { StaffProfileDto } from '@gym/shared';
import Toast from 'react-native-toast-message';

const formSchema = z.object({
  reason: z.string().trim().min(1, 'Reason is required'),
});

type LeaveFormValues = z.infer<typeof formSchema>;

interface LeaveRequestModalProps {
  visible: boolean;
  profile: StaffProfileDto | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function LeaveRequestModal({ visible, profile, onClose, onSuccess }: LeaveRequestModalProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(Date.now() + 86400000)); // Default to tomorrow
  const [showPicker, setShowPicker] = useState<'start' | 'end' | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LeaveFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { reason: '' },
  });

  useEffect(() => {
    if (visible) reset();
  }, [visible, reset]);

  const onSubmit = async (data: LeaveFormValues) => {
    if (!profile) return;
    try {
      await staffApi.createLeaveRequest({
        staffProfileId: profile.id,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        reason: data.reason,
      });
      Toast.show({ type: 'success', text1: 'Leave request submitted' });
      onSuccess();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: error.message || 'Failed to request leave' });
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowPicker(null);
    if (selectedDate) {
      if (showPicker === 'start') setStartDate(selectedDate);
      if (showPicker === 'end') setEndDate(selectedDate);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose} statusBarTranslucent>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={{ borderBottomColor: colors.border }} className="flex-row justify-between items-center px-4 py-3 border-b">
            <Text className="text-xl font-black text-foreground">Request Leave</Text>
            <TouchableOpacity onPress={onClose} style={{ backgroundColor: colors.secondary }} className="p-2 rounded-full">
              <X size={18} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}>
            <View className="mb-4">
              <Controller
                control={control}
                name="reason"
                render={({ field: { onChange, value } }) => (
                  <Input label="Reason" value={value} onChangeText={onChange} error={errors.reason?.message} />
                )}
              />
            </View>

            <View className="mb-4 gap-2 flex-row">
              <View className="flex-1">
                <Text className="text-xs font-bold text-muted-foreground uppercase mb-1">Start Date</Text>
                <Button variant="outline" onPress={() => setShowPicker('start')} className="flex-row items-center justify-between">
                  <Text className="font-semibold text-foreground">{startDate.toLocaleDateString()}</Text>
                  <CalendarIcon size={16} color={colors.primary} />
                </Button>
              </View>
              <View className="flex-1">
                <Text className="text-xs font-bold text-muted-foreground uppercase mb-1">End Date</Text>
                <Button variant="outline" onPress={() => setShowPicker('end')} className="flex-row items-center justify-between">
                  <Text className="font-semibold text-foreground">{endDate.toLocaleDateString()}</Text>
                  <CalendarIcon size={16} color={colors.primary} />
                </Button>
              </View>
            </View>

            {showPicker && (
              <DateTimePicker
                value={showPicker === 'start' ? startDate : endDate}
                mode="date"
                display="default"
                onChange={handleDateChange}
                themeVariant={colors.background === '#09090b' ? 'dark' : 'light'}
              />
            )}

            <View className="mt-4">
              <Button onPress={handleSubmit(onSubmit)} isLoading={isSubmitting}>
                <Text className="font-bold">Submit Request</Text>
              </Button>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
