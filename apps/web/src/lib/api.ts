const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const ACCESS_TOKEN_KEY = "dreamhome_access_token";
const REFRESH_TOKEN_KEY = "dreamhome_refresh_token";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

// Shared across concurrent 401s so two requests failing at once don't both fire a refresh —
// they await the same in-flight attempt instead.
let refreshInFlight: Promise<boolean> | null = null;

function tryRefresh(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return false;

    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return false;

      const data = await res.json();
      setTokens(data.accessToken, data.refreshToken);
      return true;
    } catch {
      return false;
    }
  })();

  return refreshInFlight.finally(() => {
    refreshInFlight = null;
  });
}

/** Session is unrecoverable (refresh failed, or the retried request still 401s) — bail out to login. */
function handleAuthFailure() {
  clearTokens();
  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  skipAuth?: boolean;
  /** Body is already a FormData instance (file upload) — don't JSON-encode it or set Content-Type. */
  isFormData?: boolean;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const doFetch = async (): Promise<Response> => {
    const headers: Record<string, string> = {};
    if (!options.isFormData) headers["Content-Type"] = "application/json";
    if (!options.skipAuth) {
      const token = getAccessToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }
    const body = options.isFormData
      ? (options.body as FormData)
      : options.body !== undefined
        ? JSON.stringify(options.body)
        : undefined;
    return fetch(`${API_URL}${path}`, {
      method: options.method ?? "GET",
      headers,
      body,
    });
  };

  let res = await doFetch();

  if (res.status === 401 && !options.skipAuth) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      res = await doFetch();
    }
    if (!refreshed || res.status === 401) {
      handleAuthFailure();
    }
  }

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = Array.isArray(body.message) ? body.message.join(", ") : body.message ?? message;
    } catch {
      // ignore body parse failure
    }
    throw new ApiError(res.status, message);
  }

  // `null`, not `undefined` — React Query treats a query resolving to `undefined` as an error
  // ("Query data cannot be undefined"), since `undefined` is reserved to mean "no data yet".
  if (res.status === 204) return null as T;

  // Some endpoints return a 200 with a completely empty body (e.g. NestJS serializing a `null`
  // return value) rather than a proper 204 — res.json() throws "Unexpected end of JSON input"
  // on an empty string, so check first instead of assuming every 200 has a JSON body.
  const text = await res.text();
  if (!text) return null as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError(res.status, "Received an invalid response from the server");
  }
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiFetch<T>(path, { ...options, method: "POST", body }),
  patch: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: "PATCH", body }),
  put: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: "PUT", body }),
  delete: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: "DELETE", body }),
  upload: <T>(path: string, formData: FormData, method: "POST" | "PATCH" = "POST") =>
    apiFetch<T>(path, { method, body: formData, isFormData: true }),
};
