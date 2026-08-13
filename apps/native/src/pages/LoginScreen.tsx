import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { APP_NAME } from '../utils/env';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { useAppDispatch } from '../store/hooks';
import { memberLoginThunk } from '../features/auth/authSlice';
import { LockKeyhole, Mail, ArrowRight } from 'lucide-react-native';
import Toast from 'react-native-toast-message';

const emailSchema = z.object({ email: z.string().email("Enter a valid email") });
const passwordSchema = z.object({ password: z.string().min(8, "Password must be at least 8 characters") });

export function LoginScreen({ navigation }: any) {
  const dispatch = useAppDispatch();
  const [step, setStep] = useState<"email" | "password">("email");
  const [email, setEmail] = useState("");
  const [isSimulating, setIsSimulating] = useState(false);

  const { control: controlEmail, handleSubmit: subEmail, formState: { errors: errEmail } } = useForm({
    resolver: zodResolver(emailSchema),
  });

  const { control: controlPass, handleSubmit: subPass, formState: { errors: errPass } } = useForm({
    resolver: zodResolver(passwordSchema),
  });

  const onEmailSubmit = (data: any) => {
    setEmail(data.email);
    setStep("password");
  };

  const onFinalLogin = async (data: any) => {
    setIsSimulating(true);
    const result = await dispatch(memberLoginThunk({ email: email || "john@example.com", password: data.password || "password123" }));
    setIsSimulating(false);
    
    if (memberLoginThunk.fulfilled.match(result)) {
      Toast.show({ type: 'success', text1: 'Welcome back!' });
      navigation.replace("Dashboard");
    } else {
      if (result.payload === "NOT_A_MEMBER") {
        Toast.show({ type: 'error', text1: `You are not a member of ${APP_NAME}` });
      } else {
        Toast.show({ type: 'error', text1: 'Authentication failed' });
      }
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        className="flex-1 justify-center p-6"
      >
        <Card>
          <CardHeader>
            <View className="items-center mb-4">
              <View className="h-12 w-12 rounded-full bg-primary/10 items-center justify-center">
                <LockKeyhole size={24} color="hsl(var(--primary))" />
              </View>
            </View>
            <CardTitle className="text-center text-xl font-bold">Sign in to {APP_NAME}</CardTitle>
            <Text className="text-center text-muted-foreground mt-2">
              {step === "email" ? "Enter your email to continue" : "Enter your password"}
            </Text>
          </CardHeader>
          <CardContent>
            {step === "email" && (
              <View>
                <Controller
                  control={controlEmail}
                  name="email"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label="Email address"
                      placeholder="admin@example.com"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      error={errEmail.email?.message as string}
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                  )}
                />
                <Button className="mt-4" onPress={subEmail(onEmailSubmit)} disabled={isSimulating}>
                  <Text className="text-primary-foreground font-medium mr-2">Continue</Text>
                  <ArrowRight size={16} color="hsl(var(--primary-foreground))" />
                </Button>
              </View>
            )}

            {step === "password" && (
              <View>
                <Controller
                  control={controlPass}
                  name="password"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label="Password"
                      placeholder="••••••••"
                      secureTextEntry
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      error={errPass.password?.message as string}
                    />
                  )}
                />
                <Button className="mt-4" onPress={subPass(onFinalLogin)} disabled={isSimulating}>
                  <Text className="text-primary-foreground font-medium mr-2">Sign in</Text>
                </Button>
                <TouchableOpacity className="mt-4 items-center" onPress={() => setStep("email")}>
                  <Text className="text-primary text-sm font-medium">Back to email</Text>
                </TouchableOpacity>
              </View>
            )}
          </CardContent>
        </Card>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
