import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Smartphone } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector } from '../store/hooks';
import { themeColors } from '../constants/colors';
import { APP_NAME } from '../utils/env';

export function DownloadAppScreen() {
  const navigation = useNavigation<any>();
  const theme = useAppSelector((state) => state.theme.theme);
  const activeColors = themeColors[theme === 'dark' ? 'dark' : 'light'];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
      <View className="flex-row items-center px-4 py-3 border-b border-border bg-card">
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 mr-2">
          <ChevronLeft size={24} color={activeColors.foreground} />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-foreground">Get the App</Text>
      </View>

      <ScrollView className="flex-1 p-6">
        <View className="bg-primary/90 border border-primary/50 rounded-3xl p-8 items-center mt-8">
          <View className="w-20 h-20 bg-white/20 rounded-2xl items-center justify-center mb-6">
            <Smartphone size={40} color="#ffffff" />
          </View>
          <Text className="text-3xl font-black text-primary-foreground text-center mb-4">Get {APP_NAME}</Text>
          <Text className="text-primary-foreground/90 font-medium text-center text-lg mb-10 px-2 leading-relaxed">
            Help your gym buddies download the app instantly by having them scan this QR code.
          </Text>
          <View className="bg-white p-4 rounded-3xl shadow-xl border-4 border-white/20">
            <Image 
              source={{ uri: "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://valorfitness.example.com/download" }}
              className="w-[200px] h-[200px]"
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
