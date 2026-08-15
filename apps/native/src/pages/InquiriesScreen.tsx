import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MessageSquare, Search, X } from 'lucide-react-native';
import Toast from 'react-native-toast-message';

import { Card, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { StatusBadge } from '../components/ui/StatusBadge';
import { EmptyState } from '../components/ui/EmptyState';
import { ScreenWrapper, PageHeader } from '../components/layout/ScreenWrapper';
import { useTheme } from '../hooks/useTheme';
import * as inquiryApi from '../features/inquiries/inquiryApi';
import type { InquiryDto } from '@gym/shared';
import { formatDateTime } from '../utils/format';

export function InquiriesScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [inquiries, setInquiries] = useState<InquiryDto[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState<InquiryDto | null>(null);

  const loadData = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      const response = await inquiryApi.listInquiries({ page: 1, pageSize: 50 });
      setInquiries(response.data);
    } catch {
      Toast.show({ type: 'error', text1: 'Could not load inquiries' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  const filteredInquiries = inquiries.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.email.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <ScreenWrapper refreshing={isLoading} onRefresh={loadData}>
      <PageHeader
        label="Leads"
        title="Inquiries"
        subtitle="Messages from the public website"
      />

      <View className="mb-4">
        <Input
          placeholder="Search inquiries..."
          value={search}
          onChangeText={setSearch}
          leftIcon={<Search size={16} color={colors.mutedForeground} />}
        />
      </View>

      <Card>
        <CardContent className="p-0">
          {filteredInquiries.length === 0 && !isLoading ? (
            <View className="p-4">
              <EmptyState icon={MessageSquare} title="No inquiries found" />
            </View>
          ) : (
            <View>
              {filteredInquiries.map((inquiry, index) => (
                <TouchableOpacity
                  key={inquiry.id}
                  onPress={() => setSelectedInquiry(inquiry)}
                  className={`flex-row justify-between items-center p-4 ${
                    index !== filteredInquiries.length - 1 ? 'border-b border-border' : ''
                  }`}
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-center flex-1 mr-2">
                    <View
                      style={{ backgroundColor: colors.primarySoft }}
                      className="w-10 h-10 items-center justify-center rounded-xl mr-3"
                    >
                      <MessageSquare size={20} color={colors.primary} />
                    </View>
                    <View className="flex-1">
                      <Text className="font-bold text-foreground text-base" numberOfLines={1}>
                        {inquiry.name}
                      </Text>
                      <Text className="text-xs font-semibold text-muted-foreground" numberOfLines={1}>
                        {inquiry.email}
                      </Text>
                    </View>
                  </View>
                  <StatusBadge status={inquiry.status} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </CardContent>
      </Card>

      {/* Inquiry detail modal — cross-platform */}
      <Modal
        visible={!!selectedInquiry}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setSelectedInquiry(null)}
        statusBarTranslucent
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'left', 'right']}>
          {selectedInquiry && (
            <View style={{ flex: 1 }}>
              <View
                style={{ borderBottomColor: colors.border }}
                className="flex-row justify-between items-center px-4 py-3 border-b"
              >
                <Text className="text-xl font-black text-foreground">Inquiry Details</Text>
                <TouchableOpacity
                  onPress={() => setSelectedInquiry(null)}
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
                <Card className="mb-4">
                  <CardContent className="p-4 gap-4">
                    <View>
                      <Text className="text-xs font-bold text-muted-foreground uppercase mb-1">From</Text>
                      <Text className="text-foreground font-bold">{selectedInquiry.name}</Text>
                      <Text className="text-muted-foreground text-sm">{selectedInquiry.email}</Text>
                      <Text className="text-muted-foreground text-sm">{selectedInquiry.phone || 'No phone'}</Text>
                    </View>
                    <View className="h-px bg-border" />
                    <View>
                      <Text className="text-xs font-bold text-muted-foreground uppercase mb-1">Status</Text>
                      <StatusBadge status={selectedInquiry.status} />
                    </View>
                    <View className="h-px bg-border" />
                    <View>
                      <Text className="text-xs font-bold text-muted-foreground uppercase mb-1">Message</Text>
                      <Text className="text-foreground mt-1 leading-relaxed">{selectedInquiry.message}</Text>
                    </View>
                    <View className="h-px bg-border" />
                    <View>
                      <Text className="text-xs font-bold text-muted-foreground uppercase mb-1">Received</Text>
                      <Text className="text-foreground font-semibold">{formatDateTime(selectedInquiry.createdAt)}</Text>
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
