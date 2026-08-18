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
  const { colors, theme, styleMode } = useTheme();
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
    if (theme === 'system') return <Monitor size={20} color={colors.foreground} />;
    if (theme === 'light') return <Sun size={20} color={colors.foreground} />;
    if (theme === 'dark') return <Moon size={20} color={colors.foreground} />;
    return <MoonStar size={20} color={colors.foreground} />;
  };

  let containerStyle: any = { 
    top: Math.max(insets.top, 16) + 16, 
    right: 16 
  };
  
  let buttonStyle: any = {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  };
  
  if (styleMode === 'clay') {
    buttonStyle.borderWidth = 0;
    buttonStyle.elevation = 8;
    buttonStyle.shadowColor = '#000';
    buttonStyle.shadowOffset = { width: 0, height: 4 };
    buttonStyle.shadowOpacity = 0.2;
    buttonStyle.shadowRadius = 8;
  } else if (styleMode === 'glass') {
    buttonStyle.backgroundColor = 'rgba(0,0,0,0.1)';
    buttonStyle.borderColor = 'rgba(255,255,255,0.1)';
  } else if (styleMode === 'minimal') {
    buttonStyle.borderWidth = 2;
  }

  return (
    <>
      <View className="absolute z-[999] flex-row gap-3" style={containerStyle} pointerEvents="box-none">
        <TouchableOpacity 
          onPress={handleThemeToggle} 
          className="p-3 rounded-full items-center justify-center"
          style={buttonStyle}
          activeOpacity={0.7}
        >
          <ThemeIcon />
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={handleSettingsPress} 
          className="p-3 rounded-full items-center justify-center"
          style={buttonStyle}
          activeOpacity={0.7}
        >
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <Settings size={20} color={colors.foreground} />
          </Animated.View>
        </TouchableOpacity>
      </View>
      <ApiSettingsModal visible={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
}
