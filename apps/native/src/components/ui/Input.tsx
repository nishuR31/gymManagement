import React, { useRef, useState } from 'react';
import {
  TextInput,
  TextInputProps,
  View,
  Text,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  /** Optional icon rendered on the left side inside the input */
  leftIcon?: React.ReactNode;
  className?: string;
}

export function Input({
  label,
  error,
  className,
  secureTextEntry,
  leftIcon,
  onFocus,
  onBlur,
  ...props
}: InputProps) {
  const { styleMode, colors, isDark } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  // ── Container border class by styleMode + state ──
  let containerClass = `flex-row overflow-hidden ${props.multiline ? 'items-start pt-3 pb-3' : 'items-center h-12'} `;
  const bgClass = isDark ? 'bg-white/10' : 'bg-black/5';
  const glassBgClass = isDark ? 'bg-white/10' : 'bg-white/40';

  if (styleMode === 'clay') {
    containerClass += isFocused
      ? `rounded-2xl border-2 border-primary ${bgClass} shadow-md`
      : `rounded-2xl border-2 border-transparent ${bgClass} shadow-sm`;
  } else if (styleMode === 'glass' || styleMode === 'liquid-glass') {
    containerClass += isFocused
      ? `rounded-xl border border-primary ${glassBgClass}`
      : `rounded-xl border border-white/10 ${glassBgClass}`;
  } else if (styleMode === 'minimal') {
    containerClass += isFocused
      ? 'rounded-none border-b-2 border-primary bg-transparent'
      : 'rounded-none border-b border-border bg-transparent';
  } else {
    containerClass += isFocused
      ? `rounded-lg border border-primary ${bgClass}`
      : `rounded-lg border border-input ${bgClass}`;
  }

  if (error) {
    containerClass += ' border-destructive border';
  }

  const isSecure = secureTextEntry && !isPasswordVisible;

  return (
    <View className="mb-4">
      {label ? (
        <Text className="mb-1.5 text-sm font-medium" style={{ color: colors.mutedForeground }}>
          {label}
        </Text>
      ) : null}

      <View className={`${containerClass} ${className || ''}`}>
        {leftIcon ? (
          <View className="pl-3 pr-1">{leftIcon}</View>
        ) : null}

        <TextInput
          className={`flex-1 text-sm ${leftIcon ? 'pl-1' : 'pl-3'} ${secureTextEntry ? 'pr-10' : 'pr-3'} ${props.multiline ? 'min-h-[60px]' : 'h-full'}`}
          style={[{ color: colors.foreground, backgroundColor: 'transparent', textAlignVertical: props.multiline ? 'top' : 'center', outlineStyle: 'none' } as any, props.style]}
          placeholderTextColor={colors.mutedForeground}
          secureTextEntry={isSecure}
          underlineColorAndroid="transparent"
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          {...props}
          value={props.value !== undefined ? props.value : ''}
        />

        {secureTextEntry && (
          <TouchableOpacity
            className="absolute right-0 w-10 items-center justify-center h-full z-10"
            onPress={() => setIsPasswordVisible((v) => !v)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {isPasswordVisible ? (
              <EyeOff size={18} color={colors.mutedForeground} />
            ) : (
              <Eye size={18} color={colors.mutedForeground} />
            )}
          </TouchableOpacity>
        )}
      </View>

      {error ? (
        <Text className="mt-1 text-xs" style={{ color: colors.destructive }}>{error}</Text>
      ) : null}
    </View>
  );
}
