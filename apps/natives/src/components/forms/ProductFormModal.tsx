import { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import Toast from 'react-native-toast-message';

import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useTheme } from '../../hooks/useTheme';
import * as inventoryApi from '../../features/inventory/inventoryApi';
import type { ProductDto } from '@gym/shared';
import type { ProductCategory } from '@gym/shared';

interface ProductFormModalProps {
  visible: boolean;
  product: ProductDto | null;
  onClose: () => void;
  onSuccess: () => void;
}

const CATEGORIES: ProductCategory[] = [
  'PROTEIN',
  'CREATINE',
  'ACCESSORY',
  'MERCHANDISE',
  'OTHER'
];

export function ProductFormModal({ visible, product, onClose, onSuccess }: ProductFormModalProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState<ProductCategory>('PROTEIN');
  const [price, setPrice] = useState('');
  const [cost, setCost] = useState('');
  const [threshold, setThreshold] = useState('0');
  const [description, setDescription] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      if (product) {
        setName(product.name);
        setSku(product.sku);
        setCategory(product.category);
        setPrice((product.priceCents / 100).toString());
        setCost((product.costCents / 100).toString());
        setThreshold(product.reorderThreshold.toString());
        setDescription(product.description || '');
      } else {
        setName('');
        setSku('');
        setCategory('PROTEIN');
        setPrice('');
        setCost('');
        setThreshold('0');
        setDescription('');
      }
    }
  }, [visible, product]);

  const handleSubmit = async () => {
    if (!name || !sku || !price || !cost) {
      Toast.show({ type: 'error', text1: 'Please fill in all required fields' });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name,
        sku,
        category,
        description,
        priceCents: Math.round(parseFloat(price) * 100),
        costCents: Math.round(parseFloat(cost) * 100),
        reorderThreshold: parseInt(threshold, 10) || 0,
      };

      if (product) {
        await inventoryApi.updateProduct(product.id, payload);
        Toast.show({ type: 'success', text1: 'Product updated' });
      } else {
        await inventoryApi.createProduct(payload);
        Toast.show({ type: 'success', text1: 'Product created' });
      }
      onSuccess();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: error.message || 'Failed to save product' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!product) return;
    setIsSubmitting(true);
    try {
      await inventoryApi.deleteProduct(product.id);
      Toast.show({ type: 'success', text1: 'Product deleted' });
      onSuccess();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: error.message || 'Failed to delete product' });
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
            <Text className="text-xl font-black text-foreground">
              {product ? 'Edit Product' : 'New Product'}
            </Text>
            <TouchableOpacity onPress={onClose} style={{ backgroundColor: colors.secondary }} className="p-2 rounded-full">
              <X size={18} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: Math.max(insets.bottom, 24) }} keyboardShouldPersistTaps="handled">
            <View className="mb-4">
              <Input
                label="Product Name *"
                placeholder="e.g. Whey Protein"
                value={name}
                onChangeText={setName}
              />
            </View>

            <View className="flex-row mb-4 gap-3">
              <View className="flex-1">
                <Input
                  label="SKU *"
                  placeholder="PROT-001"
                  value={sku}
                  onChangeText={setSku}
                  autoCapitalize="characters"
                />
              </View>
              <View className="flex-1">
                <Text className="mb-1 text-sm font-bold text-foreground">Category *</Text>
                <View className="flex-row flex-wrap gap-2">
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} className="py-1">
                    {CATEGORIES.map(cat => (
                      <TouchableOpacity
                        key={cat}
                        onPress={() => setCategory(cat)}
                        className={`px-3 py-2 rounded-lg mr-2 border ${category === cat ? 'bg-primary border-primary' : 'bg-card border-border'}`}
                      >
                        <Text className={`font-bold ${category === cat ? 'text-primary-foreground' : 'text-foreground'}`}>{cat}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
            </View>

            <View className="flex-row mb-4 gap-3">
              <View className="flex-1">
                <Input
                  label="Selling Price ($) *"
                  placeholder="0.00"
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="decimal-pad"
                />
              </View>
              <View className="flex-1">
                <Input
                  label="Cost Price ($) *"
                  placeholder="0.00"
                  value={cost}
                  onChangeText={setCost}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <View className="mb-4">
              <Input
                label="Reorder Threshold"
                placeholder="Minimum stock level"
                value={threshold}
                onChangeText={setThreshold}
                keyboardType="number-pad"
              />
            </View>

            <View className="mb-6">
              <Input
                label="Description"
                placeholder="Optional details"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
              />
            </View>

            <Button
              onPress={handleSubmit}
              disabled={isSubmitting}
              className="w-full mb-3"
            >
              <Text className="text-white font-bold text-lg">
                {isSubmitting ? 'Saving...' : 'Save Product'}
              </Text>
            </Button>
            
            {product && (
              <Button
                onPress={handleDelete}
                disabled={isSubmitting}
                variant="outline"
                className="w-full"
              >
                <Text style={{ color: colors.destructive }} className="font-bold text-lg">
                  Delete Product
                </Text>
              </Button>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
