import React from 'react';
import { TouchableOpacity, Text, TouchableOpacityProps, ActivityIndicator } from 'react-native';
import { useAppSelector } from '../../store/hooks';

interface ButtonProps extends TouchableOpacityProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  children: React.ReactNode;
}

export function Button({ variant = 'primary', size = 'md', isLoading = false, children, className, ...props }: ButtonProps) {
  const styleMode = useAppSelector((state) => state.theme.styleMode);
  
  let bgClass = '';
  let textClass = 'text-center font-medium ';
  let baseRadiusClass = 'rounded-md';
  let shadowClass = '';

  if (styleMode === 'clay') {
    baseRadiusClass = 'rounded-2xl';
    shadowClass = 'shadow-md';
  } else if (styleMode === 'glass') {
    shadowClass = 'shadow-sm';
  } else if (styleMode === 'minimal') {
    shadowClass = '';
  }

  switch (variant) {
    case 'primary':
      bgClass = styleMode === 'glass' ? 'bg-primary/70 border border-white/20' : 'bg-primary';
      textClass += 'text-primary-foreground';
      break;
    case 'secondary':
      bgClass = styleMode === 'glass' ? 'bg-secondary/70 border border-white/20' : 'bg-secondary';
      textClass += 'text-secondary-foreground';
      break;
    case 'destructive':
      bgClass = styleMode === 'glass' ? 'bg-destructive/70 border border-white/20' : 'bg-destructive';
      textClass += 'text-destructive-foreground';
      break;
    case 'outline':
      bgClass = 'border border-input bg-background hover:bg-accent';
      textClass += 'text-foreground';
      break;
    case 'ghost':
      bgClass = 'hover:bg-accent';
      textClass += 'text-foreground';
      break;
  }

  let sizeClass = '';
  switch (size) {
    case 'sm':
      sizeClass = 'h-9 px-3';
      textClass += ' text-xs';
      break;
    case 'md':
      sizeClass = 'h-10 px-4 py-2';
      textClass += ' text-sm';
      break;
    case 'lg':
      sizeClass = 'h-11 px-8';
      textClass += ' text-base';
      break;
    case 'icon':
      sizeClass = 'h-10 w-10 justify-center items-center';
      break;
  }

  return (
    <TouchableOpacity
      className={`inline-flex flex-row items-center justify-center whitespace-nowrap transition-colors ${baseRadiusClass} ${shadowClass} ${bgClass} ${sizeClass} ${className || ''}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading && <ActivityIndicator size="small" color={variant === 'outline' || variant === 'ghost' ? 'hsl(var(--foreground))' : 'hsl(var(--primary-foreground))'} className="mr-2" />}
      {typeof children === 'string' ? (
        <Text className={textClass}>{children}</Text>
      ) : (
        children
      )}
    </TouchableOpacity>
  );
}
