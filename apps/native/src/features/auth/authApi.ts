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

export async function refreshSession(): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>("/auth/refresh");
  return response.data;
}

export async function getCurrentUser(): Promise<AuthUserDto> {
  const response = await api.get<{ user: AuthUserDto }>("/auth/me");
  return response.data.user;
}

export async function logout(): Promise<void> {
  await api.post("/auth/logout");
}
