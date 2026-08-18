import { useAppSelector } from '../store/hooks';
import { useColorScheme } from 'react-native';

type StyleMode = 'minimal' | 'glass' | 'clay' | 'liquid-glass';
type Theme = 'light' | 'dark' | 'amoled' | 'system';

/**
 * Icon/inline-style color set — for lucide-react-native `color` prop and
 * any inline styles that can't use Tailwind classes.
 * 
 * All text/bg should prefer Tailwind classes (text-foreground, bg-card, etc.)
 * These values MUST stay in sync with global.css CSS variables.
 */
interface ThemeColors {
  foreground: string;
  muted: string;
  mutedForeground: string;
  primary: string;
  primaryForeground: string;
  primarySoft: string;
  card: string;
  cardForeground: string;
  background: string;
  border: string;
  secondary: string;
  secondaryForeground: string;
  destructive: string;
  destructiveForeground: string;
  destructiveSoft: string;
  success: string;
  successForeground: string;
  successSoft: string;
  warning: string;
  warningForeground: string;
  warningSoft: string;
  subtle: string;
}

interface UseThemeReturn {
  theme: Theme;
  styleMode: StyleMode;
  isDark: boolean;
  /** For icon color props & inline styles. Prefer Tailwind classes when possible. */
  colors: ThemeColors;
}

const lightColors: ThemeColors = {
  background: '#FAFAF9',
  foreground: '#181614',
  muted: '#F5F5F4',
  mutedForeground: '#78716C',
  subtle: '#78716C',
  card: '#FFFFFF',
  cardForeground: '#181614',
  primary: '#7A4E2D',
  primaryForeground: '#FFFFFF',
  primarySoft: '#F2E7DE',
  secondary: '#F5F5F4',
  secondaryForeground: '#181614',
  border: '#E7E5E4',
  destructive: '#ef4444',
  destructiveForeground: '#ffffff',
  destructiveSoft: 'rgba(239, 68, 68, 0.12)',
  success: '#22c55e',
  successForeground: '#ffffff',
  successSoft: 'rgba(34, 197, 94, 0.12)',
  warning: '#f59e0b',
  warningForeground: '#181614',
  warningSoft: 'rgba(245, 158, 11, 0.12)',
};

const darkColors: ThemeColors = {
  background: '#0C0A09',
  foreground: '#FAFAF9',
  muted: '#1C1917',
  mutedForeground: '#A8A29E',
  subtle: '#A8A29E',
  card: '#151210',
  cardForeground: '#FAFAF9',
  primary: '#B9825A',
  primaryForeground: '#0C0A09',
  primarySoft: 'rgba(185, 130, 90, 0.15)',
  secondary: '#1C1917',
  secondaryForeground: '#FAFAF9',
  border: '#292524',
  destructive: '#f87171',
  destructiveForeground: '#09090b',
  destructiveSoft: 'rgba(248, 113, 113, 0.15)',
  success: '#4ade80',
  successForeground: '#09090b',
  successSoft: 'rgba(74, 222, 128, 0.15)',
  warning: '#fbbf24',
  warningForeground: '#09090b',
  warningSoft: 'rgba(251, 191, 36, 0.15)',
};

const amoledColors: ThemeColors = {
  ...darkColors,
  background: '#000000',
  card: '#000000',
  cardForeground: '#FAFAF9',
  secondary: '#111111',
  muted: '#111111',
  border: '#1A1A1A',
};

export function useTheme(): UseThemeReturn {
  const theme = useAppSelector((state) => state.theme.theme) as Theme;
  const styleMode = useAppSelector((state) => state.theme.styleMode) as StyleMode;
  const systemColorScheme = useColorScheme();

  const effectiveTheme = theme === 'system' ? (systemColorScheme === 'dark' ? 'dark' : 'light') : theme;
  const isDarkTheme = effectiveTheme === 'dark' || effectiveTheme === 'amoled';

  const colors = effectiveTheme === 'amoled'
    ? amoledColors
    : isDarkTheme
      ? darkColors
      : lightColors;

  return {
    theme,
    styleMode,
    isDark: isDarkTheme,
    colors,
  };
}
