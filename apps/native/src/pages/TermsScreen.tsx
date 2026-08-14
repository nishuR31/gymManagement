import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector } from '../store/hooks';
import { themeColors } from '../constants/colors';
import { APP_NAME } from '../utils/env';

export function TermsScreen() {
  const navigation = useNavigation<any>();
  const theme = useAppSelector((state) => state.theme.theme);
  const activeColors = themeColors[theme === 'amoled' ? 'amoled' : theme === 'dark' ? 'dark' : 'light'];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
      <View className="flex-row items-center px-4 py-3 border-b border-border bg-card">
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 mr-2">
          <ChevronLeft size={24} color={activeColors.foreground} />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-foreground">Terms of Service</Text>
      </View>

      <ScrollView className="flex-1 p-6">
        <View className="mb-8">
          <Text className="text-3xl font-black text-foreground mb-2 tracking-tight">Terms of Service</Text>
          <Text className="text-sm font-medium text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</Text>
        </View>

        <View className="bg-card/30 p-6 rounded-2xl border border-border shadow-sm mb-12 gap-8">
          <View>
            <Text className="text-xl font-bold text-foreground mb-2">Acceptance of Terms</Text>
            <Text className="text-muted-foreground leading-6">
              By accessing and using {APP_NAME}'s application and facilities, you accept and agree to be bound by the terms and provision of this agreement.
            </Text>
          </View>

          <View>
            <Text className="text-xl font-bold text-foreground mb-2">Membership Guidelines</Text>
            <Text className="text-muted-foreground leading-6">
              Members must maintain an active subscription to access the facility. Sharing of access credentials or QR codes is strictly prohibited and may result in immediate termination of membership. All members are expected to re-rack weights, wipe down equipment after use, and maintain a respectful environment.
            </Text>
          </View>

          <View>
            <Text className="text-xl font-bold text-foreground mb-2">Payments and Cancellations</Text>
            <Text className="text-muted-foreground leading-6">
              All memberships are billed recursively according to the chosen plan. You may cancel your membership at any time, but no refunds will be provided for partial periods.
            </Text>
          </View>

          <View>
            <Text className="text-xl font-bold text-foreground mb-2">Liability Waiver</Text>
            <Text className="text-muted-foreground leading-6">
              By participating in activities at {APP_NAME}, you acknowledge the inherent risks associated with physical exercise. {APP_NAME} is not liable for any injuries sustained on the premises.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
