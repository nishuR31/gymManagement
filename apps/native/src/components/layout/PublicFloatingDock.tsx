import { useState } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  Modal,
  Pressable,
  ScrollView,
  Dimensions,
  useWindowDimensions,
} from 'react-native';
import {
  Home,
  Dumbbell,
  Menu,
  X,
  ArrowRight,
  ShieldCheck,
  Users,
  Scan,
  Smartphone
} from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { usePinger } from '../../hooks/usePinger';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { PulsingDot } from './PulsingDot';

export function PublicFloatingDock() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { colors, styleMode, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const isBackendOnline = usePinger(6 * 60 * 1000); // 6 mins
  const isNetworkOnline = useNetworkStatus();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const currentRoute = route.name;


  const dockBottom = Math.max(insets.bottom, 8) + 8;

  const NavItem = ({
    icon: Icon,
    targetRoute,
    label,
  }: {
    icon: any;
    targetRoute: string;
    label: string;
  }) => {
    const isActive = currentRoute === targetRoute;
    return (
      <TouchableOpacity
        className={`flex-row items-center justify-center h-11 px-3.5 rounded-full ${isActive ? 'bg-primary/10' : ''}`}
        style={{ gap: 6 }}
        onPress={() => {
          setIsMenuOpen(false);
          if (currentRoute !== targetRoute) navigation.navigate(targetRoute);
        }}
        activeOpacity={0.7}
      >
        <Icon size={20} color={isActive ? colors.primary : colors.mutedForeground} />
        {(!isMobile || isActive) && (
          <Text
            className={`font-semibold text-sm ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
          >
            {label}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const MenuItem = ({
    name,
    icon: Icon,
    targetRoute,
  }: {
    name: string;
    icon: any;
    targetRoute: string;
  }) => {
    const isActive = currentRoute === targetRoute;
    return (
      <TouchableOpacity
        className={`flex-row items-center p-3.5 rounded-xl mb-0.5 ${isActive ? 'bg-primary/10' : ''}`}
        style={{ gap: 12 }}
        onPress={() => {
          setIsMenuOpen(false);
          if (currentRoute !== targetRoute) navigation.navigate(targetRoute);
        }}
        activeOpacity={0.7}
      >
        <Icon size={20} color={isActive ? colors.primary : colors.foreground} />
        <Text
          className={`text-[15px] ${isActive ? 'font-bold text-primary' : 'font-medium text-foreground'}`}
        >
          {name}
        </Text>
      </TouchableOpacity>
    );
  };

  let containerClass = "bg-card border border-border shadow-sm";

  if (styleMode === 'clay') {
    containerClass = "bg-card shadow-[0_15px_40px_rgba(0,0,0,0.25)]";
  } else if (styleMode === 'glass') {
    containerClass = "bg-background/40 backdrop-blur-3xl border border-white/10 shadow-lg shadow-black/20";
  } else if (styleMode === 'minimal') {
    containerClass = "bg-card border-2 border-border";
  }

  return (
    <>
      {/* Dock pill */}
      <View
        className={`absolute self-center flex-row items-center justify-center px-2 h-16 rounded-full ${containerClass}`}
        style={{ bottom: dockBottom, gap: 12 }}
      >
        {/* Backend Pinger Dot (Blue/Orange) */}
        <PulsingDot
          color={isBackendOnline === null ? colors.mutedForeground : isBackendOnline ? '#3b82f6' : '#f97316'}
          style={{ marginLeft: 4, marginRight: -4 }}
          accessibilityLabel={isBackendOnline ? 'Server Online' : 'Server Offline'}
        />

        <View className="flex-row items-center">
          <NavItem icon={Home} targetRoute="Home" label="Home" />
          <NavItem icon={Users} targetRoute="MemberLogin" label="Member" />
          <NavItem icon={ShieldCheck} targetRoute="Login" label="Admin" />
        </View>

        <TouchableOpacity
          className="h-11 px-4 rounded-full bg-primary flex-row items-center"
          style={{ gap: 8 }}
          onPress={() => setIsMenuOpen(true)}
          activeOpacity={0.8}
        >
          <Menu size={18} color={colors.primaryForeground} />
          <Text className="text-primary-foreground font-bold text-sm">
            More
          </Text>
        </TouchableOpacity>

        {/* Network Status Dot (Green/Red) */}
        <PulsingDot
          color={isNetworkOnline ? '#10b981' : '#ef4444'}
          style={{ marginLeft: -4, marginRight: 4 }}
          accessibilityLabel={isNetworkOnline ? 'Network Online' : 'Network Offline'}
        />
      </View>

      {/* Sheet menu */}
      <Modal
        visible={isMenuOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsMenuOpen(false)}
        statusBarTranslucent
      >
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }} onPress={() => setIsMenuOpen(false)}>
          <Pressable>
            <View
              className="bg-card rounded-t-[28px]"
              style={{
                paddingTop: 8,
                paddingBottom: Math.max(insets.bottom, 16) + 8,
                paddingHorizontal: 16,
                maxHeight: Dimensions.get('window').height * 0.75,
                boxShadow: '0px -4px 20px rgba(0,0,0,0.15)',
              }}
            >
              {/* Drag handle */}
              <View className="w-10 h-1 bg-border rounded-full self-center mb-4" />

              <View className="flex-row justify-between items-center mb-3 px-1">
                <Text className="text-xl font-extrabold text-foreground">
                  Menu
                </Text>
                <TouchableOpacity
                  onPress={() => setIsMenuOpen(false)}
                  className="p-2 rounded-full bg-secondary"
                  activeOpacity={0.7}
                >
                  <X size={18} color={colors.foreground} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <MenuItem name="Scanner" icon={Scan} targetRoute="Scanner" />
                <MenuItem name="Features" icon={Dumbbell} targetRoute="Features" />
                <MenuItem name="Get the App" icon={Smartphone} targetRoute="DownloadApp" />
                <MenuItem name="Privacy Policy" icon={ArrowRight} targetRoute="Privacy" />
                <MenuItem name="Terms of Service" icon={ArrowRight} targetRoute="Terms" />
              </ScrollView>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
