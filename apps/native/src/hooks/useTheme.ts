import { useAppSelector } from '../store/hooks';
import { themeColors, type ThemeColors } from '../constants/colors';

type StyleMode = 'default' | 'glass' | 'clay' | 'minimal';
type Theme = 'light' | 'dark' | 'amoled';

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

  const themeKey: Theme =
    theme === 'amoled' ? 'amoled' : theme === 'dark' ? 'dark' : 'light';

  let activeColors = { ...themeColors[themeKey] };
  const isDarkTheme = theme === 'dark' || theme === 'amoled';

  return {
    theme,
    styleMode,
    colors: activeColors,
    isDark: isDarkTheme,
  };
}
