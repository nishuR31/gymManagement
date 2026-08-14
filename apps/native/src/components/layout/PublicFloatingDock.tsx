import React, { useState } from 'react';
import { View, TouchableOpacity, Text, Modal, TouchableWithoutFeedback, ScrollView } from 'react-native';
import { Home, Users, Dumbbell, Settings, Menu, X, ArrowRight, ShieldCheck, Smartphone } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppSelector } from '../../store/hooks';
import { themeColors } from '../../constants/colors';

export function PublicFloatingDock() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const theme = useAppSelector((state) => state.theme.theme);
  const styleMode = useAppSelector((state) => state.theme.styleMode);
  const activeColors = themeColors[theme === 'amoled' ? 'amoled' : theme === 'dark' ? 'dark' : 'light'];
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const currentRoute = route.name;

  let dockClass = "absolute bottom-6 left-6 right-6 h-16 flex-row items-center justify-between px-3 ";
  if (styleMode === 'clay') dockClass += "bg-card border border-transparent rounded-[32px] shadow-lg";
  else if (styleMode === 'glass') dockClass += "bg-card/60 border border-border rounded-full shadow-sm";
  else dockClass += "bg-background border border-border rounded-full shadow-none";

  let modalClass = "pt-2 pb-10 px-4 shadow-lg max-h-[80%] ";
  if (styleMode === 'clay') modalClass += "bg-card border-t border-transparent rounded-t-[32px]";
  else if (styleMode === 'glass') modalClass += "bg-card/90 border-t border-border rounded-t-3xl backdrop-blur-md";
  else modalClass += "bg-background border-t border-border rounded-t-xl shadow-none";

  const NavItem = ({ icon: Icon, targetRoute, label }: any) => {
    const isActive = currentRoute === targetRoute;
    return (
      <TouchableOpacity 
        className={`items-center justify-center h-12 px-4 ${styleMode === 'clay' ? 'rounded-2xl' : 'rounded-full'} ${isActive ? 'bg-primary/20' : ''}`}
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
      className={`flex-row items-center gap-3 p-4 border-b ${styleMode === 'minimal' ? 'border-border' : 'border-border/50'}`}
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
      <View className={dockClass} style={styleMode === 'clay' ? { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 } : {}}>
        
        <NavItem icon={Home} targetRoute="Home" label="Home" />
        <NavItem icon={Dumbbell} targetRoute="Plans" label="Plans" />
        
        <TouchableOpacity 
          className={`items-center justify-center h-12 w-12 bg-primary ${styleMode === 'clay' ? 'rounded-2xl shadow-sm' : 'rounded-full'}`}
          onPress={() => setIsMenuOpen(true)}
        >
          <Menu size={20} color={activeColors.primaryForeground} />
        </TouchableOpacity>
      </View>

      <Modal visible={isMenuOpen} transparent animationType="fade">
        <TouchableOpacity 
          className="flex-1 bg-black/40 justify-end"
          activeOpacity={1}
          onPress={() => setIsMenuOpen(false)}
        >
          <TouchableOpacity 
            activeOpacity={1}
            onPress={() => {}}
            className={modalClass}
          >
            <View className="w-12 h-1.5 bg-muted rounded-full self-center mb-6" />
            <View className="flex-row justify-between items-center mb-4 px-2">
              <Text className="text-xl font-bold text-foreground">Navigation</Text>
              <TouchableOpacity onPress={() => setIsMenuOpen(false)} className="p-2 bg-secondary rounded-full">
                <X size={20} color={activeColors.foreground} />
              </TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              <MenuItem name="Features" icon={Dumbbell} targetRoute="Features" />
              <MenuItem name="View Plans" icon={Dumbbell} targetRoute="Plans" />
              <MenuItem name="Member Login" icon={Users} targetRoute="MemberLogin" />
              <MenuItem name="Staff / Admin" icon={ShieldCheck} targetRoute="Login" />
              <MenuItem name="Get the App" icon={Smartphone} targetRoute="DownloadApp" />
              <MenuItem name="Privacy Policy" icon={ArrowRight} targetRoute="Privacy" />
              <MenuItem name="Terms of Service" icon={ArrowRight} targetRoute="Terms" />
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}
