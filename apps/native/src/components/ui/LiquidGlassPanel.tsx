import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../hooks/useTheme';

interface LiquidGlassPanelProps {
  children: React.ReactNode;
  variant?: 'regular' | 'clear';
  style?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
}

export function LiquidGlassPanel({ children, variant = 'regular', style, containerStyle }: LiquidGlassPanelProps) {
  const { isDark } = useTheme();

  // Map our conceptual variants to iOS material system
  const getTint = () => {
    if (variant === 'clear') {
      return isDark ? 'systemUltraThinMaterialDark' : 'systemUltraThinMaterialLight';
    }
    return isDark ? 'systemThickMaterialDark' : 'systemThickMaterialLight';
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {Platform.OS === 'ios' || Platform.OS === 'web' ? (
        <BlurView 
          intensity={Platform.OS === 'web' ? 50 : 100} 
          tint={getTint()} 
          style={[StyleSheet.absoluteFill, styles.blur]}
        />
      ) : (
        // Fallback for Android/Web where native iOS materials aren't available
        <View 
          style={[
            StyleSheet.absoluteFill, 
            { backgroundColor: isDark ? 'rgba(25, 25, 25, 0.85)' : 'rgba(255, 255, 255, 0.85)' }
          ]} 
          className="border border-border shadow-sm"
        />
      )}
      <View style={[styles.content, style]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderRadius: 20,
    boxShadow: '0px 4px 12px rgba(0,0,0,0.1)',
  },
  blur: {
    // Ensuring the blur view covers perfectly
  },
  content: {
    padding: 16,
    zIndex: 1, // Keep content above the BlurView
  },
});
