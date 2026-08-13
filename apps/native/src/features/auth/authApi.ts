import type { AuthUserDto } from "@gym/shared";
import { api } from "../../services/api";
import { USE_MOCK_API } from "../../utils/env";

const mockAuthResponse: any = {
  user: {
    id: "mock-1",
    email: "mock@example.com",
    role: "MEMBER",
    firstName: "Mock",
    lastName: "User",
    mustChangePassword: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  accessToken: "mock-token-123",
  expiresIn: "3600"
};

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
  if (USE_MOCK_API) return mockAuthResponse;
  const response = await api.post<AuthResponse>("/auth/login", payload);
  return response.data;
}

export async function memberLogin(payload: LoginPayload): Promise<AuthResponse> {
  if (USE_MOCK_API) return mockAuthResponse;
  const response = await api.post<AuthResponse>("/auth/member-login", payload);
  return response.data;
}

export async function completeFirstPassword(newPassword: string): Promise<AuthResponse> {
  if (USE_MOCK_API) return mockAuthResponse;
  const response = await api.post<AuthResponse>("/auth/first-password", { newPassword });
  return response.data;
}

export async function refreshSession(): Promise<AuthResponse> {
  if (USE_MOCK_API) return mockAuthResponse;
  const response = await api.post<AuthResponse>("/auth/refresh");
  return response.data;
}

export async function getCurrentUser(): Promise<AuthUserDto> {
  if (USE_MOCK_API) return mockAuthResponse.user;
  const response = await api.get<{ user: AuthUserDto }>("/auth/me");
  return response.data.user;
}

export async function logout(): Promise<void> {
  if (USE_MOCK_API) return;
  await api.post("/auth/logout");
}
