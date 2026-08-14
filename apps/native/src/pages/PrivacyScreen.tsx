import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector } from '../store/hooks';
import { themeColors } from '../constants/colors';
import { APP_NAME } from '../utils/env';

export function PrivacyScreen() {
  const navigation = useNavigation<any>();
  const theme = useAppSelector((state) => state.theme.theme);
  const activeColors = themeColors[theme === 'amoled' ? 'amoled' : theme === 'dark' ? 'dark' : 'light'];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
      <View className="flex-row items-center px-4 py-3 border-b border-border bg-card">
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 mr-2">
          <ChevronLeft size={24} color={activeColors.foreground} />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-foreground">Privacy Policy</Text>
      </View>

      <ScrollView className="flex-1 p-6">
        <View className="mb-8">
          <Text className="text-3xl font-black text-foreground mb-2 tracking-tight">Privacy Policy</Text>
          <Text className="text-sm font-medium text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</Text>
        </View>

        <View className="bg-card/30 p-6 rounded-2xl border border-border shadow-sm mb-12 gap-8">
          <View>
            <Text className="text-xl font-bold text-foreground mb-2">Information We Collect</Text>
            <Text className="text-muted-foreground leading-6">
              We collect information you provide directly to us, such as when you create or modify your account, request services, contact customer support, or otherwise communicate with us. This includes your name, email address, phone number, and physical fitness information provided during sign-up.
            </Text>
          </View>

          <View>
            <Text className="text-xl font-bold text-foreground mb-2">Use of Information</Text>
            <Text className="text-muted-foreground leading-6">
              We use the information we collect about you to provide, maintain, and improve our services, including to process transactions, send you technical notices, updates, security alerts, and support messages. We may also use this information to tailor your fitness experience at {APP_NAME}.
            </Text>
          </View>

          <View>
            <Text className="text-xl font-bold text-foreground mb-2">Sharing of Information</Text>
            <Text className="text-muted-foreground leading-6">
              We do not share your personal information with third parties except as described in this policy, such as with vendors, consultants, and other service providers who need access to such information to carry out work on our behalf. We never sell your personal data.
            </Text>
          </View>

          <View>
            <Text className="text-xl font-bold text-foreground mb-2">Contact Us</Text>
            <Text className="text-muted-foreground leading-6">
              If you have any questions about this Privacy Policy, please contact us at support@valorfitness.example.com or visit us directly at the gym's front desk.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
