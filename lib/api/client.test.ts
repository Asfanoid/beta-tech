import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ApiConfigurationError,
  ApiNetworkError,
  requestJson,
  ServiceApiError,
} from "./client";

vi.mock("server-only", () => ({}));

const fetchMock = vi.fn<typeof fetch>();

describe("requestJson", () => {
  beforeEach(() => {
    vi.stubEnv("API_URL", "https://api.example.test/prod/api/");
    vi.stubEnv("API_KEY", "test-service-key");
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("adds the server API key and disables redirects and caching", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ ok: true }));

    await expect(requestJson<{ ok: boolean }>("parts/part-1")).resolves.toEqual(
      {
        ok: true,
      },
    );

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("https://api.example.test/prod/api/parts/part-1");
    expect(new Headers(init?.headers).get("x-api-key")).toBe(
      "test-service-key",
    );
    expect(init?.cache).toBe("no-store");
    expect(init?.redirect).toBe("error");
  });

  it("preserves service status errors and allowable statuses", async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json(
        { error: "Invalid status change", allowableStatuses: ["active"] },
        { status: 400 },
      ),
    );

    await expect(requestJson("parts/part-1")).rejects.toMatchObject({
      status: 400,
      body: {
        error: "Invalid status change",
        allowableStatuses: ["active"],
      },
    } satisfies Partial<ServiceApiError>);
  });

  it("does not make a request when API credentials are missing", async () => {
    vi.stubEnv("API_KEY", "");

    await expect(requestJson("parts/part-1")).rejects.toBeInstanceOf(
      ApiConfigurationError,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps network failures to an explicit API error", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("network failure"));

    await expect(requestJson("parts/part-1")).rejects.toBeInstanceOf(
      ApiNetworkError,
    );
  });

  it("refuses paths outside the configured API root", async () => {
    await expect(
      requestJson("https://unexpected.example/path"),
    ).rejects.toThrow(TypeError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
