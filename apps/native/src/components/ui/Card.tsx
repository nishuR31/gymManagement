import { View, Text, ViewProps, TextProps } from 'react-native';

interface CardProps extends ViewProps {
  children: React.ReactNode;
}

export function Card({ children, className = '', ...props }: CardProps) {
  return (
    <View 
      className={`rounded-[12px] border border-border bg-card overflow-hidden ${className}`} 
      {...props}
    >
      <View className="z-10">
        {children}
      </View>
    </View>
  );
}

export function CardHeader({ children, className = '', ...props }: CardProps) {
  return (
    <View className={`flex flex-col gap-1.5 p-6 ${className}`} {...props}>
      {children}
    </View>
  );
}

export function CardTitle({
  children,
  className = '',
  ...props
}: TextProps & { children: React.ReactNode; className?: string }) {
  return (
    <Text
      className={`text-lg font-bold leading-tight tracking-tight text-foreground ${className}`}
      {...props}
    >
      {children}
    </Text>
  );
}

export function CardContent({ children, className = '', ...props }: CardProps) {
  return (
    <View className={`p-6 pt-0 ${className}`} {...props}>
      {children}
    </View>
  );
}
