// Trigger rebuild
import { View, Text, ViewProps, TextProps, Platform, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../hooks/useTheme';

interface CardProps extends ViewProps {
  children: React.ReactNode;
}

export function Card({ children, className, style, ...props }: CardProps) {
  const { colors, styleMode } = useTheme();

  let baseClass = '';
  let customStyle: any = { backgroundColor: colors.card, borderColor: colors.border };

  if (styleMode === 'clay') {
    baseClass += 'rounded-2xl';
    customStyle.borderWidth = 0;
    // Deep claymorphism inner/outer shadow simulation for React Native
    customStyle.shadowColor = '#000';
    customStyle.shadowOffset = { width: 0, height: 12 };
    customStyle.shadowOpacity = 0.25;
    customStyle.shadowRadius = 24;
    customStyle.elevation = 12;
  } else if (styleMode === 'glass' || styleMode === 'liquid-glass') {
    baseClass += 'rounded-3xl border border-white/10 overflow-hidden';
    customStyle.backgroundColor = 'transparent'; // Let blur handle the background
  } else if (styleMode === 'minimal') {
    baseClass += 'rounded-none shadow-none';
    customStyle.borderWidth = 1;
    customStyle.borderColor = colors.border;
  } else {
    baseClass += 'rounded-xl';
    customStyle.borderWidth = 1;
  }

  return (
    <View className={`${baseClass} ${className || ''}`} style={[customStyle, style]} {...props}>
      {(styleMode === 'liquid-glass' || styleMode === 'glass') && (Platform.OS === 'ios' || Platform.OS === 'web') && (
        <BlurView
          intensity={Platform.OS === 'web' ? 50 : 100}
          tint={colors.card === '#ffffff' ? 'systemThinMaterialLight' : 'systemThinMaterialDark'}
          style={StyleSheet.absoluteFill}
        />
      )}
      {/* Fallback for Android in liquid-glass mode */}
      {(styleMode === 'liquid-glass' || styleMode === 'glass') && Platform.OS !== 'ios' && Platform.OS !== 'web' && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.card === '#ffffff' ? 'rgba(255,255,255,0.92)' : 'rgba(25,25,25,0.90)' }]} />
      )}
      
      <View className="z-10">
        {children}
      </View>
    </View>
  );
}

export function CardHeader({ children, className, ...props }: CardProps) {
  return (
    // Fix: use gap-1.5 instead of web-only space-y-1.5
    <View className={`flex flex-col gap-1.5 p-6 ${className || ''}`} {...props}>
      {children}
    </View>
  );
}

export function CardTitle({
  children,
  className,
  ...props
}: TextProps & { children: React.ReactNode; className?: string }) {
  const { colors } = useTheme();
  return (
    <Text
      className={`text-lg font-bold leading-tight tracking-tight ${className || ''}`}
      style={[{ color: colors.foreground }, props.style]}
      {...props}
    >
      {children}
    </Text>
  );
}

export function CardContent({ children, className, ...props }: CardProps) {
  return (
    <View className={`p-6 pt-0 ${className || ''}`} {...props}>
      {children}
    </View>
  );
}
