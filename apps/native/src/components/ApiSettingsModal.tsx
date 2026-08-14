import React from 'react';
import { View, Text, Modal, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { X, RefreshCw, Sun, Moon, MoonStar, HardDrive } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useAppSelector, useAppDispatch } from '../store/hooks';
import { themeColors } from '../constants/colors';
import { setTheme, setStyleMode, type Theme, type StyleMode } from '../features/theme/themeSlice';
import { Button } from './ui/Button';

interface ApiSettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export function ApiSettingsModal({ visible, onClose }: ApiSettingsModalProps) {
  const dispatch = useAppDispatch();
  const theme = useAppSelector((state) => state.theme.theme);
  const styleMode = useAppSelector((state) => state.theme.styleMode);
  const activeColors = themeColors[theme === 'dark' || theme === 'amoled' ? 'dark' : 'light'];
  
  const handleClearCache = async () => {
    try {
      const currentTheme = await AsyncStorage.getItem('gymos-theme');
      const currentStyle = await AsyncStorage.getItem('gymos-style');
      
      await AsyncStorage.clear();
      
      if (currentTheme) await AsyncStorage.setItem('gymos-theme', currentTheme);
      if (currentStyle) await AsyncStorage.setItem('gymos-style', currentStyle);
      
      Toast.show({ type: 'success', text1: 'Cache cleared successfully!' });
      onClose();
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Failed to clear cache' });
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-card rounded-t-3xl overflow-hidden pt-4 pb-10 px-6 max-h-[80%]">
            
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-xl font-bold text-foreground">Valor Fitness Settings</Text>
              <TouchableOpacity onPress={onClose} className="p-2 bg-secondary rounded-full">
                <X size={20} color={activeColors.foreground} />
              </TouchableOpacity>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {/* Color Scheme */}
              <View className="mb-6 p-4 rounded-xl border border-border bg-card shadow-sm">
                <View className="flex-row items-center gap-3 mb-3">
                  <View className="p-2 bg-primary/10 rounded-md">
                    {theme === 'amoled' ? <MoonStar size={20} color={activeColors.primary} /> : theme === 'dark' ? <Moon size={20} color={activeColors.primary} /> : <Sun size={20} color={activeColors.primary} />}
                  </View>
                  <Text className="text-lg font-bold text-foreground">Color Scheme</Text>
                </View>
                <Text className="text-xs text-muted-foreground mb-4">
                  Switch between light and dark mode.
                </Text>
                <View className="flex-row gap-3">
                  <Button variant={theme === "light" ? "primary" : "secondary"} onPress={() => dispatch(setTheme("light"))} className="flex-1 h-10">
                    <Text className={theme === "light" ? "text-primary-foreground font-bold" : "text-foreground font-medium"}>Light</Text>
                  </Button>
                  <Button variant={theme === "dark" ? "primary" : "secondary"} onPress={() => dispatch(setTheme("dark"))} className="flex-1 h-10">
                    <Text className={theme === "dark" ? "text-primary-foreground font-bold" : "text-foreground font-medium"}>Dark</Text>
                  </Button>
                </View>
                <View className="flex-row gap-3 mt-2">
                  <Button variant={theme === "amoled" ? "primary" : "secondary"} onPress={() => dispatch(setTheme("amoled"))} className="flex-1 h-10">
                    <Text className={theme === "amoled" ? "text-primary-foreground font-bold" : "text-foreground font-medium"}>AMOLED (Beta)</Text>
                  </Button>
                </View>
              </View>

              {/* Styling Paradigm */}
              <View className="mb-6 p-4 rounded-xl border border-border bg-card shadow-sm">
                <View className="flex-row items-center gap-3 mb-3">
                  <View className="p-2 bg-primary/10 rounded-md">
                    <Sun size={20} color={activeColors.primary} />
                  </View>
                  <Text className="text-lg font-bold text-foreground">Styling Paradigm</Text>
                </View>
                <Text className="text-xs text-muted-foreground mb-4">
                  Change the overall shape and feel of UI components.
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  <Button variant={styleMode === "minimal" ? "primary" : "secondary"} onPress={() => dispatch(setStyleMode("minimal"))} className="h-10 px-4">
                    <Text className={styleMode === "minimal" ? "text-primary-foreground font-bold" : "text-foreground font-medium"}>Minimalist</Text>
                  </Button>
                  <Button variant={styleMode === "glass" ? "primary" : "secondary"} onPress={() => dispatch(setStyleMode("glass"))} className="h-10 px-4">
                    <Text className={styleMode === "glass" ? "text-primary-foreground font-bold" : "text-foreground font-medium"}>Glassmorphism</Text>
                  </Button>
                  <Button variant={styleMode === "clay" ? "primary" : "secondary"} onPress={() => dispatch(setStyleMode("clay"))} className="h-10 px-4 mt-2">
                    <Text className={styleMode === "clay" ? "text-primary-foreground font-bold" : "text-foreground font-medium"}>Claymorphism</Text>
                  </Button>
                </View>
              </View>

              {/* Troubleshooting & Cache */}
              <View className="mb-6 p-4 rounded-xl border border-border bg-card shadow-sm">
                <View className="flex-row items-center gap-3 mb-3">
                  <View className="p-2 bg-primary/10 rounded-md">
                    <HardDrive size={20} color={activeColors.primary} />
                  </View>
                  <Text className="text-lg font-bold text-foreground">Troubleshooting</Text>
                </View>
                <Text className="text-xs text-muted-foreground mb-4">
                  If the app shows stale data, clearing cache forces it to reload.
                </Text>
                <Button onPress={handleClearCache} className="w-full h-11">
                  <RefreshCw size={16} color={activeColors.primaryForeground} style={{ marginRight: 8 }} />
                  <Text className="text-primary-foreground font-bold">Clear Cache & Reload App</Text>
                </Button>
              </View>

            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
