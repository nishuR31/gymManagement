import type { AuthUserDto, ProfileUpdateDto, PasswordUpdateDto, TwoFactorSetupResponse, PasskeyDto } from "@gym/shared";
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  const storedRefreshToken = await AsyncStorage.getItem('@refresh_token');
  const headers: any = {};
  if (storedRefreshToken) {
    headers['x-refresh-token'] = storedRefreshToken;
  }
  await api.post("/auth/logout", {}, { headers });
}

export async function requestSecurityDisable(userId: string): Promise<void> {
  await api.post("/auth/security-disable/request", { userId });
}

export async function updateProfile(payload: ProfileUpdateDto): Promise<AuthUserDto> {
  const response = await api.patch<{ user: AuthUserDto }>("/auth/me/profile", payload);
  return response.data.user;
}

export async function changePassword(payload: PasswordUpdateDto): Promise<void> {
  await api.post("/auth/me/password", payload);
}

export async function generateTwoFactor(): Promise<TwoFactorSetupResponse> {
  const response = await api.post<TwoFactorSetupResponse>("/auth/2fa/generate");
  return response.data;
}

export async function verifyTwoFactor(token: string): Promise<void> {
  await api.post("/auth/2fa/verify", { token });
}

export async function disableTwoFactor(token: string): Promise<void> {
  await api.post("/auth/2fa/disable", { token });
}

export async function getPasskeys(): Promise<PasskeyDto[]> {
  const response = await api.get<PasskeyDto[]>("/auth/passkeys");
  return response.data;
}

export async function generatePasskeyRegistration(): Promise<any> {
  const response = await api.post("/auth/passkeys/generate-registration");
  return response.data;
}

export async function verifyPasskeyRegistration(registrationResponse: any): Promise<void> {
  await api.post("/auth/passkeys/verify-registration", { response: registrationResponse });
}

export async function removePasskey(id: string): Promise<void> {
  await api.delete(`/auth/passkeys/${id}`);
}
