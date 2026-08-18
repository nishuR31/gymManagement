import React from 'react';
import { Text, TouchableOpacity, TouchableOpacityProps, ActivityIndicator, View } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface ButtonProps extends TouchableOpacityProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
}

export const Button = React.memo(function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const { isDark } = useTheme();

  // ── Variant styles ──
  let bgClass = '';
  let textClass = '';
  let borderClass = '';

  switch (variant) {
    case 'primary':
      bgClass = 'bg-primary';
      textClass = 'text-primary-foreground';
      break;
    case 'secondary':
      bgClass = 'bg-secondary';
      textClass = 'text-secondary-foreground';
      break;
    case 'destructive':
      bgClass = 'bg-destructive';
      textClass = 'text-destructive-foreground';
      break;
    case 'outline':
      bgClass = 'bg-transparent';
      textClass = 'text-foreground';
      borderClass = 'border border-border';
      break;
    case 'ghost':
      bgClass = 'bg-transparent';
      textClass = 'text-foreground';
      break;
  }

  // ── Size styles ──
  let sizeClass = '';
  let textSize = 'text-sm';
  switch (size) {
    case 'sm':
      sizeClass = 'h-9 px-3';
      textSize = 'text-xs';
      break;
    case 'md':
      sizeClass = 'h-10 px-4';
      textSize = 'text-sm';
      break;
    case 'lg':
      sizeClass = 'h-11 px-8';
      textSize = 'text-base';
      break;
    case 'icon':
      sizeClass = 'h-10 w-10 justify-center items-center';
      break;
  }

  const isDisabled = isLoading || disabled;

  // React Native ActivityIndicator color fallback
  const spinnerColor = (variant === 'outline' || variant === 'ghost')
    ? (isDark ? '#fafafa' : '#181614') // foreground
    : '#ffffff'; // primary/destructive foreground

  return (
    <TouchableOpacity
      className={`
        flex-row items-center justify-center rounded-[8px]
        ${bgClass}
        ${borderClass}
        ${sizeClass}
        ${isDisabled ? 'opacity-50' : ''}
        ${className}
      `}
      disabled={isDisabled}
      activeOpacity={0.75}
      style={{ minHeight: size === 'lg' ? 44 : size === 'sm' ? 36 : 40 }}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={spinnerColor} />
      ) : (
        <>
          {leftIcon && (
            <View className="mr-2">
              {leftIcon}
            </View>
          )}
          {typeof children === 'string' ? (
            <Text
              className={`font-semibold text-center ${textSize} ${textClass}`}
              numberOfLines={1}
            >
              {children}
            </Text>
          ) : (
            children
          )}
          {rightIcon && (
            <View className="ml-2">
              {rightIcon}
            </View>
          )}
        </>
      )}
    </TouchableOpacity>
  );
});
