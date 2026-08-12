import type { AttendanceDto } from "@gym/shared";
import { api } from "../../services/api";

export async function listCurrentAttendance(): Promise<AttendanceDto[]> {
  const response = await api.get<{ data: AttendanceDto[] }>("/attendance/current");
  return response.data.data;
}
