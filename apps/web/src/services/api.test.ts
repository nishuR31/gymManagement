import { AxiosError, AxiosHeaders, type AxiosAdapter, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { api, setAccessToken } from "./api";

const originalAdapter = api.defaults.adapter;

describe("api client", () => {
  beforeEach(() => {
    setAccessToken(null);
  });

  afterEach(() => {
    if (originalAdapter) {
      api.defaults.adapter = originalAdapter;
    } else {
      delete api.defaults.adapter;
    }
    setAccessToken(null);
  });

  it("refreshes once and retries the original request after a 401", async () => {
    const calls: Array<{ url: string | undefined; authorization: string | undefined }> = [];
    let secureAttempts = 0;

    const adapter: AxiosAdapter = async (config) => {
      calls.push({
        url: config.url,
        authorization: readAuthorization(config)
      });

      if (config.url === "/auth/refresh") {
        return response(config, { accessToken: "next-token" });
      }

      if (config.url === "/secure") {
        secureAttempts += 1;
        if (secureAttempts === 1) {
          throw new AxiosError("Unauthorized", "ERR_BAD_REQUEST", config, undefined, response(config, { error: { code: "UNAUTHORIZED" } }, 401));
        }
        return response(config, { ok: true });
      }

      return response(config, {});
    };

    api.defaults.adapter = adapter;
    setAccessToken("old-token");

    const result = await api.get<{ ok: boolean }>("/secure");

    expect(result.data.ok).toBe(true);
    expect(calls).toEqual([
      { url: "/secure", authorization: "Bearer old-token" },
      { url: "/auth/refresh", authorization: "Bearer old-token" },
      { url: "/secure", authorization: "Bearer next-token" }
    ]);
  });
});

function response<T>(config: InternalAxiosRequestConfig, data: T, status = 200): AxiosResponse<T> {
  return {
    data,
    status,
    statusText: status === 200 ? "OK" : "Unauthorized",
    headers: new AxiosHeaders(),
    config
  };
}

function readAuthorization(config: InternalAxiosRequestConfig): string | undefined {
  const value = config.headers.get?.("Authorization") ?? config.headers.Authorization;
  return typeof value === "string" ? value : undefined;
}
