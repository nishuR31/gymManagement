import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ImageBackground, ScrollView, Dimensions, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dumbbell, ArrowRight, ArrowLeft } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { registerThunk, loginThunk, logoutThunk, setTokens, bootstrapAuthThunk } from '../features/auth/authSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setRefreshToken } from '../services/api';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import Svg, { Path } from 'react-native-svg';
import { APP_NAME } from '../utils/env';
import { themeColors } from '../constants/colors';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

const signupSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters")
});

type SignupFormValues = z.infer<typeof signupSchema>;

export function SignupScreen({ navigation }: any) {
  const dispatch = useAppDispatch();
  const theme = useAppSelector((state) => state.theme.theme);
  const activeColors = themeColors[theme === 'dark' ? 'dark' : 'light'];

  const [isSubmitting, setIsSubmitting] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<SignupFormValues>({ 
    resolver: zodResolver(signupSchema) 
  });

  const onSubmit = async (values: SignupFormValues) => {
    setIsSubmitting(true);
    try {
      await dispatch(registerThunk({
        ...values,
        role: "MEMBER" // default role for public signups
      })).unwrap();
      
      Toast.show({ type: 'success', text1: "Account created successfully!" });
      // Automatically login
      await dispatch(loginThunk({ email: values.email, password: values.password }));
      navigation.replace("MemberLogin");
    } catch (err: any) {
      Toast.show({ type: 'error', text1: typeof err === 'string' ? err : "Failed to create account" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignup = async () => {
    try {
      setIsSubmitting(true);
      const redirectUrl = Linking.createURL('/auth/callback');
      const authUrl = `http://localhost:4000/api/auth/google?redirect=${encodeURIComponent(redirectUrl)}`;

      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);

      if (result.type === 'success' && result.url) {
        const urlObj = new URL(result.url);
        const accessToken = urlObj.searchParams.get('accessToken');
        const refreshToken = urlObj.searchParams.get('refreshToken');
        
        if (accessToken && refreshToken) {
          await setRefreshToken(refreshToken);
          dispatch(setTokens({ accessToken }));
          
          const bootstrapResult = await dispatch(bootstrapAuthThunk());
          
          if (bootstrapAuthThunk.fulfilled.match(bootstrapResult)) {
            if (bootstrapResult.payload.user.role === "MEMBER") {
              await dispatch(logoutThunk());
              Toast.show({ type: 'error', text1: "Use member login for member access" });
              navigation.navigate("MemberLogin");
              return;
            }
            Toast.show({ type: 'success', text1: "Signed in securely" });
            navigation.replace("Dashboard");
            return;
          }
        }
        Toast.show({ type: 'error', text1: "Google Auth failed or missing tokens" });
      }
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e.message || "Google Auth failed" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View className="flex-1 flex-row bg-background">
      {isTablet && (
        <View className="flex-1 bg-zinc-950 relative overflow-hidden">
          <ImageBackground
            source={{ uri: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1170&auto=format&fit=crop' }}
            className="absolute inset-0 w-full h-full opacity-40"
            resizeMode="cover"
          />
          <SafeAreaView className="flex-1 justify-between p-10 z-10">
            <View className="flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <Dumbbell size={20} color="#ffffff" />
              </View>
              <Text className="text-xl font-black text-white">{APP_NAME}</Text>
            </View>
            <View>
              <Text className="text-5xl font-black text-white leading-tight">Join us{'\n'}today.</Text>
              <View className="mt-8 gap-4">
                <Text className="text-lg text-zinc-300">Start your fitness journey with Valor.</Text>
              </View>
            </View>
          </SafeAreaView>
        </View>
      )}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className={`flex-1 items-center justify-center bg-card ${isTablet ? 'border-l border-border max-w-[500px]' : ''}`}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} className="w-full" keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets={true}>
          <SafeAreaView className="w-full px-8 py-12 max-w-[450px] self-center">
            
            <View className="mb-8">
              <TouchableOpacity onPress={() => navigation.navigate("Login")} className="flex-row items-center gap-2 mb-6">
                <ArrowLeft size={16} color={activeColors.mutedForeground} />
                <Text className="text-sm font-medium text-muted-foreground">Back to login</Text>
              </TouchableOpacity>
              <Text className="text-3xl md:text-4xl font-black text-foreground">Sign up</Text>
              <Text className="mt-2 text-sm text-muted-foreground">Create a new account.</Text>
            </View>

            <View className="gap-4 w-full">
              <View className="flex-row gap-4 w-full">
                <View className="flex-1">
                  <Controller control={control} name="firstName" render={({ field: { onChange, value } }) => (
                    <Input label="First Name" value={value} onChangeText={onChange} error={errors.firstName?.message} />
                  )} />
                </View>
                <View className="flex-1">
                  <Controller control={control} name="lastName" render={({ field: { onChange, value } }) => (
                    <Input label="Last Name" value={value} onChangeText={onChange} error={errors.lastName?.message} />
                  )} />
                </View>
              </View>
              <Controller control={control} name="email" render={({ field: { onChange, value } }) => (
                <Input label="Email" autoCapitalize="none" keyboardType="email-address" value={value} onChangeText={onChange} error={errors.email?.message} />
              )} />
              <Controller control={control} name="password" render={({ field: { onChange, value } }) => (
                <Input label="Password" secureTextEntry value={value} onChangeText={onChange} error={errors.password?.message} />
              )} />
              
              <Button onPress={handleSubmit(onSubmit)} disabled={isSubmitting} className="w-full h-11 mt-2">
                {isSubmitting ? (
                  <ActivityIndicator size="small" color={activeColors.primaryForeground} />
                ) : (
                  <>
                    <Text className="text-primary-foreground font-bold mr-2">Create Account</Text>
                    <ArrowRight size={16} color={activeColors.primaryForeground} />
                  </>
                )}
              </Button>
            </View>

            <View className="mt-6 flex-row items-center justify-center relative">
              <View className="absolute inset-0 flex-row items-center justify-center">
                <View className="flex-1 h-[1px] bg-border" />
              </View>
              <View className="bg-background px-3">
                <Text className="text-xs font-semibold uppercase text-muted-foreground tracking-widest">Or continue with</Text>
              </View>
            </View>

            <View className="mt-6">
              <Button variant="outline" onPress={handleGoogleSignup} className="w-full h-11 flex-row items-center justify-center">
                <Svg width={20} height={20} viewBox="0 0 24 24" className="mr-2">
                  <Path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <Path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <Path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <Path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </Svg>
                <Text className="text-foreground font-bold">Google</Text>
              </Button>
            </View>

            <View className="mt-8 pt-6 border-t border-border">
              <Text className="text-sm font-medium text-foreground">Already have an account?</Text>
              <TouchableOpacity onPress={() => navigation.navigate("Login")} className="mt-2 flex-row items-center gap-2">
                <Text className="text-sm font-bold text-primary">Sign in instead</Text>
                <ArrowRight size={16} color={activeColors.primary} />
              </TouchableOpacity>
            </View>

          </SafeAreaView>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
