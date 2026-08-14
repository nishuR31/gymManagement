import React, { useState } from 'react';
import { View, TouchableOpacity, Text, Dimensions, Modal, TouchableWithoutFeedback, ScrollView } from 'react-native';
import { Home, Users, Dumbbell, Settings, Menu, X, CreditCard, Box, PieChart, Activity, ShieldCheck, ClipboardList, MessageSquare } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppSelector } from '../../store/hooks';
import { themeColors } from '../../constants/colors';
import { isAdminRole } from '../../utils/roles';

export function FloatingDock() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const theme = useAppSelector((state) => state.theme.theme);
  const user = useAppSelector((state) => state.auth.user);
  const activeColors = themeColors[theme === 'dark' ? 'dark' : 'light'];
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isAdmin = isAdminRole(user?.role);
  const currentRoute = route.name;

  const NavItem = ({ icon: Icon, targetRoute, label }: any) => {
    const isActive = currentRoute === targetRoute;
    return (
      <TouchableOpacity 
        className={`items-center justify-center h-12 px-4 rounded-full ${isActive ? 'bg-primary/20' : ''}`}
        onPress={() => {
          setIsMenuOpen(false);
          if (currentRoute !== targetRoute) navigation.navigate(targetRoute);
        }}
      >
        <View className="flex-row items-center gap-2">
          <Icon size={20} color={isActive ? activeColors.primary : activeColors.mutedForeground} />
          {label ? <Text className={isActive ? 'text-primary font-bold' : 'text-muted-foreground font-medium'}>{label}</Text> : null}
        </View>
      </TouchableOpacity>
    );
  };

  const MenuItem = ({ name, icon: Icon, targetRoute }: any) => (
    <TouchableOpacity 
      className="flex-row items-center gap-3 p-4 border-b border-border"
      onPress={() => {
        setIsMenuOpen(false);
        if (currentRoute !== targetRoute) navigation.navigate(targetRoute);
      }}
    >
      <Icon size={20} color={activeColors.foreground} />
      <Text className="text-base font-medium text-foreground">{name}</Text>
    </TouchableOpacity>
  );

  return (
    <>
      <View className="absolute bottom-6 left-6 right-6 h-16 rounded-full bg-card/90 border border-border flex-row items-center justify-between px-2 shadow-lg" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 }}>
        
        <View className="flex-row items-center">
          <NavItem icon={Home} targetRoute="Dashboard" />
          <NavItem icon={Activity} targetRoute="Attendance" />
          <NavItem icon={Users} targetRoute="Members" />
        </View>

        <TouchableOpacity 
          className="items-center justify-center h-12 px-4 rounded-full bg-primary flex-row gap-2"
          onPress={() => setIsMenuOpen(true)}
        >
          <Menu size={20} color={activeColors.primaryForeground} />
          <Text className="text-primary-foreground font-bold">Menu</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={isMenuOpen} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setIsMenuOpen(false)}>
          <View className="flex-1 bg-black/40 justify-end">
            <TouchableWithoutFeedback>
              <View className="bg-card rounded-t-3xl pt-2 pb-10 px-4 shadow-lg">
                <View className="w-12 h-1.5 bg-muted rounded-full self-center mb-6" />
                <View className="flex-row justify-between items-center mb-4 px-2">
                  <Text className="text-xl font-bold text-foreground">Menu</Text>
                  <TouchableOpacity onPress={() => setIsMenuOpen(false)} className="p-2 bg-secondary rounded-full">
                    <X size={20} color={activeColors.foreground} />
                  </TouchableOpacity>
                </View>
                
                <ScrollView className="max-h-[70%]">
                  <MenuItem name="Dashboard" icon={Home} targetRoute="Dashboard" />
                  
                  <View className="my-4 border-t border-border" />
                  <Text className="text-xs uppercase text-muted-foreground font-bold ml-2 mb-2 tracking-wider">Front Desk</Text>
                  <MenuItem name="Attendance" icon={Activity} targetRoute="Attendance" />
                  <MenuItem name="Members" icon={Users} targetRoute="Members" />
                  
                  <View className="my-4 border-t border-border" />
                  <Text className="text-xs uppercase text-muted-foreground font-bold ml-2 mb-2 tracking-wider">Business</Text>
                  {isAdmin && <MenuItem name="Memberships" icon={CreditCard} targetRoute="Memberships" />}
                  {isAdmin && <MenuItem name="Workout & Diet Plans" icon={Dumbbell} targetRoute="Plans" />}
                  <MenuItem name="Inventory" icon={Box} targetRoute="Inventory" />
                  <MenuItem name="Orders" icon={ClipboardList} targetRoute="Orders" />
                  <MenuItem name="Payments" icon={CreditCard} targetRoute="Payments" />
                  <MenuItem name="Reports" icon={PieChart} targetRoute="Reports" />
                  
                  <View className="my-4 border-t border-border" />
                  <Text className="text-xs uppercase text-muted-foreground font-bold ml-2 mb-2 tracking-wider">Admin</Text>
                  {isAdmin && <MenuItem name="Staff" icon={ShieldCheck} targetRoute="Staff" />}
                  <MenuItem name="Inquiries" icon={MessageSquare} targetRoute="Inquiries" />
                  <MenuItem name="Settings" icon={Settings} targetRoute="Settings" />
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}
