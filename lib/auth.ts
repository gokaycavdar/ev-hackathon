/**
 * Auth utilities for JWT token management and authenticated API calls.
 * The Go backend returns unified responses: { success, data, error, meta }
 */

const TOKEN_KEY = "ecocharge:token";
const USER_ID_KEY = "ecocharge:userId";

// --- Token Management ---

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_ID_KEY);
}

export function getStoredUserId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(USER_ID_KEY);
}

export function setStoredUserId(id: string): void {
  localStorage.setItem(USER_ID_KEY, id);
}

// --- API Response Types ---

type ApiResponse<T> = {
  success: boolean;
  data: T;
  error?: { code: string; message: string };
  meta?: Record<string, unknown>;
};

// --- Authenticated Fetch ---

/**
 * Wrapper around fetch that adds Authorization: Bearer header.
 * Redirects to login on 401 responses.
 */
export async function authFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getToken();
  const headers = new Headers(options.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    clearToken();
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  }

  return res;
}

// --- Response Unwrapper ---

/**
 * Parses the Go backend's unified response envelope and extracts `data`.
 * Throws an Error with the backend's error message on failure.
 */
export async function unwrapResponse<T>(res: Response): Promise<T> {
  const json: ApiResponse<T> = await res.json();

  if (!json.success || !res.ok) {
    const msg = json.error?.message || `Request failed with status ${res.status}`;
    throw new Error(msg);
  }

  return json.data;
}
