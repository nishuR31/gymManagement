import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Appearance } from "react-native";

export type Theme = "light" | "dark";
export type StyleMode = "minimal" | "glass" | "clay";

export interface ThemeState {
  theme: Theme;
  styleMode: StyleMode;
  isLoaded: boolean;
}

const STORAGE_KEY = "gymos-theme";
const STYLE_STORAGE_KEY = "gymos-style";

const initialState: ThemeState = {
  theme: "light", // Initialized lazily to prevent RN circular dependency
  styleMode: "minimal",
  isLoaded: false
};

export const loadThemeSettings = createAsyncThunk("theme/loadSettings", async () => {
  const theme = await AsyncStorage.getItem(STORAGE_KEY);
  const style = await AsyncStorage.getItem(STYLE_STORAGE_KEY);
  const systemTheme = Appearance.getColorScheme() === "dark" ? "dark" : "light";
  return {
    theme: (theme === "light" || theme === "dark") ? theme : systemTheme,
    styleMode: (style === "minimal" || style === "glass" || style === "clay") ? style : "minimal"
  };
});

export const themeSlice = createSlice({
  name: "theme",
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<Theme>) => {
      state.theme = action.payload;
      AsyncStorage.setItem(STORAGE_KEY, action.payload).catch(() => {});
    },
    setStyleMode: (state, action: PayloadAction<StyleMode>) => {
      state.styleMode = action.payload;
      AsyncStorage.setItem(STYLE_STORAGE_KEY, action.payload).catch(() => {});
    },
    toggleTheme: (state) => {
      state.theme = state.theme === "dark" ? "light" : "dark";
      AsyncStorage.setItem(STORAGE_KEY, state.theme).catch(() => {});
    }
  },
  extraReducers: (builder) => {
    builder.addCase(loadThemeSettings.fulfilled, (state, action) => {
      if (action.payload.theme) state.theme = action.payload.theme as Theme;
      if (action.payload.styleMode) state.styleMode = action.payload.styleMode as StyleMode;
      state.isLoaded = true;
    });
    builder.addCase(loadThemeSettings.rejected, (state) => {
      state.isLoaded = true;
    });
  }
});

export const { setTheme, setStyleMode, toggleTheme } = themeSlice.actions;
export const themeReducer = themeSlice.reducer;

