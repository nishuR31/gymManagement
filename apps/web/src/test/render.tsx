import type { AuthUserDto } from "@gym/shared";
import { configureStore } from "@reduxjs/toolkit";
import type { ReactNode } from "react";
import { Provider } from "react-redux";
import { authReducer, type AuthState } from "../features/auth/authSlice";

const baseUser: AuthUserDto = {
  id: "user-1",
  email: "user@example.com",
  firstName: "Test",
  lastName: "User",
  role: "MEMBER",
  mustChangePassword: false
};

export function makeAuthState(overrides: Partial<AuthState> = {}): AuthState {
  return {
    user: baseUser,
    accessToken: "access-token",
    status: "authenticated",
    error: null,
    ...overrides
  };
}

export function TestProvider({ authState, children }: { authState: AuthState; children: ReactNode }) {
  const store = configureStore({
    reducer: {
      auth: authReducer
    },
    preloadedState: {
      auth: authState
    }
  });

  return <Provider store={store}>{children}</Provider>;
}
