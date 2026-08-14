import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CreditCard, Search, FileText } from 'lucide-react-native';
import Toast from 'react-native-toast-message';

import { Card, CardContent } from '../components/ui/Card';
import { FloatingDock } from '../components/layout/FloatingDock';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useAppSelector } from '../store/hooks';
import { themeColors } from '../constants/colors';
import type { InvoiceDto } from '@gym/shared';
import { formatCents, formatDateTime } from '../utils/format';

export function PaymentsScreen() {
  const theme = useAppSelector((state) => state.theme.theme);
  const activeColors = themeColors[theme === 'amoled' ? 'amoled' : theme === 'dark' ? 'dark' : 'light'];

  // Payments screen shows recent invoices (all members overview from dashboard)
  // The API provides member-specific invoice lookup; for admin overview, we use the dashboard summary
  const [invoices, setInvoices] = useState<InvoiceDto[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDto | null>(null);

  const loadData = async (): Promise<void> => {
    setIsLoading(true);
    try {
      // Load invoices from dashboard's recent payments or a known member
      // For a real admin payments list we'd need a /invoices endpoint
      // For now show an informative empty state with pull-to-refresh
      setInvoices([]);
    } catch {
      Toast.show({ type: 'error', text1: 'Could not load payments' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredInvoices = invoices.filter(inv =>
    inv.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadData} tintColor={activeColors.primary} />} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>

        <View className="mb-6 bg-card border border-border p-4 rounded-lg shadow-sm">
          <Text className="text-xs font-black uppercase tracking-[0.18em] text-primary">Sales</Text>
          <Text className="mt-2 text-3xl font-black text-foreground">Payments</Text>
          <Text className="mt-1 text-sm font-semibold text-muted-foreground mb-4">Invoice and payment tracking</Text>

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
            {filteredInvoices.length === 0 && !isLoading ? (
              <View className="items-center py-12 px-4">
                <CreditCard size={32} color={activeColors.mutedForeground} />
                <Text className="font-bold text-foreground mt-2">No payments found</Text>
                <Text className="text-sm text-muted-foreground text-center mt-1">Use the web dashboard to view and manage payments</Text>
              </View>
            ) : (
              <View>
                {filteredInvoices.map((invoice, index) => (
                  <TouchableOpacity
                    key={invoice.id}
                    onPress={() => setSelectedInvoice(invoice)}
                    className={`flex-row justify-between items-center p-4 ${index !== filteredInvoices.length - 1 ? 'border-b border-border' : ''}`}
                  >
                    <View className="flex-row items-center flex-1 mr-2">
                      <View className="w-10 h-10 bg-secondary items-center justify-center rounded-full mr-3">
                        <FileText size={20} color={activeColors.primary} />
                      </View>
                      <View className="flex-1">
                        <Text className="font-bold text-foreground text-base" numberOfLines={1}>
                          Invoice {invoice.id.slice(0, 8)}
                        </Text>
                        <Text className="text-xs font-semibold text-muted-foreground">{formatDateTime(invoice.createdAt)}</Text>
                      </View>
                    </View>
                    <View className="items-end">
                      <Text className="font-black text-foreground text-lg">{formatCents(invoice.amountDueCents)}</Text>
                      <View className={`px-2 py-0.5 rounded-full border ${invoice.status === 'PAID' ? 'bg-green-500/10 border-green-500/20' : 'bg-secondary border-border'}`}>
                        <Text className={`text-[10px] uppercase font-bold ${invoice.status === 'PAID' ? 'text-green-500' : 'text-muted-foreground'}`}>{invoice.status}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </CardContent>
        </Card>

      </ScrollView>

      <Modal visible={!!selectedInvoice} animationType="slide" presentationStyle="pageSheet">
        <View className="flex-1 bg-background pt-12">
          {selectedInvoice && (
            <View className="flex-1">
              <View className="flex-row justify-between items-center px-4 pb-4 border-b border-border">
                <Text className="text-xl font-bold text-foreground">Invoice Details</Text>
                <Button variant="outline" onPress={() => setSelectedInvoice(null)} className="h-8 px-4">Close</Button>
              </View>

              <ScrollView className="p-4" contentContainerStyle={{ paddingBottom: 60 }}>
                <Card className="mb-4">
                  <CardContent className="p-4 gap-4">
                    <View>
                      <Text className="text-xs font-bold text-muted-foreground uppercase">Invoice ID</Text>
                      <Text className="text-foreground mt-1">{selectedInvoice.id}</Text>
                    </View>
                    <View className="h-px bg-border" />
                    <View>
                      <Text className="text-xs font-bold text-muted-foreground uppercase">Amount Due</Text>
                      <Text className="text-foreground mt-1 font-semibold">{formatCents(selectedInvoice.amountDueCents)}</Text>
                    </View>
                    <View className="h-px bg-border" />
                    <View>
                      <Text className="text-xs font-bold text-muted-foreground uppercase">Amount Paid</Text>
                      <Text className="text-foreground mt-1 font-semibold">{formatCents(selectedInvoice.amountPaidCents)}</Text>
                    </View>
                  </CardContent>
                </Card>
              </ScrollView>
            </View>
          )}
        </View>
      </Modal>

      <FloatingDock />
    </SafeAreaView>
  );
}
