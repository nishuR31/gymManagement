import React from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { useForm, Controller } from "react-hook-form";
import { ArrowRight, BadgeCheck, Clock3, CreditCard, Dumbbell, MapPin, ShieldCheck, Sparkles, Users } from "lucide-react-native";
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

export function PublicHomeScreen() {
  const navigation = useNavigation<any>();
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
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView className="flex-1">
          {/* Hero Section */}
          <View className="relative h-[500px]">
            <Image 
              source={{ uri: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=800&q=80" }}
              className="absolute inset-0 w-full h-full opacity-60"
            />
            <View className="absolute inset-0 bg-background/40" />
            
            <View className="flex-1 justify-end p-6 pb-12">
              <View className="flex-row items-center bg-primary/20 self-start px-3 py-1.5 rounded-full mb-4">
                <Sparkles size={14} color="hsl(var(--primary))" />
                <Text className="text-primary font-bold ml-2 text-xs uppercase tracking-widest">{APP_NAME}</Text>
              </View>
              <Text className="text-4xl font-black text-foreground mb-4">
                Train with intent. Track every win.
              </Text>
              <Text className="text-muted-foreground font-medium text-base mb-6">
                Strength training, personal coaching, flexible memberships, and a front desk experience that keeps every visit moving.
              </Text>
              <Button onPress={() => navigation.navigate("Login")}>
                Member Login
              </Button>
            </View>
          </View>

          {/* Offerings Section */}
          <View className="p-6">
            <Text className="text-primary font-black uppercase text-xs tracking-widest mb-2">What members feel</Text>
            <Text className="text-3xl font-black text-foreground mb-6">A gym experience that feels organized.</Text>
            
            {offerings.map((item, index) => (
              <Card key={item.title} className="mb-4">
                <CardContent className="pt-6">
                  <View className="flex-row items-center justify-between mb-4">
                    <View className="h-10 w-10 bg-primary items-center justify-center rounded-md">
                      <item.icon size={20} color="hsl(var(--primary-foreground))" />
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
          <View className="p-6 pt-0">
            <Card>
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

                <Button onPress={handleSubmit(onSubmit)} className="mt-4" isLoading={isSubmitting}>
                  Send Inquiry
                </Button>
              </CardContent>
            </Card>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
