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
  const { colors, styleMode } = useTheme();
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
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          height: 44,
          paddingHorizontal: 14,
          gap: 6,
          borderRadius: 22,
          backgroundColor: isActive ? `${colors.primary}22` : 'transparent',
        }}
        onPress={() => {
          setIsMenuOpen(false);
          if (currentRoute !== targetRoute) navigation.navigate(targetRoute);
        }}
        activeOpacity={0.7}
      >
        <Icon size={20} color={isActive ? colors.primary : colors.mutedForeground} />
        {(!isMobile || isActive) && (
          <Text
            style={{
              color: isActive ? colors.primary : colors.mutedForeground,
              fontWeight: '600',
              fontSize: 14,
            }}
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
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          padding: 14,
          borderRadius: 12,
          marginBottom: 2,
          backgroundColor: isActive ? `${colors.primary}18` : 'transparent',
        }}
        onPress={() => {
          setIsMenuOpen(false);
          if (currentRoute !== targetRoute) navigation.navigate(targetRoute);
        }}
        activeOpacity={0.7}
      >
        <Icon size={20} color={isActive ? colors.primary : colors.foreground} />
        <Text
          style={{
            color: isActive ? colors.primary : colors.foreground,
            fontSize: 15,
            fontWeight: isActive ? '700' : '500',
          }}
        >
          {name}
        </Text>
      </TouchableOpacity>
    );
  };

  let containerStyle: any = {
    position: 'absolute',
    bottom: dockBottom,
    alignSelf: 'center',
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    gap: 12,
  };

  let containerClass = "elevation-12 shadow-sm";

  if (styleMode === 'clay') {
    containerStyle.borderWidth = 0;
    containerClass = "shadow-[0_15px_40px_rgba(0,0,0,0.25)]";
    containerStyle.shadowColor = '#000';
    containerStyle.shadowOffset = { width: 0, height: 12 };
    containerStyle.shadowOpacity = 0.3;
    containerStyle.shadowRadius = 24;
    containerStyle.elevation = 16;
  } else if (styleMode === 'glass') {
    containerClass = "bg-background/40 backdrop-blur-3xl border border-white/10 shadow-lg shadow-black/20";
    containerStyle.backgroundColor = 'transparent';
  } else if (styleMode === 'minimal') {
    containerStyle.borderRadius = 0;
    containerStyle.borderWidth = 2;
    containerClass = "shadow-none";
  }

  return (
    <>
      {/* Dock pill */}
      <View
        className={containerClass}
        style={containerStyle}
      >
        {/* Backend Pinger Dot (Blue/Orange) */}
        <PulsingDot
          color={isBackendOnline === null ? colors.mutedForeground : isBackendOnline ? '#3b82f6' : '#f97316'}
          style={{ marginLeft: 4, marginRight: -4 }}
          accessibilityLabel={isBackendOnline ? 'Server Online' : 'Server Offline'}
        />

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <NavItem icon={Home} targetRoute="Home" label="Home" />
          <NavItem icon={Dumbbell} targetRoute="Plans" label="Plans" />
          <NavItem icon={Users} targetRoute="MemberLogin" label="Member" />
          <NavItem icon={ShieldCheck} targetRoute="Login" label="Admin" />
        </View>

        <TouchableOpacity
          style={{
            height: 44,
            paddingHorizontal: 18,
            borderRadius: 22,
            backgroundColor: colors.primary,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}
          onPress={() => setIsMenuOpen(true)}
          activeOpacity={0.8}
        >
          <Menu size={18} color={colors.primaryForeground} />
          <Text
            style={{
              color: colors.primaryForeground,
              fontWeight: '700',
              fontSize: 14,
            }}
          >
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
              style={{
                backgroundColor: colors.card,
                borderTopLeftRadius: 28,
                borderTopRightRadius: 28,
                paddingTop: 8,
                paddingBottom: Math.max(insets.bottom, 16) + 8,
                paddingHorizontal: 16,
                maxHeight: Dimensions.get('window').height * 0.75,
                elevation: 24,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: 0.15,
                shadowRadius: 20,
              }}
            >
              {/* Drag handle */}
              <View
                style={{
                  width: 40,
                  height: 4,
                  backgroundColor: colors.border,
                  borderRadius: 2,
                  alignSelf: 'center',
                  marginBottom: 16,
                }}
              />

              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 12,
                  paddingHorizontal: 4,
                }}
              >
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: '800',
                    color: colors.foreground,
                  }}
                >
                  Menu
                </Text>
                <TouchableOpacity
                  onPress={() => setIsMenuOpen(false)}
                  style={{
                    padding: 8,
                    borderRadius: 20,
                    backgroundColor: colors.secondary,
                  }}
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
