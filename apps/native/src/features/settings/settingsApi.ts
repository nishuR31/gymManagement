import type { GymInfoDto, SettingDto } from "@gym/shared";
import { api } from "../../services/api";

export async function listSettings(): Promise<SettingDto[]> {
  const response = await api.get<{ data: SettingDto[] }>("/settings");
  return response.data.data;
}

export async function updateSetting(key: string, value: unknown): Promise<SettingDto> {
  const response = await api.put<{ setting: SettingDto }>(`/settings/${key}`, { value });
  return response.data.setting;
}

export async function getGymInfo(): Promise<GymInfoDto> {
  const response = await api.get<GymInfoDto>("/settings/gym-info");
  return response.data;
}
