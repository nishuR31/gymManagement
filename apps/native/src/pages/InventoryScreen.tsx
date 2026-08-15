import { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Box, Search, AlertTriangle, FileText } from 'lucide-react-native';
import Toast from 'react-native-toast-message';

import { Card, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';
import { ScreenWrapper, PageHeader } from '../components/layout/ScreenWrapper';
import { useTheme } from '../hooks/useTheme';
import * as inventoryApi from '../features/inventory/inventoryApi';
import type { ProductDto } from '@gym/shared';
import { formatCents } from '../utils/format';

export function InventoryScreen() {
  const { colors } = useTheme();

  const [products, setProducts] = useState<ProductDto[]>([]);
  const [valuation, setValuation] = useState(0);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const loadData = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      const [productRows, value] = await Promise.all([
        inventoryApi.listProducts(),
        inventoryApi.getValuation().catch(() => ({ totalValueCents: 0, products: [] })),
      ]);
      setProducts(productRows);
      setValuation(value.totalValueCents);
    } catch {
      Toast.show({ type: 'error', text1: 'Could not load inventory' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <ScreenWrapper refreshing={isLoading} onRefresh={loadData}>
      <PageHeader
        label="Management"
        title="Inventory"
        subtitle="Manage products and stock levels."
      />

      {/* Search */}
      <View className="mb-4">
        <Input
          placeholder="Search products..."
          value={search}
          onChangeText={setSearch}
          leftIcon={<Search size={16} color={colors.mutedForeground} />}
        />
      </View>

      {/* Valuation card */}
      <Card className="mb-4">
        <CardContent className="p-4 flex-row items-center justify-between">
          <View>
            <Text className="text-xs font-semibold uppercase text-muted-foreground">
              Total Valuation
            </Text>
            <Text className="text-2xl font-black text-foreground mt-1">
              {formatCents(valuation)}
            </Text>
          </View>
          <View
            style={{ backgroundColor: colors.primarySoft }}
            className="w-12 h-12 items-center justify-center rounded-xl"
          >
            <FileText size={24} color={colors.primary} />
          </View>
        </CardContent>
      </Card>

      {/* Product list */}
      <Card>
        <CardContent className="p-0">
          {filteredProducts.length === 0 && !isLoading ? (
            <View className="p-4">
              <EmptyState icon={Box} title="No products found" description="Try a different search." />
            </View>
          ) : (
            <View>
              {filteredProducts.map((product, index) => {
                const isLowStock = product.currentStock < product.reorderThreshold;
                const iconBg = isLowStock ? colors.destructiveSoft : colors.primarySoft;
                const iconColor = isLowStock ? colors.destructive : colors.primary;
                return (
                  <View
                    key={product.id}
                    className={`flex-row justify-between items-center p-4 ${
                      index !== filteredProducts.length - 1 ? 'border-b border-border' : ''
                    }`}
                  >
                    <View className="flex-row items-center flex-1 mr-2">
                      <View
                        style={{ backgroundColor: iconBg }}
                        className="w-10 h-10 items-center justify-center rounded-xl mr-3"
                      >
                        {isLowStock ? (
                          <AlertTriangle size={20} color={iconColor} />
                        ) : (
                          <Box size={20} color={iconColor} />
                        )}
                      </View>
                      <View className="flex-1">
                        <Text
                          className="font-bold text-foreground text-base"
                          numberOfLines={1}
                        >
                          {product.name}
                        </Text>
                        <Text className="text-xs font-semibold text-muted-foreground">
                          {product.category} · {formatCents(product.priceCents)}
                        </Text>
                      </View>
                    </View>
                    <View className="items-end">
                      <Text
                        style={{ color: isLowStock ? colors.destructive : colors.foreground }}
                        className="font-black text-lg"
                      >
                        {product.currentStock}
                      </Text>
                      <Text className="text-[10px] uppercase font-bold text-muted-foreground">
                        In Stock
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </CardContent>
      </Card>
    </ScreenWrapper>
  );
}
