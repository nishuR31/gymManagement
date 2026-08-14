import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Box, Search, AlertTriangle, FileText } from 'lucide-react-native';
import Toast from 'react-native-toast-message';

import { Card, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { useAppSelector } from '../store/hooks';
import { themeColors } from '../constants/colors';
import * as inventoryApi from '../features/inventory/inventoryApi';
import type { ProductDto } from '@gym/shared';
import { formatCents } from '../utils/format';

export function InventoryScreen() {
  const theme = useAppSelector((state) => state.theme.theme);
  const activeColors = themeColors[theme === 'amoled' ? 'amoled' : theme === 'dark' ? 'dark' : 'light'];

  const [products, setProducts] = useState<ProductDto[]>([]);
  const [valuation, setValuation] = useState(0);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const loadData = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const [productRows, value] = await Promise.all([
        inventoryApi.listProducts(),
        inventoryApi.getValuation().catch(() => ({ totalValueCents: 0, products: [] }))
      ]);
      setProducts(productRows);
      setValuation(value.totalValueCents);
    } catch {
      Toast.show({ type: 'error', text1: 'Could not load inventory' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadData} tintColor={activeColors.primary} />} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        
        <View className="mb-6 bg-card border border-border p-4 rounded-lg shadow-sm">
          <Text className="text-xs font-black uppercase tracking-[0.18em] text-primary">Management</Text>
          <Text className="mt-2 text-3xl font-black text-foreground">Inventory</Text>
          <Text className="mt-1 text-sm font-semibold text-muted-foreground mb-4">Manage products and stock</Text>
          
          <View className="relative justify-center">
            <Input
              placeholder="Search products..."
              value={search}
              onChangeText={setSearch}
              className="pl-10 h-10"
            />
            <View className="absolute left-3 top-2.5">
              <Search size={16} color={activeColors.mutedForeground} />
            </View>
          </View>
        </View>

        <Card className="mb-4">
          <CardContent className="p-4 flex-row items-center justify-between">
            <View>
              <Text className="text-xs font-semibold uppercase text-muted-foreground">Total Valuation</Text>
              <Text className="text-2xl font-black text-foreground">{formatCents(valuation)}</Text>
            </View>
            <View className="w-12 h-12 bg-primary/20 items-center justify-center rounded-full">
              <FileText size={24} color={activeColors.primary} />
            </View>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {filteredProducts.length === 0 && !isLoading ? (
              <View className="items-center py-12 px-4">
                <Box size={32} color={activeColors.mutedForeground} className="mb-2" />
                <Text className="font-bold text-foreground">No products found</Text>
              </View>
            ) : (
              <View>
                {filteredProducts.map((product, index) => (
                  <View key={product.id} className={`flex-row justify-between items-center p-4 ${index !== filteredProducts.length - 1 ? 'border-b border-border' : ''}`}>
                    <View className="flex-row items-center flex-1 mr-2">
                      <View className="w-10 h-10 bg-secondary items-center justify-center rounded-full mr-3">
                        {product.stockLevel < product.minimumStock ? (
                          <AlertTriangle size={20} color={activeColors.destructive} />
                        ) : (
                          <Box size={20} color={activeColors.primary} />
                        )}
                      </View>
                      <View className="flex-1">
                        <Text className="font-bold text-foreground text-base" numberOfLines={1}>{product.name}</Text>
                        <Text className="text-xs font-semibold text-muted-foreground">{product.category} · {formatCents(product.sellingPriceCents)}</Text>
                      </View>
                    </View>
                    <View className="items-end">
                      <Text className={`font-black text-lg ${product.stockLevel < product.minimumStock ? 'text-destructive' : 'text-foreground'}`}>
                        {product.stockLevel}
                      </Text>
                      <Text className="text-[10px] uppercase font-bold text-muted-foreground">Stock</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </CardContent>
        </Card>

      </ScrollView>
    </SafeAreaView>
  );
}
