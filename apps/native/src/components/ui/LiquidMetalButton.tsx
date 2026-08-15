import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet, TouchableOpacityProps, StyleProp, ViewStyle, Platform, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../hooks/useTheme';

interface LiquidMetalButtonProps extends TouchableOpacityProps {
  title: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  isLoading?: boolean;
}

export const LiquidMetalButton = React.memo(function LiquidMetalButton({ title, leftIcon, rightIcon, containerStyle, isLoading, ...props }: LiquidMetalButtonProps) {
  const { isDark } = useTheme();

  return (
    <TouchableOpacity activeOpacity={0.8} style={[containerStyle]} {...props}>
      <View 
        className={`relative overflow-hidden rounded-full px-6 py-3.5 flex-row items-center justify-center border-t border-l ${
          isDark 
            ? 'border-t-white/20 border-l-white/10 border-b-black/50 border-r-black/50 shadow-black/80' 
            : 'border-t-white/80 border-l-white/50 border-b-black/10 border-r-black/10 shadow-black/20'
        }`}
        style={[
          styles.shadow, 
          // Fallback background for Android
          (Platform.OS !== 'ios' && Platform.OS !== 'web') && { backgroundColor: isDark ? '#1c1c1c' : '#e5e5e5' }
        ]}
      >
        {/* iOS/Web Native Material Background */}
        {(Platform.OS === 'ios' || Platform.OS === 'web') && (
          <BlurView
            intensity={Platform.OS === 'web' ? 50 : 80}
            tint={isDark ? 'systemThinMaterialDark' : 'systemThinMaterialLight'}
            style={StyleSheet.absoluteFill}
          />
        )}
        {/* Subtle inner gradient/highlight simulation using absolute views */}
        <View className="absolute inset-x-0 top-0 h-1/2 bg-white/10 dark:bg-white/5 rounded-t-full" />
        
        {isLoading ? (
          <ActivityIndicator className="z-10" color={isDark ? '#e4e4e7' : '#27272a'} />
        ) : (
          <>
            {leftIcon && <View className="mr-2 z-10">{leftIcon}</View>}
            
            <Text className={`z-10 font-bold text-base tracking-wider ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
              {title}
            </Text>
            
            {rightIcon && <View className="ml-2 z-10">{rightIcon}</View>}
          </>
        )}
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  shadow: {
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
});
