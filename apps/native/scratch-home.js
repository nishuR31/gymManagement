const fs = require('fs');
const content = fs.readFileSync('src/pages/PublicHomeScreen.tsx', 'utf8');

// The goal is to create the complete rewritten PublicHomeScreen.tsx
const newContent = `import { useState } from 'react';
import { View, Text, ScrollView, Image, KeyboardAvoidingView, Platform, TouchableOpacity, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from "react-hook-form";
import { Dumbbell, ShieldCheck, Sparkles, ArrowRight, Users, History, MapPin, CheckCircle, CreditCard } from "lucide-react-native";
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
import { AppDock } from '../components/layout/AppDock';
import { Footer } from '../components/layout/Footer';
import { SectionBackground } from '../components/ui/SectionBackground';
import { useTheme } from '../hooks/useTheme';

const inquirySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.union([
    z.string().regex(/^\\+?[0-9\\s\\-()]{8,15}$/, "Enter a valid phone number (e.g. +91 9876543210)"),
    z.literal("")
  ]),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

type InquiryForm = z.infer<typeof inquirySchema>;

export function PublicHomeScreen() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const navigation = useNavigation<any>();
  const { isDark } = useTheme();

  // We use standard hex colors for icons since lucide-react-native requires string colors
  // and we removed the theme colors dictionary to rely on CSS variables.
  const primaryColor = isDark ? '#B9825A' : '#7A4E2D';

  const { control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<InquiryForm>({
    resolver: zodResolver(inquirySchema),
    defaultValues: { name: "", email: "", phone: "", message: "" }
  });

  const onSubmit = async (data: InquiryForm): Promise<void> => {
    try {
      await submitPublicInquiry(data);
      Toast.show({ type: 'success', text1: 'Inquiry sent!', text2: "We'll get back to you shortly." });
      reset();
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Could not send inquiry', text2: getApiErrorMessage(error, "Please try again later.") });
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background relative">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: isTablet ? 120 : 80 }}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={true}
        >
          {/* Hero Section */}
          <View className="relative min-h-[600px] lg:min-h-[700px] justify-center">
            <SectionBackground 
              source={require('../../assets/home/hero.webp')} 
              overlayOpacity={0.4} 
              gradient={true} 
            />

            {/* Top Navigation */}
            <View className="absolute top-4 left-4 z-10 flex-row items-center gap-2 bg-black/50 rounded-full px-4 py-2">
              <Dumbbell size={18} color={primaryColor} />
              <Text className="text-white font-bold text-sm">{APP_NAME}</Text>
            </View>

            {/* Centered content */}
            <View className="w-full max-w-7xl self-center px-6 pt-24 pb-12 flex-col lg:flex-row z-10">
              {/* Left Column */}
              <View className="flex-1 justify-center lg:pt-12">
                <View className="flex-row items-center bg-primary/20 self-start px-3 py-1.5 rounded-full mb-4">
                  <Sparkles size={14} color={primaryColor} />
                  <Text className="text-primary font-bold ml-2 text-xs uppercase tracking-widest">{APP_NAME}</Text>
                </View>
                <Text
                  className="text-5xl md:text-[64px] font-bold text-on-media-foreground leading-[1.1] mb-4 drop-shadow-sm tracking-tight"
                  numberOfLines={2}
                  adjustsFontSizeToFit
                >
                  Train with intent.{'\\n'}Track every win.
                </Text>
                <Text className="text-on-media-muted font-medium text-base md:text-xl mb-8 max-w-2xl leading-relaxed">
                  Strength training, personal coaching, flexible memberships, and a front desk experience that keeps every visit moving.
                </Text>

                <View className="flex-row flex-wrap gap-3">
                  <Button onPress={() => navigation.navigate("Plans")} rightIcon={<ArrowRight size={16} color="#ffffff" />}>
                    Explore Plans
                  </Button>
                  <Button variant="outline" className="bg-black/30 border-white/20" onPress={() => navigation.navigate("MemberLogin")}>
                    <Text className="text-white font-bold">Member Login</Text>
                  </Button>
                </View>
              </View>
            </View>
          </View>

          {/* Feature Cards Section */}
          <View className="w-full relative z-20 pb-12 overflow-hidden bg-background">
            <View className={\`relative z-10 w-full max-w-7xl self-center px-6 pt-12 flex-col md:flex-row justify-between gap-4\`}>
              <Card className="flex-1 min-w-[280px]">
                <CardContent className="p-4 pt-4 flex-row items-center gap-4">
                  <View className="h-10 w-10 bg-primary/10 rounded-md items-center justify-center">
                    <MapPin size={18} color={primaryColor} />
                  </View>
                  <View className="flex-1 flex-col justify-center">
                    <Text className="text-sm font-bold text-foreground mb-0.5">Single-gym focus</Text>
                    <Text className="text-xs font-medium text-muted-foreground">Built for one serious training floor</Text>
                  </View>
                </CardContent>
              </Card>
              <Card className="flex-1 min-w-[280px]">
                <CardContent className="p-4 pt-4 flex-row items-center gap-4">
                  <View className="h-10 w-10 bg-primary/10 rounded-md items-center justify-center">
                    <CheckCircle size={18} color={primaryColor} />
                  </View>
                  <View className="flex-1 flex-col justify-center">
                    <Text className="text-sm font-bold text-foreground mb-0.5">Coached workflows</Text>
                    <Text className="text-xs font-medium text-muted-foreground">Members, plans, attendance, billing</Text>
                  </View>
                </CardContent>
              </Card>
              <Card className="flex-1 min-w-[280px]">
                <CardContent className="p-4 pt-4 flex-row items-center gap-4">
                  <View className="h-10 w-10 bg-primary/10 rounded-md items-center justify-center">
                    <Sparkles size={18} color={primaryColor} />
                  </View>
                  <View className="flex-1 flex-col justify-center">
                    <Text className="text-sm font-bold text-foreground mb-0.5">Operational clarity</Text>
                    <Text className="text-xs font-medium text-muted-foreground">Staff tools without admin clutter</Text>
                  </View>
                </CardContent>
              </Card>
            </View>
          </View>

          {/* Bottom Sections with Immersive Background */}
          <View className="relative w-full bg-background overflow-hidden min-h-[800px]">
            <SectionBackground 
              source={require('../../assets/home/experience.webp')} 
              overlayOpacity={0.65} 
            />

            <View className="relative z-10 w-full max-w-7xl self-center px-6 py-16 flex-col lg:flex-row gap-12">
              {/* Left Column */}
              <View className="flex-1 lg:pr-8">
                <Text className="text-primary font-bold uppercase text-xs tracking-widest mb-3 drop-shadow-sm">What members feel</Text>
                <Text className="text-4xl md:text-5xl font-bold text-on-media-foreground mb-10 leading-[1.1] drop-shadow-md">
                  A gym experience that feels{'\\n'}organized from warm-up to{'\\n'}checkout.
                </Text>

                {/* Offerings Cards */}
                <View className="flex-col gap-4 w-full">
                  <Card className="w-full bg-black/40 border-white/10">
                    <CardContent className="p-5 pt-5">
                      <Text className="text-white font-bold text-lg mb-4 leading-tight">Strength floor</Text>
                      <View className="flex-row justify-between items-center mb-6">
                        <View className="h-10 w-10 bg-primary rounded-md items-center justify-center">
                          <Dumbbell size={18} color="#ffffff" />
                        </View>
                        <Text className="font-mono text-white/50 font-bold text-xs">01</Text>
                      </View>
                      <Text className="text-white/70 text-sm leading-relaxed">Purpose-built training space for progressive strength, conditioning blocks, and focused solo sessions.</Text>
                    </CardContent>
                  </Card>

                  <Card className="w-full bg-black/40 border-white/10">
                    <CardContent className="p-5 pt-5">
                      <Text className="text-white font-bold text-lg mb-4 leading-tight">Personal coaching</Text>
                      <View className="flex-row justify-between items-center mb-6">
                        <View className="h-10 w-10 bg-primary rounded-md items-center justify-center">
                          <ShieldCheck size={18} color="#ffffff" />
                        </View>
                        <Text className="font-mono text-white/50 font-bold text-xs">02</Text>
                      </View>
                      <Text className="text-white/70 text-sm leading-relaxed">Coaches keep plans, check-ins, and member progress aligned so accountability feels natural.</Text>
                    </CardContent>
                  </Card>
                </View>
              </View>

              {/* Right Column: Contact Form */}
              <View className="w-full lg:w-[420px]">
                <Card className="bg-surface border-border h-full">
                  <CardContent className="p-6 pt-6">
                    <Text className="text-xl font-bold text-foreground mb-2">Contact {APP_NAME}</Text>
                    <Text className="text-muted-foreground text-sm mb-6">Have a question or want to join? Drop us a message.</Text>

                    <Controller control={control} name="name" render={({ field: { onChange, onBlur, value } }) => (
                      <Input label="Your Name" onBlur={onBlur} onChangeText={onChange} value={value} error={errors.name?.message} placeholder="John Smith" />
                    )} />

                    <Controller control={control} name="email" render={({ field: { onChange, onBlur, value } }) => (
                      <Input label="Email Address" onBlur={onBlur} onChangeText={onChange} value={value} error={errors.email?.message} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" />
                    )} />

                    <Controller control={control} name="phone" render={({ field: { onChange, onBlur, value } }) => (
                      <Input label="Phone (Optional)" onBlur={onBlur} onChangeText={onChange} value={value} error={errors.phone?.message} keyboardType="phone-pad" placeholder="+91 9876543210" />
                    )} />

                    <Controller control={control} name="message" render={({ field: { onChange, onBlur, value } }) => (
                      <Input label="Message" onBlur={onBlur} onChangeText={onChange} value={value} error={errors.message?.message} multiline numberOfLines={4} className="min-h-[100px] mb-2" placeholder="Tell us what you're looking for…" />
                    )} />

                    <Button onPress={handleSubmit(onSubmit)} className="mt-6 w-full" isLoading={isSubmitting} rightIcon={<ArrowRight size={16} color="#ffffff" />}>
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
    </SafeAreaView>
  );
}
`;

fs.writeFileSync('src/pages/PublicHomeScreen.tsx', newContent);
