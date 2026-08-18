import { useState } from 'react';
import { TextInput, TextInputProps, View, Text, TouchableOpacity } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  className?: string;
}

export function Input({
  label,
  error,
  className = '',
  secureTextEntry,
  leftIcon,
  onFocus,
  onBlur,
  ...props
}: InputProps) {
  const { isDark } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  let containerClass = `flex-row overflow-hidden rounded-[8px] bg-black/5 dark:bg-white/5 border ${isFocused ? 'border-primary' : 'border-input'} ${props.multiline ? 'items-start pt-3 pb-3' : 'items-center h-12'}`;

  if (error) {
    containerClass += ' border-destructive border';
  }

  const isSecure = secureTextEntry && !isPasswordVisible;

  // React Native color fallback for placeholder/icons since lucide requires literal strings
  const mutedColor = isDark ? '#A8A29E' : '#78716C'; 

  return (
    <View className="mb-4">
      {label ? (
        <Text className="mb-1.5 text-sm font-medium text-muted-foreground">
          {label}
        </Text>
      ) : null}

      <View className={`${containerClass} ${className}`}>
        {leftIcon ? (
          <View className="pl-3 pr-1">{leftIcon}</View>
        ) : null}

        <TextInput
          className={`flex-1 text-sm text-foreground bg-transparent outline-none ${leftIcon ? 'pl-1' : 'pl-3'} ${secureTextEntry ? 'pr-10' : 'pr-3'} ${props.multiline ? 'min-h-[60px]' : 'h-full'}`}
          style={{ textAlignVertical: props.multiline ? 'top' : 'center', outlineStyle: 'none' } as any}
          placeholderTextColor={mutedColor}
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
              <EyeOff size={18} color={mutedColor} />
            ) : (
              <Eye size={18} color={mutedColor} />
            )}
          </TouchableOpacity>
        )}
      </View>

      {error ? (
        <Text className="mt-1 text-xs text-destructive">{error}</Text>
      ) : null}
    </View>
  );
}
