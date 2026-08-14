import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ImageBackground, ScrollView, Dimensions, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ArrowRight, Fingerprint, Dumbbell, UserRound, KeyRound, BadgeCheck } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';

import { useAppDispatch } from '../store/hooks';
import { memberLoginThunk } from '../features/auth/authSlice';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { APP_NAME } from '../utils/env';
import { themeColors } from '../constants/colors';
import { useAppSelector } from '../store/hooks';

const emailSchema = z.object({ email: z.string().email("Enter a valid email") });
const passwordSchema = z.object({ password: z.string().min(8, "Password must be at least 8 characters") });
const codeSchema = z.object({ code: z.string().min(4, "Enter valid code") });

type EmailFormValues = z.infer<typeof emailSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;
type CodeFormValues = z.infer<typeof codeSchema>;
type AuthStep = "login" | "2fa" | "otp";

const { width } = Dimensions.get('window');

export function MemberLoginScreen() {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<any>();
  const theme = useAppSelector((state) => state.theme.theme);
  const activeColors = themeColors[theme === 'amoled' ? 'amoled' : theme === 'dark' ? 'dark' : 'light'];

  const [step, setStep] = useState<AuthStep>("login");
  const [email, setEmail] = useState("");
  const [passwordCache, setPasswordCache] = useState("");
  const [isSimulating, setIsSimulating] = useState(false);

  const { control: controlLogin, handleSubmit: subLogin, formState: { errors: errLogin } } = useForm<EmailFormValues & PasswordFormValues>({ resolver: zodResolver(emailSchema.merge(passwordSchema)) });
  const { control: controlCode, handleSubmit: subCode, formState: { errors: errCode } } = useForm<CodeFormValues>({ resolver: zodResolver(codeSchema) });

  const onFinalLogin = async (pass?: string) => {
    setIsSimulating(true);
    const result = await dispatch(memberLoginThunk({ email: email || "john@example.com", password: pass || "password123" }));
    setIsSimulating(false);

    if (memberLoginThunk.fulfilled.match(result)) {
      if (result.payload.user.mustChangePassword) {
        Toast.show({ type: 'info', text1: 'Password change required' });
        return;
      }
      Toast.show({ type: 'success', text1: 'Welcome back!' });
      navigation.replace("Dashboard");
      return;
    }

    if (result.payload === "NOT_A_MEMBER") {
      Toast.show({ type: 'error', text1: `You are not a member of ${APP_NAME}` });
      return;
    }

    Toast.show({ type: 'error', text1: 'Authentication failed' });
  };

  const handleLoginNext = (v: EmailFormValues & PasswordFormValues) => {
    setEmail(v.email);
    setPasswordCache(v.password);
    setStep("2fa");
    Toast.show({ type: 'success', text1: 'Credentials accepted. Enter 2FA code.' });
  };
  const handleCodeSubmit = () => { onFinalLogin(passwordCache); };

  const handlePasskey = () => { Toast.show({ type: 'info', text1: "Prompting for Passkey..." }); setTimeout(() => onFinalLogin(), 1500); };

  const renderStep = () => {
    if (step === "login") {
      return (
        <View className="space-y-6 animate-fade-in mt-4">
          <Controller control={controlLogin} name="email" render={({ field: { onChange, onBlur, value } }) => (
            <Input label="Member Email" onBlur={onBlur} onChangeText={onChange} value={value} error={errLogin.email?.message} autoCapitalize="none" keyboardType="email-address" />
          )} />
          <View className="mt-4">
            <Controller control={controlLogin} name="password" render={({ field: { onChange, onBlur, value } }) => (
              <Input label="Password" onBlur={onBlur} onChangeText={onChange} value={value} error={errLogin.password?.message} secureTextEntry />
            )} />
          </View>
          <Button onPress={subLogin(handleLoginNext)} className="mt-4">
            <View className="flex-row items-center justify-center">
              <Text className="text-primary-foreground font-bold mr-2">Sign In</Text>
              <ArrowRight size={16} color={activeColors.primaryForeground} />
            </View>
          </Button>

          <View className="flex-row items-center my-6">
            <View className="flex-1 h-px bg-border" />
            <Text className="mx-4 text-xs uppercase text-muted-foreground">Or continue with</Text>
            <View className="flex-1 h-px bg-border" />
          </View>

          <View className="gap-3">
            <Button variant="outline" onPress={handlePasskey}>
              <View className="flex-row items-center justify-center">
                <Fingerprint size={20} color={activeColors.foreground} style={{ marginRight: 8 }} />
                <Text className="text-foreground font-bold">Continue with Passkey</Text>
              </View>
            </Button>
          </View>
        </View>
      );
    }

    if (step === "2fa" || step === "otp") {
      return (
        <View className="space-y-6 mt-4">
          <View className="flex-row items-center gap-2 mb-4">
            <TouchableOpacity onPress={() => setStep("login")} className="p-2 rounded-full bg-secondary">
              <ArrowLeft size={16} color={activeColors.foreground} />
            </TouchableOpacity>
            <Text className="text-sm font-medium text-foreground">{step === "2fa" ? "Two-Factor Authentication" : "One-Time Password"}</Text>
          </View>
          <Text className="text-sm text-muted-foreground mb-4">
            {step === "2fa" ? "Enter the 6-digit code from your authenticator app." : `We sent a code to ${email}.`}
          </Text>
          <Controller control={controlCode} name="code" render={({ field: { onChange, onBlur, value } }) => (
            <Input label="Verification Code" onBlur={onBlur} onChangeText={onChange} value={value} error={errCode.code?.message} placeholder="000000" keyboardType="number-pad" />
          )} />
          <Button onPress={subCode(handleCodeSubmit)} disabled={isSimulating} className="mt-4">
             {isSimulating ? <ActivityIndicator color={activeColors.primaryForeground} /> : <Text className="text-primary-foreground font-bold">Verify &amp; Sign In</Text>}
          </Button>
        </View>
      );
    }
  };

  const isWide = width > 768;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets={true}>
        <View className={`flex-1 ${isWide ? 'flex-row' : 'flex-col'}`}>
          
          {/* Left Hero Section */}
          <View className={`${isWide ? 'w-1/2' : 'w-full h-56'} bg-zinc-950 relative overflow-hidden`}>
            <ImageBackground
              source={{ uri: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=1169&auto=format&fit=crop" }}
              className="absolute inset-0 w-full h-full opacity-50"
              resizeMode="cover"
            />
            <View className="absolute inset-0 bg-black/40" />
            
            <View className="flex-1 justify-between p-6 pt-10">
              <TouchableOpacity onPress={() => navigation.navigate("Home")} className="flex-row items-center gap-3">
                <View className="w-9 h-9 bg-primary items-center justify-center rounded-lg shadow-lg">
                  <Dumbbell size={18} color={activeColors.primaryForeground} />
                </View>
                <Text className="text-lg font-black text-white">{APP_NAME}</Text>
              </TouchableOpacity>
              
              {!isWide && (
                <View className="mt-4">
                  <Text className="text-2xl font-black text-white leading-tight">Unlock your true potential.</Text>
                </View>
              )}

              {isWide && (
                <View className="mb-12">
                  <View className="flex-row items-center self-start bg-white/20 px-4 py-1.5 rounded-full mb-6 border border-white/30">
                    <UserRound size={14} color="#FFF" />
                    <Text className="text-white font-black text-xs uppercase tracking-widest ml-2">Member Access</Text>
                  </View>
                  <Text className="text-5xl font-black text-white leading-tight mb-8">Unlock{'\n'}your true{'\n'}potential.</Text>
                  <View className="gap-4">
                    <View className="flex-row items-center gap-3"><BadgeCheck size={20} color={activeColors.primary} /><Text className="font-semibold text-white">Track your training progress</Text></View>
                    <View className="flex-row items-center gap-3"><KeyRound size={20} color={activeColors.primary} /><Text className="font-semibold text-white">Manage your memberships</Text></View>
                    <View className="flex-row items-center gap-3"><Dumbbell size={20} color={activeColors.primary} /><Text className="font-semibold text-white">Book classes and sessions</Text></View>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* Right Form Section */}
          <View className={`${isWide ? 'w-1/2' : 'flex-1'} bg-card border-l border-border justify-center p-6`}>
            <View className="w-full max-w-md self-center">
              
              <TouchableOpacity onPress={() => navigation.navigate("Home")} className="flex-row items-center gap-2 mb-8">
                <ArrowLeft size={16} color={activeColors.mutedForeground} />
                <Text className="text-sm font-medium text-muted-foreground">Back to website</Text>
              </TouchableOpacity>
              
              <Text className="text-3xl font-black text-foreground mb-2">Member Login</Text>
              <Text className="text-sm text-muted-foreground mb-6">Access your personal gym portal securely.</Text>

              <View className="min-h-[280px]">
                {renderStep()}
              </View>

              <View className="mt-8 pt-6 border-t border-border">
                <Text className="text-sm font-medium text-foreground">Staff or Administrator?</Text>
                <TouchableOpacity onPress={() => navigation.navigate("Login")} className="flex-row items-center mt-2">
                  <Text className="text-sm font-bold text-primary mr-2">Use staff portal</Text>
                  <ArrowRight size={14} color={activeColors.primary} />
                </TouchableOpacity>
              </View>
              
            </View>
          </View>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
