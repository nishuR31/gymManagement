import { useAppSelector } from '../store/hooks';
import { themeColors, type ThemeColors } from '../constants/colors';

import { useColorScheme } from 'react-native';

type StyleMode = 'minimal' | 'glass' | 'clay' | 'liquid-glass';
type Theme = 'light' | 'dark' | 'amoled' | 'system';

interface UseThemeReturn {
  theme: Theme;
  styleMode: StyleMode;
  colors: ThemeColors;
  isDark: boolean;
}

/**
 * Single hook that replaces the duplicated pattern:
 *   const theme = useAppSelector(state => state.theme.theme);
 *   const activeColors = themeColors[theme === 'amoled' ? 'amoled' : ...];
 * across all screens.
 */
export function useTheme(): UseThemeReturn {
  const theme = useAppSelector((state) => state.theme.theme) as Theme;
  const styleMode = useAppSelector((state) => state.theme.styleMode) as StyleMode;
  const systemColorScheme = useColorScheme();

  const effectiveTheme = theme === 'system' ? (systemColorScheme === 'dark' ? 'dark' : 'light') : theme;

  const themeKey: 'light' | 'dark' | 'amoled' =
    effectiveTheme === 'amoled' ? 'amoled' : effectiveTheme === 'dark' ? 'dark' : 'light';

  let activeColors = { ...themeColors[themeKey] };
  const isDarkTheme = effectiveTheme === 'dark' || effectiveTheme === 'amoled';

  return {
    theme,
    styleMode,
    colors: activeColors,
    isDark: isDarkTheme,
  };
}
