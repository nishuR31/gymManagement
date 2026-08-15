import { useState } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  Modal,
  Pressable,
  ScrollView,
  useWindowDimensions,
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
  Menu,
  X,
  LayoutDashboard,
  Pin,
  PinOff
} from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { useTheme } from '../../hooks/useTheme';
import { togglePinnedRoute } from '../../features/theme/themeSlice';

const ROUTE_CONFIG: Record<string, { label: string, icon: any }> = {
  "Dashboard": { label: "Dashboard", icon: LayoutDashboard },
  "Attendance": { label: "Attendance", icon: Activity },
  "Members": { label: "Members", icon: Users },
  "Memberships": { label: "Memberships", icon: CreditCard },
  "Plans": { label: "Plans", icon: NotebookText },
  "Inventory": { label: "Inventory", icon: Box },
  "Orders": { label: "Orders", icon: ClipboardList },
  "Payments": { label: "Payments", icon: CreditCard },
  "Reports": { label: "Reports", icon: PieChart },
  "Staff": { label: "Staff", icon: ShieldCheck },
  "Inquiries": { label: "Inquiries", icon: MessageSquare },
  "Settings": { label: "Settings", icon: Settings },
};

export const FLOATING_DOCK_HEIGHT = 64;

export function FloatingDock() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const dispatch = useAppDispatch();
  const { colors, styleMode } = useTheme();
  const insets = useSafeAreaInsets();
  const user = useAppSelector((state) => state.auth.user);
  const pinnedRoutes = useAppSelector((state) => state.theme.pinnedRoutes);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const currentRoute = route.name;
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';

  const dockBottom = Math.max(insets.bottom, 8) + 8;

  const NavItem = ({ icon: Icon, targetRoute, label }: { icon: any; targetRoute: string, label: string }) => {
    const isActive = currentRoute === targetRoute;
    const isCrowded = pinnedRoutes.length > 2;
    const showText = (!isMobile || isActive) && (!isCrowded || isActive);

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
        {showText && (
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

  const MenuItem = ({ name, icon: Icon, targetRoute }: { name: string; icon: any; targetRoute: string }) => {
    const isActive = currentRoute === targetRoute;
    const isPinned = pinnedRoutes.includes(targetRoute);

    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2, backgroundColor: isActive ? `${colors.primary}18` : 'transparent', borderRadius: 12 }}>
        <TouchableOpacity
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            padding: 14,
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
        
        <TouchableOpacity 
          style={{ padding: 14, paddingLeft: 8 }}
          onPress={() => dispatch(togglePinnedRoute(targetRoute))}
          activeOpacity={0.6}
        >
          {isPinned ? <Pin size={18} color={colors.primary} /> : <PinOff size={18} color={colors.mutedForeground} />}
        </TouchableOpacity>
      </View>
    );
  };

  let containerStyle: any = {
    position: 'absolute',
    bottom: dockBottom,
    alignSelf: 'center',
    height: FLOATING_DOCK_HEIGHT,
    borderRadius: FLOATING_DOCK_HEIGHT / 2,
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
      <View
        className={containerClass}
        style={containerStyle}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <NavItem icon={Home} targetRoute="Home" label="Home" />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', alignItems: 'center', flexGrow: 1 }}>
          {pinnedRoutes.map(r => {
            const config = ROUTE_CONFIG[r];
            if (!config) return null;
            return <NavItem key={r} icon={config.icon} targetRoute={r} label={config.label} />;
          })}
        </ScrollView>

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
      </View>

      <Modal
        visible={isMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsMenuOpen(false)}
      >
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <Pressable style={{ flex: 1 }} onPress={() => setIsMenuOpen(false)} />
          <View
            style={{
              backgroundColor: colors.card,
              borderTopLeftRadius: 32,
              borderTopRightRadius: 32,
              padding: 24,
              paddingBottom: Math.max(insets.bottom, 24),
              maxHeight: '80%',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <Text style={{ fontSize: 20, fontWeight: '900', color: colors.foreground }}>Menu</Text>
              <TouchableOpacity
                onPress={() => setIsMenuOpen(false)}
                style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.secondary, borderRadius: 18 }}
              >
                <X size={18} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              <View style={{ gap: 4 }}>
                <Text style={{ fontSize: 12, fontWeight: '800', textTransform: 'uppercase', color: colors.mutedForeground, letterSpacing: 1, marginTop: 8, marginBottom: 8, paddingHorizontal: 4 }}>Core</Text>
                <MenuItem name="Dashboard" icon={LayoutDashboard} targetRoute="Dashboard" />
                <MenuItem name="Attendance" icon={Activity} targetRoute="Attendance" />
                
                <Text style={{ fontSize: 12, fontWeight: '800', textTransform: 'uppercase', color: colors.mutedForeground, letterSpacing: 1, marginTop: 16, marginBottom: 8, paddingHorizontal: 4 }}>Operations</Text>
                <MenuItem name="Members" icon={Users} targetRoute="Members" />
                {isAdmin && <MenuItem name="Memberships" icon={CreditCard} targetRoute="Memberships" />}
                {isAdmin && <MenuItem name="Plans" icon={NotebookText} targetRoute="Plans" />}
                <MenuItem name="Inventory" icon={Box} targetRoute="Inventory" />
                <MenuItem name="Orders" icon={ClipboardList} targetRoute="Orders" />
                <MenuItem name="Payments" icon={CreditCard} targetRoute="Payments" />
                
                <Text style={{ fontSize: 12, fontWeight: '800', textTransform: 'uppercase', color: colors.mutedForeground, letterSpacing: 1, marginTop: 16, marginBottom: 8, paddingHorizontal: 4 }}>Management</Text>
                <MenuItem name="Reports" icon={PieChart} targetRoute="Reports" />
                {isAdmin && <MenuItem name="Staff" icon={ShieldCheck} targetRoute="Staff" />}
                <MenuItem name="Inquiries" icon={MessageSquare} targetRoute="Inquiries" />
                <MenuItem name="Settings" icon={Settings} targetRoute="Settings" />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}
