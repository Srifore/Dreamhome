const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { next: { revalidate: 60 } });
  if (!res.ok) {
    throw new ApiError(res.status, `API request failed: ${path} (${res.status})`);
  }
  return res.json();
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const message = Array.isArray(data.message) ? data.message.join(", ") : data.message;
    throw new Error(message || `Request failed (${res.status})`);
  }
  return res.json();
}
