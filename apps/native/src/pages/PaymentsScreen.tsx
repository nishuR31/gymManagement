import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CreditCard, Search } from 'lucide-react-native';
import Toast from 'react-native-toast-message';

import { Card, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useAppSelector } from '../store/hooks';
import { themeColors } from '../constants/colors';
import * as paymentApi from '../features/payments/paymentApi';
import type { PaymentDto } from '@gym/shared';
import { formatCents, formatDateTime } from '../utils/format';

export function PaymentsScreen() {
  const theme = useAppSelector((state) => state.theme.theme);
  const activeColors = themeColors[theme === 'amoled' ? 'amoled' : theme === 'dark' ? 'dark' : 'light'];

  const [payments, setPayments] = useState<PaymentDto[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentDto | null>(null);

  const loadData = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const response = await paymentApi.listPayments({
        page: 1,
        pageSize: 50,
      });
      setPayments(response.data);
    } catch {
      Toast.show({ type: 'error', text1: 'Could not load payments' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredPayments = payments.filter(p => 
    p.id.toLowerCase().includes(search.toLowerCase()) || 
    (p.member && `${p.member.firstName} ${p.member.lastName}`.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadData} tintColor={activeColors.primary} />} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        
        <View className="mb-6 bg-card border border-border p-4 rounded-lg shadow-sm">
          <Text className="text-xs font-black uppercase tracking-[0.18em] text-primary">Sales</Text>
          <Text className="mt-2 text-3xl font-black text-foreground">Payments</Text>
          <Text className="mt-1 text-sm font-semibold text-muted-foreground mb-4">View membership and service payments</Text>
          
          <View className="relative justify-center">
            <Input
              placeholder="Search payments..."
              value={search}
              onChangeText={setSearch}
              className="pl-10 h-10"
            />
            <View className="absolute left-3 top-2.5">
              <Search size={16} color={activeColors.mutedForeground} />
            </View>
          </View>
        </View>

        <Card>
          <CardContent className="p-0">
            {filteredPayments.length === 0 && !isLoading ? (
              <View className="items-center py-12 px-4">
                <CreditCard size={32} color={activeColors.mutedForeground} className="mb-2" />
                <Text className="font-bold text-foreground">No payments found</Text>
              </View>
            ) : (
              <View>
                {filteredPayments.map((payment, index) => (
                  <TouchableOpacity 
                    key={payment.id} 
                    onPress={() => setSelectedPayment(payment)}
                    className={`flex-row justify-between items-center p-4 ${index !== filteredPayments.length - 1 ? 'border-b border-border' : ''}`}
                  >
                    <View className="flex-row items-center flex-1 mr-2">
                      <View className="w-10 h-10 bg-secondary items-center justify-center rounded-full mr-3">
                        <CreditCard size={20} color={activeColors.primary} />
                      </View>
                      <View className="flex-1">
                        <Text className="font-bold text-foreground text-base" numberOfLines={1}>
                          {payment.member ? `${payment.member.firstName} ${payment.member.lastName}` : 'Walk-in'}
                        </Text>
                        <Text className="text-xs font-semibold text-muted-foreground">{formatDateTime(payment.createdAt)} · {payment.paymentMethod}</Text>
                      </View>
                    </View>
                    <View className="items-end">
                      <Text className="font-black text-foreground text-lg">{formatCents(payment.amountCents)}</Text>
                      <View className={`px-2 py-0.5 rounded-full border ${payment.status === 'COMPLETED' ? 'bg-green-500/10 border-green-500/20' : 'bg-secondary border-border'}`}>
                        <Text className={`text-[10px] uppercase font-bold ${payment.status === 'COMPLETED' ? 'text-green-500' : 'text-muted-foreground'}`}>{payment.status}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </CardContent>
        </Card>

      </ScrollView>

      <Modal visible={!!selectedPayment} animationType="slide" presentationStyle="pageSheet">
        <View className="flex-1 bg-background pt-12">
          {selectedPayment && (
            <View className="flex-1">
              <View className="flex-row justify-between items-center px-4 pb-4 border-b border-border">
                <Text className="text-xl font-bold text-foreground">Payment Details</Text>
                <Button variant="outline" onPress={() => setSelectedPayment(null)} className="h-8 px-4">Close</Button>
              </View>
              
              <ScrollView className="p-4" contentContainerStyle={{ paddingBottom: 60 }}>
                <Card className="mb-4">
                  <CardContent className="p-4 gap-4">
                    <View>
                      <Text className="text-xs font-bold text-muted-foreground uppercase">Payment ID</Text>
                      <Text className="text-foreground mt-1">{selectedPayment.id}</Text>
                    </View>
                    <View className="h-px bg-border" />
                    <View>
                      <Text className="text-xs font-bold text-muted-foreground uppercase">Amount</Text>
                      <Text className="text-foreground mt-1 font-semibold">{formatCents(selectedPayment.amountCents)}</Text>
                    </View>
                  </CardContent>
                </Card>
              </ScrollView>
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}
