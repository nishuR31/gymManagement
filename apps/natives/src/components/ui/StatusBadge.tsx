
import { View, Text } from 'react-native';
import {
  AlertTriangle,
  Check,
  Circle,
  Clock3,
  Snowflake,
  X,
} from 'lucide-react-native';
import { readableStatus } from '../../utils/format';
import { useTheme } from '../../hooks/useTheme';

type ToneKey = 'success' | 'warning' | 'danger' | 'muted' | 'primary';

const toneByStatus: Record<string, ToneKey> = {
  ACTIVE: 'success',
  APPROVED: 'success',
  PAID: 'success',
  NORMAL: 'success',
  TRAINER: 'success',
  PARTIALLY_PAID: 'warning',
  EXPIRING_SOON: 'warning',
  HIGH: 'warning',
  NEW: 'warning',
  GYM_OWNER: 'warning',
  CANCELLED: 'danger',
  REJECTED: 'danger',
  SUSPENDED: 'danger',
  SUPER_ADMIN: 'danger',
  PENDING: 'muted',
  REFUNDED: 'muted',
  EXPIRED: 'muted',
  FROZEN: 'muted',
  LOW: 'muted',
  READ: 'muted',
  STAFF: 'muted',
  ADMIN: 'primary',
};

const iconByStatus: Record<string, typeof Check> = {
  ACTIVE: Check,
  APPROVED: Check,
  PAID: Check,
  PARTIALLY_PAID: Clock3,
  PENDING: Clock3,
  NEW: Clock3,
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
  READ: Check,
  SUPER_ADMIN: Check,
  GYM_OWNER: Check,
  ADMIN: Check,
  STAFF: Circle,
  TRAINER: Check,
};

export function StatusBadge({ status }: { status: string }) {
  const { colors } = useTheme();
  const Icon = iconByStatus[status] ?? Circle;
  const tone: ToneKey = toneByStatus[status] ?? 'muted';

  // Derive colors from theme — fully type-safe and cross-platform
  const bgColor: Record<ToneKey, string> = {
    success: `${colors.success}20`,
    warning: `${colors.warning}20`,
    danger: `${colors.destructive}20`,
    muted: colors.secondary,
    primary: colors.primarySoft,
  };

  const textColor: Record<ToneKey, string> = {
    success: colors.success,
    warning: colors.warning,
    danger: colors.destructive,
    muted: colors.mutedForeground,
    primary: colors.primary,
  };

  const bg = bgColor[tone];
  const fg = textColor[tone];

  return (
    <View
      style={{ backgroundColor: bg }}
      className="flex-row items-center gap-1.5 rounded px-2 py-1"
    >
      <Icon size={12} color={fg} />
      <Text
        style={{ color: fg }}
        className="text-xs font-bold"
        numberOfLines={1}
      >
        {readableStatus(status)}
      </Text>
    </View>
  );
}
