import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, CheckCircle } from 'lucide-react-native';
import Toast from 'react-native-toast-message';

import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useTheme } from '../../hooks/useTheme';
import * as paymentApi from '../../features/payments/paymentApi';
import type { InvoiceDto, PaymentMethod } from '@gym/shared';
import { formatCents } from '../../utils/format';

interface RecordPaymentModalProps {
  visible: boolean;
  invoice: InvoiceDto | null;
  onClose: () => void;
  onSuccess: () => void;
}

const PAYMENT_METHODS: PaymentMethod[] = [
  'CASH', 'UPI', 'CARD', 'ONLINE'
];

export function RecordPaymentModal({ visible, invoice, onClose, onSuccess }: RecordPaymentModalProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (visible && invoice) {
      setAmount((invoice.remainingCents / 100).toFixed(2));
      setMethod('CASH');
    }
  }, [visible, invoice]);

  const amountCents = Math.round(parseFloat(amount || '0') * 100);
  const remainingAfterPayment = invoice ? invoice.remainingCents - amountCents : 0;
  const exceedsRemaining = invoice ? amountCents > invoice.remainingCents : false;
  const clearsBalance = invoice ? amountCents === invoice.remainingCents : false;

  const handleSubmit = async () => {
    if (!invoice) return;
    
    if (amountCents <= 0) {
      Toast.show({ type: 'error', text1: 'Please enter a valid amount' });
      return;
    }
    
    if (exceedsRemaining) {
      Toast.show({ type: 'error', text1: 'Amount exceeds remaining balance' });
      return;
    }

    setIsSubmitting(true);
    try {
      await paymentApi.recordPayment(invoice.id, {
        amountCents,
        method,
      });
      Toast.show({ type: 'success', text1: 'Payment recorded successfully' });
      onSuccess();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: error.message || 'Failed to record payment' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={{ borderBottomColor: colors.border }} className="flex-row justify-between items-center px-4 py-3 border-b">
            <Text className="text-xl font-black text-foreground">Record Payment</Text>
            <TouchableOpacity onPress={onClose} style={{ backgroundColor: colors.secondary }} className="p-2 rounded-full">
              <X size={18} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: Math.max(insets.bottom, 24) }} keyboardShouldPersistTaps="handled">
            {invoice && (
              <View className="mb-6 rounded-lg border border-border p-4 bg-card">
                <Text className="text-xs font-bold text-muted-foreground uppercase">Remaining Balance</Text>
                <Text className="text-3xl font-black text-foreground mt-1">
                  {formatCents(invoice.remainingCents)}
                </Text>
                
                <Text className={`mt-2 font-bold ${exceedsRemaining ? 'text-destructive' : 'text-muted-foreground'}`}>
                  After this payment: {formatCents(Math.max(0, remainingAfterPayment))}
                </Text>
                
                {clearsBalance && (
                  <View className="flex-row items-center mt-3 bg-success-soft p-2 rounded-md">
                    <CheckCircle size={16} color={colors.success} className="mr-2" />
                    <Text className="font-bold text-success text-xs">This will mark the invoice as PAID</Text>
                  </View>
                )}
              </View>
            )}

            <View className="mb-4">
              <Input
                label="Amount ($)"
                placeholder="0.00"
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
              />
            </View>

            <View className="mb-6">
              <Text className="mb-1 text-sm font-bold text-foreground">Payment Method</Text>
              <View className="flex-row flex-wrap gap-2">
                {PAYMENT_METHODS.map(m => (
                  <TouchableOpacity
                    key={m}
                    onPress={() => setMethod(m)}
                    className={`px-3 py-2 rounded-lg mb-2 border ${method === m ? 'bg-primary border-primary' : 'bg-card border-border'}`}
                  >
                    <Text className={`font-bold ${method === m ? 'text-primary-foreground' : 'text-foreground'}`}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <Button
              onPress={handleSubmit}
              disabled={isSubmitting || exceedsRemaining || amountCents <= 0}
              className="w-full"
            >
              <Text className="text-white font-bold text-lg">
                {isSubmitting ? 'Recording...' : 'Record Payment'}
              </Text>
            </Button>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
