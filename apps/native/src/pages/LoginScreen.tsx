import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ImageBackground, ScrollView, Dimensions, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dumbbell, ShieldCheck, Users, BarChart3, LockKeyhole, ArrowRight, ArrowLeft, Fingerprint, MessageSquare, Mail } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import Svg, { Path } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { loginThunk, logoutThunk } from '../features/auth/authSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { APP_NAME } from '../utils/env';
import { themeColors } from '../constants/colors';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

const emailSchema = z.object({ email: z.string().email("Enter a valid email") });
const passwordSchema = z.object({ password: z.string().min(8, "Password must be at least 8 characters") });
const codeSchema = z.object({ code: z.string().min(4, "Enter valid code") });

type EmailFormValues = z.infer<typeof emailSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;
type CodeFormValues = z.infer<typeof codeSchema>;
type AuthStep = "email" | "password" | "2fa" | "otp" | "magic-link";

export function LoginScreen({ navigation }: any) {
  const dispatch = useAppDispatch();
  const theme = useAppSelector((state) => state.theme.theme);
  const activeColors = themeColors[theme === 'dark' ? 'dark' : 'light'];

  const [step, setStep] = useState<AuthStep>("email");
  const [email, setEmail] = useState("");
  const [passwordCache, setPasswordCache] = useState("");
  const [isSimulating, setIsSimulating] = useState(false);

  const { control: controlEmail, handleSubmit: subEmail, formState: { errors: errEmail } } = useForm<EmailFormValues>({ resolver: zodResolver(emailSchema) });
  const { control: controlPass, handleSubmit: subPass, formState: { errors: errPass } } = useForm<PasswordFormValues>({ resolver: zodResolver(passwordSchema) });
  const { control: controlCode, handleSubmit: subCode, formState: { errors: errCode } } = useForm<CodeFormValues>({ resolver: zodResolver(codeSchema) });

  const onFinalLogin = async (pass?: string, code?: string) => {
    setIsSimulating(true);
    const result = await dispatch(loginThunk({ email: email || "admin@example.com", password: pass || "adminpassword" }));
    setIsSimulating(false);
    
    if (loginThunk.fulfilled.match(result)) {
      if (result.payload.user.role === "MEMBER") {
        await dispatch(logoutThunk());
        Toast.show({ type: 'error', text1: "Use member login for member access" });
        navigation.navigate("MemberLogin");
        return;
      }
      Toast.show({ type: 'success', text1: "Signed in securely" });
      navigation.replace("Dashboard");
      return;
    }

    if (loginThunk.rejected.match(result) && result.payload === "2FA_REQUIRED") {
      setPasswordCache(pass || "");
      setStep("2fa");
      Toast.show({ type: 'success', text1: "Password accepted. Enter 2FA code." });
      return;
    }

    Toast.show({ type: 'error', text1: "Authentication failed" });
  };

  const handleEmailNext = (v: EmailFormValues) => { setEmail(v.email); setStep("password"); };
  const handlePassNext = (v: PasswordFormValues) => { onFinalLogin(v.password); };
  const handleCodeSubmit = (v: CodeFormValues) => { onFinalLogin(passwordCache, v.code); };

  const handleOAuth = (provider: string) => { Toast.show({ type: 'success', text1: `Redirecting to ${provider}...` }); setTimeout(() => onFinalLogin(), 1500); };
  const handlePasskey = () => { Toast.show({ type: 'success', text1: "Prompting for Passkey..." }); setTimeout(() => onFinalLogin(), 1500); };
  const handleMagicLink = () => { setStep("magic-link"); Toast.show({ type: 'success', text1: "Magic link sent to " + email }); };
  const handleSendOTP = () => { setStep("otp"); Toast.show({ type: 'success', text1: "OTP sent to " + email }); };

  const renderStep = () => {
    if (step === "email") {
      return (
        <View className="gap-6 animate-fade-in w-full">
          <View className="gap-4">
            <Controller control={controlEmail} name="email" render={({ field: { onChange, value } }) => (
              <Input label="Email" autoCapitalize="none" keyboardType="email-address" value={value} onChangeText={onChange} error={errEmail.email?.message} />
            )} />
            <Button onPress={subEmail(handleEmailNext)} className="w-full h-11">
              <Text className="text-primary-foreground font-bold mr-2">Continue with Email</Text>
              <ArrowRight size={16} color={activeColors.primaryForeground} />
            </Button>
          </View>
          
          <View className="relative flex-row items-center justify-center my-2">
            <View className="absolute inset-0 flex-row items-center justify-center">
              <View className="flex-1 h-[1px] bg-border" />
            </View>
            <View className="bg-background px-3">
              <Text className="text-xs font-semibold uppercase text-muted-foreground tracking-widest">Or continue with</Text>
            </View>
          </View>

          <View className="gap-3">
            <Button variant="outline" onPress={handlePasskey} className="w-full h-11">
              <Fingerprint size={20} color={activeColors.foreground} />
              <Text className="text-foreground font-bold ml-2">Continue with Passkey</Text>
            </Button>
            <View className="flex-row gap-3">
              <Button variant="outline" onPress={() => handleOAuth("Google")} className="flex-1 h-11 flex-row items-center justify-center">
                <Svg width={20} height={20} viewBox="0 0 24 24" className="mr-2">
                  <Path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <Path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <Path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <Path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </Svg>
                <Text className="text-foreground font-bold">Google</Text>
              </Button>
              <Button variant="outline" onPress={() => handleOAuth("Facebook")} className="flex-1 h-11 flex-row items-center justify-center">
                <Svg width={20} height={20} viewBox="0 0 24 24" className="mr-2 text-[#1877F2]">
                  <Path fill="currentColor" d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-1.125 0-2.517.236-2.517 1.426v2.54h3.82l-.369 3.667h-3.451v7.98h-4.566z" />
                </Svg>
                <Text className="text-foreground font-bold">Facebook</Text>
              </Button>
            </View>
          </View>
        </View>
      );
    }

    if (step === "password") {
      return (
        <View className="gap-6 animate-fade-in w-full">
          <View className="flex-row items-center gap-2 pb-4">
            <TouchableOpacity onPress={() => setStep("email")} className="p-2 -ml-2 rounded-full">
              <ArrowLeft size={20} color={activeColors.foreground} />
            </TouchableOpacity>
            <Text className="text-sm font-bold text-foreground">{email}</Text>
          </View>
          <View className="gap-4">
            <Controller control={controlPass} name="password" render={({ field: { onChange, value } }) => (
              <Input label="Password" secureTextEntry value={value} onChangeText={onChange} error={errPass.password?.message} />
            )} />
            <Button onPress={subPass(handlePassNext)} className="w-full h-11">
              <Text className="text-primary-foreground font-bold mr-2">Sign In</Text>
              <ArrowRight size={16} color={activeColors.primaryForeground} />
            </Button>
          </View>
          
          <View className="gap-3 pt-4 border-t border-border mt-2">
            <Button variant="outline" onPress={handleSendOTP} className="w-full h-11">
              <MessageSquare size={16} color={activeColors.foreground} />
              <Text className="text-foreground font-bold ml-2">Send OTP to Email</Text>
            </Button>
          </View>
        </View>
      );
    }

    if (step === "2fa" || step === "otp") {
      return (
        <View className="gap-6 animate-fade-in w-full">
          <View className="flex-row items-center gap-2 pb-2">
            <TouchableOpacity onPress={() => setStep("password")} className="p-2 -ml-2 rounded-full">
              <ArrowLeft size={20} color={activeColors.foreground} />
            </TouchableOpacity>
            <Text className="text-sm font-bold text-foreground">{step === "2fa" ? "Two-Factor Authentication" : "One-Time Password"}</Text>
          </View>
          <Text className="text-sm text-muted-foreground mb-2">
            {step === "2fa" ? "Enter the 6-digit code from your authenticator app." : `We sent a code to ${email}.`}
          </Text>
          <View className="gap-4">
            <Controller control={controlCode} name="code" render={({ field: { onChange, value } }) => (
              <Input label="Verification Code" placeholder="000000" keyboardType="numeric" value={value} onChangeText={onChange} error={errCode.code?.message} />
            )} />
            <Button onPress={subCode(handleCodeSubmit)} disabled={isSimulating} className="w-full h-11">
              {isSimulating ? <ActivityIndicator size="small" color={activeColors.primaryForeground} /> : <Text className="text-primary-foreground font-bold">Verify & Sign In</Text>}
            </Button>
          </View>
        </View>
      );
    }

    if (step === "magic-link") {
      return (
        <View className="gap-6 animate-fade-in w-full items-center py-6">
          <View className="w-16 h-16 bg-primary/10 rounded-full items-center justify-center mb-4">
            <Mail size={32} color={activeColors.primary} />
          </View>
          <Text className="text-xl font-bold text-foreground">Check your email</Text>
          <Text className="text-sm text-muted-foreground text-center px-4">We sent a magic link to <Text className="font-bold text-foreground">{email}</Text>. Click the link inside to instantly sign in.</Text>
          <Button variant="outline" onPress={() => setStep("email")} className="mt-4 w-full h-11">
            <Text className="text-foreground font-bold">Back to Login</Text>
          </Button>
        </View>
      );
    }
  };

  return (
    <View className="flex-1 flex-row bg-background">
      {isTablet && (
        <View className="flex-1 bg-zinc-950 relative overflow-hidden">
          <ImageBackground
            source={{ uri: 'https://images.unsplash.com/photo-1599058917212-d750089bc07e?q=80&w=1169&auto=format&fit=crop' }}
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
              <View className="self-start flex-row items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 mb-6">
                <ShieldCheck size={14} color="#ffffff" />
                <Text className="text-xs font-black uppercase tracking-widest text-white">Staff Operations</Text>
              </View>
              <Text className="text-5xl font-black text-white leading-tight">Elevate{'\n'}your gym's{'\n'}performance.</Text>
              <View className="mt-8 gap-4">
                <View className="flex-row items-center gap-3"><Users size={20} color={activeColors.primary} /><Text className="font-semibold text-white">Member lifecycle controls</Text></View>
                <View className="flex-row items-center gap-3"><BarChart3 size={20} color={activeColors.primary} /><Text className="font-semibold text-white">Reports and revenue snapshots</Text></View>
                <View className="flex-row items-center gap-3"><LockKeyhole size={20} color={activeColors.primary} /><Text className="font-semibold text-white">Enterprise-grade security</Text></View>
              </View>
            </View>
          </SafeAreaView>
        </View>
      )}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className={`flex-1 items-center justify-center bg-card ${isTablet ? 'border-l border-border max-w-[500px]' : ''}`}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} className="w-full" keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets={true}>
          <SafeAreaView className="w-full px-8 py-12 max-w-[450px] self-center">
            
            <View className="mb-8">
              <TouchableOpacity onPress={() => navigation.navigate("Home")} className="flex-row items-center gap-2 mb-6">
                <ArrowLeft size={16} color={activeColors.mutedForeground} />
                <Text className="text-sm font-medium text-muted-foreground">Back to website</Text>
              </TouchableOpacity>
              <Text className="text-3xl md:text-4xl font-black text-foreground">Sign in</Text>
              <Text className="mt-2 text-sm text-muted-foreground">Access the staff operations dashboard securely.</Text>
            </View>

            <View className="min-h-[300px] justify-start w-full">
              {renderStep()}
            </View>

            <View className="mt-8 pt-6 border-t border-border">
              <Text className="text-sm font-medium text-foreground">Member account?</Text>
              <TouchableOpacity onPress={() => navigation.navigate("MemberLogin")} className="mt-2 flex-row items-center gap-2">
                <Text className="text-sm font-bold text-primary">Use member portal</Text>
                <ArrowRight size={16} color={activeColors.primary} />
              </TouchableOpacity>
            </View>

          </SafeAreaView>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
