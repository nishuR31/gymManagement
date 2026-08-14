import type { AuthUserDto } from "@gym/shared";
import { configureStore } from "@reduxjs/toolkit";
import type { ReactNode } from "react";
import { Provider } from "react-redux";
import { authReducer, type AuthState } from "../features/auth/authSlice";

const baseUser: AuthUserDto = {
  id: "user-123",
  email: "member@example.com",
  firstName: "Jane",
  lastName: "Doe",
  role: "MEMBER",
  mustChangePassword: false,
  twoFactorEnabled: false,
  hasPasskeys: false,
  securityDisableRequested: false
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
