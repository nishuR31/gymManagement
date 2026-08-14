import type {
  AttendanceDto,
  DailyAttendanceDto,
  MonthlyAttendanceDto,
} from "@gym/shared";
import { api } from "../../services/api";

export interface CheckInPayload {
  memberId?: string;
  qrPayload?: string;
  query?: string;
}

export interface CheckOutPayload {
  memberId?: string;
  attendanceId?: string;
}

export interface DisambiguationMatch {
  id: string;
  memberCode: string;
  firstName: string;
  lastName: string;
  phone: string;
}

export interface CheckInResponse {
  attendance?: AttendanceDto;
  matches?: DisambiguationMatch[];
}

export async function checkIn(payload: CheckInPayload): Promise<CheckInResponse> {
  const response = await api.post<CheckInResponse>("/attendance/check-in", payload, {
    validateStatus: (status) => status === 201 || status === 300,
  });
  return response.data;
}

export async function checkOut(payload: CheckOutPayload): Promise<AttendanceDto> {
  const response = await api.post<{ attendance: AttendanceDto }>("/attendance/check-out", payload);
  return response.data.attendance;
}

export async function listCurrent(): Promise<AttendanceDto[]> {
  const response = await api.get<{ data: AttendanceDto[] }>("/attendance/current");
  return response.data.data;
}

export async function getDailyAttendance(date: string): Promise<DailyAttendanceDto> {
  const response = await api.get<DailyAttendanceDto>("/attendance/daily", {
    params: { date },
  });
  return response.data;
}

export async function getMonthlyAttendance(month: string): Promise<MonthlyAttendanceDto> {
  const response = await api.get<MonthlyAttendanceDto>("/attendance/monthly", {
    params: { month },
  });
  return response.data;
}
