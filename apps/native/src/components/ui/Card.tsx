import React from 'react';
import { View, Text, ViewProps, TextProps } from 'react-native';
import { useAppSelector } from '../../store/hooks';

interface CardProps extends ViewProps {
  children: React.ReactNode;
}

export function Card({ children, className, ...props }: CardProps) {
  const styleMode = useAppSelector((state) => state.theme.styleMode);
  
  let baseClass = 'bg-card ';
  if (styleMode === 'clay') {
    baseClass += 'border border-transparent shadow-md rounded-[32px]';
  } else if (styleMode === 'glass') {
    baseClass += 'border border-border bg-card/60 shadow-sm rounded-xl';
  } else {
    baseClass += 'rounded-xl border border-border shadow-none';
  }

  return (
    <View className={`${baseClass} ${className || ''}`} {...props}>
      {children}
    </View>
  );
}

export function CardHeader({ children, className, ...props }: CardProps) {
  return (
    <View className={`flex flex-col space-y-1.5 p-6 ${className || ''}`} {...props}>
      {children}
    </View>
  );
}

export function CardTitle({ children, className, ...props }: TextProps & { children: React.ReactNode, className?: string }) {
  return (
    <Text className={`text-lg font-bold leading-tight tracking-tight text-foreground ${className || ''}`} {...props}>
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
