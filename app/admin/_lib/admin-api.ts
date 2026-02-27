"use client";

type StoredUser = {
  role?: string;
  Role?: string;
  userRole?: string;
  [key: string]: unknown;
};

export interface AdminSession {
  token: string | null;
  role: string | null;
  user: StoredUser | null;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:5000";

const buildApiUrl = (path: string): string => {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const base = API_BASE_URL.endsWith("/") ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
};

const parseStoredUser = (raw: string | null): StoredUser | null => {
  if (!raw) return null;

  try {
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
};

export const getAdminSession = (): AdminSession => {
  if (typeof window === "undefined") {
    return { token: null, role: null, user: null };
  }

  const token = localStorage.getItem("pairup_token") || localStorage.getItem("authToken");
  const userRaw = localStorage.getItem("pairup_user") || localStorage.getItem("userInfo");
  const user = parseStoredUser(userRaw);
  const role = user?.role || user?.Role || user?.userRole || null;

  return { token, role, user };
};

export const hasAdminAccess = (): boolean => {
  const session = getAdminSession();
  return Boolean(session.token && session.role === "admin");
};

export const adminFetch = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const { token } = getAdminSession();
  const headers = new Headers(init.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (!(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(buildApiUrl(path), {
    ...init,
    headers,
    cache: "no-store",
  });

  const rawBody = await response.text();
  let payload: unknown = null;

  if (rawBody) {
    try {
      payload = JSON.parse(rawBody) as unknown;
    } catch {
      payload = { message: rawBody };
    }
  }

  if (!response.ok) {
    const message =
      typeof payload === "object" &&
      payload !== null &&
      "message" in payload &&
      typeof (payload as { message?: unknown }).message === "string"
        ? (payload as { message: string }).message
        : `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  return payload as T;
};
