import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type Theme = "light" | "dark" | "amoled" | "system";
export type StyleMode = "minimal" | "glass" | "clay" | "liquid-glass";

export interface ThemeState {
  theme: Theme;
  styleMode: StyleMode;
  isLoaded: boolean;
  pinnedRoutes: string[];
}

const STORAGE_KEY = "gymos-theme";
const STYLE_STORAGE_KEY = "gymos-style";
const PINNED_ROUTES_KEY = "gymos-pinned-routes";

const initialState: ThemeState = {
  theme: "system",
  styleMode: "minimal",
  isLoaded: false,
  pinnedRoutes: ["Dashboard", "Attendance"],
};

export const loadThemeSettings = createAsyncThunk("theme/loadSettings", async () => {
  const theme = await AsyncStorage.getItem(STORAGE_KEY);
  const style = await AsyncStorage.getItem(STYLE_STORAGE_KEY);
  const pinnedRoutesStr = await AsyncStorage.getItem(PINNED_ROUTES_KEY);


  let pinnedRoutes = ["Dashboard", "Attendance"];
  if (pinnedRoutesStr) {
    try {
      pinnedRoutes = JSON.parse(pinnedRoutesStr);
    } catch (e) { }
  }

  return {
    theme: (theme === "light" || theme === "dark" || theme === "amoled" || theme === "system") ? theme : "system",
    styleMode: (style === "minimal" || style === "glass" || style === "clay" || style === "liquid-glass") ? style : "minimal",
    pinnedRoutes
  };
});

export const themeSlice = createSlice({
  name: "theme",
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<Theme>) => {
      state.theme = action.payload;
      AsyncStorage.setItem(STORAGE_KEY, action.payload).catch(() => { });
    },
    setStyleMode: (state, action: PayloadAction<StyleMode>) => {
      state.styleMode = action.payload;
      AsyncStorage.setItem(STYLE_STORAGE_KEY, action.payload).catch(() => { });
    },
    toggleTheme: (state) => {
      state.theme = state.theme === "dark" ? "light" : "dark";
      AsyncStorage.setItem(STORAGE_KEY, state.theme).catch(() => { });
    },
    togglePinnedRoute: (state, action: PayloadAction<string>) => {
      const route = action.payload;
      if (state.pinnedRoutes.includes(route)) {
        state.pinnedRoutes = state.pinnedRoutes.filter(r => r !== route);
      } else {
        state.pinnedRoutes.push(route);
      }
      AsyncStorage.setItem(PINNED_ROUTES_KEY, JSON.stringify(state.pinnedRoutes)).catch(() => { });
    }
  },
  extraReducers: (builder) => {
    builder.addCase(loadThemeSettings.fulfilled, (state, action) => {
      if (action.payload.theme) state.theme = action.payload.theme as Theme;
      if (action.payload.styleMode) state.styleMode = action.payload.styleMode as StyleMode;
      if (action.payload.pinnedRoutes) state.pinnedRoutes = action.payload.pinnedRoutes;
      state.isLoaded = true;
    });
    builder.addCase(loadThemeSettings.rejected, (state) => {
      state.isLoaded = true;
    });
  }
});

export const { setTheme, setStyleMode, toggleTheme, togglePinnedRoute } = themeSlice.actions;
export const themeReducer = themeSlice.reducer;
