import React from 'react';
import { View, Text } from 'react-native';
import { Inbox } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
}

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
}: EmptyStateProps) {
  const { colors } = useTheme();

  return (
    <View className="flex min-h-[128px] items-center justify-center rounded-xl border border-dashed border-border px-4 py-10">
      <View className="items-center gap-3">
        <View className="h-12 w-12 items-center justify-center rounded-xl bg-secondary">
          <Icon size={22} color={colors.primary} />
        </View>
        <Text className="text-sm font-bold text-foreground text-center">
          {title}
        </Text>
        {description ? (
          <Text className="text-sm text-muted-foreground text-center max-w-[240px]">
            {description}
          </Text>
        ) : null}
        {action ? <View className="mt-2">{action}</View> : null}
      </View>
    </View>
  );
}
