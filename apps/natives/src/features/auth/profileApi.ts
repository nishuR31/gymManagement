import type { PasskeyDto, ProfileUpdateDto, PasswordUpdateDto, TwoFactorSetupResponse, AuthUserDto } from "@gym/shared";
import { api } from "../../services/api";

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

export async function listPasskeys(): Promise<PasskeyDto[]> {
  const response = await api.get<PasskeyDto[]>("/auth/passkeys");
  return response.data;
}

export async function generatePasskeyRegistration(): Promise<any> {
  const response = await api.post("/auth/passkeys/generate-registration");
  return response.data;
}

export async function verifyPasskeyRegistration(payload: any): Promise<void> {
  await api.post("/auth/passkeys/verify-registration", payload);
}

export async function deletePasskey(id: string): Promise<void> {
  await api.delete(`/auth/passkeys/${id}`);
}
