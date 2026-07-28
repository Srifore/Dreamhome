import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiGet, apiPost, ApiError } from "./api";

describe("apiGet", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("resolves with the parsed JSON body on a successful response", async () => {
    const payload = { id: "1", name: "Faber Chimney" };
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => payload,
    });

    const result = await apiGet<typeof payload>("/public/products/1");

    expect(result).toEqual(payload);
  });

  it("requests the given path against the configured API base URL", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    });

    await apiGet("/public/brands");

    expect(fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/public\/brands$/),
      expect.objectContaining({ next: { revalidate: 60 } }),
    );
  });

  it("throws an ApiError carrying the HTTP status when the response is not ok", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({}),
    });

    await expect(apiGet("/public/products/missing")).rejects.toBeInstanceOf(ApiError);
    await expect(apiGet("/public/products/missing")).rejects.toMatchObject({ status: 404 });
  });
});

describe("apiPost", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends a POST with a JSON body and content-type header", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ id: "enq-1" }),
    });

    await apiPost("/public/enquiries", { name: "Jane", phone: "12345" });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/public\/enquiries$/),
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Jane", phone: "12345" }),
        cache: "no-store",
      }),
    );
  });

  it("resolves with the parsed JSON body on success", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: "enq-42" }),
    });

    await expect(apiPost("/public/enquiries", {})).resolves.toEqual({ id: "enq-42" });
  });

  it("throws with a single string message from the error body", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ message: "Phone number is required" }),
    });

    await expect(apiPost("/public/enquiries", {})).rejects.toThrow("Phone number is required");
  });

  it("joins an array of validation messages into a single error message", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ message: ["name should not be empty", "phone must be a phone number"] }),
    });

    await expect(apiPost("/public/enquiries", {})).rejects.toThrow(
      "name should not be empty, phone must be a phone number",
    );
  });

  it("falls back to a generic status-coded message when the error body has no message", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    });

    await expect(apiPost("/public/enquiries", {})).rejects.toThrow("Request failed (500)");
  });

  it("falls back to a generic message even when the error body isn't valid JSON", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => {
        throw new Error("not json");
      },
    });

    await expect(apiPost("/public/enquiries", {})).rejects.toThrow("Request failed (502)");
  });
});
