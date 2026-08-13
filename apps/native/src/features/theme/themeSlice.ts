import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type Theme = "light" | "dark";
export type StyleMode = "minimal" | "glass" | "clay";

export interface ThemeState {
  theme: Theme;
  styleMode: StyleMode;
}

const STORAGE_KEY = "gymos-theme";
const STYLE_STORAGE_KEY = "gymos-style";

function getSystemTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getStoredTheme(): Theme | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "light" || v === "dark" ? v : null;
  } catch {
    return null;
  }
}

function getStoredStyle(): StyleMode | null {
  try {
    const v = localStorage.getItem(STYLE_STORAGE_KEY);
    return v === "minimal" || v === "glass" || v === "clay" ? v : null;
  } catch {
    return null;
  }
}

const initialState: ThemeState = {
  theme: getStoredTheme() ?? getSystemTheme(),
  styleMode: getStoredStyle() ?? "minimal"
};

export const themeSlice = createSlice({
  name: "theme",
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<Theme>) => {
      state.theme = action.payload;
      try {
        localStorage.setItem(STORAGE_KEY, action.payload);
      } catch { }
    },
    setStyleMode: (state, action: PayloadAction<StyleMode>) => {
      state.styleMode = action.payload;
      try {
        localStorage.setItem(STYLE_STORAGE_KEY, action.payload);
      } catch { }
    },
    toggleTheme: (state) => {
      state.theme = state.theme === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(STORAGE_KEY, state.theme);
      } catch { }
    }
  }
});

export const { setTheme, setStyleMode, toggleTheme } = themeSlice.actions;
export const themeReducer = themeSlice.reducer;
