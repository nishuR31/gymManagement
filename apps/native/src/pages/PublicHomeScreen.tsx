import { useState, useRef } from 'react';
import { View, Text, ScrollView, Image, KeyboardAvoidingView, Platform, TouchableOpacity, useWindowDimensions, Pressable, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from "react-hook-form";
import { CreditCard, Dumbbell, ShieldCheck, Sparkles, ArrowRight, Settings, Users, History, MapPin, CheckCircle, Calendar, Clock } from "lucide-react-native";
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
import { AppDock } from '../components/layout/AppDock';
import { ApiSettingsModal } from '../components/ApiSettingsModal';
import { Footer } from '../components/layout/Footer';

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
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const navigation = useNavigation<any>();
  const theme = useAppSelector((state) => state.theme.theme);
  const activeColors = themeColors[theme === 'amoled' ? 'amoled' : theme === 'dark' ? 'dark' : 'light'];

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const spinValue = useRef(new Animated.Value(0)).current;

  const accessToken = useAppSelector((state) => state.auth.accessToken);

  const handleSettingsPress = () => {
    setIsSettingsOpen(true);
    Animated.sequence([
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(spinValue, {
        toValue: 0,
        duration: 0,
        useNativeDriver: true,
      })
    ]).start();
  };

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg']
  });
  const [isCalendarHovered, setIsCalendarHovered] = useState(false);

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
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: isTablet ? 120 : 80 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets={true}>

          {/* Hero Section */}
          <View className="relative min-h-[600px] lg:min-h-[700px] justify-center">
            <Image
              source={{ uri: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=1600&q=80" }}
              className="absolute inset-0 w-full h-full opacity-90"
              resizeMode="cover"
            />
            {/* Dark masking gradient from top (for nav) and bottom (to blend into black) */}
            <View className="absolute inset-0 bg-black/10" />
            <View className="absolute inset-0 bg-gradient-to-b from-background/50 via-transparent to-background" />

            {/* Top Navigation Accents */}
            <View className="absolute top-4 left-4 z-10 flex-row items-center gap-2 bg-black/50 rounded-full px-4 py-2">
              <Dumbbell size={18} color={activeColors.primary} />
              <Text className="text-white font-black text-sm">{APP_NAME}</Text>
            </View>

            <TouchableOpacity onPress={handleSettingsPress} className="absolute top-4 right-4 p-2.5 bg-black/50 rounded-full z-10">
              <Animated.View style={{ transform: [{ rotate: spin }] }}>
                <Settings size={20} color="#ffffff" />
              </Animated.View>
            </TouchableOpacity>

            {/* Centered content wrapper */}
            <View className="w-full max-w-7xl self-center px-6 pt-24 pb-12 flex-row z-10">
              {/* Left Column */}
              <View className="flex-1 justify-center lg:pt-12">
                <View className="flex-row items-center bg-primary/20 self-start px-3 py-1.5 rounded-full mb-4">
                  <Sparkles size={14} color={activeColors.primary} />
                  <Text className="text-primary font-bold ml-2 text-xs uppercase tracking-widest">{APP_NAME}</Text>
                </View>
                <Text 
                  className="text-5xl md:text-7xl lg:text-[80px] font-black text-foreground leading-[1.1] mb-4 drop-shadow-sm tracking-tight"
                  numberOfLines={2}
                  adjustsFontSizeToFit
                >
                  Train with intent.{'\n'}Track every win.
                </Text>
                <Text className="text-muted-foreground font-medium text-base md:text-xl mb-8 max-w-2xl leading-relaxed">
                  Strength training, personal coaching, flexible memberships, and a front desk experience that keeps every visit moving.
                </Text>

                <View className="flex-row flex-wrap gap-3">
                  <Button onPress={() => navigation.navigate("Plans")} rightIcon={<ArrowRight size={16} color={activeColors.primaryForeground} />}>
                    View Plans
                  </Button>
                </View>
              </View>

              {/* Right Column (Desktop Only) */}
              {isTablet && (
                <View className="w-[420px] justify-center pl-12 lg:pt-12">
                  <Card className="mb-4 bg-zinc-950/80 border-zinc-800">
                    <CardContent className="p-4 pt-4 flex-row items-center gap-4">
                        <View className="h-12 w-12 bg-[#c59a58] rounded-md items-center justify-center">
                          <Users size={24} color="#000" />
                        </View>
                        <View className="flex-col justify-center">
                          <Text className="text-xs font-black text-zinc-400 uppercase tracking-wider mb-0.5">Member-first</Text>
                          <Text className="text-sm font-bold text-white">Live floor ops</Text>
                        </View>
                    </CardContent>
                  </Card>
                  <Card className="mb-4 bg-zinc-950/80 border-zinc-800">
                    <CardContent className="p-4 pt-4 flex-row items-center gap-4">
                        <View className="h-12 w-12 bg-[#c59a58] rounded-md items-center justify-center">
                          <History size={24} color="#000" />
                        </View>
                        <View className="flex-col justify-center">
                          <Text className="text-xs font-black text-zinc-400 uppercase tracking-wider mb-0.5">Fast Desk</Text>
                          <Text className="text-sm font-bold text-white">Check-ins in seconds</Text>
                        </View>
                    </CardContent>
                  </Card>
                  <Card className="bg-zinc-950/80 border-zinc-800">
                    <CardContent className="p-4 pt-4 flex-row items-center gap-4">
                        <View className="h-12 w-12 bg-[#c59a58] rounded-md items-center justify-center">
                          <ShieldCheck size={24} color="#000" />
                        </View>
                        <View className="flex-col justify-center">
                          <Text className="text-xs font-black text-zinc-400 uppercase tracking-wider mb-0.5">Secure</Text>
                          <Text className="text-sm font-bold text-white">Role-based access</Text>
                        </View>
                    </CardContent>
                  </Card>
                </View>
              )}
            </View>
          </View>

          {/* Three Feature Cards Section */}
          <View className="bg-background w-full relative z-20 pb-12">
             <View className={`w-full max-w-7xl self-center px-6 flex-row flex-wrap justify-between gap-4 ${isTablet ? 'flex-nowrap' : ''}`}>
                 <Card className="flex-1 min-w-[280px] bg-zinc-900 border-zinc-800">
                    <CardContent className="p-4 pt-4 flex-row items-center gap-4">
                        <View className="h-10 w-10 bg-zinc-800 rounded-md items-center justify-center">
                           <MapPin size={18} color="#c59a58" />
                        </View>
                        <View className="flex-1 flex-col justify-center">
                           <Text className="text-sm font-bold text-white mb-0.5">Single-gym focus</Text>
                           <Text className="text-xs font-medium text-zinc-400">Built for one serious training floor</Text>
                        </View>
                    </CardContent>
                 </Card>
                 <Card className="flex-1 min-w-[280px] bg-zinc-900 border-zinc-800">
                    <CardContent className="p-4 pt-4 flex-row items-center gap-4">
                        <View className="h-10 w-10 bg-zinc-800 rounded-md items-center justify-center">
                           <CheckCircle size={18} color="#c59a58" />
                        </View>
                        <View className="flex-1 flex-col justify-center">
                           <Text className="text-sm font-bold text-white mb-0.5">Coached workflows</Text>
                           <Text className="text-xs font-medium text-zinc-400">Members, plans, attendance, billing</Text>
                        </View>
                    </CardContent>
                 </Card>
                 <Card className="flex-1 min-w-[280px] bg-zinc-900 border-zinc-800">
                    <CardContent className="p-4 pt-4 flex-row items-center gap-4">
                        <View className="h-10 w-10 bg-zinc-800 rounded-md items-center justify-center">
                           <Sparkles size={18} color="#c59a58" />
                        </View>
                        <View className="flex-1 flex-col justify-center">
                           <Text className="text-sm font-bold text-white mb-0.5">Operational clarity</Text>
                           <Text className="text-xs font-medium text-zinc-400">Staff tools without admin clutter</Text>
                        </View>
                    </CardContent>
                 </Card>
             </View>
          </View>

          {/* Bottom Sections with Immersive Background */}
          <View className="relative w-full bg-background overflow-hidden min-h-[800px]">
            <View className="absolute inset-0 bg-gradient-to-b from-background via-background/20 to-background/60" style={{ pointerEvents: 'none' }} />
            <Image
              source={{ uri: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=1600&q=80" }}
              className="absolute inset-0 w-full h-full opacity-80"
              resizeMode="cover"
            />
            {/* Top gradient to blend with the black section above */}
            <View className="absolute inset-0 bg-gradient-to-b from-background via-background/20 to-background/80 pointer-events-none" />

            <View className="relative z-10 w-full max-w-7xl self-center px-6 py-16 flex-col lg:flex-row gap-12">
              
              {/* Left Column: What Members Feel */}
              <View className="flex-1">
                <View className="flex-row items-center self-start bg-black/60 px-4 py-2.5 rounded-full border border-white/5 mb-8 gap-6 z-50">
                  <View className="relative">
                    {/* @ts-ignore */}
                    <Pressable 
                      onHoverIn={() => setIsCalendarHovered(true)} 
                      onHoverOut={() => setIsCalendarHovered(false)}
                      className="flex-row items-center cursor-pointer"
                    >
                       <Calendar size={14} color="#c59a58" />
                       <Text className="text-white text-xs font-bold ml-2">Sat, Aug 15</Text>
                    </Pressable>
                    {isCalendarHovered && (
                      <View className="absolute top-8 left-0 bg-zinc-900 border border-zinc-800 rounded-lg p-4 w-56 shadow-2xl mt-2 z-50">
                        <View className="mb-3 border-b border-zinc-800 pb-3">
                          <Text className="text-white font-bold text-sm">Saturday, August 15</Text>
                          <Text className="text-[#c59a58] font-medium text-xs mt-0.5">2:38 PM</Text>
                        </View>
                        <Text className="text-white font-bold mb-2 text-sm text-center">August 2026</Text>
                        <View className="flex-row justify-between mb-1">
                          {['S','M','T','W','T','F','S'].map((d, i) => (
                            <Text key={i} className="text-zinc-500 text-[10px] w-6 text-center">{d}</Text>
                          ))}
                        </View>
                        <View className="flex-row flex-wrap">
                          {Array.from({ length: 31 }).map((_, i) => (
                            <Text key={i} className={`text-[10px] w-6 text-center my-1.5 ${i + 1 === 15 ? 'text-[#c59a58] font-bold bg-[#c59a58]/10 rounded' : 'text-zinc-300'}`}>
                              {i + 1}
                            </Text>
                          ))}
                        </View>
                      </View>
                    )}
                  </View>
                  <View className="flex-row items-center">
                     <Clock size={14} color="#c59a58" />
                     <Text className="text-white text-xs font-bold ml-2">2:38 PM</Text>
                  </View>
                </View>

                <Text className="text-[#c59a58] font-black uppercase text-xs tracking-widest mb-3 drop-shadow-sm">What members feel</Text>
                <Text className="text-4xl md:text-5xl font-black text-white mb-10 leading-[1.1] drop-shadow-md">
                  A gym experience that feels{'\n'}organized from warm-up to{'\n'}checkout.
                </Text>

                {/* Offerings Cards (Horizontal) */}
                <View className="flex-row flex-wrap gap-4 w-full">
                  <Card className="flex-1 min-w-[220px] bg-[#1a1a1a]/90 border-transparent">
                    <CardContent className="p-5 pt-5">
                      <Text className="text-white font-bold text-lg mb-4 leading-tight">Strength floor</Text>
                      <View className="flex-row justify-between items-center mb-6">
                        <View className="h-10 w-10 bg-[#c59a58] rounded-md items-center justify-center">
                          <Dumbbell size={18} color="#000" />
                        </View>
                        <Text className="font-mono text-zinc-500 font-black text-xs">01</Text>
                      </View>
                      <Text className="text-zinc-400 text-sm leading-relaxed">Purpose-built training space for progressive strength, conditioning blocks, and focused solo sessions.</Text>
                    </CardContent>
                  </Card>
                  
                  <Card className="flex-1 min-w-[220px] bg-[#1a1a1a]/90 border-transparent">
                    <CardContent className="p-5 pt-5">
                      <Text className="text-white font-bold text-lg mb-4 leading-tight">Personal coaching</Text>
                      <View className="flex-row justify-between items-center mb-6">
                        <View className="h-10 w-10 bg-[#c59a58] rounded-md items-center justify-center">
                          <ShieldCheck size={18} color="#000" />
                        </View>
                        <Text className="font-mono text-zinc-500 font-black text-xs">02</Text>
                      </View>
                      <Text className="text-zinc-400 text-sm leading-relaxed">Coaches keep plans, check-ins, and member progress aligned so accountability feels natural.</Text>
                    </CardContent>
                  </Card>

                  <Card className="flex-1 min-w-[220px] bg-[#1a1a1a]/90 border-transparent">
                    <CardContent className="p-5 pt-5">
                      <Text className="text-white font-bold text-lg mb-4 leading-tight">Flexible plans</Text>
                      <View className="flex-row justify-between items-center mb-6">
                        <View className="h-10 w-10 bg-[#c59a58] rounded-md items-center justify-center">
                          <CreditCard size={18} color="#000" />
                        </View>
                        <Text className="font-mono text-zinc-500 font-black text-xs">03</Text>
                      </View>
                      <Text className="text-zinc-400 text-sm leading-relaxed">Memberships are clear, renewable, and easy for the front desk to manage without friction.</Text>
                    </CardContent>
                  </Card>
                </View>
              </View>

              {/* Right Column: Contact Form */}
              <View className="w-full lg:w-[420px]">
                <Card className="bg-[#1a1a1a]/90 border-transparent h-full">
                  <CardContent className="p-6">
                    <Text className="text-xl font-bold text-white mb-6">Contact {APP_NAME}</Text>

                    <Controller control={control} name="name" render={({ field: { onChange, onBlur, value } }) => (
                      <Input label="Name" onBlur={onBlur} onChangeText={onChange} value={value} error={errors.name?.message} className="bg-[#111111] border-transparent" />
                    )} />

                    <Controller control={control} name="email" render={({ field: { onChange, onBlur, value } }) => (
                      <Input label="Email" onBlur={onBlur} onChangeText={onChange} value={value} error={errors.email?.message} autoCapitalize="none" keyboardType="email-address" className="bg-[#111111] border-transparent" />
                    )} />

                    <Controller control={control} name="phone" render={({ field: { onChange, onBlur, value } }) => (
                      <Input label="Phone" onBlur={onBlur} onChangeText={onChange} value={value} error={errors.phone?.message} keyboardType="phone-pad" className="bg-[#111111] border-transparent" />
                    )} />

                    <Controller control={control} name="message" render={({ field: { onChange, onBlur, value } }) => (
                      <Input label="Message" onBlur={onBlur} onChangeText={onChange} value={value} error={errors.message?.message} multiline numberOfLines={4} className="min-h-[100px] bg-[#111111] border-transparent mb-2" />
                    )} />

                    <Button onPress={handleSubmit(onSubmit)} className="mt-8 w-full bg-[#c59a58]" isLoading={isSubmitting} rightIcon={<ArrowRight size={16} color="#ffffff" />}>
                      <Text className="text-white font-bold">Send Inquiry</Text>
                    </Button>
                  </CardContent>
                </Card>
              </View>
            </View>
          </View>
          <Footer />
        </ScrollView>
      </KeyboardAvoidingView>
      <AppDock />
      <ApiSettingsModal visible={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </SafeAreaView>
  );
}
