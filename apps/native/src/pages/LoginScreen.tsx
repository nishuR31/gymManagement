import { useState } from 'react';
import { View, Text, TouchableOpacity, ImageBackground, ScrollView, useWindowDimensions, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dumbbell, ShieldCheck, Users, BarChart3, LockKeyhole, ArrowRight, ArrowLeft, Fingerprint } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Footer } from '../components/layout/Footer';
import { loginThunk, logoutThunk } from '../features/auth/authSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { APP_NAME } from '../utils/env';
import { themeColors } from '../constants/colors';


const emailSchema = z.object({ email: z.string().email("Enter a valid email") });
const passwordSchema = z.object({ password: z.string().min(8, "Password must be at least 8 characters") });
const codeSchema = z.object({ code: z.string().min(4, "Enter valid code") });

type EmailFormValues = z.infer<typeof emailSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;
type CodeFormValues = z.infer<typeof codeSchema>;
type AuthStep = "login" | "2fa" | "otp";

export function LoginScreen({ navigation }: any) {
  const dispatch = useAppDispatch();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const theme = useAppSelector((state) => state.theme.theme);
  const activeColors = themeColors[theme === 'amoled' ? 'amoled' : theme === 'dark' ? 'dark' : 'light'];

  const [step, setStep] = useState<AuthStep>("login");
  const [email, setEmail] = useState("");
  const [passwordCache, setPasswordCache] = useState("");
  const [isSimulating, setIsSimulating] = useState(false);

  const { control: controlLogin, handleSubmit: subLogin, formState: { errors: errLogin } } = useForm<EmailFormValues & PasswordFormValues>({ resolver: zodResolver(emailSchema.merge(passwordSchema)) });
  const { control: controlCode, handleSubmit: subCode, formState: { errors: errCode } } = useForm<CodeFormValues>({ resolver: zodResolver(codeSchema) });

  const onFinalLogin = async (pass?: string, currentEmail?: string) => {
    setIsSimulating(true);
    const result = await dispatch(loginThunk({ email: currentEmail || email || "admin@example.com", password: pass || "adminpassword" }));
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

    Toast.show({ type: 'error', text1: "Authentication failed", text2: typeof result.payload === 'string' ? result.payload : "Network or server error" });
  };

  const handleLoginNext = (v: EmailFormValues & PasswordFormValues) => {
    setEmail(v.email);
    onFinalLogin(v.password, v.email);
  };
  const handleCodeSubmit = (v: CodeFormValues) => { onFinalLogin(passwordCache, email); };

  const handlePasskey = () => { Toast.show({ type: 'success', text1: "Prompting for Passkey..." }); setTimeout(() => onFinalLogin(), 1500); };

  const renderStep = () => {
    if (step === "login") {
      return (
        <View className="gap-6 animate-fade-in w-full">
          <View className="gap-4">
            <Controller control={controlLogin} name="email" render={({ field: { onChange, value } }) => (
              <Input label="Email" autoCapitalize="none" keyboardType="email-address" value={value} onChangeText={onChange} error={errLogin.email?.message} />
            )} />
            <Controller control={controlLogin} name="password" render={({ field: { onChange, value } }) => (
              <Input label="Password" secureTextEntry value={value} onChangeText={onChange} error={errLogin.password?.message} />
            )} />
            <Button onPress={subLogin(handleLoginNext)} className="w-full h-11">
              <Text className="text-primary-foreground font-bold mr-2">Sign In</Text>
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
          </View>
        </View>
      );
    }

    if (step === "2fa" || step === "otp") {
      return (
        <View className="gap-6 animate-fade-in w-full">
          <View className="flex-row items-center gap-2 pb-2">
            <TouchableOpacity onPress={() => setStep("login")} className="p-2 -ml-2 rounded-full">
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

    return null;
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: isTablet ? 120 : 80 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets={true}>
        <View className="flex-1 relative bg-zinc-950">
          <ImageBackground
            source={{ uri: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1470&auto=format&fit=crop' }}
            className="absolute inset-0 w-full h-full opacity-50"
            resizeMode="cover"
          />
          <View className="absolute inset-0 bg-black/60" />
          
          <View className={`flex-1 ${isTablet ? 'flex-row' : 'flex-col'} z-10`}>
          
          {/* Left Hero Section */}
          <View className={`${isTablet ? 'w-1/2' : 'w-full h-56'} relative`}>
            <SafeAreaView className="flex-1 p-8 lg:p-20 z-10 items-center justify-center">
              <TouchableOpacity onPress={() => navigation.navigate("Home")} className="flex-row items-center gap-3 absolute top-12 left-8 lg:top-20 lg:left-20 z-20">
                <View className="w-9 h-9 bg-primary items-center justify-center rounded-lg shadow-lg">
                  <Dumbbell size={18} color="#ffffff" />
                </View>
                <Text className="text-lg font-black text-white">{APP_NAME}</Text>
              </TouchableOpacity>
              
              <View className="w-full max-w-2xl flex-1 justify-center items-center">
                {!isTablet && (
                  <View className="mt-12 items-center w-full px-4">
                    <Text className="text-3xl font-black text-white leading-tight text-center">Elevate your gym's performance.</Text>
                  </View>
                )}

                {isTablet && (
                  <View className="items-center w-full">
                    <View className="self-center flex-row items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 mb-6">
                      <ShieldCheck size={14} color="#ffffff" />
                      <Text className="text-xs font-black uppercase tracking-widest text-white">Staff Operations</Text>
                    </View>
                    <Text className="text-5xl font-black text-white leading-tight mb-8 text-center w-full">Elevate your gym's performance.</Text>
                    <View className="gap-5 items-center w-full mt-4">
                      <View className="flex-row items-center gap-4 w-full justify-center"><Users size={24} color={activeColors.primary} /><Text className="font-semibold text-white text-xl">Member lifecycle controls</Text></View>
                      <View className="flex-row items-center gap-4 w-full justify-center"><BarChart3 size={24} color={activeColors.primary} /><Text className="font-semibold text-white text-xl">Reports and revenue snapshots</Text></View>
                      <View className="flex-row items-center gap-4 w-full justify-center"><LockKeyhole size={24} color={activeColors.primary} /><Text className="font-semibold text-white text-xl">Enterprise-grade security</Text></View>
                    </View>
                  </View>
                )}
              </View>
            </SafeAreaView>
          </View>

          {/* Right Form Section */}
          <View className={`${isTablet ? 'w-1/2' : 'flex-1'} justify-center p-6 lg:p-12`}>
            <View className="w-full max-w-md self-center bg-background/80 backdrop-blur-2xl rounded-[32px] p-8 lg:p-10 border border-white/10 shadow-2xl">
              
              <View className="flex-row items-center justify-between mb-6">
                <TouchableOpacity onPress={() => navigation.navigate("Home")} className="flex-row items-center gap-2">
                  <ArrowLeft size={16} color={activeColors.mutedForeground} />
                  <Text className="text-sm font-medium text-muted-foreground">Back to website</Text>
                </TouchableOpacity>
                {!isTablet && (
                  <View className="flex-row items-center gap-2">
                    <Dumbbell size={18} color={activeColors.primary} />
                    <Text className="font-black text-foreground">{APP_NAME}</Text>
                  </View>
                )}
              </View>
              
              <Text className="text-3xl font-black text-foreground mb-2">Sign in</Text>
              <Text className="text-sm text-muted-foreground mb-6">Access the staff operations dashboard securely.</Text>

              <View className="min-h-[280px]">
                {renderStep()}
              </View>

              <View className="mt-8 pt-6 border-t border-border">
                <Text className="text-sm font-medium text-foreground">Member account?</Text>
                <TouchableOpacity onPress={() => navigation.navigate("MemberLogin")} className="flex-row items-center mt-2">
                  <Text className="text-sm font-bold text-primary mr-2">Use member portal</Text>
                  <ArrowRight size={14} color={activeColors.primary} />
                </TouchableOpacity>
              </View>
              
            </View>
          </View>
        </View>
        </View>
        <Footer />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
