import { View, Text } from 'react-native';

interface LoadBarProps {
  value: number;
  max: number;
  label?: string;
  maxLabel?: string;
  tone?: "brand" | "success" | "warning" | "danger";
}

export function LoadBar({ value, max, label, maxLabel, tone }: LoadBarProps) {
  const percent = max <= 0 ? 100 : Math.min(100, Math.max(0, (value / max) * 100));
  const resolvedTone = tone ?? (value <= max ? "warning" : "brand");
  
  const toneClass = {
    brand: "bg-primary",
    success: "bg-green-500",
    warning: "bg-yellow-500",
    danger: "bg-destructive"
  }[resolvedTone];

  return (
    <View className="gap-1">
      <View className="flex-row justify-between">
        <Text className="text-xs font-semibold text-muted-foreground">{label ?? `${value}`}</Text>
        <Text className="text-xs font-semibold text-muted-foreground">{maxLabel ?? max}</Text>
      </View>
      <View className="h-2 overflow-hidden rounded-full bg-secondary">
        <View className={`h-full rounded-full ${toneClass}`} style={{ width: `${percent}%` }} />
      </View>
    </View>
  );
}
