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
  PinOff,
  AlertTriangle,
  UserRound,
  Scan
} from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { useTheme } from '../../hooks/useTheme';
import { togglePinnedRoute } from '../../features/theme/themeSlice';
import { usePinger } from '../../hooks/usePinger';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { PulsingDot } from './PulsingDot';

const ROUTE_CONFIG: Record<string, { label: string, icon: any }> = {
  "Dashboard": { label: "Dashboard", icon: LayoutDashboard },
  "Attendance": { label: "Attendance", icon: Activity },
  "Members": { label: "Members", icon: Users },
  "Memberships": { label: "Memberships", icon: CreditCard },
  "Plans": { label: "Plans", icon: NotebookText },
  "Inventory": { label: "Inventory", icon: Box },
  "Orders": { label: "Orders", icon: ClipboardList },
  "Scanner": { label: "Scanner", icon: Scan },
  "Payments": { label: "Payments", icon: CreditCard },
  "Reports": { label: "Reports", icon: PieChart },
  "Redlist": { label: "Redlist", icon: AlertTriangle },
  "Staff": { label: "Staff", icon: ShieldCheck },
  "Inquiries": { label: "Inquiries", icon: MessageSquare },
  "Settings": { label: "Settings", icon: Settings },
  "Profile": { label: "Profile", icon: UserRound },
};

export function FloatingDock() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const dispatch = useAppDispatch();
  const { colors, styleMode } = useTheme();
  const insets = useSafeAreaInsets();
  const user = useAppSelector((state) => state.auth.user);
  const pinnedRoutes = useAppSelector((state) => state.theme.pinnedRoutes);
  const isBackendOnline = usePinger(6 * 60 * 1000); // 6 mins
  const isNetworkOnline = useNetworkStatus();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const currentRoute = route.name;


  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
  
  const FLOATING_DOCK_HEIGHT = isMobile ? 56 : 64;

  const dockBottom = Math.max(insets.bottom, 8) + 8;

  const NavItem = ({ icon: Icon, targetRoute, label }: { icon: any; targetRoute: string, label: string }) => {
    const isActive = currentRoute === targetRoute;
    const isCrowded = pinnedRoutes.length > 2;
    const showText = (!isMobile || isActive) && (!isCrowded || isActive);

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
        {showText && (
          <Text className={`font-semibold text-sm ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
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
      <View className={`flex-row items-center mb-0.5 rounded-xl ${isActive ? 'bg-primary/10' : ''}`}>
        <TouchableOpacity
          className="flex-1 flex-row items-center p-3.5"
          style={{ gap: 12 }}
          onPress={() => {
            setIsMenuOpen(false);
            if (currentRoute !== targetRoute) navigation.navigate(targetRoute);
          }}
          activeOpacity={0.7}
        >
          <Icon size={20} color={isActive ? colors.primary : colors.foreground} />
          <Text className={`text-[15px] ${isActive ? 'font-bold text-primary' : 'font-medium text-foreground'}`}>
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

  let containerClass = "bg-card border border-border shadow-sm";

  if (styleMode === 'clay') {
    containerClass = "bg-card shadow-[0_15px_40px_rgba(0,0,0,0.25)]";
  } else if (styleMode === 'glass') {
    containerClass = "bg-card/40 backdrop-blur-3xl border border-border shadow-lg";
  } else if (styleMode === 'liquid-glass') {
    containerClass = "bg-card/20 backdrop-blur-3xl border border-border shadow-lg";
  } else if (styleMode === 'minimal') {
    containerClass = "bg-card border-2 border-border";
  }

  return (
    <>
      <View
        className={`absolute self-center flex-row items-center justify-center px-2 ${containerClass}`}
        style={{
          bottom: dockBottom,
          height: FLOATING_DOCK_HEIGHT,
          borderRadius: FLOATING_DOCK_HEIGHT / 2,
          gap: 12,
        }}
      >
        {/* Backend Pinger Dot (Blue/Orange) */}
        <PulsingDot
          color={isBackendOnline === null ? colors.mutedForeground : isBackendOnline ? '#3b82f6' : '#f97316'}
          style={{ marginLeft: 4, marginRight: -4 }}
          accessibilityLabel={isBackendOnline ? 'Server Online' : 'Server Offline'}
        />

        <View className="flex-row items-center">
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

      <Modal
        visible={isMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsMenuOpen(false)}
      >
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <Pressable style={{ flex: 1 }} onPress={() => setIsMenuOpen(false)} />
          <View
            className="bg-card rounded-t-[32px] p-6"
            style={{
              paddingBottom: Math.max(insets.bottom, 24),
              maxHeight: '80%',
              boxShadow: '0px -4px 20px rgba(0,0,0,0.15)',
            }}
          >
            <View className="flex-row items-center justify-between mb-5">
              <Text className="text-xl font-black text-foreground">Menu</Text>
              <TouchableOpacity
                onPress={() => setIsMenuOpen(false)}
                className="w-9 h-9 items-center justify-center bg-secondary rounded-full"
              >
                <X size={18} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              <View style={{ gap: 4 }}>
                <Text className="text-xs font-extrabold uppercase text-muted-foreground tracking-widest mt-2 mb-2 px-1">Core</Text>
                <MenuItem name="Dashboard" icon={LayoutDashboard} targetRoute="Dashboard" />
                <MenuItem name="Attendance" icon={Activity} targetRoute="Attendance" />
                
                <Text className="text-xs font-extrabold uppercase text-muted-foreground tracking-widest mt-4 mb-2 px-1">Operations</Text>
                <MenuItem name="Members" icon={Users} targetRoute="Members" />
                {isAdmin && <MenuItem name="Memberships" icon={CreditCard} targetRoute="Memberships" />}
                {isAdmin && <MenuItem name="Plans" icon={NotebookText} targetRoute="Plans" />}
                <MenuItem name="Inventory" icon={Box} targetRoute="Inventory" />
                <MenuItem name="Orders" icon={ClipboardList} targetRoute="Orders" />
                <MenuItem name="Scanner" icon={Scan} targetRoute="Scanner" />
                <MenuItem name="Payments" icon={CreditCard} targetRoute="Payments" />
                
                <Text className="text-xs font-extrabold uppercase text-muted-foreground tracking-widest mt-4 mb-2 px-1">Management</Text>
                <MenuItem name="Reports" icon={PieChart} targetRoute="Reports" />
                <MenuItem name="Redlist" icon={AlertTriangle} targetRoute="Redlist" />
                {isAdmin && <MenuItem name="Staff" icon={ShieldCheck} targetRoute="Staff" />}
                <MenuItem name="Inquiries" icon={MessageSquare} targetRoute="Inquiries" />
                <MenuItem name="Settings" icon={Settings} targetRoute="Settings" />
                <MenuItem name="Profile" icon={UserRound} targetRoute="Profile" />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}
