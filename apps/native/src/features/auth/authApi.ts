import type { AuthUserDto } from "@gym/shared";
import { api } from "../../services/api";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: AuthUserDto;
  accessToken: string;
  expiresIn: string;
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>("/auth/login", payload);
  return response.data;
}

export async function memberLogin(payload: LoginPayload): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>("/auth/member-login", payload);
  return response.data;
}

export async function completeFirstPassword(newPassword: string): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>("/auth/first-password", { newPassword });
  return response.data;
}

export async function register(payload: any): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>("/auth/signup", payload);
  return response.data;
}

export async function requestPasswordReset(email: string): Promise<void> {
  await api.post("/auth/password-reset/request", { email });
}

export async function verifyPasswordResetWith2FA(email: string, code: string): Promise<{ resetToken: string }> {
  const response = await api.post<{ resetToken: string }>("/auth/password-reset/2fa/verify", { email, token: code });
  return response.data;
}

export async function confirmPasswordReset(resetToken: string, password: string): Promise<void> {
  await api.post("/auth/password-reset/confirm", { token: resetToken, newPassword: password });
}

export async function refreshSession(): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>("/auth/refresh");
  return response.data;
}

export async function getCurrentUser(): Promise<AuthUserDto> {
  const response = await api.get<{ user: AuthUserDto }>("/auth/me");
  return response.data.user;
}

export async function logout(): Promise<void> {
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  const storedRefreshToken = await AsyncStorage.getItem('@refresh_token');
  const headers: any = {};
  if (storedRefreshToken) {
    headers['x-refresh-token'] = storedRefreshToken;
  }
  await api.post("/auth/logout", {}, { headers });
}
