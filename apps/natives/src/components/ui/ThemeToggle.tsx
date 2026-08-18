import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Layers, Moon, Sun, Monitor, Smartphone, Droplet, Box, Type } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useAppDispatch } from '../../store/hooks';
import { setTheme, setStyleMode, type Theme, type StyleMode } from '../../features/theme/themeSlice';

export const ThemeToggle = React.memo(function ThemeToggle() {
  const { theme, styleMode, colors } = useTheme();
  const dispatch = useAppDispatch();

  const handleThemeChange = (newTheme: Theme) => {
    dispatch(setTheme(newTheme));
  };

  const handleStyleChange = (newStyle: StyleMode) => {
    dispatch(setStyleMode(newStyle));
  };

  return (
    <View className="rounded-3xl p-5 border mt-4" style={[styles.shadow, { backgroundColor: colors.card, borderColor: colors.border }]}>
      
      {/* ── Section A: Color Scheme ── */}
      <Text className="font-black text-lg mb-4" style={{ color: colors.foreground }}>Color Engine</Text>
      <View className="flex-row flex-wrap gap-2 mb-8">
        
        <TouchableOpacity
          onPress={() => handleThemeChange('system')}
          className={`flex-1 min-w-[45%] flex-row items-center gap-2 p-3 rounded-2xl border ${
            theme === 'system' ? 'bg-primary/20 border-primary' : 'bg-transparent border-border'
          }`}
        >
          <Smartphone size={18} color={theme === 'system' ? colors.primary : colors.mutedForeground} />
          <Text className={`font-medium ${theme === 'system' ? 'text-primary' : 'text-muted-foreground'}`}>System</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleThemeChange('light')}
          className={`flex-1 min-w-[45%] flex-row items-center gap-2 p-3 rounded-2xl border ${
            theme === 'light' ? 'bg-primary/20 border-primary' : 'bg-transparent border-border'
          }`}
        >
          <Sun size={18} color={theme === 'light' ? colors.primary : colors.mutedForeground} />
          <Text className={`font-medium ${theme === 'light' ? 'text-primary' : 'text-muted-foreground'}`}>Light</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleThemeChange('dark')}
          className={`flex-1 min-w-[45%] flex-row items-center gap-2 p-3 rounded-2xl border ${
            theme === 'dark' ? 'bg-primary/20 border-primary' : 'bg-transparent border-border'
          }`}
        >
          <Moon size={18} color={theme === 'dark' ? colors.primary : colors.mutedForeground} />
          <Text className={`font-medium ${theme === 'dark' ? 'text-primary' : 'text-muted-foreground'}`}>Dark</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleThemeChange('amoled')}
          className={`flex-1 min-w-[45%] flex-row items-center gap-2 p-3 rounded-2xl border ${
            theme === 'amoled' ? 'bg-primary/20 border-primary' : 'bg-transparent border-border'
          }`}
        >
          <Monitor size={18} color={theme === 'amoled' ? colors.primary : colors.mutedForeground} />
          <Text className={`font-medium ${theme === 'amoled' ? 'text-primary' : 'text-muted-foreground'}`}>Amoled</Text>
        </TouchableOpacity>

      </View>

      {/* ── Section B: Material Engine ── */}
      <Text className="font-black text-lg mb-4" style={{ color: colors.foreground }}>Material Engine</Text>
      <View className="gap-3">
        
        {/* Minimalist */}
        <TouchableOpacity
          onPress={() => handleStyleChange('minimal')}
          className={`flex-row items-center justify-between p-4 rounded-2xl border ${
            styleMode === 'minimal' ? 'bg-primary/10 border-primary/50' : 'bg-secondary border-border'
          }`}
        >
          <View className="flex-row items-center gap-4 flex-1">
            <View className={`p-2.5 rounded-xl ${styleMode === 'minimal' ? 'bg-primary/20' : 'bg-background'}`}>
              <Type size={20} color={styleMode === 'minimal' ? colors.primary : colors.mutedForeground} />
            </View>
            <View className="flex-1">
              <Text className="font-bold" style={{ color: colors.foreground }}>Minimalist</Text>
              <Text className="text-xs mt-1" style={{ color: colors.mutedForeground }}>Sharp, clean, focus on typography and space.</Text>
            </View>
          </View>
          {styleMode === 'minimal' && <View className="w-2.5 h-2.5 rounded-full bg-primary" />}
        </TouchableOpacity>

        {/* Claymorphism */}
        <TouchableOpacity
          onPress={() => handleStyleChange('clay')}
          className={`flex-row items-center justify-between p-4 rounded-2xl border ${
            styleMode === 'clay' ? 'bg-primary/10 border-primary/50' : 'bg-secondary border-border'
          }`}
        >
          <View className="flex-row items-center gap-4 flex-1">
            <View className={`p-2.5 rounded-xl ${styleMode === 'clay' ? 'bg-primary/20' : 'bg-background'}`}>
              <Box size={20} color={styleMode === 'clay' ? colors.primary : colors.mutedForeground} />
            </View>
            <View className="flex-1">
              <Text className="font-bold" style={{ color: colors.foreground }}>Claymorphism</Text>
              <Text className="text-xs mt-1" style={{ color: colors.mutedForeground }}>Soft, tactile, bubbly extruded 3D surfaces.</Text>
            </View>
          </View>
          {styleMode === 'clay' && <View className="w-2.5 h-2.5 rounded-full bg-primary" />}
        </TouchableOpacity>

        {/* Glassmorphism */}
        <TouchableOpacity
          onPress={() => handleStyleChange('glass')}
          className={`flex-row items-center justify-between p-4 rounded-2xl border ${
            styleMode === 'glass' ? 'bg-primary/10 border-primary/50' : 'bg-secondary border-border'
          }`}
        >
          <View className="flex-row items-center gap-4 flex-1">
            <View className={`p-2.5 rounded-xl ${styleMode === 'glass' ? 'bg-primary/20' : 'bg-background'}`}>
              <Layers size={20} color={styleMode === 'glass' ? colors.primary : colors.mutedForeground} />
            </View>
            <View className="flex-1">
              <Text className="font-bold" style={{ color: colors.foreground }}>Glassmorphism</Text>
              <Text className="text-xs mt-1" style={{ color: colors.mutedForeground }}>Subtle, frosted semi-transparent layered cards.</Text>
            </View>
          </View>
          {styleMode === 'glass' && <View className="w-2.5 h-2.5 rounded-full bg-primary" />}
        </TouchableOpacity>

        {/* Liquid Glass */}
        <TouchableOpacity
          onPress={() => handleStyleChange('liquid-glass')}
          className={`flex-row items-center justify-between p-4 rounded-2xl border ${
            styleMode === 'liquid-glass' ? 'bg-primary/10 border-primary/50' : 'bg-secondary border-border'
          }`}
        >
          <View className="flex-row items-center gap-4 flex-1">
            <View className={`p-2.5 rounded-xl ${styleMode === 'liquid-glass' ? 'bg-primary/20' : 'bg-background'}`}>
              <Droplet size={20} color={styleMode === 'liquid-glass' ? colors.primary : colors.mutedForeground} />
            </View>
            <View className="flex-1">
              <Text className="font-bold" style={{ color: colors.foreground }}>Liquid Glass</Text>
              <Text className="text-xs mt-1" style={{ color: colors.mutedForeground }}>Heavy native iOS blur on all surfaces.</Text>
            </View>
          </View>
          {styleMode === 'liquid-glass' && <View className="w-2.5 h-2.5 rounded-full bg-primary" />}
        </TouchableOpacity>

      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
});
