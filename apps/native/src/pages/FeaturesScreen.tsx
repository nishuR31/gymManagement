import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Dumbbell, Smartphone, QrCode, TrendingUp, Calendar, Zap } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector } from '../store/hooks';
import { themeColors } from '../constants/colors';
import { APP_NAME } from '../utils/env';

export function FeaturesScreen() {
  const navigation = useNavigation<any>();
  const theme = useAppSelector((state) => state.theme.theme);
  const activeColors = themeColors[theme === 'dark' ? 'dark' : 'light'];

  const features = [
    {
      icon: QrCode,
      title: "Instant Check-ins",
      description: "Walk in, scan your digital QR code, and get straight to training without fumbling for a physical card."
    },
    {
      icon: TrendingUp,
      title: "Attendance Tracking",
      description: "Monitor your gym visits, track your consistency, and view your historical attendance records."
    },
    {
      icon: Calendar,
      title: "Flexible Memberships",
      description: "View your current plan details, upcoming renewals, and manage your billing securely from your phone."
    },
    {
      icon: Dumbbell,
      title: "Personalized Plans",
      description: "Stay in sync with your coaches. View upcoming classes and follow customized workout schedules."
    },
    {
      icon: Smartphone,
      title: "Dark Mode & Themes",
      description: "Customize the app to your liking with support for minimal, glass, and clay styles."
    },
    {
      icon: Zap,
      title: "Fast & Responsive",
      description: "Built for speed. The app is lightweight, loads instantly, and keeps you moving."
    }
  ];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
      <View className="flex-row items-center px-4 py-3 border-b border-border bg-card">
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 mr-2">
          <ChevronLeft size={24} color={activeColors.foreground} />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-foreground">App Features</Text>
      </View>

      <ScrollView className="flex-1 p-6">
        <View className="mb-8">
          <Text className="text-3xl font-black text-foreground mb-3 tracking-tight">Everything you need to train.</Text>
          <Text className="text-base font-medium text-muted-foreground leading-6">
            The {APP_NAME} app puts your gym membership directly in your pocket.
          </Text>
        </View>

        <View className="gap-4 pb-12">
          {features.map((feature, index) => (
            <View key={index} className="bg-card/50 p-5 rounded-2xl border border-border shadow-sm flex-row gap-4">
              <View className="h-12 w-12 bg-primary/20 rounded-xl items-center justify-center shrink-0">
                <feature.icon size={24} color={activeColors.primary} />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-bold text-foreground mb-1">{feature.title}</Text>
                <Text className="text-muted-foreground leading-5 text-sm">{feature.description}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
