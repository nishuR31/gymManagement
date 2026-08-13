import { TextInput, TextInputProps, View, Text } from 'react-native';
import { useAppSelector } from '../../store/hooks';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function Input({ label, error, className, ...props }: InputProps) {
  const styleMode = useAppSelector((state) => state.theme.styleMode);
  
  let baseClass = 'flex h-10 w-full px-3 py-2 text-sm text-foreground ';
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

  return (
    <View className="mb-4">
      {label && <Text className="mb-2 text-sm font-medium text-foreground">{label}</Text>}
      <TextInput
        className={`${baseClass} ${className || ''}`}
        placeholderTextColor="#9ca3af" // muted-foreground equivalent
        {...props}
      />
      {error && <Text className="mt-1 text-xs text-destructive">{error}</Text>}
    </View>
  );
}
