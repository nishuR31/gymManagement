import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ImageBackground, ScrollView, Dimensions, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dumbbell, ArrowRight, ArrowLeft, MessageSquare, Fingerprint } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { requestPasswordReset, verifyPasswordResetWith2FA, confirmPasswordReset } from '../features/auth/authApi';
import { useAppSelector } from '../store/hooks';
import { APP_NAME } from '../utils/env';
import { themeColors } from '../constants/colors';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

const emailSchema = z.object({ email: z.string().email("Enter a valid email") });
const codeSchema = z.object({ code: z.string().min(4, "Enter valid code") });
const passwordSchema = z.object({ password: z.string().min(8, "Password must be at least 8 characters") });

type EmailFormValues = z.infer<typeof emailSchema>;
type CodeFormValues = z.infer<typeof codeSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

export function ForgotPasswordScreen({ navigation }: any) {
  const theme = useAppSelector((state) => state.theme.theme);
  const activeColors = themeColors[theme === 'dark' ? 'dark' : 'light'];

  const [step, setStep] = useState<"email" | "method" | "2fa" | "new_password">("email");
  const [email, setEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { control: controlEmail, handleSubmit: subEmail, formState: { errors: errEmail } } = useForm<EmailFormValues>({ resolver: zodResolver(emailSchema) });
  const { control: controlCode, handleSubmit: subCode, formState: { errors: errCode } } = useForm<CodeFormValues>({ resolver: zodResolver(codeSchema) });
  const { control: controlPass, handleSubmit: subPass, formState: { errors: errPass } } = useForm<PasswordFormValues>({ resolver: zodResolver(passwordSchema) });

  const onEmailSubmit = async (v: EmailFormValues) => {
    setIsSubmitting(true);
    try {
      setEmail(v.email);
      await requestPasswordReset(v.email);
      setStep("method");
      Toast.show({ type: 'success', text1: "Options retrieved. Choose how to verify." });
    } catch (err: any) {
      Toast.show({ type: 'error', text1: typeof err === 'string' ? err : "Failed to request reset" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onCodeSubmit = async (v: CodeFormValues) => {
    setIsSubmitting(true);
    try {
      const res = await verifyPasswordResetWith2FA(email, v.code);
      setResetToken(res.resetToken);
      setStep("new_password");
      Toast.show({ type: 'success', text1: "Verified! Enter your new password." });
    } catch (err: any) {
      Toast.show({ type: 'error', text1: typeof err === 'string' ? err : "Failed to verify 2FA code" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onPassSubmit = async (v: PasswordFormValues) => {
    setIsSubmitting(true);
    try {
      if (!resetToken) {
        Toast.show({ type: 'error', text1: "Missing reset token" });
        return;
      }
      await confirmPasswordReset(resetToken, v.password);
      Toast.show({ type: 'success', text1: "Password reset successfully! Please log in." });
      navigation.navigate("Login");
    } catch (err: any) {
      Toast.show({ type: 'error', text1: typeof err === 'string' ? err : "Failed to reset password" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailLink = () => {
    Toast.show({ type: 'success', text1: "Reset link sent to your email!" });
    navigation.navigate("Login");
  };

  const handlePasskey = () => {
    Toast.show({ type: 'error', text1: "Passkey not implemented on native yet." });
  };

  const renderStep = () => {
    if (step === "email") {
      return (
        <View className="gap-6 animate-fade-in w-full">
          <View className="gap-4">
            <Controller control={controlEmail} name="email" render={({ field: { onChange, value } }) => (
              <Input label="Email Address" autoCapitalize="none" keyboardType="email-address" value={value} onChangeText={onChange} error={errEmail.email?.message} />
            )} />
            <Button onPress={subEmail(onEmailSubmit)} disabled={isSubmitting} className="w-full h-11">
              {isSubmitting ? <ActivityIndicator size="small" color={activeColors.primaryForeground} /> : (
                <>
                  <Text className="text-primary-foreground font-bold mr-2">Continue</Text>
                  <ArrowRight size={16} color={activeColors.primaryForeground} />
                </>
              )}
            </Button>
          </View>
        </View>
      );
    }

    if (step === "method") {
      return (
        <View className="gap-6 animate-fade-in w-full">
          <View className="flex-row items-center gap-2 pb-4">
            <TouchableOpacity onPress={() => setStep("email")} className="p-2 -ml-2 rounded-full">
              <ArrowLeft size={20} color={activeColors.foreground} />
            </TouchableOpacity>
            <Text className="text-sm font-bold text-foreground">{email}</Text>
          </View>
          <View className="gap-3">
            <Button variant="outline" onPress={handleEmailLink} className="w-full h-11">
              <Text className="text-foreground font-bold">Send Reset Link to Email</Text>
            </Button>
            <Button variant="outline" onPress={() => setStep("2fa")} className="w-full h-11">
              <MessageSquare size={16} color={activeColors.foreground} />
              <Text className="text-foreground font-bold ml-2">Verify with Authenticator App</Text>
            </Button>
            <Button variant="outline" onPress={handlePasskey} className="w-full h-11">
              <Fingerprint size={16} color={activeColors.foreground} />
              <Text className="text-foreground font-bold ml-2">Verify with Passkey</Text>
            </Button>
          </View>
        </View>
      );
    }

    if (step === "2fa") {
      return (
        <View className="gap-6 animate-fade-in w-full">
          <View className="flex-row items-center gap-2 pb-2">
            <TouchableOpacity onPress={() => setStep("method")} className="p-2 -ml-2 rounded-full">
              <ArrowLeft size={20} color={activeColors.foreground} />
            </TouchableOpacity>
            <Text className="text-sm font-bold text-foreground">Authenticator Code</Text>
          </View>
          <View className="gap-4">
            <Controller control={controlCode} name="code" render={({ field: { onChange, value } }) => (
              <Input label="Verification Code" placeholder="000000" keyboardType="numeric" value={value} onChangeText={onChange} error={errCode.code?.message} />
            )} />
            <Button onPress={subCode(onCodeSubmit)} disabled={isSubmitting} className="w-full h-11">
              {isSubmitting ? <ActivityIndicator size="small" color={activeColors.primaryForeground} /> : <Text className="text-primary-foreground font-bold">Verify Code</Text>}
            </Button>
          </View>
        </View>
      );
    }

    if (step === "new_password") {
      return (
        <View className="gap-6 animate-fade-in w-full">
          <View className="gap-4">
            <Controller control={controlPass} name="password" render={({ field: { onChange, value } }) => (
              <Input label="New Password" secureTextEntry value={value} onChangeText={onChange} error={errPass.password?.message} />
            )} />
            <Button onPress={subPass(onPassSubmit)} disabled={isSubmitting} className="w-full h-11">
              {isSubmitting ? <ActivityIndicator size="small" color={activeColors.primaryForeground} /> : <Text className="text-primary-foreground font-bold">Reset Password</Text>}
            </Button>
          </View>
        </View>
      );
    }
  };

  return (
    <View className="flex-1 flex-row bg-background">
      {isTablet && (
        <View className="flex-1 bg-zinc-950 relative overflow-hidden">
          <ImageBackground
            source={{ uri: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=1170&auto=format&fit=crop' }}
            className="absolute inset-0 w-full h-full opacity-40"
            resizeMode="cover"
          />
          <SafeAreaView className="flex-1 p-10 z-10">
            <View className="flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <Dumbbell size={20} color="#ffffff" />
              </View>
              <Text className="text-xl font-black text-white">{APP_NAME}</Text>
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
              <Text className="text-3xl md:text-4xl font-black text-foreground">Reset Password</Text>
              <Text className="mt-2 text-sm text-muted-foreground">Follow the steps to regain access to your account.</Text>
            </View>

            <View className="min-h-[200px] justify-start w-full">
              {renderStep()}
            </View>

          </SafeAreaView>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
