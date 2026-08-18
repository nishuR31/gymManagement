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

export const Button = React.memo(function Button({
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
  const { styleMode, colors } = useTheme();

  // ── Border radius by styleMode ──
  let radiusClass = 'rounded-lg'; // 8px default
  let clayShadowClass = '';
  if (styleMode === 'clay') {
    radiusClass = 'rounded-2xl'; // 16px
    clayShadowClass = 'shadow-[0_4px_14px_rgba(0,0,0,0.15)]'; 
  } else if (styleMode === 'glass' || styleMode === 'liquid-glass') {
    radiusClass = 'rounded-xl'; // 12px
  } else if (styleMode === 'minimal') {
    radiusClass = 'rounded-none'; // 0px
  }

  // ── Variant styles ──
  let bgStyle: any = {};
  let textStyle: any = {};
  let borderClass = '';

  switch (variant) {
    case 'primary':
      if (styleMode === 'glass') {
        bgStyle = { backgroundColor: `${colors.primary}B3` }; // 70% opacity
        borderClass = 'border border-white/20 backdrop-blur-md';
      } else {
        bgStyle = { backgroundColor: colors.primary };
      }
      textStyle = { color: colors.primaryForeground };
      break;
    case 'secondary':
      if (styleMode === 'glass') {
        bgStyle = { backgroundColor: `${colors.secondary}B3` }; // 70%
        borderClass = 'border border-white/20 backdrop-blur-md';
      } else {
        bgStyle = { backgroundColor: colors.secondary };
      }
      textStyle = { color: colors.secondaryForeground };
      break;
    case 'destructive':
      if (styleMode === 'glass') {
        bgStyle = { backgroundColor: `${colors.destructive}B3` };
        borderClass = 'border border-white/20 backdrop-blur-md';
      } else {
        bgStyle = { backgroundColor: colors.destructive };
      }
      textStyle = { color: colors.destructiveForeground };
      break;
    case 'outline':
      bgStyle = { backgroundColor: 'transparent', borderColor: colors.border, borderWidth: 1 };
      textStyle = { color: colors.foreground };
      break;
    case 'ghost':
      bgStyle = { backgroundColor: 'transparent' };
      textStyle = { color: colors.foreground };
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
        ${borderClass}
        ${radiusClass}
        ${sizeClass}
        ${clayShadowClass}
        ${isDisabled ? 'opacity-50' : ''}
        ${className || ''}
      `}
      style={[bgStyle, props.style]}
      disabled={isDisabled}
      activeOpacity={0.75}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator
          size="small"
          color={spinnerColor}
        />
      ) : (
        <>
          {leftIcon && (
            <View style={{ marginRight: 8 }}>
              {leftIcon}
            </View>
          )}
          {typeof children === 'string' ? (
            <Text
              className={`font-semibold text-center ${textSize}`}
              style={textStyle}
              numberOfLines={1}
            >
              {children}
            </Text>
          ) : (
            children
          )}
          {rightIcon && (
            <View style={{ marginLeft: 8 }}>
              {rightIcon}
            </View>
          )}
        </>
      )}
    </TouchableOpacity>
  );
});
