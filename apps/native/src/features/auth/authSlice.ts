import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { AuthUserDto } from "@gym/shared";
import { setAccessToken } from "../../services/api";
import { getApiErrorCode } from "../../utils/apiError";
import * as authApi from "./authApi";

export type AuthStatus = "idle" | "loading" | "authenticated" | "unauthenticated" | "password_change_required";

export interface AuthState {
  user: AuthUserDto | null;
  accessToken: string | null;
  status: AuthStatus;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  status: "idle",
  error: null
};

export const loginThunk = createAsyncThunk("auth/login", async (payload: authApi.LoginPayload) => {
  return authApi.login(payload);
});

export const memberLoginThunk = createAsyncThunk<
  authApi.AuthResponse,
  authApi.LoginPayload,
  { rejectValue: string | null }
>("auth/memberLogin", async (payload, { rejectWithValue }) => {
  try {
    return await authApi.memberLogin(payload);
  } catch (error) {
    return rejectWithValue(getApiErrorCode(error));
  }
});

export const completeFirstPasswordThunk = createAsyncThunk("auth/completeFirstPassword", async (newPassword: string) => {
  return authApi.completeFirstPassword(newPassword);
});

export const bootstrapAuthThunk = createAsyncThunk("auth/bootstrap", async () => {
  const session = await authApi.refreshSession();
  return session;
});

export const logoutThunk = createAsyncThunk("auth/logout", async () => {
  await authApi.logout();
});

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loginThunk.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(loginThunk.fulfilled, (state, action) => {
        state.status = action.payload.user.mustChangePassword ? "password_change_required" : "authenticated";
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        setAccessToken(action.payload.accessToken);
      })
      .addCase(loginThunk.rejected, (state) => {
        state.status = "unauthenticated";
        state.user = null;
        state.accessToken = null;
        state.error = "Invalid email or password";
        setAccessToken(null);
      })
      .addCase(memberLoginThunk.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(memberLoginThunk.fulfilled, (state, action) => {
        state.status = action.payload.user.mustChangePassword ? "password_change_required" : "authenticated";
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        setAccessToken(action.payload.accessToken);
      })
      .addCase(memberLoginThunk.rejected, (state) => {
        state.status = "unauthenticated";
        state.user = null;
        state.accessToken = null;
        state.error = "Invalid email or password";
        setAccessToken(null);
      })
      .addCase(completeFirstPasswordThunk.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(completeFirstPasswordThunk.fulfilled, (state, action) => {
        state.status = "authenticated";
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        setAccessToken(action.payload.accessToken);
      })
      .addCase(completeFirstPasswordThunk.rejected, (state) => {
        state.status = "password_change_required";
        state.error = "Could not set password";
      })
      .addCase(bootstrapAuthThunk.pending, (state) => {
        state.status = state.status === "idle" ? "loading" : state.status;
      })
      .addCase(bootstrapAuthThunk.fulfilled, (state, action) => {
        state.status = action.payload.user.mustChangePassword ? "password_change_required" : "authenticated";
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        setAccessToken(action.payload.accessToken);
      })
      .addCase(bootstrapAuthThunk.rejected, (state) => {
        state.status = "unauthenticated";
        state.user = null;
        state.accessToken = null;
        setAccessToken(null);
      })
      .addCase(logoutThunk.fulfilled, (state) => {
        state.status = "unauthenticated";
        state.user = null;
        state.accessToken = null;
        setAccessToken(null);
      });
  }
});

export const authReducer = authSlice.reducer;
