import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEFAULT_API_URL = process.env.EXPO_PUBLIC_API_URL ?? "https://gymmanagement-kejr.onrender.com";
const API_URL_KEY = '@api_base_url';

let accessToken: string | null = null;
let refreshPromise: Promise<string> | null = null;

export const api = axios.create({
  baseURL: DEFAULT_API_URL,
});

export async function loadApiBaseUrl() {
  try {
    const url = await AsyncStorage.getItem(API_URL_KEY);
    if (url) {
      api.defaults.baseURL = url;
    }
  } catch (e) {
    console.warn("Failed to load API URL from storage");
  }
}

export async function setCustomApiBaseUrl(url: string) {
  try {
    await AsyncStorage.setItem(API_URL_KEY, url);
    api.defaults.baseURL = url;
  } catch (e) {
    console.error("Failed to save API URL", e);
  }
}

export async function resetApiBaseUrl() {
  try {
    await AsyncStorage.removeItem(API_URL_KEY);
    api.defaults.baseURL = DEFAULT_API_URL;
  } catch (e) {
    console.error("Failed to reset API URL", e);
  }
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export async function setRefreshToken(token: string) {
  try {
    await AsyncStorage.setItem('@refresh_token', token);
  } catch (e) {
    console.error("Failed to save refresh token", e);
  }
}

export async function clearRefreshToken() {
  try {
    await AsyncStorage.removeItem('@refresh_token');
  } catch (e) {
    console.error("Failed to clear refresh token", e);
  }
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
      refreshPromise = (async () => {
        const storedRefreshToken = await AsyncStorage.getItem('@refresh_token');
        const headers: any = {};
        if (storedRefreshToken) {
          headers['x-refresh-token'] = storedRefreshToken;
        }

        const response = await api.post<{ accessToken: string }>("/auth/refresh", {}, { headers });
        return response.data.accessToken;
      })();
    }

    try {
      const token = await refreshPromise;
      setAccessToken(token);
      originalRequest.headers.Authorization = `Bearer ${token}`;
      return api(originalRequest);
    } finally {
      refreshPromise = null;
    }
  }
);
