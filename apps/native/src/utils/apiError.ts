import { AxiosError } from "axios";

export interface ApiErrorBody {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data as ApiErrorBody | undefined;
    return data?.error?.message ?? fallback;
  }
  return fallback;
}

export function getApiErrorCode(error: unknown): string | null {
  if (error instanceof AxiosError) {
    const data = error.response?.data as ApiErrorBody | undefined;
    return data?.error?.code ?? null;
  }
  return null;
}

