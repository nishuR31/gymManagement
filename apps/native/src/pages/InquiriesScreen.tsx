import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MessageSquare, Search } from 'lucide-react-native';
import Toast from 'react-native-toast-message';

import { Card, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useAppSelector } from '../store/hooks';
import { themeColors } from '../constants/colors';
import * as publicApi from '../features/public/publicApi';
import type { PublicInquiryDto } from '@gym/shared';
import { formatDateTime } from '../utils/format';

export function InquiriesScreen() {
  const theme = useAppSelector((state) => state.theme.theme);
  const activeColors = themeColors[theme === 'amoled' ? 'amoled' : theme === 'dark' ? 'dark' : 'light'];

  const [inquiries, setInquiries] = useState<PublicInquiryDto[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState<PublicInquiryDto | null>(null);

  const loadData = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const response = await publicApi.listInquiries({
        page: 1,
        pageSize: 50,
      });
      setInquiries(response.data);
    } catch {
      Toast.show({ type: 'error', text1: 'Could not load inquiries' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredInquiries = inquiries.filter(i => 
    i.name.toLowerCase().includes(search.toLowerCase()) || 
    i.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadData} tintColor={activeColors.primary} />} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        
        <View className="mb-6 bg-card border border-border p-4 rounded-lg shadow-sm">
          <Text className="text-xs font-black uppercase tracking-[0.18em] text-primary">Leads</Text>
          <Text className="mt-2 text-3xl font-black text-foreground">Inquiries</Text>
          <Text className="mt-1 text-sm font-semibold text-muted-foreground mb-4">Messages from the public website</Text>
          
          <View className="relative justify-center">
            <Input
              placeholder="Search inquiries..."
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
            {filteredInquiries.length === 0 && !isLoading ? (
              <View className="items-center py-12 px-4">
                <MessageSquare size={32} color={activeColors.mutedForeground} className="mb-2" />
                <Text className="font-bold text-foreground">No inquiries found</Text>
              </View>
            ) : (
              <View>
                {filteredInquiries.map((inquiry, index) => (
                  <TouchableOpacity 
                    key={inquiry.id} 
                    onPress={() => setSelectedInquiry(inquiry)}
                    className={`flex-row justify-between items-center p-4 ${index !== filteredInquiries.length - 1 ? 'border-b border-border' : ''}`}
                  >
                    <View className="flex-row items-center flex-1 mr-2">
                      <View className="w-10 h-10 bg-secondary items-center justify-center rounded-full mr-3">
                        <MessageSquare size={20} color={activeColors.primary} />
                      </View>
                      <View className="flex-1">
                        <Text className="font-bold text-foreground text-base" numberOfLines={1}>
                          {inquiry.name}
                        </Text>
                        <Text className="text-xs font-semibold text-muted-foreground">{inquiry.email}</Text>
                      </View>
                    </View>
                    <View className="items-end">
                      <View className={`px-2 py-0.5 rounded-full border ${inquiry.status === 'NEW' ? 'bg-primary/10 border-primary/20' : 'bg-secondary border-border'}`}>
                        <Text className={`text-[10px] uppercase font-bold ${inquiry.status === 'NEW' ? 'text-primary' : 'text-muted-foreground'}`}>{inquiry.status}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </CardContent>
        </Card>

      </ScrollView>

      <Modal visible={!!selectedInquiry} animationType="slide" presentationStyle="pageSheet">
        <View className="flex-1 bg-background pt-12">
          {selectedInquiry && (
            <View className="flex-1">
              <View className="flex-row justify-between items-center px-4 pb-4 border-b border-border">
                <Text className="text-xl font-bold text-foreground">Inquiry Details</Text>
                <Button variant="outline" onPress={() => setSelectedInquiry(null)} className="h-8 px-4">Close</Button>
              </View>
              
              <ScrollView className="p-4" contentContainerStyle={{ paddingBottom: 60 }}>
                <Card className="mb-4">
                  <CardContent className="p-4 gap-4">
                    <View>
                      <Text className="text-xs font-bold text-muted-foreground uppercase">From</Text>
                      <Text className="text-foreground mt-1 font-bold">{selectedInquiry.name}</Text>
                      <Text className="text-muted-foreground">{selectedInquiry.email}</Text>
                      <Text className="text-muted-foreground">{selectedInquiry.phone || 'No phone'}</Text>
                    </View>
                    <View className="h-px bg-border" />
                    <View>
                      <Text className="text-xs font-bold text-muted-foreground uppercase">Message</Text>
                      <Text className="text-foreground mt-2">{selectedInquiry.message}</Text>
                    </View>
                    <View className="h-px bg-border" />
                    <View>
                      <Text className="text-xs font-bold text-muted-foreground uppercase">Received</Text>
                      <Text className="text-foreground mt-1">{formatDateTime(selectedInquiry.createdAt)}</Text>
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
