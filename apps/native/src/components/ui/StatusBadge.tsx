import React from 'react';
import { View, Text } from 'react-native';
import { AlertTriangle, Check, Circle, Clock3, Snowflake, X } from 'lucide-react-native';
import { readableStatus } from '../../utils/format';

const toneByStatus: Record<string, string> = {
  ACTIVE: 'bg-success-soft text-success',
  PAID: 'bg-success-soft text-success',
  PARTIALLY_PAID: 'bg-warning-soft text-warning',
  PENDING: 'bg-secondary text-muted-foreground',
  REFUNDED: 'bg-secondary text-muted-foreground',
  CANCELLED: 'bg-accent-soft text-destructive',
  EXPIRED: 'bg-secondary text-muted-foreground',
  EXPIRING_SOON: 'bg-warning-soft text-warning',
  FROZEN: 'bg-secondary text-muted-foreground',
  LOW: 'bg-secondary text-muted-foreground',
  NORMAL: 'bg-success-soft text-success',
  HIGH: 'bg-warning-soft text-warning',
  NEW: 'bg-warning-soft text-warning',
  READ: 'bg-secondary text-muted-foreground',
  SUPER_ADMIN: 'bg-accent-soft text-destructive',
  GYM_OWNER: 'bg-warning-soft text-warning',
  ADMIN: 'bg-secondary text-primary',
  STAFF: 'bg-secondary text-muted-foreground',
  TRAINER: 'bg-success-soft text-success',
};

const iconByStatus = {
  ACTIVE: Check,
  APPROVED: Check,
  PAID: Check,
  PARTIALLY_PAID: Clock3,
  PENDING: Clock3,
  REFUNDED: Circle,
  CANCELLED: X,
  REJECTED: X,
  SUSPENDED: AlertTriangle,
  EXPIRED: AlertTriangle,
  EXPIRING_SOON: AlertTriangle,
  FROZEN: Snowflake,
  LOW: AlertTriangle,
  NORMAL: Check,
  HIGH: AlertTriangle,
  NEW: Clock3,
  READ: Check,
  SUPER_ADMIN: Check,
  GYM_OWNER: Check,
  ADMIN: Check,
  STAFF: Circle,
  TRAINER: Check,
};

const getTextColorClass = (className: string) => {
  if (className.includes('text-success')) return 'text-success';
  if (className.includes('text-warning')) return 'text-warning';
  if (className.includes('text-destructive')) return 'text-destructive';
  if (className.includes('text-primary')) return 'text-primary';
  return 'text-muted-foreground';
};

const getBgColorClass = (className: string) => {
  if (className.includes('bg-success-soft')) return 'bg-success-soft';
  if (className.includes('bg-warning-soft')) return 'bg-warning-soft';
  if (className.includes('bg-accent-soft')) return 'bg-accent-soft';
  return 'bg-secondary';
};

export function StatusBadge({ status }: { status: string }) {
  const Icon = iconByStatus[status as keyof typeof iconByStatus] ?? Circle;
  const toneClass = toneByStatus[status] ?? 'bg-secondary text-muted-foreground';
  
  const textColorClass = getTextColorClass(toneClass);
  const bgColorClass = getBgColorClass(toneClass);

  return (
    <View className={`flex-row items-center gap-1.5 rounded px-2 py-1 ${bgColorClass}`}>
      <Icon size={12} className={textColorClass} />
      <Text className={`text-xs font-bold ${textColorClass}`} numberOfLines={1}>
        {readableStatus(status)}
      </Text>
    </View>
  );
}
