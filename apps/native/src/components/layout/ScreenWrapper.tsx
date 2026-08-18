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

export const DOCK_HEIGHT = 80;

interface ScreenWrapperProps {
  children: React.ReactNode;
  showDock?: boolean;
  scrollable?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  className?: string;
  contentPaddingBottom?: number;
}

export function ScreenWrapper({
  children,
  showDock = true,
  scrollable = true,
  refreshing = false,
  onRefresh,
  className = '',
  contentPaddingBottom = 0,
}: ScreenWrapperProps) {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const extraPad = isTablet ? 48 : 16;

  const bottomPad = showDock
    ? DOCK_HEIGHT + insets.bottom + extraPad + contentPaddingBottom
    : insets.bottom + extraPad + contentPaddingBottom;

  const primaryColor = isDark ? '#B9825A' : '#7A4E2D';

  const refreshControl =
    onRefresh ? (
      <RefreshControl
        refreshing={refreshing}
        onRefresh={onRefresh}
        tintColor={primaryColor}
        colors={[primaryColor]}
      />
    ) : undefined;

  return (
    <SafeAreaView
      className={`flex-1 bg-background ${className}`}
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

interface PageHeaderProps {
  label?: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  onSubtitlePress?: () => void;
}

export function PageHeader({ label, title, subtitle, actions, onSubtitlePress }: PageHeaderProps) {
  return (
    <View className="mb-6 rounded-xl border px-4 py-4 bg-card border-border">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 mr-2">
          {label ? (
            <Text className="text-xs font-black uppercase tracking-[0.18em] mb-1 text-primary">
              {label}
            </Text>
          ) : null}
          <Text className="text-3xl font-black leading-tight text-foreground">
            {title}
          </Text>
          {subtitle ? (
            onSubtitlePress ? (
              <React.Fragment>
                <Text
                  onPress={onSubtitlePress}
                  className="mt-1 text-sm font-semibold underline text-primary"
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

export function SectionTitle({ children }: { children: string }) {
  return (
    <Text className="text-base font-black mb-3 mt-1 text-foreground">
      {children}
    </Text>
  );
}

export function Divider({ className = '' }: { className?: string }) {
  return <View className={`h-px bg-border ${className}`} />;
}
