import React, { useState } from 'react';
import { TextInput, TextInputProps, View, Text, TouchableOpacity } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { useAppSelector } from '../../store/hooks';
import { themeColors } from '../../constants/colors';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  className?: string;
}

export function Input({ label, error, className, secureTextEntry, ...props }: InputProps) {
  const styleMode = useAppSelector((state) => state.theme.styleMode);
  const theme = useAppSelector((state) => state.theme.theme);
  const activeColors = themeColors[theme === 'amoled' ? 'amoled' : theme === 'dark' ? 'dark' : 'light'];
  
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  
  let baseClass = 'flex-1 h-10 pl-3 py-2 text-sm text-foreground ';
  if (styleMode === 'clay') {
    baseClass += 'rounded-2xl border-transparent bg-card shadow-sm';
  } else if (styleMode === 'glass') {
    baseClass += 'rounded-md bg-card/60 border border-border shadow-sm';
  } else {
    baseClass += 'rounded-md border border-input bg-background shadow-none';
  }

  if (error) {
    baseClass += ' border border-destructive';
  }

  // Add padding right if it has an eye icon so text doesn't overlap
  if (secureTextEntry) {
    baseClass += ' pr-10';
  } else {
    baseClass += ' pr-3';
  }

  const isSecure = secureTextEntry && !isPasswordVisible;

  return (
    <View className="mb-4">
      {label ? <Text className="mb-2 text-sm font-medium text-foreground">{label}</Text> : null}
      <View className="flex-row items-center relative">
        <TextInput
          className={`${baseClass} ${className || ''}`}
          placeholderTextColor="#9ca3af"
          secureTextEntry={isSecure}
          {...props}
        />
        {secureTextEntry && (
          <TouchableOpacity 
            className="absolute right-0 w-10 items-center justify-center h-full z-10"
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
          >
            {isPasswordVisible ? (
              <EyeOff size={18} color={activeColors.mutedForeground} />
            ) : (
              <Eye size={18} color={activeColors.mutedForeground} />
            )}
          </TouchableOpacity>
        )}
      </View>
      {error ? <Text className="mt-1 text-xs text-destructive">{error}</Text> : null}
    </View>
  );
}
