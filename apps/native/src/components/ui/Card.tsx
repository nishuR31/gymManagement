import React from 'react';
import { View, Text, ViewProps, TextProps } from 'react-native';
import { useAppSelector } from '../../store/hooks';
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
  } else if (styleMode === 'glass') {
    baseClass += 'rounded-3xl shadow-sm border border-white/10';
    customStyle.backgroundColor = 'rgba(255,255,255,0.03)'; // Subtle tint
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
      {children}
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
  return (
    <Text
      className={`text-lg font-bold leading-tight tracking-tight text-foreground ${className || ''}`}
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
