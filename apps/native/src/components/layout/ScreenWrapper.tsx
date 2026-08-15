import React from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppDock } from './AppDock';
import { Footer } from './Footer';
import { useTheme } from '../../hooks/useTheme';
import { useWindowDimensions } from 'react-native';

// Height of the floating dock pill + its bottom margin
export const DOCK_HEIGHT = 80;

interface ScreenWrapperProps {
  children: React.ReactNode;
  /** Show the floating navigation dock (default: true) */
  showDock?: boolean;
  /** Whether the content is scrollable (default: true) */
  scrollable?: boolean;
  /** Pull-to-refresh: set to true when loading to show spinner */
  refreshing?: boolean;
  /** Pull-to-refresh callback */
  onRefresh?: () => void;
  /** Extra className for the outer SafeAreaView */
  className?: string;
  /** contentContainerStyle extras for the ScrollView */
  contentPaddingBottom?: number;
}

/**
 * ScreenWrapper — the single layout primitive for all authenticated screens.
 * Handles:
 *  - SafeAreaView with correct edges for iOS notch / Android status bar
 *  - ScrollView with dynamic bottom padding for the FloatingDock
 *  - RefreshControl wiring
 *  - FloatingDock placement with safe-area-aware bottom offset
 */
export function ScreenWrapper({
  children,
  showDock = true,
  scrollable = true,
  refreshing = false,
  onRefresh,
  className = '',
  contentPaddingBottom = 0,
}: ScreenWrapperProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const extraPad = isTablet ? 48 : 16;

  // Bottom padding = dock height + bottom inset (iPhone home indicator) + extra breathing room
  const bottomPad = showDock
    ? DOCK_HEIGHT + insets.bottom + extraPad + contentPaddingBottom
    : insets.bottom + extraPad + contentPaddingBottom;

  const refreshControl =
    onRefresh ? (
      <RefreshControl
        refreshing={refreshing}
        onRefresh={onRefresh}
        tintColor={colors.primary}
        colors={[colors.primary]}
      />
    ) : undefined;

  return (
    <SafeAreaView
      className={`flex-1 ${className}`}
      style={{ backgroundColor: colors.background }}
      edges={['top', 'left', 'right']}
    >
      {scrollable ? (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: bottomPad }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
        >
          {children}
          <Footer />
        </ScrollView>
      ) : (
        <View className="flex-1" style={{ paddingBottom: bottomPad }}>
          {children}
          <Footer />
        </View>
      )}
      {showDock && <AppDock />}
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────
// PageHeader — consistent branding header used at the top of every screen
// ─────────────────────────────────────────────

interface PageHeaderProps {
  /** Small label above the title (e.g. "Front Desk") */
  label?: string;
  title: string;
  subtitle?: string;
  /** Slot for action buttons (right side) */
  actions?: React.ReactNode;
  /** Optional callback for when the subtitle is pressed */
  onSubtitlePress?: () => void;
}

export function PageHeader({ label, title, subtitle, actions, onSubtitlePress }: PageHeaderProps) {
  return (
    <View className="mb-6 rounded-xl border border-border bg-card px-4 py-4">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 mr-2">
          {label ? (
            <Text className="text-xs font-black uppercase tracking-[0.18em] text-primary mb-1">
              {label}
            </Text>
          ) : null}
          <Text className="text-3xl font-black text-foreground leading-tight">
            {title}
          </Text>
          {subtitle ? (
            onSubtitlePress ? (
              <React.Fragment>
                <Text
                  onPress={onSubtitlePress}
                  className="mt-1 text-sm font-semibold text-primary underline"
                >
                  {subtitle}
                </Text>
              </React.Fragment>
            ) : (
              <Text className="mt-1 text-sm font-semibold text-muted-foreground">
                {subtitle}
              </Text>
            )
          ) : null}
        </View>
        {actions ? (
          <View className="flex-row items-center gap-2 mt-1">{actions}</View>
        ) : null}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────
// SectionTitle — consistent section heading
// ─────────────────────────────────────────────

export function SectionTitle({ children }: { children: string }) {
  return (
    <Text className="text-base font-black text-foreground mb-3 mt-1">
      {children}
    </Text>
  );
}

// ─────────────────────────────────────────────
// Divider — thin horizontal rule
// ─────────────────────────────────────────────

export function Divider({ className = '' }: { className?: string }) {
  return <View className={`h-px bg-border ${className}`} />;
}
