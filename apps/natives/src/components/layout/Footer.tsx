
import { View, Text, TouchableOpacity, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Dumbbell } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { APP_NAME } from '../../utils/env';

export function Footer() {
  const { colors, styleMode } = useTheme();
  const navigation = useNavigation<any>();

  let containerClass = "pt-6 pb-4 px-6 mt-4 border-t border-border";
  let containerStyle: any = { borderTopLeftRadius: 32, borderTopRightRadius: 32, backgroundColor: colors.card };

  if (styleMode === 'clay') {
    containerStyle.borderRadius = 48;
    containerStyle.borderTopWidth = 0;
    containerClass += " shadow-[0_-10px_50px_rgba(0,0,0,0.2)] m-4";
  } else if (styleMode === 'glass') {
    containerClass += " bg-background/40 backdrop-blur-3xl border border-white/10 shadow-lg shadow-black/20 m-4 rounded-[32px]";
    containerStyle.backgroundColor = 'transparent';
  } else if (styleMode === 'minimal') {
    containerStyle.borderTopLeftRadius = 0;
    containerStyle.borderTopRightRadius = 0;
    containerStyle.borderTopWidth = 2;
  }

  return (
    <View className={containerClass} style={containerStyle}>
      <View className="flex-row flex-wrap justify-around gap-6 mb-6">

        {/* Brand Section */}
        <View className="flex-1 min-w-[200px]">
          <View className="flex-row items-center gap-2 mb-3">
            <View className="w-8 h-8 bg-primary items-center justify-center rounded-lg shadow-sm">
              <Dumbbell size={16} color={colors.primaryForeground} />
            </View>
            <Text className="text-lg font-black" style={{ color: colors.foreground }}>{APP_NAME}</Text>
          </View>
          <Text className="text-sm leading-5" style={{ color: colors.mutedForeground }}>
            Elevating your gym's performance with professional tools and intuitive member experiences.
          </Text>
        </View>

        {/* Quick Links */}
        <View className="flex-1 min-w-[120px]">
          <Text className="text-xs font-black uppercase tracking-wider mb-3" style={{ color: colors.foreground }}>Quick Links</Text>
          <View className="gap-3">
            <TouchableOpacity onPress={() => navigation.navigate('Home')}>
              <Text className="text-sm font-medium" style={{ color: colors.mutedForeground }}>Home</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Plans')}>
              <Text className="text-sm font-medium" style={{ color: colors.mutedForeground }}>Membership Plans</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('MemberLogin')}>
              <Text className="text-sm font-medium" style={{ color: colors.mutedForeground }}>Member Portal</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text className="text-sm font-medium" style={{ color: colors.mutedForeground }}>Staff Login</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Contact & Legal */}
        <View className="flex-1 min-w-[120px]">
          <Text className="text-xs font-black uppercase tracking-wider mb-3" style={{ color: colors.foreground }}>Legal & Contact</Text>
          <View className="gap-3">
            {/* Email contact */}
            <TouchableOpacity
              onPress={() => Linking.openURL('mailto:contact@valorfitness.com')}
              className="flex-row items-center gap-1.5 mb-1"
            >
              <Text className="text-sm font-medium" style={{ color: colors.primary }}>contact@valorfitness.com</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Privacy')}>
              <Text className="text-sm font-medium" style={{ color: colors.mutedForeground }}>Privacy Policy</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Terms')}>
              <Text className="text-sm font-medium" style={{ color: colors.mutedForeground }}>Terms of Service</Text>
            </TouchableOpacity>
          </View>
        </View>

      </View>

      <View className="pt-3 border-t border-border/50 items-center">
        <Text className="text-xs font-medium" style={{ color: colors.mutedForeground }}>
          © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
        </Text>
      </View>

      {/* Dock spacer — just enough room for the floating dock */}
      <View className="h-4 w-full" />
    </View>
  );
}
