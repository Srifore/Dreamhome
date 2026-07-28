import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, api, apiFetch, clearTokens, getAccessToken, getRefreshToken, setTokens } from "./api";

const API_URL = "http://localhost:3001";

function makeResponse(body: unknown, init: { status?: number; statusText?: string } = {}) {
  const status = init.status ?? 200;
  const payload = body === null || body === undefined ? null : JSON.stringify(body);
  return new Response(payload, { status, statusText: init.statusText });
}

/** Replaces window.location with a plain mock so 401-driven redirects don't hit jsdom's
 *  "not implemented: navigation" error, and so we can assert on the resulting href precisely. */
function mockLocation(pathname: string) {
  let href = "";
  Object.defineProperty(window, "location", {
    writable: true,
    configurable: true,
    value: {
      pathname,
      get href() {
        return href;
      },
      set href(value: string) {
        href = value;
      },
    },
  });
  return {
    get href() {
      return href;
    },
  };
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  localStorage.clear();
  mockLocation("/dashboard");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("apiFetch response handling", () => {
  it("returns parsed JSON for a normal 200 response", async () => {
    fetchMock.mockResolvedValueOnce(makeResponse({ id: "1", name: "Widget" }));
    const result = await apiFetch<{ id: string; name: string }>("/things/1");
    expect(result).toEqual({ id: "1", name: "Widget" });
  });

  it("returns null for a 204 No Content response", async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(null, { status: 204 }));
    const result = await apiFetch("/things/1");
    expect(result).toBeNull();
  });

  it("returns null for a 200 response with a completely empty body", async () => {
    fetchMock.mockResolvedValueOnce(new Response("", { status: 200 }));
    const result = await apiFetch("/things/1");
    expect(result).toBeNull();
  });

  it("throws an ApiError when a 200 response body is not valid JSON", async () => {
    fetchMock.mockResolvedValueOnce(new Response("not-json{", { status: 200 }));
    const error = await apiFetch("/things/1").catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 200,
      message: "Received an invalid response from the server",
    });
  });

  it("throws an ApiError with the server-provided message for a non-ok response", async () => {
    fetchMock.mockResolvedValueOnce(makeResponse({ message: "Not found" }, { status: 404 }));
    await expect(apiFetch("/things/999")).rejects.toMatchObject({ status: 404, message: "Not found" });
  });

  it("joins an array error message into a single string", async () => {
    fetchMock.mockResolvedValueOnce(
      makeResponse({ message: ["name is required", "phone is required"] }, { status: 400 }),
    );
    await expect(apiFetch("/things")).rejects.toMatchObject({
      status: 400,
      message: "name is required, phone is required",
    });
  });

  it("falls back to statusText when the error response body can't be parsed", async () => {
    fetchMock.mockResolvedValueOnce(new Response("<html>oops</html>", { status: 500, statusText: "Server Error" }));
    await expect(apiFetch("/things")).rejects.toMatchObject({ status: 500, message: "Server Error" });
  });
});

describe("apiFetch request construction", () => {
  it("issues a GET with no body against API_URL + path by default", async () => {
    fetchMock.mockResolvedValueOnce(makeResponse({ ok: true }));
    await apiFetch("/things");
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe(`${API_URL}/things`);
    expect(opts.method).toBe("GET");
    expect(opts.body).toBeUndefined();
    expect(opts.headers["Content-Type"]).toBe("application/json");
  });

  it("attaches an Authorization header when an access token is stored", async () => {
    setTokens("tok-123", "refresh-abc");
    fetchMock.mockResolvedValueOnce(makeResponse({ ok: true }));
    await apiFetch("/secure");
    const [, opts] = fetchMock.mock.calls[0];
    expect(opts.headers.Authorization).toBe("Bearer tok-123");
  });

  it("omits the Authorization header when skipAuth is set, even with a token stored", async () => {
    setTokens("tok-123", "refresh-abc");
    fetchMock.mockResolvedValueOnce(makeResponse({ ok: true }));
    await apiFetch("/public", { skipAuth: true });
    const [, opts] = fetchMock.mock.calls[0];
    expect(opts.headers.Authorization).toBeUndefined();
  });

  it("sends FormData bodies as-is, without JSON-encoding or a Content-Type header", async () => {
    fetchMock.mockResolvedValueOnce(makeResponse({ ok: true }));
    const formData = new FormData();
    formData.append("file", "content");
    await apiFetch("/upload", { method: "POST", body: formData, isFormData: true });
    const [, opts] = fetchMock.mock.calls[0];
    expect(opts.body).toBe(formData);
    expect(opts.headers["Content-Type"]).toBeUndefined();
  });
});

describe("api helper methods", () => {
  it("api.get issues a GET", async () => {
    fetchMock.mockResolvedValueOnce(makeResponse([{ id: "1" }]));
    await api.get("/things");
    expect(fetchMock.mock.calls[0][1].method).toBe("GET");
  });

  it("api.post JSON-encodes the body and sets method POST", async () => {
    fetchMock.mockResolvedValueOnce(makeResponse({ id: "1" }));
    await api.post("/things", { name: "widget" });
    const [, opts] = fetchMock.mock.calls[0];
    expect(opts.method).toBe("POST");
    expect(opts.body).toBe(JSON.stringify({ name: "widget" }));
  });

  it("api.patch, api.put, and api.delete set the correct HTTP method", async () => {
    // A fresh Response per call — a Response body can only be read once, and mockResolvedValue
    // (without "Once") would otherwise hand back the same already-consumed instance each time.
    fetchMock.mockImplementation(async () => makeResponse({ ok: true }));
    await api.patch("/things/1", { name: "x" });
    await api.put("/things/1", { name: "y" });
    await api.delete("/things/1");
    expect(fetchMock.mock.calls[0][1].method).toBe("PATCH");
    expect(fetchMock.mock.calls[1][1].method).toBe("PUT");
    expect(fetchMock.mock.calls[2][1].method).toBe("DELETE");
  });

  it("api.upload defaults to POST but accepts PATCH", async () => {
    fetchMock.mockImplementation(async () => makeResponse({ ok: true }));
    const fd = new FormData();
    await api.upload("/files", fd);
    await api.upload("/files/1", fd, "PATCH");
    expect(fetchMock.mock.calls[0][1].method).toBe("POST");
    expect(fetchMock.mock.calls[1][1].method).toBe("PATCH");
  });
});

describe("401 handling: refresh + retry", () => {
  it("on a 401, refreshes the token and retries the original request once", async () => {
    setTokens("old-access", "refresh-token");
    fetchMock
      .mockResolvedValueOnce(makeResponse(null, { status: 401 })) // original request
      .mockResolvedValueOnce(makeResponse({ accessToken: "new-access", refreshToken: "new-refresh" })) // refresh
      .mockResolvedValueOnce(makeResponse({ data: "secret" })); // retried request

    const result = await apiFetch("/secure");

    expect(result).toEqual({ data: "secret" });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][0]).toBe(`${API_URL}/auth/refresh`);
    // new tokens were persisted...
    expect(getAccessToken()).toBe("new-access");
    // ...and used on the retried request.
    expect(fetchMock.mock.calls[2][1].headers.Authorization).toBe("Bearer new-access");
  });

  it("clears tokens and redirects to /login when there is no refresh token to use", async () => {
    clearTokens();
    const location = mockLocation("/dashboard");
    fetchMock.mockResolvedValueOnce(makeResponse(null, { status: 401 }));

    await expect(apiFetch("/secure")).rejects.toThrow(ApiError);

    // Refresh was never attempted (no fetch to /auth/refresh) since there was nothing to refresh with.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(getAccessToken()).toBeNull();
    expect(location.href).toBe("/login");
  });

  it("clears tokens and redirects to /login when the refresh call itself fails", async () => {
    setTokens("old-access", "refresh-token");
    const location = mockLocation("/dashboard");
    fetchMock
      .mockResolvedValueOnce(makeResponse(null, { status: 401 })) // original request
      .mockResolvedValueOnce(makeResponse(null, { status: 401 })); // refresh endpoint rejects the refresh token

    await expect(apiFetch("/secure")).rejects.toThrow(ApiError);

    expect(fetchMock).toHaveBeenCalledTimes(2); // no retry attempted
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
    expect(location.href).toBe("/login");
  });

  it("clears tokens and redirects to /login when the retried request still 401s", async () => {
    setTokens("old-access", "refresh-token");
    const location = mockLocation("/dashboard");
    fetchMock
      .mockResolvedValueOnce(makeResponse(null, { status: 401 })) // original request
      .mockResolvedValueOnce(makeResponse({ accessToken: "new-access", refreshToken: "new-refresh" })) // refresh ok
      .mockResolvedValueOnce(makeResponse(null, { status: 401 })); // retry still unauthorized

    await expect(apiFetch("/secure")).rejects.toThrow(ApiError);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(getAccessToken()).toBeNull();
    expect(location.href).toBe("/login");
  });

  it("does not redirect when already on the /login page", async () => {
    clearTokens();
    const location = mockLocation("/login");
    fetchMock.mockResolvedValueOnce(makeResponse(null, { status: 401 }));

    await expect(apiFetch("/secure")).rejects.toThrow(ApiError);

    expect(location.href).toBe(""); // href setter was never invoked
  });

  it("dedupes concurrent 401s: two simultaneous requests trigger only one refresh call", async () => {
    setTokens("old-access", "refresh-token");
    const callCountByUrl: Record<string, number> = {};

    fetchMock.mockImplementation(async (url: string) => {
      if (url === `${API_URL}/auth/refresh`) {
        return makeResponse({ accessToken: "new-access", refreshToken: "new-refresh" });
      }
      callCountByUrl[url] = (callCountByUrl[url] ?? 0) + 1;
      if (callCountByUrl[url] === 1) {
        return makeResponse(null, { status: 401 });
      }
      return makeResponse({ url });
    });

    const [a, b] = await Promise.all([
      apiFetch<{ url: string }>("/a"),
      apiFetch<{ url: string }>("/b"),
    ]);

    expect(a).toEqual({ url: `${API_URL}/a` });
    expect(b).toEqual({ url: `${API_URL}/b` });

    const refreshCalls = fetchMock.mock.calls.filter(([url]: any[]) => url === `${API_URL}/auth/refresh`);
    expect(refreshCalls).toHaveLength(1);
    // 2 original (401) + 1 shared refresh + 2 retries = 5.
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  it("does not attempt a refresh when skipAuth is set, even on a 401", async () => {
    setTokens("old-access", "refresh-token");
    fetchMock.mockResolvedValueOnce(makeResponse(null, { status: 401 }));

    await expect(apiFetch("/login-endpoint", { skipAuth: true })).rejects.toThrow(ApiError);

    expect(fetchMock).toHaveBeenCalledTimes(1); // no refresh attempt
  });
});
