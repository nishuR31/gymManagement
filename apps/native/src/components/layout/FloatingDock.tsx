import {
  View,
  TouchableOpacity,
  Text,
  ScrollView,
} from 'react-native';
import {
  Home,
  Users,
  Activity,
  CreditCard,
  Box,
  ClipboardList,
  PieChart,
  Settings,
  ShieldCheck,
  MessageSquare,
  NotebookText,
} from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppSelector } from '../../store/hooks';
import { useTheme } from '../../hooks/useTheme';

export const FLOATING_DOCK_HEIGHT = 64;

export function FloatingDock() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { colors, styleMode } = useTheme();
  const insets = useSafeAreaInsets();
  const user = useAppSelector((state) => state.auth.user);

  const currentRoute = route.name;
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';

  const dockBottom = Math.max(insets.bottom, 8) + 8;

  const NavItem = ({ icon: Icon, targetRoute, label }: { icon: any; targetRoute: string, label: string }) => {
    const isActive = currentRoute === targetRoute;
    return (
      <TouchableOpacity
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          height: 44,
          paddingHorizontal: 16,
          borderRadius: 22,
          gap: 6,
          backgroundColor: isActive ? `${colors.primary}22` : 'transparent',
        }}
        onPress={() => {
          if (currentRoute !== targetRoute) navigation.navigate(targetRoute);
        }}
        activeOpacity={0.7}
      >
        <Icon size={20} color={isActive ? colors.primary : colors.mutedForeground} />
        <Text
          style={{
            color: isActive ? colors.primary : colors.mutedForeground,
            fontWeight: '600',
            fontSize: 14,
          }}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  let containerClass = "absolute left-4 right-4 overflow-hidden";
  let containerStyle: any = {
    bottom: dockBottom,
    height: FLOATING_DOCK_HEIGHT,
    backgroundColor: colors.card,
    borderRadius: FLOATING_DOCK_HEIGHT / 2,
    borderWidth: 1,
    borderColor: colors.border,
  };

  if (styleMode === 'clay') {
    containerStyle.borderWidth = 0;
    containerClass += " shadow-[0_15px_40px_rgba(0,0,0,0.25)]";
    containerStyle.shadowColor = '#000';
    containerStyle.shadowOffset = { width: 0, height: 12 };
    containerStyle.shadowOpacity = 0.3;
    containerStyle.shadowRadius = 24;
    containerStyle.elevation = 16;
  } else if (styleMode === 'glass') {
    containerClass += " bg-background/40 backdrop-blur-3xl border border-white/10 shadow-lg shadow-black/20";
    containerStyle.backgroundColor = 'transparent';
  } else if (styleMode === 'minimal') {
    containerStyle.borderRadius = 0;
    containerStyle.borderWidth = 2;
    containerClass += " shadow-none";
  }

  return (
    <View
      className={containerClass}
      style={containerStyle}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ alignItems: 'center', paddingHorizontal: 8, gap: 4, height: '100%' }}
      >
        <NavItem icon={Home} targetRoute="Dashboard" label="Dashboard" />
        <NavItem icon={Activity} targetRoute="Attendance" label="Attendance" />
        <NavItem icon={Users} targetRoute="Members" label="Members" />
        {isAdmin && <NavItem icon={CreditCard} targetRoute="Memberships" label="Memberships" />}
        {isAdmin && <NavItem icon={NotebookText} targetRoute="Plans" label="Plans" />}
        <NavItem icon={Box} targetRoute="Inventory" label="Inventory" />
        <NavItem icon={ClipboardList} targetRoute="Orders" label="Orders" />
        <NavItem icon={CreditCard} targetRoute="Payments" label="Payments" />
        <NavItem icon={PieChart} targetRoute="Reports" label="Reports" />
        {isAdmin && <NavItem icon={ShieldCheck} targetRoute="Staff" label="Staff" />}
        <NavItem icon={MessageSquare} targetRoute="Inquiries" label="Inquiries" />
        <NavItem icon={Settings} targetRoute="Settings" label="Settings" />
      </ScrollView>
    </View>
  );
}
