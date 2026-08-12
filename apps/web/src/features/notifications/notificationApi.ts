import type {
  NotificationCategory,
  NotificationDto,
  NotificationPriority,
  PaginatedNotificationDto
} from "@gym/shared";
import { api } from "../../services/api";

export interface NotificationListParams {
  unreadOnly?: boolean;
  page?: number;
  pageSize?: number;
}

export interface CreateNotificationPayload {
  userId?: string;
  title: string;
  body: string;
  category: NotificationCategory;
  priority: NotificationPriority;
}

export async function listNotifications(params: NotificationListParams): Promise<PaginatedNotificationDto> {
  const response = await api.get<PaginatedNotificationDto>("/notifications", { params });
  return response.data;
}

export async function getUnreadNotificationCount(): Promise<number> {
  const response = await api.get<{ count: number }>("/notifications/unread-count");
  return response.data.count;
}

export async function createNotification(payload: CreateNotificationPayload): Promise<NotificationDto> {
  const response = await api.post<{ notification: NotificationDto }>("/notifications", payload);
  return response.data.notification;
}

export async function markNotificationRead(id: string): Promise<NotificationDto> {
  const response = await api.post<{ notification: NotificationDto }>(`/notifications/${id}/read`);
  return response.data.notification;
}
