import React, { useEffect, useRef } from 'react';
import { View, Animated, ViewStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  rounded?: boolean;
  className?: string;
  style?: ViewStyle;
}

/** Single animated shimmer skeleton bone */
export function Skeleton({
  width = '100%',
  height = 16,
  rounded = false,
  className = '',
  style,
}: SkeletonProps) {
  const { colors } = useTheme();
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const opacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0.85],
  });

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          backgroundColor: colors.border,
          borderRadius: rounded ? 999 : 6,
          opacity,
        },
        style,
      ]}
    />
  );
}

interface SkeletonRowsProps {
  rows?: number;
  /** Show a circle avatar before each row */
  showAvatar?: boolean;
}

/** Stacked skeleton rows for list loading states */
export function SkeletonRows({ rows = 3, showAvatar = false }: SkeletonRowsProps) {
  return (
    <View className="gap-3">
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} className="flex-row items-center gap-3">
          {showAvatar && (
            <Skeleton width={36} height={36} rounded className="shrink-0" />
          )}
          <View className="flex-1 gap-2">
            <Skeleton height={14} width={`${70 + (i % 3) * 10}%`} />
            <Skeleton height={10} width={`${40 + (i % 2) * 20}%`} />
          </View>
        </View>
      ))}
    </View>
  );
}
