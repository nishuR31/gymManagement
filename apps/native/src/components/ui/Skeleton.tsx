import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';

function SkeletonBar({ delay = 0 }: { delay?: number }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 700,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity, delay]);

  return (
    <Animated.View
      style={{ opacity }}
      className="h-12 rounded-md bg-secondary"
    />
  );
}

export function SkeletonRows({ rows = 4 }: { rows?: number }) {
  return (
    <View className="gap-2">
      {Array.from({ length: rows }, (_value, index) => (
        <SkeletonBar key={index} delay={index * 100} />
      ))}
    </View>
  );
}

export function SkeletonCard() {
  return (
    <View className="rounded-xl border border-border bg-card p-4 gap-3">
      <SkeletonBar delay={0} />
      <SkeletonBar delay={100} />
    </View>
  );
}
