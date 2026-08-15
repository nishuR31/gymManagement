import { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ClipboardList, Search, X } from 'lucide-react-native';
import Toast from 'react-native-toast-message';

import { Card, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { StatusBadge } from '../components/ui/StatusBadge';
import { EmptyState } from '../components/ui/EmptyState';
import { ScreenWrapper, PageHeader } from '../components/layout/ScreenWrapper';
import { useTheme } from '../hooks/useTheme';
import * as orderApi from '../features/orders/orderApi';
import type { ProductOrderDto } from '@gym/shared';
import { formatCents, formatDateTime } from '../utils/format';

export function OrdersScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [orders, setOrders] = useState<ProductOrderDto[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ProductOrderDto | null>(null);

  const loadData = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      const response = await orderApi.listOrders({ page: 1, pageSize: 50 });
      setOrders(response.data);
    } catch {
      Toast.show({ type: 'error', text1: 'Could not load orders' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  const filteredOrders = orders.filter((o) =>
    o.orderCode.toLowerCase().includes(search.toLowerCase()) ||
    o.memberName.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <ScreenWrapper refreshing={isLoading} onRefresh={loadData}>
      <PageHeader
        label="Sales"
        title="Orders"
        subtitle="View product sales and POS transactions"
      />

      <View className="mb-4">
        <Input
          placeholder="Search orders..."
          value={search}
          onChangeText={setSearch}
          leftIcon={<Search size={16} color={colors.mutedForeground} />}
        />
      </View>

      <Card>
        <CardContent className="p-0">
          {filteredOrders.length === 0 && !isLoading ? (
            <View className="p-4">
              <EmptyState icon={ClipboardList} title="No orders found" />
            </View>
          ) : (
            <View>
              {filteredOrders.map((order, index) => (
                <TouchableOpacity
                  key={order.id}
                  onPress={() => setSelectedOrder(order)}
                  className={`flex-row justify-between items-center p-4 ${
                    index !== filteredOrders.length - 1 ? 'border-b border-border' : ''
                  }`}
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-center flex-1 mr-2">
                    <View
                      style={{ backgroundColor: colors.primarySoft }}
                      className="w-10 h-10 items-center justify-center rounded-xl mr-3"
                    >
                      <ClipboardList size={20} color={colors.primary} />
                    </View>
                    <View className="flex-1">
                      <Text className="font-bold text-foreground text-base" numberOfLines={1}>
                        {order.memberName || 'Walk-in Customer'}
                      </Text>
                      <Text className="text-xs font-semibold text-muted-foreground" numberOfLines={1}>
                        {formatDateTime(order.createdAt)} · {order.productName}
                      </Text>
                    </View>
                  </View>
                  <View className="items-end gap-1">
                    <Text className="font-black text-foreground text-lg">
                      {formatCents(order.amountCents)}
                    </Text>
                    <StatusBadge status={order.status} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </CardContent>
      </Card>

      {/* Order detail modal — cross-platform */}
      <Modal
        visible={!!selectedOrder}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setSelectedOrder(null)}
        statusBarTranslucent
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'left', 'right']}>
          {selectedOrder && (
            <View style={{ flex: 1 }}>
              <View
                style={{ borderBottomColor: colors.border }}
                className="flex-row justify-between items-center px-4 py-3 border-b"
              >
                <Text className="text-xl font-black text-foreground">Order Details</Text>
                <TouchableOpacity
                  onPress={() => setSelectedOrder(null)}
                  style={{ backgroundColor: colors.secondary }}
                  className="p-2 rounded-full"
                  activeOpacity={0.7}
                >
                  <X size={18} color={colors.foreground} />
                </TouchableOpacity>
              </View>

              <ScrollView
                contentContainerStyle={{ padding: 16, paddingBottom: Math.max(insets.bottom, 24) }}
                showsVerticalScrollIndicator={false}
              >
                <Card>
                  <CardContent className="p-4 gap-4">
                    <View>
                      <Text className="text-xs font-bold text-muted-foreground uppercase mb-1">Order Code</Text>
                      <Text className="text-foreground font-mono">{selectedOrder.orderCode}</Text>
                    </View>
                    <View className="h-px bg-border" />
                    <View>
                      <Text className="text-xs font-bold text-muted-foreground uppercase mb-1">Product</Text>
                      <Text className="text-foreground font-semibold">{selectedOrder.productName}</Text>
                    </View>
                    <View className="h-px bg-border" />
                    <View>
                      <Text className="text-xs font-bold text-muted-foreground uppercase mb-1">Customer</Text>
                      <Text className="text-foreground font-semibold">
                        {selectedOrder.memberName} {selectedOrder.memberPhone ? `· ${selectedOrder.memberPhone}` : ''}
                      </Text>
                    </View>
                    <View className="h-px bg-border" />
                    <View>
                      <Text className="text-xs font-bold text-muted-foreground uppercase mb-1">Total</Text>
                      <Text className="text-foreground font-semibold">{formatCents(selectedOrder.amountCents)}</Text>
                    </View>
                    <View className="h-px bg-border" />
                    <View className="flex-row justify-between items-center">
                      <Text className="text-xs font-bold text-muted-foreground uppercase">Status</Text>
                      <StatusBadge status={selectedOrder.status} />
                    </View>
                  </CardContent>
                </Card>
              </ScrollView>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </ScreenWrapper>
  );
}
