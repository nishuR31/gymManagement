import { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CreditCard, Search, FileText, X } from 'lucide-react-native';
import Toast from 'react-native-toast-message';

import { Card, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ScreenWrapper, PageHeader } from '../components/layout/ScreenWrapper';
import { useTheme } from '../hooks/useTheme';
import type { InvoiceDto } from '@gym/shared';
import { formatCents, formatDateTime } from '../utils/format';
import { RecordPaymentModal } from '../components/forms/RecordPaymentModal';
import * as paymentApi from '../features/payments/paymentApi';

export function PaymentsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [invoices, setInvoices] = useState<InvoiceDto[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDto | null>(null);
  const [isPaymentFormVisible, setIsPaymentFormVisible] = useState(false);

  const loadData = useCallback(async (): Promise<void> => {
    if (!search.trim()) {
      setInvoices([]);
      return;
    }
    
    setIsLoading(true);
    try {
      // If user enters an invoice ID, we try to fetch it
      const invoice = await paymentApi.getInvoice(search.trim());
      setInvoices([invoice]);
    } catch {
      Toast.show({ type: 'error', text1: 'Invoice not found or invalid ID' });
      setInvoices([]);
    } finally {
      setIsLoading(false);
    }
  }, [search]);

  // We don't automatically fetch on mount since we need a search term
  // But we do allow them to submit the search
  
  const filteredInvoices = invoices;

  return (
    <ScreenWrapper refreshing={isLoading} onRefresh={loadData}>
      <PageHeader
        label="Sales"
        title="Payments"
        subtitle="Invoice and payment tracking"
      />

      {/* Search */}
      <View className="mb-4">
        <Input
          placeholder="Search by Invoice ID (e.g. inv_...)"
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={() => loadData()}
          returnKeyType="search"
          leftIcon={<Search size={16} color={colors.mutedForeground} />}
        />
      </View>

      <Card>
        <CardContent className="p-0">
          {filteredInvoices.length === 0 && !isLoading ? (
            <View className="p-4">
              <EmptyState
                icon={CreditCard}
                title="Search for an invoice"
                description="Enter an invoice ID above to view details and record payments."
              />
            </View>
          ) : (
            <View>
              {filteredInvoices.map((invoice, index) => (
                <TouchableOpacity
                  key={invoice.id}
                  onPress={() => setSelectedInvoice(invoice)}
                  className={`flex-row justify-between items-center p-4 ${
                    index !== filteredInvoices.length - 1 ? 'border-b border-border' : ''
                  }`}
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-center flex-1 mr-2">
                    <View
                      style={{ backgroundColor: colors.primarySoft }}
                      className="w-10 h-10 items-center justify-center rounded-full mr-3"
                    >
                      <FileText size={20} color={colors.primary} />
                    </View>
                    <View className="flex-1">
                      <Text className="font-bold text-foreground text-base" numberOfLines={1}>
                        Invoice {invoice.id.slice(0, 8)}
                      </Text>
                      <Text className="text-xs font-semibold text-muted-foreground">
                        {formatDateTime(invoice.createdAt)}
                      </Text>
                    </View>
                  </View>
                  <View className="items-end gap-1">
                    <Text className="font-black text-foreground text-lg">
                      {formatCents(invoice.amountDueCents)}
                    </Text>
                    <StatusBadge status={invoice.status} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </CardContent>
      </Card>

      {/* Invoice detail modal — cross-platform */}
      <Modal
        visible={!!selectedInvoice}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setSelectedInvoice(null)}
        statusBarTranslucent
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'left', 'right']}>
          {selectedInvoice && (
            <View style={{ flex: 1 }}>
              <View
                style={{ borderBottomColor: colors.border }}
                className="flex-row justify-between items-center px-4 py-3 border-b"
              >
                <Text className="text-xl font-black text-foreground">Invoice Details</Text>
                <TouchableOpacity
                  onPress={() => setSelectedInvoice(null)}
                  style={{ backgroundColor: colors.secondary }}
                  className="p-2 rounded-full"
                  activeOpacity={0.7}
                >
                  <X size={18} color={colors.foreground} />
                </TouchableOpacity>
              </View>

              <ScrollView
                contentContainerStyle={{
                  padding: 16,
                  paddingBottom: Math.max(insets.bottom, 24),
                }}
                showsVerticalScrollIndicator={false}
              >
                <Card className="mb-4">
                  <CardContent className="p-4 gap-4">
                    <View>
                      <Text className="text-xs font-bold text-muted-foreground uppercase mb-1">Invoice ID</Text>
                      <Text className="text-foreground font-mono">{selectedInvoice.id}</Text>
                    </View>
                    <View className="h-px bg-border" />
                    <View>
                      <Text className="text-xs font-bold text-muted-foreground uppercase mb-1">Amount Due</Text>
                      <Text className="text-foreground font-semibold">{formatCents(selectedInvoice.amountDueCents)}</Text>
                    </View>
                    <View className="h-px bg-border" />
                    <View>
                      <Text className="text-xs font-bold text-muted-foreground uppercase mb-1">Amount Paid</Text>
                      <Text className="text-foreground font-semibold">{formatCents(selectedInvoice.amountPaidCents)}</Text>
                    </View>
                    <View className="h-px bg-border" />
                    <View className="flex-row justify-between items-center">
                      <Text className="text-xs font-bold text-muted-foreground uppercase">Status</Text>
                      <StatusBadge status={selectedInvoice.status} />
                    </View>
                  </CardContent>
                </Card>
                
                {selectedInvoice.status !== 'PAID' && (
                  <Button
                    onPress={() => setIsPaymentFormVisible(true)}
                    className="w-full mt-4"
                  >
                    <Text className="text-white font-bold text-lg">
                      Record Payment
                    </Text>
                  </Button>
                )}
              </ScrollView>
            </View>
          )}
        </SafeAreaView>
      </Modal>
      
      <RecordPaymentModal
        visible={isPaymentFormVisible}
        invoice={selectedInvoice}
        onClose={() => setIsPaymentFormVisible(false)}
        onSuccess={() => {
          setIsPaymentFormVisible(false);
          // Reload the invoice to show the updated amount/status
          void loadData();
          setSelectedInvoice(null);
        }}
      />
    </ScreenWrapper>
  );
}
