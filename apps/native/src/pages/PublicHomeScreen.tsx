import { useState } from 'react';
import { View, Text, ScrollView, Image, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from "react-hook-form";
import { CreditCard, Dumbbell, ShieldCheck, Sparkles, ArrowRight, Settings, Smartphone } from "lucide-react-native";
import { APP_NAME } from "../utils/env";
import Toast from 'react-native-toast-message';
import { Button } from "../components/ui/Button";
import { Card, CardContent } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { submitPublicInquiry } from "../features/public/publicApi";
import { getApiErrorMessage } from "../utils/apiError";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigation } from '@react-navigation/native';
import { MiniCalendar } from '../components/ui/MiniCalendar';
import { PublicFloatingDock } from '../components/layout/PublicFloatingDock';
import { ApiSettingsModal } from '../components/ApiSettingsModal';

const inquirySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.union([
    z.string().regex(/^\+?[0-9\s\-()]{10,15}$/, "Invalid phone number format"),
    z.literal("")
  ]),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

type InquiryForm = z.infer<typeof inquirySchema>;

const offerings = [
  { title: "Strength floor", icon: Dumbbell, copy: "Purpose-built training space for progressive strength." },
  { title: "Personal coaching", icon: ShieldCheck, copy: "Coaches keep plans and member progress aligned." },
  { title: "Flexible plans", icon: CreditCard, copy: "Memberships are clear, renewable, and easy." }
];

import { useAppSelector } from '../store/hooks';
import { themeColors } from '../constants/colors';

export function PublicHomeScreen() {
  const navigation = useNavigation<any>();
  const theme = useAppSelector((state) => state.theme.theme);
  const activeColors = themeColors[theme === 'dark' ? 'dark' : 'light'];
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const { control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<InquiryForm>({
    resolver: zodResolver(inquirySchema),
    defaultValues: { name: "", email: "", phone: "", message: "" }
  });

  const onSubmit = async (data: InquiryForm): Promise<void> => {
    try {
      await submitPublicInquiry(data);
      Toast.show({ type: 'success', text1: 'Inquiry sent' });
      reset();
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Could not send inquiry', text2: getApiErrorMessage(error, "Error") });
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background relative">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets={true}>
          
          {/* Hero Section */}
          <View className="relative h-[500px]">
            <Image 
              source={{ uri: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=800&q=80" }}
              className="absolute inset-0 w-full h-full opacity-60"
              resizeMode="cover"
            />
            <View className="absolute inset-0 bg-background/40" />
            <View className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent pointer-events-none" />
            
            <TouchableOpacity onPress={() => setIsSettingsOpen(true)} className="absolute top-4 right-4 p-2 bg-black/50 rounded-full z-10">
              <Settings size={20} color="#ffffff" />
            </TouchableOpacity>

            <View className="flex-1 justify-end p-6 pb-12">
              <View className="flex-row items-center bg-primary/20 self-start px-3 py-1.5 rounded-full mb-4">
                <Sparkles size={14} color={activeColors.primary} />
                <Text className="text-primary font-bold ml-2 text-xs uppercase tracking-widest">{APP_NAME}</Text>
              </View>
              <Text className="text-4xl font-black text-foreground mb-4 drop-shadow-sm">
                Train with intent. Track every win.
              </Text>
              <Text className="text-muted-foreground font-medium text-base mb-6">
                Strength training, personal coaching, flexible memberships, and a front desk experience that keeps every visit moving.
              </Text>
              
              <View className="flex-row flex-wrap gap-3">
                <Button onPress={() => navigation.navigate("Plans")}>
                  <View className="flex-row items-center justify-center">
                    <Text className="text-primary-foreground font-bold mr-2">View Plans</Text>
                    <ArrowRight size={16} color={activeColors.primaryForeground} />
                  </View>
                </Button>
              </View>
            </View>
          </View>

          {/* Bottom Sections with Immersive Background */}
          <View className="relative w-full mt-6 bg-background overflow-hidden">
            <Image 
              source={{ uri: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=800&q=80" }}
              className="absolute inset-0 w-full h-full opacity-60"
              resizeMode="cover"
            />
            <View className="absolute inset-0 bg-background/20" />
            <View className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background pointer-events-none" />
            
            <View className="relative z-10">
              {/* Offerings Section */}
              <View className="p-6 bg-background/40">
                <View className="mb-6">
                  <MiniCalendar />
                </View>
                <Text className="text-primary font-black uppercase text-xs tracking-widest mb-2">What members feel</Text>
                <Text className="text-3xl font-black text-foreground mb-6">A gym experience that feels organized.</Text>
                
                {offerings.map((item, index) => (
                  <Card key={item.title} className="mb-4 bg-card/80">
                    <CardContent className="pt-6">
                      <View className="flex-row items-center justify-between mb-4">
                        <View className="h-10 w-10 bg-primary items-center justify-center rounded-md">
                          <item.icon size={20} color={activeColors.primaryForeground} />
                        </View>
                        <Text className="font-mono text-muted-foreground font-black text-xs">
                          {String(index + 1).padStart(2, "0")}
                        </Text>
                      </View>
                      <Text className="text-lg font-bold text-foreground mb-2">{item.title}</Text>
                      <Text className="text-muted-foreground leading-5">{item.copy}</Text>
                    </CardContent>
                  </Card>
                ))}
              </View>

              {/* Contact Form */}
              <View className="p-6 pt-0 bg-background/40">
                <Card className="bg-card/90">
                  <CardContent className="pt-6">
                    <Text className="text-xl font-bold text-foreground mb-4">Contact {APP_NAME}</Text>
                    
                    <Controller control={control} name="name" render={({ field: { onChange, onBlur, value } }) => (
                      <Input label="Name" onBlur={onBlur} onChangeText={onChange} value={value} error={errors.name?.message} />
                    )} />
                    
                    <Controller control={control} name="email" render={({ field: { onChange, onBlur, value } }) => (
                      <Input label="Email" onBlur={onBlur} onChangeText={onChange} value={value} error={errors.email?.message} autoCapitalize="none" keyboardType="email-address" />
                    )} />

                    <Controller control={control} name="phone" render={({ field: { onChange, onBlur, value } }) => (
                      <Input label="Phone" onBlur={onBlur} onChangeText={onChange} value={value} error={errors.phone?.message} keyboardType="phone-pad" />
                    )} />

                    <Controller control={control} name="message" render={({ field: { onChange, onBlur, value } }) => (
                      <Input label="Message" onBlur={onBlur} onChangeText={onChange} value={value} error={errors.message?.message} multiline numberOfLines={4} className="h-24" />
                    )} />

                    <Button onPress={() => handleSubmit(onSubmit)()} className="mt-4" isLoading={isSubmitting}>
                      <View className="flex-row items-center justify-center">
                        <ArrowRight size={16} color={activeColors.primaryForeground} style={{ marginRight: 8 }} />
                        <Text className="text-primary-foreground font-bold">Send Inquiry</Text>
                      </View>
                    </Button>
                  </CardContent>
                </Card>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <PublicFloatingDock />
      <ApiSettingsModal visible={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </SafeAreaView>
  );
}
