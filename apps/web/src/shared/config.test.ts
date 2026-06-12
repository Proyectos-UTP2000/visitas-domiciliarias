import { describe, expect, it, vi } from "vitest";
import { normalizeApiBaseUrl } from "./config";

describe("API base URL config", () => {
  it("keeps /api/v1 as the default relative API base", () => {
    expect(normalizeApiBaseUrl(undefined)).toBe("/api/v1");
  });

  it("keeps an explicit full API base when it already includes /api/v1", () => {
    expect(normalizeApiBaseUrl("http://localhost:4000/api/v1")).toBe(
      "http://localhost:4000/api/v1",
    );
  });

  it("appends /api/v1 when VITE_API_URL is only the backend origin", () => {
    expect(normalizeApiBaseUrl("http://localhost:4000")).toBe(
      "http://localhost:4000/api/v1",
    );
  });

  it("uses VITE_API_URL before VITE_API_BASE_URL", async () => {
    vi.resetModules();
    vi.stubEnv("VITE_API_URL", "http://localhost:4000");
    vi.stubEnv("VITE_API_BASE_URL", "http://localhost:5000/api/v1");

    const { getApiBaseUrl } = await import("./config");

    expect(getApiBaseUrl()).toBe("http://localhost:4000/api/v1");
  });
});
