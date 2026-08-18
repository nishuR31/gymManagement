
import { View, Text, TouchableOpacity, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Dumbbell } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { APP_NAME } from '../../utils/env';

export function Footer({ transparent = false }: { transparent?: boolean } = {}) {
  const { colors, styleMode } = useTheme();
  const navigation = useNavigation<any>();

  let containerClass = "pt-6 pb-4 px-6 mt-4 border-t border-border bg-card rounded-t-[32px]";

  if (transparent) {
    containerClass = "pt-6 pb-4 px-6 mt-12 border-t border-white/10";
  } else if (styleMode === 'clay') {
    containerClass = "pt-6 pb-4 px-6 m-4 bg-card rounded-5xl shadow-[0_-10px_50px_rgba(0,0,0,0.2)]";
  } else if (styleMode === 'glass') {
    containerClass = "pt-6 pb-4 px-6 m-4 bg-background/40 backdrop-blur-3xl border border-white/10 shadow-lg shadow-black/20 rounded-[32px]";
  } else if (styleMode === 'minimal') {
    containerClass = "pt-6 pb-4 px-6 mt-4 border-t-2 border-border bg-card";
  }

  // On transparent (image bg), force white text; otherwise follow theme tokens
  const headingClass = transparent ? 'text-white' : 'text-foreground';
  const bodyClass = transparent ? 'text-white/60' : 'text-muted-foreground';
  const dividerClass = transparent ? 'border-white/10' : 'border-border/50';

  return (
    <View className={containerClass}>
      <View className="flex-row flex-wrap justify-around gap-6 mb-6">

        {/* Brand */}
        <View className="flex-1 min-w-[200px]">
          <View className="flex-row items-center gap-2 mb-3">
            <View className="w-8 h-8 bg-primary items-center justify-center rounded-lg shadow-sm">
              <Dumbbell size={16} color={colors.primaryForeground} />
            </View>
            <Text className={`text-lg font-black ${headingClass}`}>{APP_NAME}</Text>
          </View>
          <Text className={`text-sm leading-5 ${bodyClass}`}>
            Elevating your gym's performance with professional tools and intuitive member experiences.
          </Text>
        </View>

        {/* Quick Links */}
        <View className="flex-1 min-w-[120px]">
          <Text className={`text-xs font-black uppercase tracking-wider mb-3 ${headingClass}`}>Quick Links</Text>
          <View className="gap-3">
            <TouchableOpacity onPress={() => navigation.navigate('Home')}>
              <Text className={`text-sm font-medium ${bodyClass}`}>Home</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Plans')}>
              <Text className={`text-sm font-medium ${bodyClass}`}>Membership Plans</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('MemberLogin')}>
              <Text className={`text-sm font-medium ${bodyClass}`}>Member Portal</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text className={`text-sm font-medium ${bodyClass}`}>Staff Login</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Legal & Contact */}
        <View className="flex-1 min-w-[120px]">
          <Text className={`text-xs font-black uppercase tracking-wider mb-3 ${headingClass}`}>Legal & Contact</Text>
          <View className="gap-3">
            <TouchableOpacity
              onPress={() => Linking.openURL('mailto:contact@valorfitness.com')}
              className="flex-row items-center gap-1.5 mb-1"
            >
              <Text className="text-sm font-medium text-primary">contact@valorfitness.com</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Privacy')}>
              <Text className={`text-sm font-medium ${bodyClass}`}>Privacy Policy</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Terms')}>
              <Text className={`text-sm font-medium ${bodyClass}`}>Terms of Service</Text>
            </TouchableOpacity>
          </View>
        </View>

      </View>

      <View className={`pt-3 border-t ${dividerClass} items-center`}>
        <Text className={`text-xs font-medium ${bodyClass}`}>
          © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
        </Text>
      </View>

      {/* Dock spacer */}
      <View className="h-4 w-full" />
    </View>
  );
}


