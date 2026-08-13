import React from 'react';
import { TouchableOpacity, Text, TouchableOpacityProps } from 'react-native';

interface ButtonProps extends TouchableOpacityProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  children: React.ReactNode;
}

export function Button({ variant = 'primary', size = 'md', children, className, ...props }: ButtonProps) {
  let bgClass = '';
  let textClass = 'text-center font-medium ';

  switch (variant) {
    case 'primary':
      bgClass = 'bg-primary';
      textClass += 'text-primary-foreground';
      break;
    case 'secondary':
      bgClass = 'bg-secondary';
      textClass += 'text-secondary-foreground';
      break;
    case 'destructive':
      bgClass = 'bg-destructive';
      textClass += 'text-destructive-foreground';
      break;
    case 'outline':
      bgClass = 'border border-input bg-background hover:bg-accent hover:text-accent-foreground';
      textClass += 'text-foreground';
      break;
    case 'ghost':
      bgClass = 'hover:bg-accent hover:text-accent-foreground';
      textClass += 'text-foreground';
      break;
  }

  let sizeClass = '';
  switch (size) {
    case 'sm':
      sizeClass = 'h-9 px-3 rounded-md';
      textClass += ' text-xs';
      break;
    case 'md':
      sizeClass = 'h-10 px-4 py-2 rounded-md';
      textClass += ' text-sm';
      break;
    case 'lg':
      sizeClass = 'h-11 px-8 rounded-md';
      textClass += ' text-base';
      break;
    case 'icon':
      sizeClass = 'h-10 w-10 justify-center items-center rounded-md';
      break;
  }

  return (
    <TouchableOpacity
      className={`inline-flex items-center justify-center whitespace-nowrap transition-colors ${bgClass} ${sizeClass} ${className || ''}`}
      {...props}
    >
      {typeof children === 'string' ? (
        <Text className={textClass}>{children}</Text>
      ) : (
        children
      )}
    </TouchableOpacity>
  );
}
