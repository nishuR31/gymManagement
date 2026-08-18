import {
  View, Text, ScrollView, ImageBackground,
  KeyboardAvoidingView, Platform, useWindowDimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from "react-hook-form";
import {
  Dumbbell, ShieldCheck, Sparkles, ArrowRight,
  Users, MapPin, CheckCircle, Activity, Calendar
} from "lucide-react-native";
import { APP_NAME } from "../utils/env";
import Toast from 'react-native-toast-message';
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { submitPublicInquiry } from "../features/public/publicApi";
import { getApiErrorMessage } from "../utils/apiError";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigation } from '@react-navigation/native';
import { AppDock } from '../components/layout/AppDock';
import { Footer } from '../components/layout/Footer';
import { useTheme } from '../hooks/useTheme';

const inquirySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.union([
    z.string().regex(/^\+?[0-9\s\-()]{8,15}$/, "Enter a valid phone number"),
    z.literal("")
  ]),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

type InquiryForm = z.infer<typeof inquirySchema>;

export function PublicHomeScreen() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const navigation = useNavigation<any>();
  const { isDark, colors, theme } = useTheme();
  const isAmoled = theme === 'amoled';

  // ── Per-theme tokens ──────────────────────────────────────────────────────
  // AMOLED: push toward pure black. Dark: moderate overlay so photos show. Light: warm cream tint.
  const heroOverlay     = isAmoled ? 'rgba(0,0,0,0.76)' : isDark ? 'rgba(0,0,0,0.48)' : 'rgba(250,247,242,0.62)';
  const section2Overlay = isAmoled ? 'rgba(0,0,0,0.88)' : isDark ? 'rgba(0,0,0,0.74)' : 'rgba(245,240,232,0.82)';
  const section3Overlay = isAmoled ? 'rgba(0,0,0,0.85)' : isDark ? 'rgba(0,0,0,0.70)' : 'rgba(250,247,242,0.78)';

  const headingColor  = isDark ? '#FFFFFF'   : colors.foreground;
  const bodyColor     = isDark ? 'rgba(255,255,255,0.72)' : colors.mutedForeground;
  const badgeBg       = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(122,78,45,0.08)';
  const badgeBorder   = isDark ? 'rgba(255,255,255,0.20)' : 'rgba(122,78,45,0.25)';
  const badgeText     = isDark ? 'rgba(255,255,255,0.90)' : colors.primary;
  const chipBg        = isDark ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.72)';
  const chipBorder    = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.08)';
  const chipIconBg    = isDark ? 'rgba(185,130,90,0.80)'  : colors.primary;
  const cardBg        = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.82)';
  const cardBorder    = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.07)';
  const cardTextMuted = isDark ? 'rgba(255,255,255,0.55)' : colors.mutedForeground;
  const ctaOutlineBg      = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.65)';
  const ctaOutlineBorder  = isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.10)';
  const ctaOutlineColor   = isDark ? '#FFFFFF' : colors.foreground;
  const brandBadgeBg = isDark ? 'rgba(0,0,0,0.40)' : 'rgba(255,255,255,0.75)';

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

  const featureItems = [
    { icon: MapPin,      label: 'Single-gym focus',   sub: 'Built for one serious training floor' },
    { icon: CheckCircle, label: 'Coached workflows',   sub: 'Members, plans, attendance, billing' },
    { icon: Sparkles,    label: 'Operational clarity', sub: 'Staff tools without admin clutter' },
  ];

  const experienceItems = [
    {
      icon: Dumbbell,   n: '01', title: 'Strength floor',
      desc: 'Purpose-built training space for progressive strength, conditioning blocks, and focused solo sessions.',
    },
    {
      icon: ShieldCheck, n: '02', title: 'Personal coaching',
      desc: 'Coaches keep plans, check-ins, and member progress aligned so accountability feels natural.',
    },
    {
      icon: Activity,    n: '03', title: 'Progress tracking',
      desc: "Every session logged. Members see how far they've come — motivation baked right in.",
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-background relative">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: isTablet ? 120 : 80 }}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={true}
        >

          {/* ═══════════════════════════════════════════════════════
              SECTION 1 — HERO
              Dark: female athlete photo, strong dark overlay, white text
              Light: same photo, warm translucent cream overlay, dark text
          ════════════════════════════════════════════════════════ */}
          <ImageBackground
            source={require('../../assets/home/hero.webp')}
            resizeMode="cover"
            className="w-full"
            style={{ minHeight: '100dvh' as any }}
          >
            {/* Overlay */}
            <View style={{ position: 'absolute', inset: 0, backgroundColor: heroOverlay }} />

            {/* Brand badge */}
            <View
              className="absolute top-5 left-5 z-10 flex-row items-center gap-2 rounded-full px-4 py-2"
              style={{ backgroundColor: brandBadgeBg }}
            >
              <Dumbbell size={16} color={colors.primary} />
              <Text style={{ color: headingColor }} className="font-bold text-sm">{APP_NAME}</Text>
            </View>

            {/* Hero content */}
            <View className="flex-1 justify-center w-full max-w-5xl self-center px-6 pt-28 pb-16 z-10">
              {/* Badge pill */}
              <View
                className="flex-row items-center self-start px-3 py-1.5 rounded-full mb-5"
                style={{ backgroundColor: badgeBg, borderWidth: 1, borderColor: badgeBorder }}
              >
                <Sparkles size={13} color={colors.primary} />
                <Text style={{ color: badgeText }} className="font-bold ml-2 text-xs uppercase tracking-widest">
                  {APP_NAME}
                </Text>
              </View>

              <Text
                style={{ color: headingColor, fontSize: isTablet ? 72 : 46, lineHeight: isTablet ? 80 : 54 }}
                className="font-black leading-tight mb-5 tracking-tight"
              >
                Train with intent.{'\n'}Track every win.
              </Text>
              <Text style={{ color: bodyColor }} className="font-medium text-base md:text-lg mb-10 max-w-xl leading-relaxed">
                Strength training, personal coaching, flexible memberships, and a front desk experience that keeps every visit moving.
              </Text>

              <View className="flex-row flex-wrap gap-3">
                <Button
                  onPress={() => navigation.navigate("MemberLogin")}
                  rightIcon={<ArrowRight size={16} color={colors.primaryForeground} />}
                >
                  Member Login
                </Button>
                <Button
                  variant="outline"
                  onPress={() => navigation.navigate("Login")}
                  style={{ backgroundColor: ctaOutlineBg, borderColor: ctaOutlineBorder }}
                >
                  <Text style={{ color: ctaOutlineColor }} className="font-bold">Staff Portal</Text>
                </Button>
              </View>
            </View>

            {/* Feature chips at bottom */}
            <View className="z-10 w-full max-w-5xl self-center px-6 pb-12 flex-col md:flex-row gap-3">
              {featureItems.map((item, i) => (
                <View
                  key={i}
                  className="flex-1 flex-row items-center gap-3 rounded-2xl px-4 py-3"
                  style={{ backgroundColor: chipBg, borderWidth: 1, borderColor: chipBorder }}
                >
                  <View
                    className="h-9 w-9 rounded-lg items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: chipIconBg }}
                  >
                    <item.icon size={16} color="#fff" />
                  </View>
                  <View className="flex-1">
                    <Text style={{ color: headingColor }} className="font-bold text-sm">{item.label}</Text>
                    <Text style={{ color: bodyColor }} className="text-xs mt-0.5">{item.sub}</Text>
                  </View>
                </View>
              ))}
            </View>
          </ImageBackground>

          {/* ═══════════════════════════════════════════════════════
              SECTION 2 — EXPERIENCE + CONTACT FORM
              Dark: male gym athlete, deep dark overlay, white text
              Light: same photo, warm cream overlay, dark text, white glass cards
          ════════════════════════════════════════════════════════ */}
          <ImageBackground
            source={require('../../assets/home/experience.webp')}
            resizeMode="cover"
            className="w-full"
          >
            <View style={{ position: 'absolute', inset: 0, backgroundColor: section2Overlay }} />

            <View className="relative z-10 w-full max-w-5xl self-center px-6 py-20 flex-col lg:flex-row gap-14">
              {/* Left — copy + experience cards */}
              <View className="flex-1 lg:pr-10">
                <Text style={{ color: colors.primary }} className="font-bold uppercase text-xs tracking-widest mb-3">
                  What members feel
                </Text>
                <Text
                  style={{ color: headingColor, fontSize: isTablet ? 48 : 34, lineHeight: isTablet ? 56 : 42 }}
                  className="font-black leading-tight mb-8"
                >
                  A gym experience that feels{'\n'}organized from warm-up to checkout.
                </Text>

                <View className="gap-4">
                  {experienceItems.map((item, i) => (
                    <View
                      key={i}
                      className="rounded-2xl p-4 flex-row gap-4"
                      style={{ backgroundColor: cardBg, borderWidth: 1, borderColor: cardBorder }}
                    >
                      <View className="h-10 w-10 bg-primary rounded-xl items-center justify-center flex-shrink-0">
                        <item.icon size={18} color="#fff" />
                      </View>
                      <View className="flex-1">
                        <View className="flex-row justify-between items-center mb-1">
                          <Text style={{ color: headingColor }} className="font-bold text-base">{item.title}</Text>
                          <Text style={{ color: cardTextMuted }} className="font-mono text-xs font-bold">{item.n}</Text>
                        </View>
                        <Text style={{ color: cardTextMuted }} className="text-sm leading-relaxed">{item.desc}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>

              {/* Right — contact form */}
              <View className="w-full lg:w-[400px] flex-shrink-0">
                <View
                  className="rounded-3xl overflow-hidden"
                  style={{ backgroundColor: cardBg, borderWidth: 1, borderColor: cardBorder }}
                >
                  <View className="p-6">
                    <Text style={{ color: headingColor }} className="text-xl font-black mb-1">
                      Contact {APP_NAME}
                    </Text>
                    <Text style={{ color: cardTextMuted }} className="text-sm mb-6">
                      Have a question or want to join? Drop us a message.
                    </Text>

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
                      <Input label="Message" onBlur={onBlur} onChangeText={onChange} value={value} error={errors.message?.message} multiline numberOfLines={4} className="min-h-[90px] mb-2" placeholder="Tell us what you're looking for…" />
                    )} />

                    <Button
                      onPress={handleSubmit(onSubmit)}
                      className="mt-5 w-full"
                      isLoading={isSubmitting}
                      rightIcon={<ArrowRight size={16} color={colors.primaryForeground} />}
                    >
                      Send Inquiry
                    </Button>
                  </View>
                </View>
              </View>
            </View>
          </ImageBackground>

          {/* ═══════════════════════════════════════════════════════
              SECTION 3 — CTA + FOOTER
              Dark: training photo, dark overlay
              Light: cta photo, soft warm overlay, dark text
          ════════════════════════════════════════════════════════ */}
          <ImageBackground
            source={isDark
              ? require('../../assets/home/training.webp')
              : require('../../assets/home/cta.webp')
            }
            resizeMode="cover"
            className="w-full"
          >
            <View style={{ position: 'absolute', inset: 0, backgroundColor: section3Overlay }} />

            <View className="relative z-10 w-full max-w-5xl self-center px-6 py-24 items-center">
              <Text style={{ color: colors.primary }} className="font-bold uppercase text-xs tracking-widest mb-4 text-center">
                Ready to start?
              </Text>
              <Text
                style={{ color: headingColor, fontSize: isTablet ? 52 : 36, lineHeight: isTablet ? 60 : 44 }}
                className="font-black text-center leading-tight mb-5"
              >
                Your fitness journey{'\n'}starts here.
              </Text>
              <Text style={{ color: bodyColor }} className="text-base text-center max-w-md leading-relaxed mb-10">
                Join a gym system designed to help you train smarter, track your progress, and stay accountable every step of the way.
              </Text>

              <View className="flex-row flex-wrap gap-4 justify-center">
                <Button
                  onPress={() => navigation.navigate("MemberLogin")}
                  rightIcon={<ArrowRight size={16} color={colors.primaryForeground} />}
                >
                  Access Member Portal
                </Button>
                <Button
                  variant="outline"
                  onPress={() => navigation.navigate("DownloadApp")}
                  style={{ backgroundColor: ctaOutlineBg, borderColor: ctaOutlineBorder }}
                >
                  <View className="flex-row items-center gap-2">
                    <Calendar size={16} color={ctaOutlineColor} />
                    <Text style={{ color: ctaOutlineColor }} className="font-bold">Get the App</Text>
                  </View>
                </Button>
              </View>
            </View>

            {/* Footer bleeds into this section's photo */}
            <Footer transparent={true} />
          </ImageBackground>

        </ScrollView>
      </KeyboardAvoidingView>
      <AppDock />
    </SafeAreaView>
  );
}
