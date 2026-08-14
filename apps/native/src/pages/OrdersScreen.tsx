import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ClipboardList, Search } from 'lucide-react-native';
import Toast from 'react-native-toast-message';

import { Card, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useAppSelector } from '../store/hooks';
import { themeColors } from '../constants/colors';
import * as orderApi from '../features/orders/orderApi';
import type { ProductOrderDto } from '@gym/shared';
import { formatCents, formatDateTime } from '../utils/format';

export function OrdersScreen() {
  const theme = useAppSelector((state) => state.theme.theme);
  const activeColors = themeColors[theme === 'amoled' ? 'amoled' : theme === 'dark' ? 'dark' : 'light'];

  const [orders, setOrders] = useState<ProductOrderDto[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ProductOrderDto | null>(null);

  const loadData = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const response = await orderApi.listOrders({
        page: 1,
        pageSize: 50,
      });
      setOrders(response.data);
    } catch {
      Toast.show({ type: 'error', text1: 'Could not load orders' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredOrders = orders.filter(o => 
    o.id.toLowerCase().includes(search.toLowerCase()) || 
    (o.member && `${o.member.firstName} ${o.member.lastName}`.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadData} tintColor={activeColors.primary} />} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        
        <View className="mb-6 bg-card border border-border p-4 rounded-lg shadow-sm">
          <Text className="text-xs font-black uppercase tracking-[0.18em] text-primary">Sales</Text>
          <Text className="mt-2 text-3xl font-black text-foreground">Orders</Text>
          <Text className="mt-1 text-sm font-semibold text-muted-foreground mb-4">View product sales and POS transactions</Text>
          
          <View className="relative justify-center">
            <Input
              placeholder="Search orders..."
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
            {filteredOrders.length === 0 && !isLoading ? (
              <View className="items-center py-12 px-4">
                <ClipboardList size={32} color={activeColors.mutedForeground} className="mb-2" />
                <Text className="font-bold text-foreground">No orders found</Text>
              </View>
            ) : (
              <View>
                {filteredOrders.map((order, index) => (
                  <TouchableOpacity 
                    key={order.id} 
                    onPress={() => setSelectedOrder(order)}
                    className={`flex-row justify-between items-center p-4 ${index !== filteredOrders.length - 1 ? 'border-b border-border' : ''}`}
                  >
                    <View className="flex-row items-center flex-1 mr-2">
                      <View className="w-10 h-10 bg-secondary items-center justify-center rounded-full mr-3">
                        <ClipboardList size={20} color={activeColors.primary} />
                      </View>
                      <View className="flex-1">
                        <Text className="font-bold text-foreground text-base" numberOfLines={1}>
                          {order.member ? `${order.member.firstName} ${order.member.lastName}` : 'Walk-in Customer'}
                        </Text>
                        <Text className="text-xs font-semibold text-muted-foreground">{formatDateTime(order.createdAt)}</Text>
                      </View>
                    </View>
                    <View className="items-end">
                      <Text className="font-black text-foreground text-lg">{formatCents(order.totalAmountCents)}</Text>
                      <Text className="text-[10px] uppercase font-bold text-muted-foreground">{order.status}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </CardContent>
        </Card>

      </ScrollView>

      <Modal visible={!!selectedOrder} animationType="slide" presentationStyle="pageSheet">
        <View className="flex-1 bg-background pt-12">
          {selectedOrder && (
            <View className="flex-1">
              <View className="flex-row justify-between items-center px-4 pb-4 border-b border-border">
                <Text className="text-xl font-bold text-foreground">Order Details</Text>
                <Button variant="outline" onPress={() => setSelectedOrder(null)} className="h-8 px-4">Close</Button>
              </View>
              
              <ScrollView className="p-4" contentContainerStyle={{ paddingBottom: 60 }}>
                <Card className="mb-4">
                  <CardContent className="p-4 gap-4">
                    <View>
                      <Text className="text-xs font-bold text-muted-foreground uppercase">Order ID</Text>
                      <Text className="text-foreground mt-1">{selectedOrder.id}</Text>
                    </View>
                    <View className="h-px bg-border" />
                    <View>
                      <Text className="text-xs font-bold text-muted-foreground uppercase">Total</Text>
                      <Text className="text-foreground mt-1 font-semibold">{formatCents(selectedOrder.totalAmountCents)}</Text>
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
