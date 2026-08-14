import React, { ReactNode } from 'react';
import { View, Text } from 'react-native';
import { Inbox, LucideIcon } from 'lucide-react-native';
import { useAppSelector } from '../../store/hooks';
import { themeColors } from '../../constants/colors';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
}

export function EmptyState({ title, description, icon: Icon = Inbox, action }: EmptyStateProps) {
  const theme = useAppSelector((state) => state.theme.theme);
  const activeColors = themeColors[theme === 'amoled' ? 'amoled' : theme === 'dark' ? 'dark' : 'light'];

  return (
    <View className="flex min-h-[128px] items-center justify-center rounded-md border border-dashed border-border bg-surface/75 px-4 py-8">
      <View className="items-center">
        <View className="flex h-11 w-11 items-center justify-center rounded-md bg-secondary">
          <Icon size={20} color={activeColors.primary} />
        </View>
        <Text className="mt-3 text-sm font-bold text-foreground text-center">{title}</Text>
        {description ? <Text className="mt-1 text-sm text-muted-foreground text-center">{description}</Text> : null}
        {action ? <View className="mt-4">{action}</View> : null}
      </View>
    </View>
  );
}
