import { useState } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { CheckCircle2, Smartphone } from 'lucide-react-native';

import { APP_NAME } from '../utils/env';
import { ScreenWrapper } from '../components/layout/ScreenWrapper';
import { Card, CardContent } from '../components/ui/Card';
import { useTheme } from '../hooks/useTheme';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { LiquidMetalButton } from '../components/ui/LiquidMetalButton';
import { LiquidGlassPanel } from '../components/ui/LiquidGlassPanel';

function Step({ number, title, description }: { number: string; title: string; description: string }) {
  const { colors } = useTheme();
  return (
    <View className="flex-row gap-4 items-start mb-6">
      <View style={{ backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}33` }} className="w-10 h-10 rounded-full border items-center justify-center">
        <Text style={{ color: colors.primary }} className="font-black text-xs">{number}</Text>
      </View>
      <View className="flex-1 mt-1">
        <Text className="text-lg font-bold text-foreground mb-1">{title}</Text>
        <Text className="text-sm text-muted-foreground leading-relaxed">{description}</Text>
      </View>
    </View>
  );
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  const { colors } = useTheme();

  return (
    <Card className="flex-1 min-w-[280px]">
      <CardContent className="pt-6">
        <View className="mb-4 w-8 h-8 rounded-full items-center justify-center border" style={{ borderColor: `${colors.primary}40`, backgroundColor: 'transparent' }}>
          <CheckCircle2 size={16} color={colors.primary} />
        </View>
        <Text className="text-lg font-bold text-foreground mb-2">{title}</Text>
        <Text className="text-sm text-muted-foreground leading-relaxed">{description}</Text>
      </CardContent>
    </Card>
  );
}

export function DownloadAppScreen() {
  const [platform, setPlatform] = useState<"ios" | "android">("ios");
  const { colors } = useTheme();

  const iosUrl = "https://apps.apple.com/app/valorfitness";
  const androidUrl = "https://play.google.com/store/apps/details?id=com.valorfitness";
  const currentUrl = platform === "ios" ? iosUrl : androidUrl;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(currentUrl)}&color=000000&bgcolor=ffffff`;

  return (
    <ScreenWrapper>

      {/* Header Section */}
      <View className="items-center justify-center py-16 px-4 mb-8 border-b border-border/50">
        <View className="flex-row items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 mb-6" style={{ backgroundColor: `${colors.primary}10` }}>
          <Smartphone size={14} color={colors.primary} />
          <Text className="text-xs font-black uppercase tracking-widest" style={{ color: colors.primary }}>{APP_NAME} APP</Text>
        </View>
        <Text className="text-4xl md:text-6xl font-black text-foreground text-center mb-4 tracking-tight">Your gym pass in your pocket.</Text>
        <Text className="text-base md:text-lg text-muted-foreground text-center max-w-2xl leading-relaxed mb-8">
          Download our app for better services, easy access, and a more convenient gym experience. View timelines, track your classes, and manage your membership seamlessly.
        </Text>

        {/* Functional Layer: Liquid Glass Floating Toolbar */}
        <View className="absolute bottom-10 left-4 right-4 items-center z-50">
          <LiquidGlassPanel variant="regular" containerStyle={{ width: '100%', maxWidth: 400 }}>
            <Text className="text-foreground font-bold text-center mb-2 text-sm uppercase tracking-widest">Functional Controls</Text>
            <ThemeToggle />
            <View className="h-4" />
            <LiquidMetalButton title="Get Access Link" onPress={() => {}} />
          </LiquidGlassPanel>
        </View>
      </View>

      <View className="max-w-7xl mx-auto w-full px-4 lg:px-12 pb-20">

        {/* Main Content Split */}
        <View className="flex-col lg:flex-row gap-12 lg:gap-24 mb-24">

          {/* Left: Steps */}
          <View className="flex-1 pt-8">
            <Text className="text-3xl font-black text-foreground mb-4">How to get started</Text>
            <Text className="text-muted-foreground mb-10 text-sm">It takes less than a minute to setup your account and start using the app.</Text>

            <Step number="01" title="Download" description="Get the app from the App Store or Google Play." />
            <Step number="02" title="Get Credentials" description="Get your login ID and temporary password from the owner, a staff member, or an authorized person." />
            <Step number="03" title="Login & Secure" description="Log in and change your password immediately. Enabling 2FA is highly recommended for security." />
            <Step number="04" title="Explore & Configure" description="Check out the app and configure it yourself. If you don't understand something, ask a staff member or other users for help (sorry for the inconvenience!)." />
            <Step number="05" title="You're All Set!" description="Thank you for using our services. Enjoy your gym experience." />
          </View>

          {/* Right: Phone Mockup */}
          <View className="flex-1 items-center lg:items-end justify-center">

            {/* Phone Outer Chassis (Metal Ring) */}
            <View className="relative bg-[#3a3a3a] rounded-[60px] p-[2px] shadow-2xl" style={{ elevation: 20 }}>

              {/* Hardware Buttons */}
              {/* Left Side: Volume & Action Button */}
              <View className="absolute -left-[4px] top-[120px] w-[4px] h-[24px] bg-[#2a2a2a] rounded-l-md" />
              <View className="absolute -left-[4px] top-[170px] w-[4px] h-[48px] bg-[#2a2a2a] rounded-l-md" />
              <View className="absolute -left-[4px] top-[230px] w-[4px] h-[48px] bg-[#2a2a2a] rounded-l-md" />

              {/* Right Side: Power Button */}
              <View className="absolute -right-[4px] top-[180px] w-[4px] h-[64px] bg-[#2a2a2a] rounded-r-md" />

              {/* Phone Container / Bezel */}
              <View
                className="relative rounded-[58px] border-[10px] bg-zinc-950 overflow-hidden items-center p-6 w-[320px] h-[640px]"
                style={{ borderColor: '#000000' }}
              >

                {/* Screen Glare Effect */}
                <View className="absolute -top-[10%] -left-[50%] w-[200%] h-[120%] bg-white opacity-[0.03] -rotate-12 z-0" style={{ pointerEvents: 'none' }} />

                {/* Dynamic Hardware Features based on Platform */}
                {platform === 'ios' ? (
                  <>
                    {/* iOS Dynamic Island */}
                    <View className="absolute top-3 w-[110px] h-[32px] bg-black rounded-full z-20 flex-row items-center justify-between px-3" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.5, shadowRadius: 4 }}>
                      <View className="w-[10px] h-[10px] rounded-full bg-zinc-800" />
                      <View className="w-[10px] h-[10px] rounded-full bg-[#0a0a0a] border border-zinc-900 shadow-[inset_0_0_4px_rgba(255,255,255,0.1)]" />
                    </View>
                    {/* iOS Home Indicator */}
                    <View className="absolute bottom-2 w-1/3 h-1.5 bg-zinc-700/80 rounded-full z-20" />
                  </>
                ) : (
                  <>
                    {/* Android Punch Hole */}
                    <View className="absolute top-4 w-[16px] h-[16px] bg-black rounded-full z-20 shadow-[inset_0_0_6px_rgba(255,255,255,0.15)] items-center justify-center">
                      <View className="w-[6px] h-[6px] bg-[#050505] rounded-full" />
                    </View>
                    {/* Android Bottom Navigation Bar (Ghost) */}
                    <View className="absolute bottom-2 w-full h-8 flex-row items-center justify-around px-12 z-20 opacity-40">
                      <View className="w-3 h-3 bg-zinc-500 rounded-sm" />
                      <View className="w-4 h-4 bg-zinc-500 rounded-full" />
                      <View className="w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-l-[10px] border-l-zinc-500" />
                    </View>
                  </>
                )}

                {/* Segmented Control */}
                <View className="mt-14 bg-zinc-900/80 backdrop-blur-md rounded-full p-1 flex-row w-[200px] mb-12 z-10 border border-white/5">
                  <TouchableOpacity
                    onPress={() => setPlatform('ios')}
                    className={`flex-1 items-center py-2.5 rounded-full ${platform === 'ios' ? 'bg-[#c59a58] shadow-md' : 'bg-transparent'}`}
                  >
                    <Text className={`text-xs font-bold ${platform === 'ios' ? 'text-zinc-950' : 'text-zinc-400'}`}>iOS</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setPlatform('android')}
                    className={`flex-1 items-center py-2.5 rounded-full ${platform === 'android' ? 'bg-[#c59a58] shadow-md' : 'bg-transparent'}`}
                  >
                    <Text className={`text-xs font-bold ${platform === 'android' ? 'text-zinc-950' : 'text-zinc-400'}`}>Android</Text>
                  </TouchableOpacity>
                </View>

                {/* QR Code */}
                <View className="bg-white p-4 rounded-[28px] mb-10 z-10 shadow-2xl">
                  <Image source={{ uri: qrCodeUrl }} className="w-48 h-48 rounded-xl" />
                </View>

                <Text className="text-white text-2xl font-black mb-2 tracking-tight z-10">Scan to download</Text>
                <Text className="text-zinc-400 text-sm text-center mb-8 px-4 z-10">
                  Point your camera to get the {platform === 'ios' ? 'iOS' : 'Android'} app
                </Text>

              </View>
            </View>
          </View>
        </View>

        {/* Functionalities Row */}
        <View>
          <Text className="text-3xl font-black text-foreground mb-8 text-center">App Functionalities</Text>
          <View className="flex-row flex-wrap gap-4 justify-center">
            <FeatureCard
              title="Fast Check-in"
              description="No more waiting at the front desk. Flash your app barcode to scan in instantly."
            />
            <FeatureCard
              title="Class Timelines"
              description="View daily schedules, track class availability, and book your spot ahead of time."
            />
            <FeatureCard
              title="Membership Management"
              description="Check your billing cycle, renew plans, or upgrade your membership natively in the app."
            />
          </View>
        </View>

      </View>
    </ScreenWrapper>
  );
}
