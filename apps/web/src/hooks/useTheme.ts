import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { setTheme as setReduxTheme, setStyleMode as setReduxStyleMode, toggleTheme as toggleReduxTheme, type Theme, type StyleMode } from "../features/theme/themeSlice";

export function useTheme() {
  const dispatch = useAppDispatch();
  const theme = useAppSelector((state) => state.theme.theme);
  const styleMode = useAppSelector((state) => state.theme.styleMode);

  const toggle = useCallback(() => {
    dispatch(toggleReduxTheme());
  }, [dispatch]);

  const setTheme = useCallback((t: Theme) => {
    dispatch(setReduxTheme(t));
  }, [dispatch]);

  const setStyleMode = useCallback((s: StyleMode) => {
    dispatch(setReduxStyleMode(s));
  }, [dispatch]);

  return { 
    theme, 
    toggle, 
    setTheme, 
    isDark: theme === "dark",
    styleMode,
    setStyleMode
  } as const;
}
