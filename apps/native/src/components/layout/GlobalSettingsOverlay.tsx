import React, { useState } from 'react';
import { View, TouchableOpacity, Animated } from 'react-native';
import { Settings, Sun, Moon, MoonStar, Monitor } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { useAppDispatch } from '../../store/hooks';
import { setTheme } from '../../features/theme/themeSlice';
import { ApiSettingsModal } from '../ApiSettingsModal';

export function GlobalSettingsOverlay() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { colors, theme, styleMode } = useTheme() || {};
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  
  const spinValue = React.useRef(new Animated.Value(0)).current;

  const handleSettingsPress = () => {
    setIsSettingsOpen(true);
    Animated.sequence([
      Animated.timing(spinValue, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(spinValue, { toValue: 0, duration: 0, useNativeDriver: true }),
    ]).start();
  };

  const spin = spinValue.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] });

  const handleThemeToggle = () => {
    // Cycle: system -> light -> dark -> amoled -> system
    if (theme === 'system') dispatch(setTheme('light'));
    else if (theme === 'light') dispatch(setTheme('dark'));
    else if (theme === 'dark') dispatch(setTheme('amoled'));
    else dispatch(setTheme('system'));
  };

  const ThemeIcon = () => {
    const fallback = theme === 'light' ? '#000' : '#fff';
    if (theme === 'system') return <Monitor size={20} color={colors?.foreground || fallback} />;
    if (theme === 'light') return <Sun size={20} color={colors?.foreground || fallback} />;
    if (theme === 'dark') return <Moon size={20} color={colors?.foreground || fallback} />;
    return <MoonStar size={20} color={colors?.foreground || fallback} />;
  };

  let buttonClass = "p-3 rounded-full items-center justify-center bg-card border border-border";
  
  if (styleMode === 'clay') {
    buttonClass = "p-3 rounded-full items-center justify-center bg-card shadow-[0_4px_16px_rgba(0,0,0,0.2)]";
  } else if (styleMode === 'glass') {
    buttonClass = "p-3 rounded-full items-center justify-center bg-card/40 border border-border";
  } else if (styleMode === 'liquid-glass') {
    buttonClass = "p-3 rounded-full items-center justify-center bg-card/20 border border-border";
  } else if (styleMode === 'minimal') {
    buttonClass = "p-3 rounded-full items-center justify-center bg-card border-2 border-border";
  }

  return (
    <>
      <View 
        className="absolute z-[999] flex-row gap-3" 
        style={{ top: Math.max(insets.top, 16) + 16, right: 32 }}
      >
        <TouchableOpacity 
          onPress={handleThemeToggle} 
          className={buttonClass}
          activeOpacity={0.7}
        >
          <ThemeIcon />
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={handleSettingsPress} 
          className={buttonClass}
          activeOpacity={0.7}
        >
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <Settings size={20} color={colors?.foreground || (theme === 'light' ? '#000' : '#fff')} />
          </Animated.View>
        </TouchableOpacity>
      </View>
      <ApiSettingsModal visible={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
}
