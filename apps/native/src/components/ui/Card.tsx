import React from 'react';
import { View, Text, ViewProps } from 'react-native';

interface CardProps extends ViewProps {
  children: React.ReactNode;
}

export function Card({ children, className, ...props }: CardProps) {
  return (
    <View className={`rounded-xl border border-border bg-card shadow-sm ${className || ''}`} {...props}>
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

export function CardTitle({ children, className, ...props }: CardProps & { children: React.ReactNode }) {
  return (
    <Text className={`text-2xl font-semibold leading-none tracking-tight text-foreground ${className || ''}`} {...props}>
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
