import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";

const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

let accessToken: string | null = null;
let refreshPromise: Promise<string> | null = null;

export const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true
});

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config;

    if (!originalRequest || error.response?.status !== 401 || originalRequest.url === "/auth/refresh") {
      throw error;
    }

    if (!refreshPromise) {
      refreshPromise = api
        .post<{ accessToken: string }>("/auth/refresh")
        .then((response) => response.data.accessToken)
        .finally(() => {
          refreshPromise = null;
        });
    }

    const token = await refreshPromise;
    setAccessToken(token);
    originalRequest.headers.Authorization = `Bearer ${token}`;
    return api(originalRequest);
  }
);
