"use client";

import useSWR, { mutate, type SWRConfiguration } from "swr";
import { getSession, setSession } from "./session";

/** Accepts the backend origin with or without the /api/v1 prefix. */
export const API_URL = (() => {
  const base = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000").replace(/\/+$/, "");
  return base.endsWith("/api/v1") ? base : `${base}/api/v1`;
})();

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly issues?: { path: string; message: string }[],
  ) {
    super(message);
  }
}

type Body = Record<string, unknown> | unknown[] | FormData;

/** Screens built from logged data. After any change, their cached copies are stale. */
const DAY_DATA = /^\/(dashboard|summaries|weights|meals|exercises\?|profile)/;

/**
 * Drops cached day data so the next screen fetches fresh numbers instead of showing
 * the old ones first. The summary page updates its own entry after generating.
 */
function invalidateDayData(changedPath: string) {
  const keepSummary = changedPath.startsWith("/summaries");
  void mutate(
    (key) => typeof key === "string" && DAY_DATA.test(key) && !(keepSummary && key.startsWith("/summaries")),
    undefined,
    { revalidate: true },
  );
}

export async function api<T>(path: string, init: { method?: string; body?: Body } = {}): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getSession()?.token;
  if (token) headers.Authorization = `Bearer ${token}`;
  const isForm = init.body instanceof FormData;
  if (init.body && !isForm) headers["Content-Type"] = "application/json";

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: init.method ?? (init.body ? "POST" : "GET"),
      headers,
      body: init.body ? (isForm ? (init.body as FormData) : JSON.stringify(init.body)) : undefined,
    });
  } catch {
    throw new ApiError("Tidak bisa terhubung ke server. Cek koneksi internet.", 0);
  }

  if (res.status === 401 && token) setSession(null);
  const method = init.method ?? (init.body ? "POST" : "GET");
  if (res.ok && method !== "GET") invalidateDayData(path);
  if (res.status === 204) return undefined as T;

  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const body = (data ?? {}) as { message?: string | string[]; issues?: { path: string; message: string }[] };
    const message = Array.isArray(body.message) ? body.message[0] : body.message;
    throw new ApiError(message ?? `Terjadi kesalahan (${res.status})`, res.status, body.issues);
  }
  return data as T;
}

export function useApi<T>(path: string | null, config?: SWRConfiguration<T, ApiError>) {
  return useSWR<T, ApiError>(path, (p: string) => api<T>(p), {
    revalidateOnFocus: true,
    shouldRetryOnError: (err) => err.status === 0 || err.status >= 500,
    ...config,
  });
}

/** Fetch an authed image (meal photo) as an object URL. */
export async function fetchImageUrl(path: string): Promise<string | null> {
  const token = getSession()?.token;
  const res = await fetch(`${API_URL}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) return null;
  return URL.createObjectURL(await res.blob());
}

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.issues?.length) return err.issues[0].message;
    return err.message;
  }
  return "Terjadi kesalahan. Coba lagi.";
}
