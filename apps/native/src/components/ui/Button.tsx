import React from 'react';
import {
  Text,
  TouchableOpacity,
  TouchableOpacityProps,
  ActivityIndicator,

  View,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface ButtonProps extends TouchableOpacityProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const { styleMode, colors, isDark } = useTheme();

  // ── Border radius by styleMode ──
  let radiusClass = 'rounded-md';
  let clayShadowClass = '';
  if (styleMode === 'clay') {
    radiusClass = 'rounded-2xl';
    clayShadowClass = 'shadow-[0_4px_14px_rgba(0,0,0,0.15)]'; // Deeper clay shadow for buttons
  } else if (styleMode === 'minimal') {
    radiusClass = 'rounded-none';
  }

  // ── Variant styles ──
  let bgClass = '';
  let textClass = '';

  switch (variant) {
    case 'primary':
      if (styleMode === 'glass') {
        bgClass = 'bg-primary/70 border border-white/20 backdrop-blur-md';
      } else {
        bgClass = 'bg-primary';
      }
      textClass = 'text-primary-foreground';
      break;
    case 'secondary':
      if (styleMode === 'glass') {
        bgClass = 'bg-secondary/70 border border-white/20 backdrop-blur-md';
      } else {
        bgClass = 'bg-secondary';
      }
      textClass = 'text-secondary-foreground';
      break;
    case 'destructive':
      if (styleMode === 'glass') {
        bgClass = 'bg-destructive/70 border border-white/20 backdrop-blur-md';
      } else {
        bgClass = 'bg-destructive';
      }
      textClass = 'text-destructive-foreground';
      break;
    case 'outline':
      bgClass = 'border border-border bg-transparent';
      textClass = 'text-foreground';
      break;
    case 'ghost':
      bgClass = 'bg-transparent hover:bg-accent';
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
      sizeClass = 'h-10 px-4 py-2';
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

  // Spinner color: white on solid backgrounds, theme color on transparent
  // Spinner color matches text class implicitly in React Native via inherited color,
  // but since RN ActivityIndicator doesn't inherit text color automatically from className in all versions,
  // we'll explicitly map it for the spinner.
  const spinnerColor = variant === 'outline' || variant === 'ghost' ? colors.foreground : colors.primaryForeground;

  return (
    <TouchableOpacity
      className={`
        flex-row items-center justify-center
        ${bgClass}
        ${radiusClass}
        ${sizeClass}
        ${clayShadowClass}
        ${isDisabled ? 'opacity-50' : ''}
        ${className || ''}
      `}
      style={props.style}
      disabled={isDisabled}
      activeOpacity={0.75}
      {...props}
    >
      {isLoading && (
        <ActivityIndicator
          size="small"
          color={spinnerColor}
          style={{ marginRight: 8 }}
        />
      )}
      {!isLoading && leftIcon && (
        <View style={{ marginRight: 8 }}>
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
      {!isLoading && rightIcon && (
        <View style={{ marginLeft: 8 }}>
          {rightIcon}
        </View>
      )}
    </TouchableOpacity>
  );
}
