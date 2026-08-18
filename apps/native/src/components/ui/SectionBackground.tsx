import { View, Image, ImageSourcePropType } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface SectionBackgroundProps {
  source: ImageSourcePropType;
  overlayOpacity?: number;
  gradient?: boolean;
}

export function SectionBackground({ 
  source, 
  overlayOpacity = 0.55,
  gradient = false
}: SectionBackgroundProps) {
  const { theme } = useTheme();
  const isAmoled = theme === 'amoled';

  // AMOLED: stronger overlay for pure black feel
  const effectiveOpacity = isAmoled ? Math.max(overlayOpacity, 0.85) : overlayOpacity;

  return (
    <>
      <Image
        source={source}
        className="absolute inset-0 w-full h-full"
        resizeMode="cover"
      />
      {/* Base overlay for contrast */}
      <View 
        className="absolute inset-0" 
        style={{ backgroundColor: `rgba(0,0,0,${effectiveOpacity})` }} 
      />

      {/* If gradient is needed, add layered overlays for depth */}
      {gradient && (
        <>
          <View className="absolute top-0 left-0 right-0 h-1/4" style={{ backgroundColor: 'rgba(0,0,0,0.15)' }} />
          <View className="absolute bottom-0 left-0 right-0 h-1/3" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} />
        </>
      )}
    </>
  );
}
