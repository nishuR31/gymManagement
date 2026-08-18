import type {
  DietMealDto,
  DietPlanTemplateDto,
  LeaveRequestDto,
  MemberDietPlanDto,
  MemberWorkoutPlanDto,
  StaffAttendanceDto,
  StaffProfileDto,
  StaffProfileRole,
  WorkoutExerciseDto,
  WorkoutPlanTemplateDto
} from "@gym/shared";
import { api } from "../../services/api";

export async function listProfiles(): Promise<StaffProfileDto[]> {
  const response = await api.get<{ data: StaffProfileDto[] }>("/staff/profiles");
  return response.data.data;
}

export async function createProfile(payload: { userId: string; role: StaffProfileRole; salaryCents: number }): Promise<StaffProfileDto> {
  const response = await api.post<{ profile: StaffProfileDto }>("/staff/profiles", payload);
  return response.data.profile;
}

export async function checkInStaff(id: string): Promise<StaffAttendanceDto> {
  const response = await api.post<{ attendance: StaffAttendanceDto }>(`/staff/profiles/${id}/check-in`);
  return response.data.attendance;
}

export async function checkOutStaff(id: string): Promise<StaffAttendanceDto> {
  const response = await api.post<{ attendance: StaffAttendanceDto }>(`/staff/profiles/${id}/check-out`);
  return response.data.attendance;
}

export async function listLeaveRequests(staffProfileId?: string): Promise<LeaveRequestDto[]> {
  const response = await api.get<{ data: LeaveRequestDto[] }>("/staff/leave-requests", {
    params: staffProfileId ? { staffProfileId } : {}
  });
  return response.data.data;
}

export async function createLeaveRequest(payload: { staffProfileId: string; startDate: string; endDate: string; reason: string }): Promise<LeaveRequestDto> {
  const response = await api.post<{ leaveRequest: LeaveRequestDto }>("/staff/leave-requests", payload);
  return response.data.leaveRequest;
}

export async function reviewLeaveRequest(id: string, status: "APPROVED" | "REJECTED"): Promise<LeaveRequestDto> {
  const response = await api.post<{ leaveRequest: LeaveRequestDto }>(`/staff/leave-requests/${id}/review`, { status });
  return response.data.leaveRequest;
}

export async function listWorkoutTemplates(): Promise<WorkoutPlanTemplateDto[]> {
  const response = await api.get<{ data: WorkoutPlanTemplateDto[] }>("/plans/workout-templates");
  return response.data.data;
}

export async function createWorkoutTemplate(payload: { name: string; exercises: WorkoutExerciseDto[] }): Promise<WorkoutPlanTemplateDto> {
  const response = await api.post<{ template: WorkoutPlanTemplateDto }>("/plans/workout-templates", payload);
  return response.data.template;
}

export async function updateWorkoutTemplate(id: string, payload: { name?: string; exercises?: WorkoutExerciseDto[]; isActive?: boolean }): Promise<WorkoutPlanTemplateDto> {
  const response = await api.patch<{ template: WorkoutPlanTemplateDto }>(`/plans/workout-templates/${id}`, payload);
  return response.data.template;
}

export async function deleteWorkoutTemplate(id: string): Promise<WorkoutPlanTemplateDto> {
  const response = await api.delete<{ template: WorkoutPlanTemplateDto }>(`/plans/workout-templates/${id}`);
  return response.data.template;
}

export async function assignWorkout(payload: { memberId: string; templateId: string; trainerId?: string; startDate: string }): Promise<MemberWorkoutPlanDto> {
  const response = await api.post<{ plan: MemberWorkoutPlanDto }>("/plans/workout-assignments", payload);
  return response.data.plan;
}

export async function listMemberWorkouts(memberId: string): Promise<MemberWorkoutPlanDto[]> {
  const response = await api.get<{ data: MemberWorkoutPlanDto[] }>(`/plans/members/${memberId}/workouts`);
  return response.data.data;
}

export async function listDietTemplates(): Promise<DietPlanTemplateDto[]> {
  const response = await api.get<{ data: DietPlanTemplateDto[] }>("/plans/diet-templates");
  return response.data.data;
}

export async function createDietTemplate(payload: { name: string; meals: DietMealDto[] }): Promise<DietPlanTemplateDto> {
  const response = await api.post<{ template: DietPlanTemplateDto }>("/plans/diet-templates", payload);
  return response.data.template;
}

export async function updateDietTemplate(id: string, payload: { name?: string; meals?: DietMealDto[]; isActive?: boolean }): Promise<DietPlanTemplateDto> {
  const response = await api.patch<{ template: DietPlanTemplateDto }>(`/plans/diet-templates/${id}`, payload);
  return response.data.template;
}

export async function deleteDietTemplate(id: string): Promise<DietPlanTemplateDto> {
  const response = await api.delete<{ template: DietPlanTemplateDto }>(`/plans/diet-templates/${id}`);
  return response.data.template;
}

export async function assignDiet(payload: { memberId: string; templateId: string; trainerId?: string; startDate: string }): Promise<MemberDietPlanDto> {
  const response = await api.post<{ plan: MemberDietPlanDto }>("/plans/diet-assignments", payload);
  return response.data.plan;
}

export async function listMemberDiets(memberId: string): Promise<MemberDietPlanDto[]> {
  const response = await api.get<{ data: MemberDietPlanDto[] }>(`/plans/members/${memberId}/diets`);
  return response.data.data;
}
